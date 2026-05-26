package storage

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"

	// PostgreSQL driver
	_ "github.com/lib/pq"
)

// ActivityData represents the incoming JSON payload
type ActivityData struct {
	FocusStatus string `json:"focus_status"`
	AppName     string `json:"app_name"`
	AppPackage  string `json:"app_package"`
	AppCategory string `json:"app_category"`
	Timestamp   int64  `json:"timestamp"`
}

// Logger handles database operations for activity logs
type Logger struct {
	db *sql.DB
}

// NewLogger initializes a new Logger instance and connects to the database
func NewLogStore(connStr string) (*Logger, error) {
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("error opening database: %w", err)
	}

	// Verify the connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("error connecting to database: %w", err)
	}

	log.Println("Successfully connected to PostgreSQL")
	return &Logger{db: db}, nil
}

// SetupSchema creates the table and converts it to a TimescaleDB Hypertable
func (l *Logger) SetupSchema() error {
	// 1. Enable TimescaleDB extension (requires superuser, but safe to run IF NOT EXISTS)
	_, err := l.db.Exec(`CREATE EXTENSION IF NOT EXISTS timescaledb;`)
	if err != nil {
		log.Printf("Warning: Could not create timescaledb extension (you may need superuser rights). Proceeding anyway... Error: %v", err)
	}

	// 2. Create the standard PostgreSQL table
	// Note: We removed the standard SERIAL PRIMARY KEY. In TimescaleDB, if you want a UNIQUE or PRIMARY KEY,
	// it MUST include the partitioning column (timestamp). For pure logging, it's often better to omit it.
	createTableQuery := `
	CREATE TABLE IF NOT EXISTS app_activity_logs (
		focus_status VARCHAR(50),
		app_name VARCHAR(255),
		app_package VARCHAR(255),
		app_category VARCHAR(100),
		timestamp BIGINT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	_, err = l.db.Exec(createTableQuery)
	if err != nil {
		return fmt.Errorf("failed to create base table: %w", err)
	}

	// 3. Convert to TimescaleDB Hypertable
	// chunk_time_interval => 86400000 (milliseconds) = 1 Day chunks
	// if_not_exists => TRUE prevents errors if the application restarts
	createHypertableQuery := `
	SELECT create_hypertable(
		'app_activity_logs', 
		'timestamp', 
		chunk_time_interval => 86400000, 
		if_not_exists => TRUE
	);`

	_, err = l.db.Exec(createHypertableQuery)
	if err != nil {
		return fmt.Errorf("failed to create hypertable: %w", err)
	}

	log.Println("TimescaleDB hypertable setup completed successfully.")
	return nil
}

// InsertJSON parses the raw JSON string and inserts it into the database
func (l *Logger) InsertJSON(payload []byte) error {
	var data ActivityData

	// Parse the JSON
	err := json.Unmarshal(payload, &data)
	if err != nil {
		return fmt.Errorf("error parsing JSON: %w", err)
	}

	// Insert into PostgreSQL
	query := `
		INSERT INTO app_activity_logs (focus_status, app_name, app_package, app_category, timestamp)
		VALUES ($1, $2, $3, $4, $5);
	`

	_, err = l.db.Exec(query, data.FocusStatus, data.AppName, data.AppPackage, data.AppCategory, data.Timestamp)
	if err != nil {
		return fmt.Errorf("error inserting record: %w", err)
	}

	log.Printf("Successfully inserted log for: %s", data.AppName)
	return nil
}

// Close terminates the database connection
func (l *Logger) Close() error {
	return l.db.Close()
}
