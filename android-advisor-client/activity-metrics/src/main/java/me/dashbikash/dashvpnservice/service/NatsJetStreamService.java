package me.dashbikash.dashvpnservice.service;

import android.util.Log;

import io.nats.client.*;
import io.nats.client.api.PublishAck;
import io.nats.client.api.StreamConfiguration;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

public class NatsJetStreamService implements AutoCloseable {

    private Connection natsConnection;
    private JetStream jetStream;

    public NatsJetStreamService(String natsUrl) throws IOException, InterruptedException {
        // 1. Initialize Connection
        Options options = new Options.Builder()
                .server(natsUrl)
                .connectionListener((conn, type) -> System.out.println("Status: " + type))
                .build();

        this.natsConnection = Nats.connect(options);

        // 2. Initialize JetStream Context
        this.jetStream = natsConnection.jetStream();

    }

    /**
     * Ensures a stream exists for a specific subject.
     */
    public void setupStream(String streamName, String subject) throws IOException, JetStreamApiException {
        JetStreamManagement jsm = natsConnection.jetStreamManagement();

        StreamConfiguration streamConfig = StreamConfiguration.builder()
                .name(streamName)
                .subjects(subject)
                .build();

        try {
            jsm.getStreamInfo(streamName);
        } catch (JetStreamApiException e) {
            // If stream doesn't exist, create it
            jsm.addStream(streamConfig);
            System.out.println("Created stream: " + streamName);
        }
    }

    /**
     * Publishes a message to JetStream synchronously.
     */
    public void publish(String subject, String message) {
        try {
            PublishAck ack = jetStream.publish(subject, message.getBytes(StandardCharsets.UTF_8));
            Log.i("ForegroundLogger", String.format("Published to [%s], Stream: %s, Seq: %d%n",
                    subject, ack.getStream(), ack.getSeqno()));
        } catch (IOException | JetStreamApiException e) {
            Log.e("ForegroundLogger","Failed to publish message: " + e.getMessage());
        }
    }

    @Override
    public void close() throws Exception {
        if (natsConnection != null) {
            natsConnection.close();
        }
    }
}