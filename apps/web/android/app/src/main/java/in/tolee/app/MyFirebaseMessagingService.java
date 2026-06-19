package in.tolee.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "ToleeFCMService";
    private static final String CALL_CHANNEL_ID = "tolee_calls_channel_v5";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "New FCM Message Received: " + remoteMessage.getMessageId());

        Map<String, String> data = remoteMessage.getData();
        
        // Log all data to help debugging
        for (Map.Entry<String, String> entry : data.entrySet()) {
            Log.d(TAG, "Data Payload: " + entry.getKey() + " = " + entry.getValue());
        }

        String type = data.get("type");
        String callId = data.get("callId");

        // AGGRESSIVE DETECTION: If it's a call, trigger the NATIVE Android screen
        // Check for common keys used in various calling implementations
        if ("incoming_call".equals(type) || "call".equals(type) || callId != null) {
            Log.d(TAG, "CRITICAL: NATIVE CALL TRIGGERED via FCM");
            
            String callType = data.get("callType");
            String callerId = data.get("callerId");
            String callerName = data.get("callerName");
            String receiverId = data.get("receiverId");
            
            // If callerName is missing, try to find it in other fields
            if (callerName == null) callerName = data.get("title");
            if (callerName == null) callerName = "Incoming Call";
            
            triggerIncomingCallScreen(callId, callType, callerId, callerName, receiverId);
        } else {
            handleStandardNotification(remoteMessage);
        }
    }

    private void triggerIncomingCallScreen(String callId, String callType, String callerId, String callerName, String receiverId) {
        Context context = getApplicationContext();
        
        // 1. Fullscreen Native Activity Intent
        Intent fullScreenIntent = new Intent(context, IncomingCallActivity.class);
        fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | 
                                 Intent.FLAG_ACTIVITY_CLEAR_TOP | 
                                 Intent.FLAG_ACTIVITY_SINGLE_TOP);
                                 
        fullScreenIntent.putExtra("callId", callId);
        fullScreenIntent.putExtra("callType", callType);
        fullScreenIntent.putExtra("callerId", callerId);
        fullScreenIntent.putExtra("callerName", callerName);
        fullScreenIntent.putExtra("receiverId", receiverId);

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                context,
                (callId != null) ? callId.hashCode() : 0,
                fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // 2. Action Intents
        Intent acceptIntent = new Intent(context, CallActivity.class);
        acceptIntent.putExtra("callId", callId);
        acceptIntent.putExtra("callType", callType);
        acceptIntent.putExtra("callerId", callerId);
        acceptIntent.putExtra("callerName", callerName);
        acceptIntent.putExtra("receiverId", receiverId);
        acceptIntent.putExtra("isIncoming", true);
        acceptIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        PendingIntent acceptPendingIntent = PendingIntent.getActivity(
                context,
                (callId != null) ? callId.hashCode() + 1 : 1,
                acceptIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent declineIntent = new Intent(context, CallActionReceiver.class);
        declineIntent.setAction("ACTION_DECLINE_CALL");
        declineIntent.putExtra("callId", callId);
        
        PendingIntent declinePendingIntent = PendingIntent.getBroadcast(
                context,
                (callId != null) ? callId.hashCode() + 2 : 2,
                declineIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // 3. Notification Channel (V5 to force fresh settings)
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CALL_CHANNEL_ID,
                    "Incoming Calls",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setImportance(NotificationManager.IMPORTANCE_HIGH);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.enableVibration(true);
            channel.setBypassDnd(true);
            
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .build();
            channel.setSound(ringtoneUri, audioAttributes);
            
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }

        // 4. Build Dialer Notification
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CALL_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(callerName)
                .setContentText("Incoming " + (callType != null ? callType : "audio") + " call...")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setSound(ringtoneUri)
                .setOngoing(true)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .addAction(android.R.drawable.ic_menu_call, "Accept", acceptPendingIntent)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Decline", declinePendingIntent)
                .setAutoCancel(true);

        if (notificationManager != null) {
            notificationManager.notify((callId != null) ? callId.hashCode() : 1002, builder.build());
        }
        
        // 5. Try to launch activity directly as well
        try {
            context.startActivity(fullScreenIntent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start activity directly from FCM: " + e.getMessage());
        }
    }


    private void createNotificationChannels(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;

            // 1. Tolee Messages (Direct Chats)
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

            // 2. Tolee Messages (Group Chats)
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

            // 3. Tolee Activity (Social activity like likes, comments, follows)
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

            // 4. Tolee Activity (Marketplace listings)
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

            // 5. Tolee Alerts (General Alerts & default fallback)
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

            // 6. Tolee Alerts (Promotions & Shoots)
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

            // 7. Tolee Alerts (Critical Alerts)
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

            // 8. Other Notifications (Old channel mapping to Tolee Alerts)
            NotificationChannel otherChannel = new NotificationChannel(
                    "other_notifications",
                    "Tolee Alerts",
                    NotificationManager.IMPORTANCE_LOW
            );
            otherChannel.setDescription("Other updates and general logs");
            manager.createNotificationChannel(otherChannel);

            // 9. Silent Notifications (For system syncing tasks)
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

    private void handleStandardNotification(RemoteMessage remoteMessage) {
        String title = null;
        String body = null;
        String url = null;
        String channelId = null;

        if (remoteMessage.getData().size() > 0) {
            Map<String, String> data = remoteMessage.getData();
            title = data.get("title");
            body = data.get("message");
            if (body == null) body = data.get("body");
            url = data.get("url");
            channelId = data.get("channelId");
        }

        if (remoteMessage.getNotification() != null) {
            if (title == null) title = remoteMessage.getNotification().getTitle();
            if (body == null) body = remoteMessage.getNotification().getBody();
            if (channelId == null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                channelId = remoteMessage.getNotification().getChannelId();
            }
        }

        if (title != null && body != null) {
            sendNotification(title, body, url, channelId);
        }
    }

    private void sendNotification(String title, String messageBody, String targetUrl, String channelId) {
        // Ensure standard channels exist
        createNotificationChannels(this);

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (targetUrl != null) intent.putExtra("url", targetUrl);

        PendingIntent pendingIntent = PendingIntent.getActivity(this, (int) System.currentTimeMillis(), intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        if (channelId == null || channelId.trim().isEmpty()) {
            channelId = "default";
            if (title != null && (title.toLowerCase().contains("alert") || title.toLowerCase().contains("critical"))) {
                channelId = "critical_alerts";
            }
        }

        Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        
        NotificationCompat.Builder notificationBuilder =
                new NotificationCompat.Builder(this, channelId)
                        .setSmallIcon(R.mipmap.ic_launcher)
                        .setContentTitle(title)
                        .setContentText(messageBody)
                        .setAutoCancel(true)
                        .setSound(defaultSoundUri)
                        .setVibrate(new long[]{0, 500, 200, 500})
                        .setContentIntent(pendingIntent)
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setCategory(NotificationCompat.CATEGORY_MESSAGE);

        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.notify((int) System.currentTimeMillis(), notificationBuilder.build());
        }
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "New Token: " + token);
    }
}
