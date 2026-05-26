package me.dashbikash.dashvpnservice;

import android.accessibilityservice.AccessibilityService;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;

import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import me.dashbikash.dashvpnservice.service.NatsJetStreamService;

public class ForegroundLoggerService extends AccessibilityService {

    private static final String TAG = "ForegroundLogger";

    // Track package, name, and category of the current app
    private String currentForegroundAppPkg = null;
    private String currentForegroundAppName = null;
    private String currentForegroundAppCategory = null;

    // Use ScheduledExecutorService to run tasks periodically
    private final ScheduledExecutorService scheduledExecutor = Executors.newSingleThreadScheduledExecutor();

    // Guava Cache to hold logs. Set a maximum size to prevent memory leaks if NATS goes offline.
    private final Cache<String, JSONObject> logCache = CacheBuilder.newBuilder()
            .maximumSize(5000)
            .build();

    private NatsJetStreamService natsJetStreamService;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event != null && event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {

            if (event.getPackageName() != null) {
                PackageManager packageManager = getPackageManager();
                String newPackageName = event.getPackageName().toString();
                String newAppName;
                String newAppCategory = "Unknown";

                try {
                    ApplicationInfo appInfo = packageManager.getApplicationInfo(newPackageName, 0);
                    newAppName = packageManager.getApplicationLabel(appInfo).toString();

                    // Fetch category for Android 8.0 (API 26) and above
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        newAppCategory = getCategoryName(appInfo.category);
                    } else {
                        newAppCategory = "Unsupported (< API 26)";
                    }
                } catch (PackageManager.NameNotFoundException e) {
                    newAppName = "Unknown App";
                }

                if (!newPackageName.equals(currentForegroundAppPkg)) {
                    Long timestamp = Calendar.getInstance().getTimeInMillis();

                    // 1. Log when the PREVIOUS app loses focus
                    if (currentForegroundAppPkg != null) {
                        Log.d(TAG, "Focus Status: LOST | AppName: " + currentForegroundAppName +
                                " | Category: " + currentForegroundAppCategory +
                                " | App Package: " + currentForegroundAppPkg + " | Timestamp: " + timestamp);

                        try {
                            JSONObject jsonObject = new JSONObject();
                            jsonObject.put("focus_status", "LOST");
                            jsonObject.put("app_name", currentForegroundAppName);
                            jsonObject.put("app_package", currentForegroundAppPkg);
                            jsonObject.put("app_category", currentForegroundAppCategory);
                            jsonObject.put("timestamp", timestamp);

                            // Store in Guava Cache with a unique ID
                            logCache.put(UUID.randomUUID().toString(), jsonObject);
                        } catch (Exception e) {
                            Log.e(TAG, "Failed to create JSON object", e);
                        }
                    }

                    // 2. Update tracking variables to the NEW app
                    currentForegroundAppPkg = newPackageName;
                    currentForegroundAppName = newAppName;
                    currentForegroundAppCategory = newAppCategory;

                    // 3. Log when the NEW app gains focus
                    Log.d(TAG, "Focus STATUS: GAINED | AppName: " + currentForegroundAppName +
                            " | Category: " + currentForegroundAppCategory +
                            " | App Package: " + currentForegroundAppPkg + " | Timestamp: " + timestamp);

                    try {
                        JSONObject jsonObject = new JSONObject();
                        jsonObject.put("focus_status", "GAINED");
                        jsonObject.put("app_name", currentForegroundAppName);
                        jsonObject.put("app_package", currentForegroundAppPkg);
                        jsonObject.put("app_category", currentForegroundAppCategory);
                        jsonObject.put("timestamp", timestamp);

                        // Store in Guava Cache with a unique ID
                        logCache.put(UUID.randomUUID().toString(), jsonObject);
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to create JSON object", e);
                    }
                }
            }
        }
    }

    /**
     * Converts Android's ApplicationInfo.category integer to a readable string.
     */
    private String getCategoryName(int category) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            switch (category) {
                case ApplicationInfo.CATEGORY_AUDIO: return "Audio";
                case ApplicationInfo.CATEGORY_GAME: return "Game";
                case ApplicationInfo.CATEGORY_IMAGE: return "Image";
                case ApplicationInfo.CATEGORY_MAPS: return "Maps";
                case ApplicationInfo.CATEGORY_NEWS: return "News";
                case ApplicationInfo.CATEGORY_PRODUCTIVITY: return "Productivity";
                case ApplicationInfo.CATEGORY_SOCIAL: return "Social";
                case ApplicationInfo.CATEGORY_VIDEO: return "Video";
                case ApplicationInfo.CATEGORY_UNDEFINED: return "Undefined";
                default: return "Other (" + category + ")";
            }
        }
        return "Unknown";
    }

    /**
     * Extracts logs from the cache, attempts to publish them,
     * and clears successfully published logs.
     */
    private void pushLogsToNats() {
        if (natsJetStreamService == null || logCache.size() == 0) return;

        ConcurrentMap<String, JSONObject> logsMap = logCache.asMap();
        List<String> successfullyPublishedKeys = new ArrayList<>();

        for (Map.Entry<String, JSONObject> entry : logsMap.entrySet()) {
            try {
                // Attempt to publish
                natsJetStreamService.publish("activity.log", entry.getValue().toString());
                // If successful, mark this key for removal
                successfullyPublishedKeys.add(entry.getKey());
            } catch (Exception e) {
                Log.e(TAG, "Failed to publish log to NATS", e);
                // Break out of the loop if connection drops, saving remaining items in cache for the next run
                break;
            }
        }

        // Only clear the logs from the cache that were successfully published
        logCache.invalidateAll(successfullyPublishedKeys);
        Log.d(TAG, "Successfully published and cleared " + successfullyPublishedKeys.size() + " logs.");
    }

    @Override
    protected void onServiceConnected() {
        // Connect to NATS
        scheduledExecutor.execute(() -> {
            try {
                natsJetStreamService = new NatsJetStreamService("nats://192.168.29.40:4222");
                natsJetStreamService.setupStream("activity-stream", "activity.log");
                Log.d(TAG, "NATS Connected Successfully");
            } catch (Exception e) {
                Log.e(TAG, "NATS Connection Failed", e);
            }
        });

        // Schedule the cache push every 10 seconds
        scheduledExecutor.scheduleWithFixedDelay(this::pushLogsToNats, 10, 10, TimeUnit.SECONDS);
    }

    @Override
    public void onInterrupt() {
        Log.w(TAG, "Service Interrupted");
        try {
            if (natsJetStreamService != null) natsJetStreamService.close();
        } catch (Exception e) {
            Log.e(TAG, "Error closing NATS on interrupt", e);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        scheduledExecutor.shutdown();
        try {
            if (natsJetStreamService != null) natsJetStreamService.close();
        } catch (Exception e) {
            Log.e(TAG, "Error closing NATS on destroy", e);
        }
    }
}