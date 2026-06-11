package in.tolee.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import io.socket.client.IO;
import io.socket.client.Socket;
import org.json.JSONObject;

public class CallActionReceiver extends BroadcastReceiver {
    private static final String TAG = "ToleeCallAction";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        String callId = intent.getStringExtra("callId");

        if ("ACTION_DECLINE_CALL".equals(action)) {
            Log.d(TAG, "Declining call from notification: " + callId);
            
            // 1. Emit decline event to signaling server
            try {
                android.content.SharedPreferences prefs = context.getSharedPreferences("tolee_prefs", Context.MODE_PRIVATE);
                String socketUrl = prefs.getString("socket_url", "https://tolee2.onrender.com");
                Socket socket = IO.socket(socketUrl);
                socket.connect();
                JSONObject payload = new JSONObject();
                payload.put("callId", callId);
                payload.put("reason", "declined");
                socket.emit("reject-call", payload);
                
                // Give it a tiny moment to emit before disconnecting
                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                    socket.disconnect();
                }, 1000);
            } catch (Exception e) {
                Log.e(TAG, "Error emitting decline from receiver", e);
            }

            // 2. Cancel the specific notification
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && callId != null) {
                nm.cancel(callId.hashCode());
            }
        }
    }
}
