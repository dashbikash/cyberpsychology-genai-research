package me.dashbikash.dashvpnservice;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.bottomnavigation.BottomNavigationView;

public class LaunchPadActivity extends AppCompatActivity {

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.layout_lunchpad);

        // 1. Initialize the WebView
        webView = findViewById(R.id.webviewLaunchpad);
        BottomNavigationView bottomNav = findViewById(R.id.bottom_navigation);

        bottomNav.setOnItemSelectedListener(item -> {
            int itemId = item.getItemId();

            if (itemId == R.id.nav_home) {
                // Load the local index.html from the assets folder
                webView.loadUrl("file:///android_asset/webviews/dist/index.html");
                return true;

            } else if (itemId == R.id.nav_chat) {
                // Do something when Chat is clicked
                webView.loadUrl("https://duck.ai/");
                return true;

            } else if (itemId == R.id.nav_settings) {
                // Do something when Profile is clicked
                startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));
                //startActivity(new Intent(LaunchPadActivity.this, MainActivity.class));
                return true;
            }

            return false;
        });

        WebSettings webSettings = webView.getSettings();

        // 1. Enable JavaScript (Crucial for React)
        webSettings.setJavaScriptEnabled(true);

        // 2. Enable DOM Storage (React uses this for state/caching)
        webSettings.setDomStorageEnabled(true);

        // 3. Allow loading local CSS/JS files from the assets folder
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowFileAccessFromFileURLs(true);
        webSettings.setAllowUniversalAccessFromFileURLs(true);

        // 3. Force links and redirects to open in the WebView instead of the device browser
        webView.setWebViewClient(new WebViewClient());
        webView.addJavascriptInterface(new WebAppInterface(this),"Android");

        // 4. Load the desired URL
        //webView.loadUrl("https://www.google.com");

        // Load the local index.html from the assets folder
        webView.loadUrl("file:///android_asset/webviews/dist/index.html");

    }

    // 1. Create the Bridge Class
    public class WebAppInterface {
        Context mContext;

        // Instantiate the interface and set the context
        WebAppInterface(Context c) {
            mContext = c;
        }

        // 2. Add the annotation to expose this method to HTML/JS
        @JavascriptInterface
        public void showAndroidToast(String message) {
            // Show a native Android Toast triggered by the web page
            Toast.makeText(mContext, message, Toast.LENGTH_SHORT).show();
        }

        @JavascriptInterface
        public void sendDataToAndroid(String data) {
            // VERY IMPORTANT: JS Interface methods run on a background thread.
            // If you want to update the Android UI based on a web event,
            // you MUST use runOnUiThread.
            runOnUiThread(() -> {
                // Update native Android UI elements here (e.g., TextViews)
                // myTextView.setText(data);
            });
        }
    }

}