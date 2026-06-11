package in.tolee.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Log;
import android.view.View;
import android.view.ViewTreeObserver;
import android.webkit.CookieManager;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.PermissionRequest;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;
import com.google.firebase.messaging.FirebaseMessaging;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "ToleeMainActivity";
    private static final int RC_SIGN_IN = 9001;
    private static final int PERMISSION_REQUEST_CODE = 1001;
    // File chooser request code for <input type="file"> in WebView
    private static final int RC_FILE_CHOOSER = 1002;
    private boolean isReady = false;

    // Holds the pending file upload callback from WebChromeClient.onShowFileChooser
    private ValueCallback<Uri[]> mFilePathCallback;

    // Handler and Runnable for scheduled cache clearing every 10 minutes
    private final android.os.Handler mCacheClearHandler = new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable mCacheClearRunnable = new Runnable() {
        @Override
        public void run() {
            try {
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    Log.d(TAG, "Scheduled Cache Clear: Auto-clearing WebView cache to fetch latest web assets...");
                    webView.clearCache(true);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error during scheduled WebView cache clear", e);
            }
            mCacheClearHandler.postDelayed(this, 10 * 60 * 1000); // Repeat every 10 minutes
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);

        createNotificationChannel();
        autoRequestPermissions();
        checkOverlayPermission();
        requestIgnoreBatteryOptimizations();

        final View content = findViewById(android.R.id.content);
        content.getViewTreeObserver().addOnPreDrawListener(
                new ViewTreeObserver.OnPreDrawListener() {
                    @Override
                    public boolean onPreDraw() {
                        if (isReady) {
                            content.getViewTreeObserver().removeOnPreDrawListener(this);
                            return true;
                        } else {
                            return false;
                        }
                    }
                }
        );

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            setupWebView(webView);
            syncFCMToken();
            handleIntent(getIntent());

            // Start the periodic 10-minute cache clearing timer
            mCacheClearHandler.postDelayed(mCacheClearRunnable, 10 * 60 * 1000);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent != null) {
            if (intent.hasExtra("acceptCallId")) {
                String callId = intent.getStringExtra("acceptCallId");
                Intent callIntent = new Intent(this, CallActivity.class);
                callIntent.putExtra("callId", callId);
                callIntent.putExtra("receiverId", intent.getStringExtra("receiverId"));
                startActivity(callIntent);
                return;
            }

            if (intent.hasExtra("url")) {
                String url = intent.getStringExtra("url");
                if (url != null) {
                    runOnUiThread(() -> {
                        WebView webView = getBridge().getWebView();
                        if (webView != null) {
                            webView.evaluateJavascript("if(window.ToleeNavigate){ window.ToleeNavigate('" + url + "'); } else { window.location.href='" + url + "'; }", null);
                        }
                    });
                }
            }
        }
    }

    private void checkOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                Log.d(TAG, "Overlay permission not granted. Requesting...");
                // Note: We don't force the user here, but background calls need this on many devices
                // Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName()));
                // startActivity(intent);
            }
        }
    }

    private void autoRequestPermissions() {
        List<String> permissions = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.POST_NOTIFICATIONS);
            }
            // Android 13+ uses READ_MEDIA_IMAGES instead of READ_EXTERNAL_STORAGE for gallery
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.READ_MEDIA_IMAGES);
            }
        } else {
            // Android 12 and below
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            }
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }
        
        // Add Camera and Audio recording permissions
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.CAMERA);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.RECORD_AUDIO);
        }

        if (!permissions.isEmpty()) {
            ActivityCompat.requestPermissions(this, permissions.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        }
    }

    private void requestIgnoreBatteryOptimizations() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                // We don't force it, but background calls might fail without this
                Log.d(TAG, "Battery optimization is active. Background calls might be delayed.");
            }
        }
    }

    private void setupWebView(WebView webView) {
        // Clear WebView cache on startup to guarantee fetching fresh live web assets
        Log.d(TAG, "Clearing WebView cache on startup to ensure latest live assets...");
        webView.clearCache(true);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        String customUserAgent = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36";
        settings.setUserAgentString(customUserAgent);

        // MIXED_CONTENT_COMPATIBILITY_MODE: Allows passive mixed content (images/media from HTTP on HTTPS)
        // but blocks active mixed content (scripts, iframes). Safe default for production apps.
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        ToleeNativeBridge bridge = new ToleeNativeBridge();
        webView.addJavascriptInterface(bridge, "ToleeNative");
        webView.addJavascriptInterface(bridge, "AndroidBridge");
        webView.addJavascriptInterface(bridge, "AndroidGoogleAuth");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                isReady = true;
                CookieManager.getInstance().flush();
                syncFCMToken();
                updateSocketUrl(url);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                String host = request.getUrl().getHost();
                if (host != null && (host.equals("tolee.in") || host.endsWith(".tolee.in") || host.contains("google.com") || host.contains("firebaseapp.com"))) {
                    return false;
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception e) {}
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    isReady = true;
                    String offlinePage = "<html><head><meta name='viewport' content='width=device-width, initial-scale=1'><style>body{background:#0f172a;color:#fff;text-align:center;padding-top:20%;font-family:sans-serif;}button{background:#3b82f6;color:#fff;border:none;padding:10px 20px;border-radius:5px;}</style></head><body><h1>No Internet</h1><button onclick='location.reload()'>Retry</button></body></html>";
                    view.loadDataWithBaseURL("https://tolee.in", offlinePage, "text/html", "UTF-8", null);
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        request.grant(request.getResources());
                    }
                });
            }

            /**
             * CRITICAL: Without this override, <input type="file"> does NOTHING in a WebView.
             * This method is called whenever the web page tries to open a file picker.
             * We launch a gallery + document chooser intent and return the result via the callback.
             */
            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {

                // Cancel any previous pending callback to avoid memory leaks
                if (mFilePathCallback != null) {
                    mFilePathCallback.onReceiveValue(null);
                    mFilePathCallback = null;
                }
                mFilePathCallback = filePathCallback;

                // Build an image-picker intent (gallery + files)
                Intent galleryIntent = new Intent(Intent.ACTION_GET_CONTENT);
                galleryIntent.addCategory(Intent.CATEGORY_OPENABLE);
                galleryIntent.setType("image/*");

                // Allow choosing from camera as well via a chooser
                Intent chooserIntent = Intent.createChooser(galleryIntent, "Select Image");

                try {
                    startActivityForResult(chooserIntent, RC_FILE_CHOOSER);
                } catch (android.content.ActivityNotFoundException e) {
                    mFilePathCallback = null;
                    Log.e(TAG, "No activity found to handle file chooser", e);
                    return false;
                }
                return true;
            }
        });
    }

    private void updateSocketUrl(String webUrl) {
        if (webUrl == null) return;
        try {
            Uri uri = Uri.parse(webUrl);
            String host = uri.getHost();
            if (host != null) {
                String socketUrl;
                if (host.equals("localhost") || 
                    host.equals("127.0.0.1") || 
                    host.startsWith("192.168.") || 
                    host.startsWith("10.") || 
                    host.startsWith("172.")) {
                    socketUrl = "http://" + host + ":4000";
                } else {
                    socketUrl = "https://tolee2.onrender.com";
                }
                
                android.content.SharedPreferences prefs = getSharedPreferences("tolee_prefs", MODE_PRIVATE);
                prefs.edit().putString("socket_url", socketUrl).apply();
                Log.d(TAG, "Resolved and saved socket URL to Prefs: " + socketUrl);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error updating socket URL", e);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;

            // 1. Call Notifications Channel (Like WhatsApp "Call notifications")
            NotificationChannel callChannel = new NotificationChannel(
                    "tolee_calls_channel_v5",
                    "Call Notifications",
                    NotificationManager.IMPORTANCE_HIGH
            );
            callChannel.setDescription("Incoming audio and video calls");
            callChannel.enableVibration(true);
            callChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            callChannel.setBypassDnd(true);
            // Set ringtone
            Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .build();
            callChannel.setSound(ringtoneUri, audioAttributes);
            manager.createNotificationChannel(callChannel);

            // 2. Critical App Alerts (Like WhatsApp "Critical app alerts")
            NotificationChannel criticalChannel = new NotificationChannel(
                    "critical_alerts",
                    "Critical App Alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            criticalChannel.setDescription("Important security and account alerts");
            criticalChannel.enableVibration(true);
            manager.createNotificationChannel(criticalChannel);

            // 3. Message Notifications (Like WhatsApp "Chat notifications")
            NotificationChannel msgChannel = new NotificationChannel(
                    "messages",
                    "Message Notifications",
                    NotificationManager.IMPORTANCE_HIGH
            );
            msgChannel.setDescription("New messages and chat updates");
            msgChannel.enableVibration(true);
            manager.createNotificationChannel(msgChannel);

            // 4. Group Notifications (Like WhatsApp "Group notifications")
            NotificationChannel groupChannel = new NotificationChannel(
                    "groups",
                    "Group Notifications",
                    NotificationManager.IMPORTANCE_HIGH
            );
            groupChannel.setDescription("Group messages and mentions");
            groupChannel.enableVibration(true);
            manager.createNotificationChannel(groupChannel);

            // 5. Other Notifications (Like WhatsApp "Other notifications")
            NotificationChannel otherChannel = new NotificationChannel(
                    "other_notifications",
                    "Other Notifications",
                    NotificationManager.IMPORTANCE_LOW
            );
            otherChannel.setDescription("Friend requests, likes, comments and other updates");
            manager.createNotificationChannel(otherChannel);

            // 6. Silent Notifications (Like WhatsApp "Silent notifications")
            NotificationChannel silentChannel = new NotificationChannel(
                    "silent_notifications",
                    "Silent Notifications",
                    NotificationManager.IMPORTANCE_MIN
            );
            silentChannel.setDescription("Silent system syncs and logs");
            silentChannel.setSound(null, null);
            manager.createNotificationChannel(silentChannel);
        }
    }

    private void syncFCMToken() {
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                String token = task.getResult();
                Log.d(TAG, "FCM Token: " + token);
                runOnUiThread(() -> {
                    WebView webView = getBridge().getWebView();
                    if (webView != null) {
                        String js = "if(window.onFCMTokenReceived){window.onFCMTokenReceived('" + token + "');}" +
                                   "if(window.onPushRegistration){window.onPushRegistration('" + token + "');}" +
                                   "if(window.onFCMTokenRefresh){window.onFCMTokenRefresh('" + token + "');}";
                        webView.evaluateJavascript(js, null);
                    }
                });
            }
        });
    }

    public class ToleeNativeBridge {
        @android.webkit.JavascriptInterface
        public void startGoogleSignIn() {
            runOnUiThread(MainActivity.this::triggerNativeGoogleSignIn);
        }

        @android.webkit.JavascriptInterface
        public void getFCMToken() {
            syncFCMToken();
        }
        
        @android.webkit.JavascriptInterface
        public void requestBatteryOptimization() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Intent intent = new Intent();
                    intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(intent);
                }
            });
        }
    }

    private void triggerNativeGoogleSignIn() {
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(getString(R.string.google_oauth_client_id))
                .requestEmail()
                .build();
        GoogleSignInClient client = GoogleSignIn.getClient(this, gso);
        client.signOut().addOnCompleteListener(this, task -> {
            startActivityForResult(client.getSignInIntent(), RC_SIGN_IN);
        });
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        // Handle file chooser result for <input type="file"> in WebView
        if (requestCode == RC_FILE_CHOOSER) {
            if (mFilePathCallback == null) return;
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null) {
                String dataString = data.getDataString();
                if (dataString != null) {
                    results = new Uri[]{ Uri.parse(dataString) };
                } else if (data.getClipData() != null) {
                    // Multi-select support
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                }
            }
            // Pass result back to WebView (null cancels the file input)
            mFilePathCallback.onReceiveValue(results);
            mFilePathCallback = null;
            return;
        }

        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == RC_SIGN_IN) {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                GoogleSignInAccount account = task.getResult(ApiException.class);
                String idToken = account.getIdToken();
                runOnUiThread(() -> {
                    WebView webView = getBridge().getWebView();
                    if (webView != null) webView.evaluateJavascript("if(window.onGoogleSignInSuccess){window.onGoogleSignInSuccess('" + idToken + "');}", null);
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    WebView webView = getBridge().getWebView();
                    if (webView != null) webView.evaluateJavascript("if(window.onGoogleSignInFailure){window.onGoogleSignInFailure('" + e.getMessage() + "');}", null);
                });
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            try {
                JSONObject results = new JSONObject();
                for (int i = 0; i < permissions.length; i++) {
                    results.put(permissions[i], grantResults[i] == PackageManager.PERMISSION_GRANTED);
                }
                runOnUiThread(() -> {
                    WebView webView = getBridge().getWebView();
                    if (webView != null) webView.evaluateJavascript("if(window.onPermissionsResult){window.onPermissionsResult(" + results.toString() + ");}", null);
                });
            } catch (Exception e) {}
            syncFCMToken();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers();
            CookieManager.getInstance().flush();
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.onPause();
            webView.pauseTimers();
            CookieManager.getInstance().flush();
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        // Remove scheduled callbacks to prevent memory leaks
        mCacheClearHandler.removeCallbacks(mCacheClearRunnable);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
    }
}
