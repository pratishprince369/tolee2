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
import android.webkit.WebResourceResponse;
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

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import android.database.Cursor;
import android.webkit.JavascriptInterface;

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

    private static class FolderInfo {
        String name;
        String coverUri;
        int count;
        FolderInfo(String name, String coverUri) {
            this.name = name;
            this.coverUri = coverUri;
            this.count = 0;
        }
    }

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

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (url != null && "local.tolee.in".equals(url.getHost())) {
                    String path = url.getPath();
                    String mediaUriStr = url.getQueryParameter("uri");
                    
                    if (mediaUriStr != null) {
                        try {
                            Uri mediaUri = Uri.parse(mediaUriStr);
                            
                            if ("/file".equals(path)) {
                                String mimeType = getContentResolver().getType(mediaUri);
                                if (mimeType == null) {
                                    mimeType = "image/*";
                                }
                                java.io.InputStream stream = getContentResolver().openInputStream(mediaUri);
                                return new WebResourceResponse(mimeType, "UTF-8", stream);
                            } 
                            
                            else if ("/thumbnail".equals(path)) {
                                java.io.InputStream stream = getMediaThumbnailStream(mediaUri);
                                if (stream != null) {
                                    return new WebResourceResponse("image/jpeg", "UTF-8", stream);
                                }
                            }
                        } catch (Exception e) {
                            Log.e(TAG, "Error serving local intercept request: " + url.toString(), e);
                        }
                    }
                }
                return super.shouldInterceptRequest(view, request);
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

                // Detect if the file chooser requests only image or video
                String[] acceptTypes = fileChooserParams.getAcceptTypes();
                boolean isVideoOnly = false;
                boolean isImageOnly = false;
                boolean isOther = false;
                
                if (acceptTypes == null || acceptTypes.length == 0 || (acceptTypes.length == 1 && acceptTypes[0].isEmpty())) {
                    isOther = true;
                } else {
                    for (String type : acceptTypes) {
                        if (type != null) {
                            String trimmed = type.trim().toLowerCase();
                            if (trimmed.contains("video")) {
                                isVideoOnly = true;
                            } else if (trimmed.contains("image")) {
                                isImageOnly = true;
                            } else {
                                isOther = true;
                            }
                        }
                    }
                }
                
                // If it is a generic file chooser (like */* for chat attachments), use native system chooser directly
                if (isOther && !isImageOnly && !isVideoOnly) {
                    Intent galleryIntent = new Intent(Intent.ACTION_GET_CONTENT);
                    galleryIntent.addCategory(Intent.CATEGORY_OPENABLE);
                    galleryIntent.setType("*/*");
                    Intent chooserIntent = Intent.createChooser(galleryIntent, "Select File");
                    try {
                        startActivityForResult(chooserIntent, RC_FILE_CHOOSER);
                    } catch (Exception e) {
                        mFilePathCallback = null;
                        return false;
                    }
                    return true;
                }

                final String pickMode = isVideoOnly ? "videos" : (isImageOnly ? "photos" : "all");
                final boolean multiple = fileChooserParams.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE;

                runOnUiThread(() -> {
                    String js = "if(window.showInstagramMediaPicker){window.showInstagramMediaPicker('" + pickMode + "', " + multiple + ");} else { if(window.AndroidBridge && window.AndroidBridge.fallbackToFileChooser){ window.AndroidBridge.fallbackToFileChooser(); } }";
                    webView.evaluateJavascript(js, null);
                });
                return true;
            }
        });
    }

    private java.io.InputStream getMediaThumbnailStream(Uri uri) {
        try {
            android.graphics.Bitmap bitmap = null;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                try {
                    bitmap = getContentResolver().loadThumbnail(
                        uri, 
                        new android.util.Size(256, 256), 
                        null
                    );
                } catch (Exception e) {
                    Log.w(TAG, "loadThumbnail failed, trying alternative for " + uri, e);
                }
            }
            
            if (bitmap == null) {
                String path = getRealPathFromURI(uri);
                if (path != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        bitmap = android.media.ThumbnailUtils.createVideoThumbnail(
                            new java.io.File(path), 
                            new android.util.Size(256, 256), 
                            null
                        );
                    } else {
                        bitmap = android.media.ThumbnailUtils.createVideoThumbnail(
                            path, 
                            MediaStore.Video.Thumbnails.MINI_KIND
                        );
                    }
                }
            }
            
            if (bitmap != null) {
                java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
                bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 75, bos);
                byte[] bitmapData = bos.toByteArray();
                return new java.io.ByteArrayInputStream(bitmapData);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error generating thumbnail for " + uri, e);
        }
        return null;
    }

    private String getRealPathFromURI(Uri contentUri) {
        String[] proj = { MediaStore.Video.Media.DATA };
        Cursor cursor = null;
        try {
            cursor = getContentResolver().query(contentUri, proj, null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                int column_index = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DATA);
                return cursor.getString(column_index);
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not resolve real path from URI " + contentUri, e);
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
        return null;
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
            Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .build();
            callChannel.setSound(ringtoneUri, audioAttributes);
            manager.createNotificationChannel(callChannel);

            // 2. Tolee Messages (Direct Chats)
            NotificationChannel msgChannel = new NotificationChannel(
                    "messages",
                    "Tolee Messages",
                    NotificationManager.IMPORTANCE_HIGH
            );
            msgChannel.setDescription("Direct chat messages");
            msgChannel.enableVibration(true);
            msgChannel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build());
            manager.createNotificationChannel(msgChannel);

            // 3. Tolee Messages (Group Chats)
            NotificationChannel groupChannel = new NotificationChannel(
                    "groups",
                    "Tolee Messages",
                    NotificationManager.IMPORTANCE_HIGH
            );
            groupChannel.setDescription("Group updates and mentions");
            groupChannel.enableVibration(true);
            groupChannel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build());
            manager.createNotificationChannel(groupChannel);

            // 4. Tolee Activity (Social activity like likes, comments, follows)
            NotificationChannel socialChannel = new NotificationChannel(
                    "social",
                    "Tolee Activity",
                    NotificationManager.IMPORTANCE_HIGH
            );
            socialChannel.setDescription("Likes, comments, follows, and other updates");
            socialChannel.enableVibration(true);
            socialChannel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build());
            manager.createNotificationChannel(socialChannel);

            // 5. Tolee Activity (Marketplace listings)
            NotificationChannel marketplaceChannel = new NotificationChannel(
                    "marketplace",
                    "Tolee Activity",
                    NotificationManager.IMPORTANCE_HIGH
            );
            marketplaceChannel.setDescription("Marketplace alerts and product inquiries");
            marketplaceChannel.enableVibration(true);
            marketplaceChannel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build());
            manager.createNotificationChannel(marketplaceChannel);

            // 6. Tolee Alerts (General Alerts & default fallback)
            NotificationChannel defaultChannel = new NotificationChannel(
                    "default",
                    "Tolee Alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            defaultChannel.setDescription("General alerts and system updates");
            defaultChannel.enableVibration(true);
            defaultChannel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build());
            manager.createNotificationChannel(defaultChannel);

            // 7. Tolee Alerts (Promotions & Shoots)
            NotificationChannel promotionsChannel = new NotificationChannel(
                    "promotions",
                    "Tolee Alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            promotionsChannel.setDescription("Special offers and regional shoots");
            promotionsChannel.enableVibration(true);
            promotionsChannel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build());
            manager.createNotificationChannel(promotionsChannel);

            // 8. Tolee Alerts (Critical Alerts)
            NotificationChannel criticalChannel = new NotificationChannel(
                    "critical_alerts",
                    "Tolee Alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            criticalChannel.setDescription("Important security and account alerts");
            criticalChannel.enableVibration(true);
            criticalChannel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build());
            manager.createNotificationChannel(criticalChannel);

            // 9. Other Notifications (Old channel mapping to Tolee Alerts)
            NotificationChannel otherChannel = new NotificationChannel(
                    "other_notifications",
                    "Tolee Alerts",
                    NotificationManager.IMPORTANCE_LOW
            );
            otherChannel.setDescription("Other updates and general logs");
            manager.createNotificationChannel(otherChannel);

            // 10. Silent Notifications (For system syncing tasks)
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

        @android.webkit.JavascriptInterface
        public void openAppSettings() {
            runOnUiThread(() -> {
                Intent intent = new Intent();
                intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + getPackageName()));
                startActivity(intent);
            });
        }

        @android.webkit.JavascriptInterface
        public void openNotificationSettings() {
            runOnUiThread(() -> {
                Intent intent = new Intent();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                    intent.putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
                } else {
                    intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                }
                startActivity(intent);
            });
        }

        @android.webkit.JavascriptInterface
        public void openChannelSettings(String channelId) {
            runOnUiThread(() -> {
                Intent intent = new Intent();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    intent.setAction(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS);
                    intent.putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
                    intent.putExtra(Settings.EXTRA_CHANNEL_ID, channelId);
                } else {
                    intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                }
                startActivity(intent);
            });
        }

        @android.webkit.JavascriptInterface
        public boolean hasMediaPermissions() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                boolean hasImages = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.READ_MEDIA_IMAGES) == PackageManager.PERMISSION_GRANTED;
                boolean hasVideos = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.READ_MEDIA_VIDEO) == PackageManager.PERMISSION_GRANTED;
                boolean hasPartial = false;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    hasPartial = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED) == PackageManager.PERMISSION_GRANTED;
                }
                return hasImages || hasVideos || hasPartial;
            } else {
                return ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
            }
        }

        @android.webkit.JavascriptInterface
        public void requestMediaPermissions() {
            runOnUiThread(() -> {
                List<String> permissions = new ArrayList<>();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    permissions.add(Manifest.permission.READ_MEDIA_IMAGES);
                    permissions.add(Manifest.permission.READ_MEDIA_VIDEO);
                    permissions.add(Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED);
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    permissions.add(Manifest.permission.READ_MEDIA_IMAGES);
                    permissions.add(Manifest.permission.READ_MEDIA_VIDEO);
                } else {
                    permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE);
                }
                ActivityCompat.requestPermissions(MainActivity.this, permissions.toArray(new String[0]), PERMISSION_REQUEST_CODE);
            });
        }

        @android.webkit.JavascriptInterface
        public String getMediaFolders(String type) {
            JSONArray folders = new JSONArray();
            try {
                Uri uri = MediaStore.Files.getContentUri("external");
                String[] projection = {
                    MediaStore.Files.FileColumns.BUCKET_DISPLAY_NAME,
                    MediaStore.Files.FileColumns._ID,
                    MediaStore.Files.FileColumns.MEDIA_TYPE,
                    MediaStore.Files.FileColumns.DATA
                };

                String selection = "";
                if ("photos".equals(type)) {
                    selection = MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE;
                } else if ("videos".equals(type)) {
                    selection = MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO;
                } else {
                    selection = MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE
                        + " OR " + MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO;
                }

                Cursor cursor = getContentResolver().query(
                    uri,
                    projection,
                    selection,
                    null,
                    MediaStore.Files.FileColumns.DATE_ADDED + " DESC"
                );

                if (cursor != null) {
                    Map<String, FolderInfo> folderMap = new HashMap<>();
                    
                    int totalCount = 0;
                    String recentsCoverUri = null;

                    int bucketIdx = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.BUCKET_DISPLAY_NAME);
                    int idIdx = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns._ID);
                    int typeIdx = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.MEDIA_TYPE);

                    while (cursor.moveToNext()) {
                        String bucketName = cursor.getString(bucketIdx);
                        long id = cursor.getLong(idIdx);
                        int mediaType = cursor.getInt(typeIdx);

                        if (bucketName == null) bucketName = "Unknown";

                        Uri contentUri;
                        if (mediaType == MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO) {
                            contentUri = Uri.withAppendedPath(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, String.valueOf(id));
                        } else {
                            contentUri = Uri.withAppendedPath(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, String.valueOf(id));
                        }

                        if (recentsCoverUri == null) {
                            recentsCoverUri = contentUri.toString();
                        }
                        totalCount++;

                        FolderInfo info = folderMap.get(bucketName);
                        if (info == null) {
                            info = new FolderInfo(bucketName, contentUri.toString());
                            folderMap.put(bucketName, info);
                        }
                        info.count++;
                    }
                    cursor.close();

                    // Add "Recents" folder first
                    if (totalCount > 0) {
                        JSONObject recents = new JSONObject();
                        recents.put("name", "Recents");
                        recents.put("count", totalCount);
                        recents.put("coverUri", recentsCoverUri);
                        folders.put(recents);
                    }

                    // Add other folders
                    for (FolderInfo info : folderMap.values()) {
                        JSONObject f = new JSONObject();
                        f.put("name", info.name);
                        f.put("count", info.count);
                        f.put("coverUri", info.coverUri);
                        folders.put(f);
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Error getting media folders", e);
            }
            return folders.toString();
        }

        @android.webkit.JavascriptInterface
        public String getFilesInFolder(String folderName, String type) {
            JSONArray files = new JSONArray();
            try {
                Uri uri = MediaStore.Files.getContentUri("external");
                String[] projection = {
                    MediaStore.Files.FileColumns._ID,
                    MediaStore.Files.FileColumns.MEDIA_TYPE,
                    MediaStore.Video.VideoColumns.DURATION,
                    MediaStore.Files.FileColumns.DATE_ADDED
                };

                String selection = "";
                List<String> selectionArgs = new ArrayList<>();

                if ("Recents".equalsIgnoreCase(folderName)) {
                    if ("photos".equals(type)) {
                        selection = MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE;
                    } else if ("videos".equals(type)) {
                        selection = MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO;
                    } else {
                        selection = MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE
                            + " OR " + MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO;
                    }
                } else {
                    if ("photos".equals(type)) {
                        selection = "(" + MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE + ")";
                    } else if ("videos".equals(type)) {
                        selection = "(" + MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO + ")";
                    } else {
                        selection = "(" + MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE
                            + " OR " + MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO + ")";
                    }
                    selection += " AND " + MediaStore.Files.FileColumns.BUCKET_DISPLAY_NAME + "=?";
                    selectionArgs.add(folderName);
                }

                Cursor cursor = getContentResolver().query(
                    uri,
                    projection,
                    selection,
                    selectionArgs.isEmpty() ? null : selectionArgs.toArray(new String[0]),
                    MediaStore.Files.FileColumns.DATE_ADDED + " DESC"
                );

                if (cursor != null) {
                    int idIdx = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns._ID);
                    int typeIdx = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.MEDIA_TYPE);
                    int durationIdx = cursor.getColumnIndexOrThrow(MediaStore.Video.VideoColumns.DURATION);

                    while (cursor.moveToNext()) {
                        long id = cursor.getLong(idIdx);
                        int mediaType = cursor.getInt(typeIdx);
                        long duration = cursor.getLong(durationIdx);

                        Uri contentUri;
                        String typeStr;
                        if (mediaType == MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO) {
                            contentUri = Uri.withAppendedPath(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, String.valueOf(id));
                            typeStr = "video";
                        } else {
                            contentUri = Uri.withAppendedPath(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, String.valueOf(id));
                            typeStr = "image";
                        }

                        JSONObject fileObj = new JSONObject();
                        fileObj.put("uri", contentUri.toString());
                        fileObj.put("type", typeStr);
                        fileObj.put("duration", duration); // duration in ms
                        files.put(fileObj);
                    }
                    cursor.close();
                }
            } catch (Exception e) {
                Log.e(TAG, "Error getting files in folder " + folderName, e);
            }
            return files.toString();
        }

        @android.webkit.JavascriptInterface
        public void onMediaSelected(String jsonUris) {
            if (mFilePathCallback != null) {
                try {
                    org.json.JSONArray array = new org.json.JSONArray(jsonUris);
                    Uri[] uriArray = new Uri[array.length()];
                    for (int i = 0; i < array.length(); i++) {
                        uriArray[i] = Uri.parse(array.getString(i));
                    }
                    mFilePathCallback.onReceiveValue(uriArray);
                } catch (Exception e) {
                    Log.e(TAG, "Error parsing selected media URIs", e);
                    mFilePathCallback.onReceiveValue(null);
                }
                mFilePathCallback = null;
            }
        }

        @android.webkit.JavascriptInterface
        public void onFileChooserCancelled() {
            if (mFilePathCallback != null) {
                mFilePathCallback.onReceiveValue(null);
                mFilePathCallback = null;
            }
        }

        @android.webkit.JavascriptInterface
        public void fallbackToFileChooser() {
            runOnUiThread(() -> {
                Intent galleryIntent = new Intent(Intent.ACTION_GET_CONTENT);
                galleryIntent.addCategory(Intent.CATEGORY_OPENABLE);
                galleryIntent.setType("*/*");
                Intent chooserIntent = Intent.createChooser(galleryIntent, "Select File");
                try {
                    startActivityForResult(chooserIntent, RC_FILE_CHOOSER);
                } catch (Exception e) {
                    mFilePathCallback = null;
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
