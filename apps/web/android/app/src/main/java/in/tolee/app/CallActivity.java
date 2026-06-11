package in.tolee.app;

import android.os.Bundle;
import android.widget.ImageButton;
import androidx.appcompat.app.AppCompatActivity;
import io.socket.client.IO;
import io.socket.client.Socket;
import org.json.JSONObject;
import org.webrtc.*;

import java.util.ArrayList;
import java.util.List;

public class CallActivity extends AppCompatActivity {

    private Socket socket;
    private PeerConnectionFactory peerConnectionFactory;
    private PeerConnection peerConnection;
    private VideoTrack localVideoTrack;
    private AudioTrack localAudioTrack;
    private CameraVideoCapturer videoCapturer;

    private SurfaceViewRenderer localVideoView;
    private SurfaceViewRenderer remoteVideoView;

    private String callId = "";
    private String callType = "audio";
    private String callerId = "";
    private String receiverId = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_call);

        callId = getIntent().getStringExtra("callId");
        if (callId == null) callId = "";
        callType = getIntent().getStringExtra("callType");
        if (callType == null) callType = "audio";
        callerId = getIntent().getStringExtra("callerId");
        if (callerId == null) callerId = "";
        receiverId = getIntent().getStringExtra("receiverId");
        if (receiverId == null) receiverId = "";

        localVideoView = findViewById(R.id.local_video_view);
        remoteVideoView = findViewById(R.id.remote_video_view);

        // 1. Initialize WebRTC factory
        EglBase eglBase = EglBase.create();
        localVideoView.init(eglBase.getEglBaseContext(), null);
        remoteVideoView.init(eglBase.getEglBaseContext(), null);

        PeerConnectionFactory.Options options = new PeerConnectionFactory.Options();
        DefaultVideoEncoderFactory defaultVideoEncoderFactory = new DefaultVideoEncoderFactory(eglBase.getEglBaseContext(), true, true);
        DefaultVideoDecoderFactory defaultVideoDecoderFactory = new DefaultVideoDecoderFactory(eglBase.getEglBaseContext());
        
        PeerConnectionFactory.initialize(
            PeerConnectionFactory.InitializationOptions.builder(this).createInitializationOptions()
        );
        peerConnectionFactory = PeerConnectionFactory.builder()
            .setOptions(options)
            .setVideoEncoderFactory(defaultVideoEncoderFactory)
            .setVideoDecoderFactory(defaultVideoDecoderFactory)
            .createPeerConnectionFactory();

        // 2. Initialize media tracks
        AudioSource audioSource = peerConnectionFactory.createAudioSource(new MediaConstraints());
        localAudioTrack = peerConnectionFactory.createAudioTrack("local_audio_track", audioSource);

        if ("video".equals(callType)) {
            videoCapturer = createVideoCapturer();
            SurfaceTextureHelper surfaceTextureHelper = SurfaceTextureHelper.create("CaptureThread", eglBase.getEglBaseContext());
            VideoSource videoSource = peerConnectionFactory.createVideoSource(videoCapturer.isScreencast());
            videoCapturer.initialize(surfaceTextureHelper, this, videoSource.getCapturerObserver());
            videoCapturer.startCapture(1280, 720, 30);

            localVideoTrack = peerConnectionFactory.createVideoTrack("local_video_track", videoSource);
            localVideoTrack.addSink(localVideoView);
        }

        // 3. Connect socket & Register signaling listeners
        connectSignalingServer();

        findViewById(R.id.btnEndCall).setOnClickListener(v -> hangUp());

        android.widget.ImageButton btnMute = findViewById(R.id.btnMute);
        btnMute.setOnClickListener(v -> {
            if (localAudioTrack != null) {
                boolean enabled = localAudioTrack.enabled();
                localAudioTrack.setEnabled(!enabled);
                btnMute.setSelected(!enabled);
                btnMute.setColorFilter(!enabled ? android.graphics.Color.RED : android.graphics.Color.WHITE);
                android.util.Log.d("CallActivity", "Audio enabled state toggled to: " + !enabled);
            }
        });

        android.widget.ImageButton btnSwitchCamera = findViewById(R.id.btnSwitchCamera);
        btnSwitchCamera.setOnClickListener(v -> {
            if (videoCapturer != null) {
                videoCapturer.switchCamera(null);
                android.util.Log.d("CallActivity", "Switched camera (front/back)");
            }
        });
    }

    private CameraVideoCapturer createVideoCapturer() {
        CameraEnumerator enumerator = new Camera2Enumerator(this);
        String[] deviceNames = enumerator.getDeviceNames();
        for (String deviceName : deviceNames) {
            if (enumerator.isFrontFacing(deviceName)) {
                return (CameraVideoCapturer) enumerator.createCapturer(deviceName, null);
            }
        }
        return (CameraVideoCapturer) enumerator.createCapturer(deviceNames[0], null);
    }

    private void connectSignalingServer() {
        try {
            android.content.SharedPreferences prefs = getSharedPreferences("tolee_prefs", MODE_PRIVATE);
            String socketUrl = prefs.getString("socket_url", "https://tolee2.onrender.com");
            android.util.Log.d("CallActivity", "Connecting to signaling server: " + socketUrl);

            IO.Options opts = new IO.Options();
            opts.transports = new String[]{"websocket"};
            socket = IO.socket(socketUrl, opts);
            
            socket.on("connect", args -> {
                // Register user session with the signaling server immediately
                try {
                    if (receiverId != null && !receiverId.isEmpty()) {
                        JSONObject registerPayload = new JSONObject();
                        registerPayload.put("userId", receiverId);
                        socket.emit("register-user", registerPayload);
                        android.util.Log.d("CallActivity", "Registered user on signaling: " + receiverId);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });

            socket.on("incoming-call", args -> {
                try {
                    JSONObject data = (JSONObject) args[0];
                    JSONObject offer = data.getJSONObject("offer");
                    SessionDescription sdp = new SessionDescription(
                        SessionDescription.Type.OFFER,
                        offer.getString("sdp")
                    );
                    
                    peerConnection.setRemoteDescription(new SimpleSdpObserver() {
                        @Override
                        public void onSetSuccess() {
                            peerConnection.createAnswer(new SimpleSdpObserver() {
                                @Override
                                public void onCreateSuccess(SessionDescription localSdp) {
                                    peerConnection.setLocalDescription(new SimpleSdpObserver(), localSdp);
                                    try {
                                        JSONObject payload = new JSONObject();
                                        payload.put("callId", callId);
                                        JSONObject answer = new JSONObject();
                                        answer.put("type", "answer");
                                        answer.put("sdp", localSdp.description);
                                        payload.put("answer", answer);
                                        socket.emit("accept-call", payload);
                                    } catch (Exception e) {
                                        e.printStackTrace();
                                    }
                                }
                            }, new MediaConstraints());
                        }
                    }, sdp);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });

            socket.on("call-accepted", args -> {
                try {
                    JSONObject data = (JSONObject) args[0];
                    JSONObject answer = data.getJSONObject("answer");
                    SessionDescription sdp = new SessionDescription(SessionDescription.Type.ANSWER, answer.getString("sdp"));
                    peerConnection.setRemoteDescription(new SimpleSdpObserver(), sdp);
                } catch (Exception e) { e.printStackTrace(); }
            });

            socket.on("ice-candidate", args -> {
                try {
                    JSONObject data = (JSONObject) args[0];
                    if (data.has("candidate")) {
                        JSONObject candJson = data.getJSONObject("candidate");
                        IceCandidate candidate = new IceCandidate(
                            candJson.getString("sdpMid"),
                            candJson.getInt("sdpMLineIndex"),
                            candJson.getString("candidate")
                        );
                        peerConnection.addIceCandidate(candidate);
                    }
                } catch (Exception e) { e.printStackTrace(); }
            });

            socket.on("call-ended", args -> runOnUiThread(this::finish));

            socket.connect();

            // Initialize PeerConnection
            List<PeerConnection.IceServer> iceServers = new ArrayList<>();
            iceServers.add(PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer());
            iceServers.add(PeerConnection.IceServer.builder("stun:stun1.l.google.com:19302").createIceServer());

            PeerConnection.Observer pcObserver = new PeerConnection.Observer() {
                @Override public void onSignalingChange(PeerConnection.SignalingState state) {}
                @Override public void onIceConnectionChange(PeerConnection.IceConnectionState state) {}
                @Override public void onIceConnectionReceivingChange(boolean receiving) {}
                @Override public void onIceGatheringChange(PeerConnection.IceGatheringState state) {}
                @Override public void onIceCandidate(IceCandidate candidate) {
                    try {
                        JSONObject payload = new JSONObject();
                        payload.put("toUserId", callerId);
                        JSONObject candJson = new JSONObject();
                        candJson.put("sdpMid", candidate.sdpMid);
                        candJson.put("sdpMLineIndex", candidate.sdpMLineIndex);
                        candJson.put("candidate", candidate.sdp);
                        payload.put("candidate", candJson);
                        payload.put("callId", callId);
                        socket.emit("ice-candidate", payload);
                    } catch (Exception e) { e.printStackTrace(); }
                }
                @Override public void onIceCandidatesRemoved(IceCandidate[] candidates) {}
                @Override public void onAddStream(MediaStream stream) {
                    if (stream.videoTracks.size() > 0) {
                        runOnUiThread(() -> stream.videoTracks.get(0).addSink(remoteVideoView));
                    }
                }
                @Override public void onRemoveStream(MediaStream stream) {}
                @Override public void onDataChannel(DataChannel dc) {}
                @Override public void onRenegotiationNeeded() {}
                @Override public void onAddTrack(RtpReceiver receiver, MediaStream[] streams) {}
            };

            peerConnection = peerConnectionFactory.createPeerConnection(iceServers, pcObserver);
            
            MediaStream stream = peerConnectionFactory.createLocalMediaStream("local_stream");
            stream.addTrack(localAudioTrack);
            if (localVideoTrack != null) {
                stream.addTrack(localVideoTrack);
            }
            peerConnection.addStream(stream);

            // Answer creation is handled dynamically after receiving the incoming-call offer socket event.

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void hangUp() {
        try {
            JSONObject payload = new JSONObject();
            payload.put("callId", callId);
            if (socket != null) {
                socket.emit("end-call", payload);
                socket.disconnect();
            }
        } catch (Exception e) { e.printStackTrace(); }
        if (peerConnection != null) peerConnection.close();
        finish();
    }

    public static class SimpleSdpObserver implements SdpObserver {
        @Override public void onCreateSuccess(SessionDescription sdp) {}
        @Override public void onSetSuccess() {}
        @Override public void onCreateFailure(String s) {}
        @Override public void onSetFailure(String s) {}
    }
}
