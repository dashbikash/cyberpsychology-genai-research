package me.dashbikash.dashvpnservice;

import android.util.Log;

import androidx.annotation.NonNull;

import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class AppUsageMetricService {

    private final Object metricsLock = new Object();
    private Cache<String, AtomicInteger> appUsage;
    private ScheduledExecutorService metricsScheduler;
    private final String userId;

    public AppUsageMetricService(String userId) {
        this.userId = userId;
        this.appUsage = createNewCache();
    }

    private Cache<String, AtomicInteger> createNewCache() {
        return CacheBuilder.newBuilder()
                .maximumSize(10000) // Drops oldest IPs if count exceeds 10k to prevent OOM
                .expireAfterAccess(5, TimeUnit.MINUTES)
                .build();
    }

    public void start() {
        if (metricsScheduler != null && !metricsScheduler.isShutdown()) {
            return;
        }
        metricsScheduler = Executors.newSingleThreadScheduledExecutor();
        // Schedule to run every 5 seconds
        metricsScheduler.scheduleWithFixedDelay(this::sendMetricsAndClear, 1, 5, TimeUnit.SECONDS);
    }

    public void stop() {
        if (metricsScheduler != null && !metricsScheduler.isShutdown()) {
            metricsScheduler.shutdownNow();
        }
    }

    public void recordAppUsage(String packageName) {
        if (packageName == null || packageName.trim().isEmpty()) return;

        synchronized (metricsLock) {
            try {
                appUsage.get(packageName, () -> new AtomicInteger(0)).incrementAndGet();
            } catch (Exception e) {
                Log.e(Constants.TAG, "Failed to increment IP cache", e);
            }
        }
    }

    private void sendMetricsAndClear() {
        Cache<String, AtomicInteger> snapshot;

        // 1. Swap the Guava cache quickly to prevent packet loss
        synchronized (metricsLock) {
            if (appUsage.size() == 0) return;
            snapshot = appUsage;
            appUsage = createNewCache(); // Fresh cache for incoming packets
        }

        try {
            JSONObject jsonBody = new JSONObject();
            JSONArray recordsArray = new JSONArray();
            long currentTimestamp = System.currentTimeMillis();

            for (Map.Entry<String, AtomicInteger> entry : snapshot.asMap().entrySet()) {
                String packageName = entry.getKey();
                int packetCount = entry.getValue().get();
                JSONObject recordObj = getJsonObject(packageName, packetCount, currentTimestamp);
                recordsArray.put(recordObj);
            }

            jsonBody.put("records", recordsArray);
            Log.d(Constants.TAG, jsonBody.toString());

            // 3. Send via Background Thread
            Thread publishThread = new Thread(() -> {
                try {
                    if (KafkaBridgeService.produceMessage(jsonBody.toString())) {
                        synchronized (metricsLock) {
                            snapshot.invalidateAll();
                            snapshot.cleanUp();
                        }
                    }
                } catch (Exception e) {
                    Log.e(Constants.TAG, "Error publishing message to KafkaBridge", e);
                }
            });
            publishThread.start();

        } catch (Exception e) {
            Log.e(Constants.TAG, "Error building or sending IP metrics", e);
        }
    }

    @NonNull
    private JSONObject getJsonObject(String packageName, int packetCount, long currentTimestamp) throws JSONException {
        JSONObject valueObj = new JSONObject();
        valueObj.put("package_name", packageName );
        valueObj.put("user", this.userId);
        valueObj.put("direction", "in");
        valueObj.put("count", packetCount);
        valueObj.put("timestamp", currentTimestamp);

        // The Kafka Record wrapper
        JSONObject recordObj = new JSONObject();
        recordObj.put("key", UUID.randomUUID().toString()); // Using UUID as partition key
        recordObj.put("value", valueObj);
        return recordObj;
    }
}