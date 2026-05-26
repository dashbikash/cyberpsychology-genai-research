package me.dashbikash.dashvpnservice;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.health.connect.datatypes.AppInfo;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.widget.Button;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.google.android.material.switchmaterial.SwitchMaterial;

import java.util.List;

import me.dashbikash.dashvpnservice.security.HashUtil;

public class MainActivity extends AppCompatActivity {

    private final Context context=this;
    private static final int VPN_REQUEST_CODE = 100;



    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        // Get the support action bar
        ActionBar actionBar = getSupportActionBar();
        if (actionBar != null) {
            // Enable the Up button
            actionBar.setDisplayHomeAsUpEnabled(true);
        }
        getLaunchableAppsWithCategory();
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });
        String devID= null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            devID = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
        }
        ((TextView)findViewById(R.id.tvDevID)).setText("Device ID: "+ HashUtil.hashAndroidId(devID));

        findViewById(R.id.btnAccessMain).setOnClickListener(view -> {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            startActivity(intent);
        });


    }
    // 1. Register the launcher as a class variable
    public void getLaunchableAppsWithCategory() {
        PackageManager pm = getPackageManager();

        // Create an intent to find only apps that show up in the app drawer
        Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
        mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);

        // Handle Android 13+ (API 33) deprecations
        List<ResolveInfo> resolvedInfos;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            resolvedInfos = pm.queryIntentActivities(mainIntent, PackageManager.ResolveInfoFlags.of(0));
        } else {
            resolvedInfos = pm.queryIntentActivities(mainIntent, 0);
        }

        for (ResolveInfo resolveInfo : resolvedInfos) {
            // Extract the ApplicationInfo from the resolved launcher activity
            ApplicationInfo appInfo = resolveInfo.activityInfo.applicationInfo;

            // 1. Get Title (App Name)
            String title = appInfo.loadLabel(pm).toString();

            // 2. Get Package Name
            String packageName = appInfo.packageName;

            // 3. Get Category (Only available on Android 8.0 / API 26 and above)
            String categoryName = "Unknown (Pre-Android 8.0)";
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                int categoryCode = appInfo.category;
                categoryName = getCategoryName(categoryCode);
            }

            Log.d("LaunchableApp", "Title: " + title +
                    " | Package: " + packageName +
                    " | Category: " + categoryName);
        }
    }

    // Helper method to translate the category integer into a readable string
    private String getCategoryName(int categoryCode) {
        switch (categoryCode) {
            case ApplicationInfo.CATEGORY_GAME: return "Game";
            case ApplicationInfo.CATEGORY_AUDIO: return "Audio";
            case ApplicationInfo.CATEGORY_VIDEO: return "Video";
            case ApplicationInfo.CATEGORY_IMAGE: return "Image";
            case ApplicationInfo.CATEGORY_SOCIAL: return "Social";
            case ApplicationInfo.CATEGORY_NEWS: return "News";
            case ApplicationInfo.CATEGORY_MAPS: return "Maps";
            case ApplicationInfo.CATEGORY_PRODUCTIVITY: return "Productivity";
            case ApplicationInfo.CATEGORY_ACCESSIBILITY: return "Accessibility"; // CATEGORY_ACCESSIBILITY (Added in API 31)
            case ApplicationInfo.CATEGORY_UNDEFINED:
            default: return "Undefined";
        }
    }

}