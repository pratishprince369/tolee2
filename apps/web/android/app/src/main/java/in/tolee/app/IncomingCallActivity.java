package in.tolee.app;

import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.os.Vibrator;
import android.util.Log;
import android.view.Window;
import android.view.WindowManager;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import io.socket.client.IO;
import io.socket.client.Socket;
import org.json.JSONObject;

public class IncomingCallActivity extends AppCompatActivity {

    private static final String TAG = "IncomingCallActivity";
    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private Socket socket;
    private PowerManager.WakeLock wakeLock;

    private String callId = "";
    private String callType = "audio";
    private String callerId = "";
    private String callerName = "";
    private String receiverId = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // AGGRESSIVE WAKEUP: Call this before super.onCreate
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        wakeDeviceAndUnlock();
        
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_incoming_call);

        // Keep screen on and show over lockscreen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }

        Intent intent = getIntent();
        callId = intent.getStringExtra("callId");
        if (callId == null) callId = "unknown_" + System.currentTimeMillis();
        callType = intent.getStringExtra("callType");
        if (callType == null) callType = "audio";
        callerId = intent.getStringExtra("callerId");
        callerName = intent.getStringExtra("callerName");
        if (callerName == null || callerName.isEmpty()) callerName = "Tolee User";
        receiverId = intent.getStringExtra("receiverId");

        Log.d(TAG, "Native Incoming Call UI started for: " + callerName + " (ID: " + callId + ")");

        ((TextView) findViewById(R.id.tvCallerName)).setText(callerName);
        ((TextView) findViewById(R.id.tvCallType)).setText("Incoming " + callType + " call...");

        // Acquire WakeLock to keep CPU alive
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP, "Tolee:CallWakeLock");
            wakeLock.acquire(30000); // 30 seconds max
        }

        // Initialize Signaling Socket
        try {
            android.content.SharedPreferences prefs = getSharedPreferences("tolee_prefs", MODE_PRIVATE);
            String socketUrl = prefs.getString("socket_url", "https://tolee2.onrender.com");
            socket = IO.socket(socketUrl);
            socket.connect();
            Log.d(TAG, "Socket connecting to: " + socketUrl);
        } catch (Exception e) {
            Log.e(TAG, "Socket error", e);
        }

        // Start ringing immediately
        playRingtone();

        findViewById(R.id.btnAccept).setOnClickListener(v -> {
            Log.d(TAG, "Call Accepted");
            stopRingtone();
            acceptCall();
        });

        findViewById(R.id.btnDecline).setOnClickListener(v -> {
            Log.d(TAG, "Call Declined");
            stopRingtone();
            declineCall();
        });
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        // Refresh UI if needed
        callerName = intent.getStringExtra("callerName");
        if (callerName != null) ((TextView) findViewById(R.id.tvCallerName)).setText(callerName);
    }

    private void wakeDeviceAndUnlock() {
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        }
    }


    private void playRingtone() {
        try {
            Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(this, ringtoneUri);
            
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
            
            mediaPlayer.setAudioAttributes(audioAttributes);
            mediaPlayer.setLooping(true);
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception e) {
            Log.e(TAG, "Ringtone error", e);
        }

        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null) {
            long[] pattern = {0, 1000, 1000}; 
            vibrator.vibrate(pattern, 0);
        }
    }

    private void stopRingtone() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) mediaPlayer.stop();
                mediaPlayer.release();
            } catch (Exception e) {}
            mediaPlayer = null;
        }
        if (vibrator != null) {
            vibrator.cancel();
        }
    }

    private void acceptCall() {
        Intent intent = new Intent(this, CallActivity.class);
        intent.putExtra("callId", callId);
        intent.putExtra("callType", callType);
        intent.putExtra("callerId", callerId);
        intent.putExtra("callerName", callerName);
        intent.putExtra("receiverId", receiverId);
        intent.putExtra("isIncoming", true);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
        
        // Clear calling notification
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(callId.hashCode());
        if (nm != null) nm.cancel(1002);
        
        finish();
    }

    private void declineCall() {
        try {
            JSONObject payload = new JSONObject();
            payload.put("callId", callId);
            payload.put("reason", "declined");
            if (socket != null) {
                socket.emit("reject-call", payload);
                socket.disconnect();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(callId.hashCode());
        if (nm != null) nm.cancel(1002);
        
        finish();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }

    @Override
    protected void onDestroy() {
        stopRingtone();
        if (socket != null) {
            socket.disconnect();
        }
        super.onDestroy();
    }
}
