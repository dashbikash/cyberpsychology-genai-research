import os
import glob
import psycopg2

# ==========================================
# Configuration: Update these with your info
# ==========================================
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "context-db"
DB_USER = "postgres"
DB_PASSWORD = "password"

# Directory where your 15 CSV files are stored
CSV_DIRECTORY = "./activity_logs" 
TABLE_NAME = "app_activity_logs"

def create_table_if_not_exists(cursor):
    # Create the base table
    create_table_query = f"""
    CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
        id SERIAL,
        timestamp BIGINT NOT NULL,
        app_name VARCHAR(255),
        app_package VARCHAR(255),
        app_category VARCHAR(100),
        focus_type VARCHAR(50),
        PRIMARY KEY (id, timestamp)
    );
    """
    cursor.execute(create_table_query)
    
    # Convert to hypertable
    hypertable_query = f"""
    SELECT create_hypertable('{TABLE_NAME}', 'timestamp', chunk_time_interval => 86400000, if_not_exists => TRUE);
    """
    cursor.execute(hypertable_query)
    print(f"Ensured hypertable '{TABLE_NAME}' exists.")

def import_csvs_to_postgres():
    try:
        # 1. Connect to your PostgreSQL database
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        conn.autocommit = False # We'll commit after all files are successfully loaded
        cursor = conn.cursor()
        print("Successfully connected to PostgreSQL.")

        # 2. Create the table
        create_table_if_not_exists(cursor)

        # 3. Find all CSV files in the directory
        # Adjust the pattern if your files have a specific naming convention
        search_pattern = os.path.join(CSV_DIRECTORY, "*.csv")
        csv_files = glob.glob(search_pattern)
        
        if not csv_files:
            print(f"No CSV files found in {CSV_DIRECTORY}")
            return

        print(f"Found {len(csv_files)} CSV files to import.")

        # 4. Import each file using the highly efficient COPY command
        for file_path in csv_files:
            print(f"Importing {os.path.basename(file_path)}...")
            with open(file_path, 'r', encoding='utf-8') as f:
                # The COPY command maps the CSV columns directly to the table columns
                # We skip the 'id' column since it's a SERIAL primary key
                copy_query = f"""
                COPY {TABLE_NAME} (timestamp, app_name, app_package, app_category, focus_type) 
                FROM STDIN WITH CSV HEADER;
                """
                cursor.copy_expert(sql=copy_query, file=f)

        # 5. Commit the transaction
        conn.commit()
        print(f"Successfully imported all {len(csv_files)} files into '{TABLE_NAME}'.")

    except psycopg2.Error as e:
        print(f"Database error occurred: {e}")
        if 'conn' in locals() and conn:
            conn.rollback() # Rollback on error to prevent partial imports
            print("Transaction rolled back.")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        # 6. Close the connection
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()
            print("Database connection closed.")

if __name__ == "__main__":
    import_csvs_to_postgres()
