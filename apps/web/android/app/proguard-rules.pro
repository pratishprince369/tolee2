# ============================================================
# Tolee Android App — ProGuard Rules (Production Security)
# ============================================================

# Keep Capacitor/JavaScript Bridge classes (required for WebView JS interface)
-keepclassmembers class in.tolee.app.MainActivity$ToleeNativeBridge {
    public *;
}
-keepclassmembers class in.tolee.app.** {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Firebase Messaging Service
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Keep Capacitor classes
-keep class com.getcapacitor.** { *; }

# Keep Socket.io client
-keep class io.socket.** { *; }
-keep class org.json.** { *; }

# Keep WebRTC
-keep class org.webrtc.** { *; }

# Ignore missing Firebase KTX classes and other optional dependencies
-dontwarn com.google.firebase.ktx.**
-dontwarn com.google.firebase.installations.ktx.**
-dontwarn com.google.firebase.messaging.ktx.**

# Hide original source file name in crash logs (prevents reverse engineering)
-renamesourcefileattribute SourceFile
-keepattributes SourceFile,LineNumberTable

# Remove verbose logging from release builds
-assumenosideeffects class android.util.Log {
    public static int d(...);
    public static int v(...);
}
