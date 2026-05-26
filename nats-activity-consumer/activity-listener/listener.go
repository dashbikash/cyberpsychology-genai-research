package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"nats-activity-consumer/pkg/storage"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

func main() {
	logger, err := storage.NewLogStore("postgresql://postgres:password@localhost:5432/activitydb?sslmode=disable")
	if err != nil {
		log.Fatal(err)
	}
	defer logger.Close()

	err = logger.SetupSchema()
	if err != nil {
		log.Fatal(err)
	}

	// 1. Connect to NATS
	nc, err := nats.Connect(nats.DefaultURL)
	if err != nil {
		log.Fatal(err)
	}
	defer nc.Close()

	// 2. Initialize JetStream context
	js, err := jetstream.New(nc)
	if err != nil {
		log.Fatal(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	streamName := "activity-stream"
	subjects := []string{"activity.log"}

	// 3. Check if Stream exists, create if it doesn't
	_, err = js.Stream(ctx, streamName)
	if err != nil {
		if errors.Is(err, jetstream.ErrStreamNotFound) {
			fmt.Printf("Stream '%s' not found. Creating it now...\n", streamName)

			_, err = js.CreateStream(ctx, jetstream.StreamConfig{
				Name:     streamName,
				Subjects: subjects,
				// You can add other configs here like MaxAge, Storage type, etc.
			})

			if err != nil {
				log.Fatalf("Failed to create stream: %v", err)
			}
			fmt.Println("Stream created successfully.")
		} else {
			// Catch connection issues or other unexpected errors
			log.Fatalf("Error checking stream status: %v", err)
		}
	} else {
		fmt.Printf("Stream '%s' already exists. Proceeding...\n", streamName)
	}

	// 4. Create or Update Consumer (Subscribe)
	cons, err := js.CreateOrUpdateConsumer(ctx, streamName, jetstream.ConsumerConfig{
		Durable:       "activity-stream",
		AckPolicy:     jetstream.AckExplicitPolicy,
		FilterSubject: "activity.log",
	})
	if err != nil {
		log.Fatalf("Failed to create consumer: %v", err)
	}

	// 5. Start Consuming
	fmt.Println("Listening for messages...")
	consumeContext, err := cons.Consume(func(msg jetstream.Msg) {
		fmt.Printf("Received: %s\n", string(msg.Data()))

		err = logger.InsertJSON(msg.Data())
		if err != nil {
			log.Println("Failed to insert JSON:", err)
			msg.Nak()
			return // Stop processing this message
		}
		msg.Ack()
	})
	if err != nil {
		log.Fatal(err)
	}
	defer consumeContext.Stop()

	// Keep running
	select {}
}
