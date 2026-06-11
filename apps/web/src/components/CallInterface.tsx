'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff, Volume2, VolumeX, ShieldAlert, Check, X, Camera, RefreshCw } from 'lucide-react';
import { getCallLogs } from '@/actions/calls';

interface CallInterfaceProps {
  activeRecipientId?: string | null;
  activeRecipientName?: string | null;
  activeRecipientAvatar?: string | null;
  onStartCallTrigger?: (type: 'audio' | 'video') => void;
  // Trigger callback when call starts or ends to mute other audio/chats
  onCallStateChange?: (inCall: boolean) => void;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 
  (typeof window !== 'undefined' 
    ? (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1' || 
       window.location.hostname.startsWith('192.168.') || 
       window.location.hostname.startsWith('10.') || 
       window.location.hostname.startsWith('172.')
        ? `http://${window.location.hostname}:4000` 
        : `https://api.tolee.in`)
    : 'http://localhost:4000');

export function CallInterface({
  activeRecipientId,
  activeRecipientName,
  activeRecipientAvatar,
  onCallStateChange
}: CallInterfaceProps) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const currentUserName = session?.user?.name || 'Tolee User';
  const currentUserAvatar = session?.user?.image || '/default-user-avatar.svg';

  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Call States: 'idle' | 'calling' | 'ringing' | 'incoming' | 'connected' | 'ended' | 'failed'
  const [callState, setCallState] = useState<'idle' | 'calling' | 'ringing' | 'incoming' | 'connected' | 'ended' | 'failed'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [failureReason, setFailureReason] = useState<'offline' | 'busy' | 'declined' | 'failed' | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  
  // Call Partner Info
  const [partner, setPartner] = useState<{ id: string; name: string; avatar: string }>({ id: '', name: '', avatar: '' });
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);

  // WebRTC Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Audio Synth Context for Ringtone
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // UI Settings
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // WebRTC ICE Servers Configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ]
  };

  // 1. Initialize Socket.io Connection
  useEffect(() => {
    if (!currentUserId) return;

    console.log('[Call Client] Attempting connection to SOCKET_URL:', SOCKET_URL);

    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    s.on('connect_error', (error) => {
      console.error('[Call Client] Socket connection error to URL:', SOCKET_URL, error);
    });

    s.on('connect', () => {
      console.log('[Call Client] Connected to signaling server:', s.id);
      s.emit('register-user', { userId: currentUserId });
    });

    // Handle Incoming Call
    s.on('incoming-call', ({ fromUserId, fromName, fromAvatar, offer, type, callId }) => {
      console.log('[Call Client] Incoming call from:', fromName);
      setCallType(type);
      setPartner({ id: fromUserId, name: fromName, avatar: fromAvatar || '/default-user-avatar.svg' });
      setCurrentCallId(callId);
      setCallState('incoming');
      
      // Cache the offer to answer it later
      (window as any).incomingOffer = offer;
      
      // Start Ringtone
      playMelodicRingtone();
    });

    // Handle Remote Ringing Status
    s.on('call-ringing', () => {
      console.log('[Call Client] Receiver is ringing...');
      setCallState('ringing');
      playDialTone();
    });

    // Handle Call Acceptance
    s.on('call-accepted', async ({ answer }) => {
      console.log('[Call Client] Call accepted by remote partner.');
      stopAudio();
      setCallState('connected');

      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          await processIceQueue();
        } catch (err) {
          console.error('[Call Client] Error setting remote description:', err);
        }
      }
    });

    // Handle Call Rejection
    s.on('call-rejected', ({ reason }) => {
      console.log('[Call Client] Call rejected due to:', reason);
      stopAudio();
      setFailureReason(reason);
      setCallState('failed');
      playBusyTone();
      setTimeout(() => resetCall(), 4000);
    });

    // Handle Call Failure (e.g. offline)
    s.on('call-failed', ({ reason }) => {
      console.log('[Call Client] Call failed. Partner is:', reason);
      stopAudio();
      setFailureReason(reason);
      setCallState('failed');
      playBusyTone();
      setTimeout(() => resetCall(), 4000);
    });

    // Handle Call Ended
    s.on('call-ended', () => {
      console.log('[Call Client] Call ended by partner.');
      stopAudio();
      setCallState('ended');
      playEndTone();
      setTimeout(() => resetCall(), 2000);
    });

    // Handle Ice Candidates Relayed by Server
    s.on('ice-candidate', async ({ candidate }) => {
      if (!candidate) return;
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[Call Client] Successfully added remote ICE candidate');
        } catch (err) {
          console.error('[Call Client] Error adding ICE candidate:', err);
        }
      } else {
        console.log('[Call Client] Queueing remote ICE candidate (remoteDescription not set yet)');
        iceCandidatesQueueRef.current.push(candidate);
      }
    });

    setSocket(s);

    // Global exposed window functions for debug or header triggers
    (window as any).startOutgoingCall = (type: 'audio' | 'video') => {
      if (latestInitiateCallRef.current) {
        latestInitiateCallRef.current(type);
      }
    };

    return () => {
      s.disconnect();
      stopAudio();
      cleanupWebRTC();
      delete (window as any).startOutgoingCall;
    };
  }, [currentUserId, activeRecipientId]);

  // Handle call state callbacks
  useEffect(() => {
    if (onCallStateChange) {
      onCallStateChange(callState !== 'idle');
    }
  }, [callState]);

  // Duration timer
  useEffect(() => {
    if (callState === 'connected') {
      setCallDuration(0);
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      // Securely bind video streams after React components have finished rendering/mounting
      const timer = setTimeout(() => {
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
          console.log('[Call Client] Successfully bound local stream to video element');
        }
        if (remoteVideoRef.current && remoteStreamRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
          console.log('[Call Client] Successfully bound remote stream to video element');
        }
      }, 150);
      
      return () => clearTimeout(timer);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, [callState]);

  // 2. Play Audio Feedback using Web Audio API
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const playMelodicRingtone = () => {
    initAudioContext();
    stopAudio();
    
    let time = 0;
    const ctx = audioContextRef.current!;
    
    const playChimeSequence = () => {
      const now = ctx.currentTime;
      // High pitch sweet chime melody
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);
        gain.gain.setValueAtTime(0, now + idx * 0.15);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.15 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.4);
        
        osc.type = 'triangle';
        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.55);
      });
    };

    playChimeSequence();
    ringtoneIntervalRef.current = setInterval(playChimeSequence, 1800);
  };

  const playDialTone = () => {
    initAudioContext();
    stopAudio();

    const ctx = audioContextRef.current!;
    const playDialSignal = () => {
      const now = ctx.currentTime;
      // US Dial tone: 350Hz + 440Hz mixed
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(350, now);
      osc2.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.05);
      gain.gain.setValueAtTime(0.06, now + 1.2);
      gain.gain.linearRampToValueAtTime(0, now + 1.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.3);
      osc2.stop(now + 1.3);
    };

    playDialSignal();
    ringtoneIntervalRef.current = setInterval(playDialSignal, 3000);
  };

  const playBusyTone = () => {
    initAudioContext();
    stopAudio();
    const ctx = audioContextRef.current!;
    const playBusySignal = () => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(480, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
      gain.gain.setValueAtTime(0.08, now + 0.25);
      gain.gain.linearRampToValueAtTime(0, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    };

    playBusySignal();
    ringtoneIntervalRef.current = setInterval(playBusySignal, 500);
  };

  const playEndTone = () => {
    initAudioContext();
    stopAudio();
    const ctx = audioContextRef.current!;
    const now = ctx.currentTime;
    // Decelerating low tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.4);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  };

  const stopAudio = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  };

  const processIceQueue = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    console.log(`[Call Client] Processing ${iceCandidatesQueueRef.current.length} queued ICE candidates`);
    for (const candidate of iceCandidatesQueueRef.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('[Call Client] Successfully added queued remote ICE candidate');
      } catch (err) {
        console.error('[Call Client] Error adding queued ICE candidate:', err);
      }
    }
    iceCandidatesQueueRef.current = [];
  };

  // 3. WebRTC Mechanics & Outgoing Setup
  const initiateCall = async (type: 'audio' | 'video') => {
    if (!socket || !activeRecipientId) return;

    initAudioContext();
    setCallType(type);
    setPartner({
      id: activeRecipientId,
      name: activeRecipientName || 'Recipient',
      avatar: activeRecipientAvatar || '/default-user-avatar.svg'
    });
    setCallState('calling');
    playDialTone();

    const callId = 'call-' + Math.random().toString(36).substr(2, 9);
    setCurrentCallId(callId);

    try {
      // Get Media Devices
      const constraints = {
        audio: true,
        video: type === 'video' ? { facingMode: 'user' } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (type === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create Peer Connection
      const pc = new RTCPeerConnection(iceServers);
      peerConnectionRef.current = pc;

      // Add local tracks to WebRTC
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            toUserId: activeRecipientId,
            candidate: event.candidate,
            callId
          });
        }
      };

      // Handle Remote Stream Arrived
      pc.ontrack = (event) => {
        console.log('[Call Client] Outgoing call track arrived.');
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      // Create Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Emit Call Initiated Event
      socket.emit('call-user', {
        toUserId: activeRecipientId,
        callerName: currentUserName,
        callerAvatar: currentUserAvatar,
        offer,
        type,
        callId
      });

    } catch (err) {
      console.error('[Call Client] Failed to acquire media and start call:', err);
      setFailureReason('failed');
      setCallState('failed');
      stopAudio();
      setTimeout(() => resetCall(), 3000);
    }
  };

  // 4. Accept Calling Action
  const acceptIncomingCall = async () => {
    if (!socket || !currentCallId) return;

    initAudioContext();
    stopAudio();
    setCallState('connected');

    try {
      const constraints = {
        audio: true,
        video: callType === 'video' ? { facingMode: 'user' } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (callType === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(iceServers);
      peerConnectionRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            toUserId: partner.id,
            candidate: event.candidate,
            callId: currentCallId
          });
        }
      };

      // Handle Remote Stream
      pc.ontrack = (event) => {
        console.log('[Call Client] Incoming call track arrived.');
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      // Set Remote Description from stored offer
      const offer = (window as any).incomingOffer;
      if (offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        // Create Answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Emit Accepted Event
        socket.emit('accept-call', {
          callId: currentCallId,
          answer
        });

        await processIceQueue();
      }
      
      delete (window as any).incomingOffer;

    } catch (err) {
      console.error('[Call Client] Failed to accept incoming call:', err);
      rejectIncomingCall('failed');
    }
  };

  // 5. Reject Call
  const rejectIncomingCall = (reason: 'declined' | 'busy' | 'failed' = 'declined') => {
    if (!socket || !currentCallId) return;
    
    stopAudio();
    socket.emit('reject-call', {
      callId: currentCallId,
      reason
    });
    
    setCallState('idle');
    resetCall();
  };

  // 6. End Call
  const endCall = () => {
    if (!socket || !currentCallId) {
      resetCall();
      return;
    }

    stopAudio();
    socket.emit('end-call', { callId: currentCallId });
    setCallState('ended');
    playEndTone();
    setTimeout(() => resetCall(), 1500);
  };

  // 7. Cleanup & Resets
  const resetCall = () => {
    stopAudio();
    cleanupWebRTC();
    setCallState('idle');
    setCallDuration(0);
    setCurrentCallId(null);
    setPartner({ id: '', name: '', avatar: '' });
    setFailureReason(null);
    setIsMuted(false);
    setIsVideoDisabled(false);
    setIsSpeakerOn(true);
    iceCandidatesQueueRef.current = [];
  };

  const cleanupWebRTC = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  // Mute microphone
  const toggleMuteMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle video stream
  const toggleVideo = () => {
    if (localStreamRef.current && callType === 'video') {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoDisabled(!videoTrack.enabled);
      }
    }
  };

  // Format calling duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const latestInitiateCallRef = useRef<((type: 'audio' | 'video') => Promise<void>) | null>(null);
  useEffect(() => {
    latestInitiateCallRef.current = initiateCall;
  });

  if (callState === 'idle') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in font-sans select-none text-white p-4">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col h-[85vh] max-h-[750px]">
        
        {/* Ringing / Outgoing Calling / Incoming Calling Screens */}
        {(callState === 'calling' || callState === 'ringing' || callState === 'incoming' || callState === 'failed') && (
          <div className="flex-1 flex flex-col items-center justify-between p-8 text-center bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 relative">
            <div className="mt-8 space-y-4">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-800 shadow-lg mx-auto relative">
                <img src={partner.avatar} alt={partner.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{partner.name}</h3>
                <p className="text-xs text-zinc-500 font-semibold tracking-wider uppercase mt-1">
                  {callState === 'incoming' ? `Incoming ${callType} Call...` :
                   callState === 'calling' ? 'Calling...' : 
                   callState === 'ringing' ? 'Ringing...' : 
                   failureReason === 'offline' ? 'User is Offline' :
                   failureReason === 'busy' ? 'User is Busy' :
                   failureReason === 'declined' ? 'Call Declined' :
                   'Unavailable'}
                </p>
              </div>
            </div>

            {/* Error Message Contexts */}
            {callState === 'failed' && (
              <div className="px-6 py-3 rounded-2xl bg-red-950/20 border border-red-900/40 max-w-xs text-xs text-red-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                {failureReason === 'offline' ? 'The user is currently offline. A push notification has been sent.' : 
                 failureReason === 'busy' ? 'The user is busy on another call.' : 
                 failureReason === 'declined' ? 'The user declined your call.' : 
                 'Call connection failed. Please try again.'}
              </div>
            )}

            {/* Action Buttons Row */}
            <div className="mb-8 w-full flex justify-center gap-6">
              {callState === 'incoming' ? (
                <>
                  <button 
                    onClick={() => rejectIncomingCall('declined')}
                    className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all flex items-center justify-center shadow-lg border border-red-500/20 text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={acceptIncomingCall}
                    className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center shadow-lg border border-emerald-500/20 text-white animate-pulse"
                  >
                    {callType === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
                  </button>
                </>
              ) : (
                <button 
                  onClick={endCall}
                  className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all flex items-center justify-center shadow-lg border border-red-500/20 text-white"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Hidden WebRTC Media Elements for Audio Calls (so browser can play audio stream) */}
        {callState === 'connected' && callType === 'audio' && (
          <div className="hidden">
            <video ref={remoteVideoRef} autoPlay playsInline />
            <video ref={localVideoRef} autoPlay playsInline muted />
          </div>
        )}

        {/* Connected Audio Call Screen */}
        {callState === 'connected' && callType === 'audio' && (
          <div className="flex-1 flex flex-col items-center justify-between p-8 text-center bg-zinc-950 relative">
            <div className="mt-16 space-y-4">
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-zinc-800 shadow-lg mx-auto">
                <img src={partner.avatar} alt={partner.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{partner.name}</h3>
                <p className="text-sm text-[#00c298] font-bold mt-1.5 flex items-center justify-center gap-1.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                  {formatDuration(callDuration)}
                </p>
              </div>
            </div>

            {/* Audio call controls */}
            <div className="mb-12 w-full flex flex-col items-center gap-6">
              <div className="flex gap-6 justify-center">
                <button 
                  onClick={toggleMuteMic}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${
                    isMuted ? 'bg-zinc-800 border-zinc-700 text-amber-500' : 'bg-transparent border-zinc-800 text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${
                    !isSpeakerOn ? 'bg-zinc-800 border-zinc-700 text-amber-500' : 'bg-transparent border-zinc-800 text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  {!isSpeakerOn ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
              <button 
                onClick={endCall}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all flex items-center justify-center shadow-lg border border-red-500/20 text-white"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* Connected Video Call Screen */}
        {callState === 'connected' && callType === 'video' && (
          <div className="flex-1 relative bg-black flex flex-col justify-end">
            
            {/* Fullscreen Remote Video */}
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Float Preview Local Video */}
            <div className="absolute top-4 right-4 w-28 h-40 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg z-20">
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              {isVideoDisabled && (
                <div className="absolute inset-0 bg-zinc-950 flex items-center justify-center">
                  <VideoOff className="w-5 h-5 text-zinc-600" />
                </div>
              )}
            </div>

            {/* Overlay Details (Top Left) */}
            <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-xs px-3 py-1.5 rounded-xl text-xs flex flex-col z-20 font-mono">
              <span className="font-bold text-white truncate max-w-[120px]">{partner.name}</span>
              <span className="text-[#00c298] font-bold mt-0.5">{formatDuration(callDuration)}</span>
            </div>

            {/* Calling control row */}
            <div className="w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 flex flex-col items-center gap-4 z-20">
              <div className="flex gap-6 justify-center">
                <button 
                  onClick={toggleMuteMic}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all bg-black/60 backdrop-blur-xs hover:bg-black/80 ${
                    isMuted ? 'border-zinc-700 text-amber-500' : 'border-zinc-800 text-zinc-300'
                  }`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button 
                  onClick={toggleVideo}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all bg-black/60 backdrop-blur-xs hover:bg-black/80 ${
                    isVideoDisabled ? 'border-zinc-700 text-amber-500' : 'border-zinc-800 text-zinc-300'
                  }`}
                >
                  {isVideoDisabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-[18px] h-[18px]" />}
                </button>
                <button 
                  onClick={endCall}
                  className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all flex items-center justify-center text-white"
                >
                  <PhoneOff className="w-[18px] h-[18px]" />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
