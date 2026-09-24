'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import { 
  Phone, Video, PhoneOff, Mic, MicOff, VideoOff, 
  Volume2, VolumeX, ShieldAlert, Check, X, Camera, 
  RefreshCw, Minimize2, Maximize2, RotateCcw, AlertTriangle
} from 'lucide-react';

interface CallInterfaceProps {
  activeRecipientId?: string | null;
  activeRecipientName?: string | null;
  activeRecipientAvatar?: string | null;
  onStartCallTrigger?: (type: 'audio' | 'video') => void;
  onCallStateChange?: (inCall: boolean) => void;
}

function getSocketUrl() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (typeof window === 'undefined') return 'http://localhost:4000';
  const h = window.location.hostname;
  const isLocal = h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.') || h.startsWith('10.') || h.startsWith('172.');
  return isLocal ? `http://${h}:4000` : 'https://api.tolee.in';
}

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
  
  // Call States: 'idle' | 'calling' | 'ringing' | 'incoming' | 'connecting' | 'connected' | 'reconnecting' | 'ended' | 'failed'
  const [callState, setCallState] = useState<'idle' | 'calling' | 'ringing' | 'incoming' | 'connecting' | 'connected' | 'reconnecting' | 'ended' | 'failed'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [failureReason, setFailureReason] = useState<'offline' | 'busy' | 'declined' | 'failed' | 'timeout' | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  
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
  const callTimeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Audio & Vibration Feedback Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vibrationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeNotificationRef = useRef<Notification | null>(null);
  const originalTitleRef = useRef<string>('');

  // Call Settings & Controls
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isReconnecting, setIsReconnecting] = useState(false);

  // State refs for duplicate prevention & async callbacks
  const currentCallIdRef = useRef<string | null>(null);
  const callStateRef = useRef<string>('idle');
  useEffect(() => {
    currentCallIdRef.current = currentCallId;
    callStateRef.current = callState;
  }, [currentCallId, callState]);

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

  // 1. Web Audio API Init & Unlock on User Gestures
  const initAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
        }
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
    } catch (_) {}
  }, []);

  // Unlock AudioContext and request notification permission on first user click/touch
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      initAudioContext();
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        try {
          Notification.requestPermission().catch(() => {});
        } catch (_) {}
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, [initAudioContext]);

  // 2. Ringtone & Audio Tone Synthesizers
  const startRingtoneAndVibration = useCallback((callerName: string, type: 'audio' | 'video', callId: string) => {
    initAudioContext();
    stopAudioAndVibration();

    // ─── Play Melodic Ringtone ───
    if (audioContextRef.current) {
      const ctx = audioContextRef.current;
      const playChimeSequence = () => {
        try {
          if (ctx.state === 'suspended') ctx.resume().catch(() => {});
          const now = ctx.currentTime;
          // Melodic sequence: C5 (523Hz), E5 (659Hz), G5 (784Hz), B5 (988Hz)
          const notes = [523.25, 659.25, 783.99, 987.77];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.frequency.setValueAtTime(freq, now + idx * 0.14);
            gain.gain.setValueAtTime(0, now + idx * 0.14);
            gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.14 + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.38);
            
            osc.type = 'sine';
            osc.start(now + idx * 0.14);
            osc.stop(now + idx * 0.14 + 0.45);
          });
        } catch (_) {}
      };

      playChimeSequence();
      ringtoneIntervalRef.current = setInterval(playChimeSequence, 1900);
    }

    // ─── Phone Vibration (WhatsApp Style) ───
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([500, 250, 500, 250, 500, 250, 500]);
        vibrationIntervalRef.current = setInterval(() => {
          try {
            navigator.vibrate([500, 250, 500, 250, 500, 250, 500]);
          } catch (_) {}
        }, 2800);
      } catch (_) {}
    }

    // ─── Background / Tab-Hidden Awareness ───
    if (typeof document !== 'undefined') {
      originalTitleRef.current = document.title;
      document.title = `(1) 📞 Incoming Call from ${callerName} - Tolee`;

      if (document.visibilityState === 'hidden') {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            const notif = new Notification(`📞 Incoming ${type === 'video' ? 'Video' : 'Voice'} Call`, {
              body: `${callerName} is calling you on Tolee...`,
              icon: '/logo.png',
              tag: `call-${callId}`,
              requireInteraction: true
            });
            notif.onclick = () => {
              window.focus();
              notif.close();
            };
            activeNotificationRef.current = notif;
          } catch (_) {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then(reg => {
                reg.showNotification(`📞 Incoming ${type === 'video' ? 'Video' : 'Voice'} Call`, {
                  body: `${callerName} is calling you on Tolee...`,
                  icon: '/logo.png',
                  tag: `call-${callId}`,
                  requireInteraction: true
                });
              }).catch(() => {});
            }
          }
        }
      }
    }
  }, [initAudioContext]);

  const playDialTone = useCallback(() => {
    initAudioContext();
    stopAudioAndVibration();
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    
    const playDialSignal = () => {
      try {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const now = ctx.currentTime;
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
      } catch (_) {}
    };

    playDialSignal();
    ringtoneIntervalRef.current = setInterval(playDialSignal, 3000);
  }, [initAudioContext]);

  const playBusyTone = useCallback(() => {
    initAudioContext();
    stopAudioAndVibration();
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;

    const playBusySignal = () => {
      try {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
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
      } catch (_) {}
    };

    playBusySignal();
    ringtoneIntervalRef.current = setInterval(playBusySignal, 500);
  }, [initAudioContext]);

  const playEndTone = useCallback(() => {
    initAudioContext();
    stopAudioAndVibration();
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    try {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.35);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch (_) {}
  }, [initAudioContext]);

  const stopAudioAndVibration = useCallback(() => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch (_) {}
    }
    if (activeNotificationRef.current) {
      try {
        activeNotificationRef.current.close();
      } catch (_) {}
      activeNotificationRef.current = null;
    }
    if (typeof document !== 'undefined' && originalTitleRef.current) {
      document.title = originalTitleRef.current;
      originalTitleRef.current = '';
    }
  }, []);

  // Process queued ICE candidates after remote description is configured
  const processIceQueue = async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) return;
    for (const candidate of iceCandidatesQueueRef.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[Call Client] Error adding queued ICE candidate:', err);
      }
    }
    iceCandidatesQueueRef.current = [];
  };

  // 3. WebRTC Cleanup
  const cleanupWebRTC = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (callTimeoutTimerRef.current) {
      clearTimeout(callTimeoutTimerRef.current);
      callTimeoutTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
          track.enabled = false;
        } catch (_) {}
      });
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
          track.enabled = false;
        } catch (_) {}
      });
      remoteStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      try {
        peerConnectionRef.current.close();
      } catch (_) {}
      peerConnectionRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    iceCandidatesQueueRef.current = [];
  }, []);

  // 4. Reset Entire Call State
  const resetCall = useCallback(() => {
    stopAudioAndVibration();
    cleanupWebRTC();
    setCallState('idle');
    setCallDuration(0);
    setCurrentCallId(null);
    setPartner({ id: '', name: '', avatar: '' });
    setFailureReason(null);
    setIsMuted(false);
    setIsVideoDisabled(false);
    setIsSpeakerOn(true);
    setIsMinimized(false);
    setIsReconnecting(false);
  }, [stopAudioAndVibration, cleanupWebRTC]);

  // 5. End Active Call
  const endCall = useCallback(() => {
    const id = currentCallIdRef.current;
    if (socket && id) {
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          new BroadcastChannel('tolee_calls').postMessage({ type: 'CALL_ENDED', callId: id });
        }
      } catch (_) {}
      socket.emit('end-call', { callId: id });
    }
    stopAudioAndVibration();
    setCallState('ended');
    playEndTone();
    setTimeout(() => resetCall(), 1200);
  }, [socket, stopAudioAndVibration, playEndTone, resetCall]);

  // 6. Reject Incoming Call
  const rejectIncomingCall = useCallback((reason: 'declined' | 'busy' | 'failed' = 'declined') => {
    const id = currentCallIdRef.current;
    if (socket && id) {
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          new BroadcastChannel('tolee_calls').postMessage({ type: 'CALL_REJECTED', callId: id });
        }
      } catch (_) {}
      socket.emit('reject-call', { callId: id, reason });
    }
    stopAudioAndVibration();
    setCallState('idle');
    resetCall();
  }, [socket, stopAudioAndVibration, resetCall]);

  // 7. Accept Incoming Call
  const acceptIncomingCall = useCallback(async () => {
    const id = currentCallIdRef.current;
    if (!socket || !id) return;

    stopAudioAndVibration();
    setCallState('connecting');

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        new BroadcastChannel('tolee_calls').postMessage({ type: 'CALL_ANSWERED', callId: id });
      }
    } catch (_) {}

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

      // Handle Reconnection & Network Drops
      pc.onconnectionstatechange = () => {
        console.log('[Call Client] PeerConnection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setIsReconnecting(false);
          setCallState('connected');
        } else if (pc.connectionState === 'disconnected') {
          setIsReconnecting(true);
        } else if (pc.connectionState === 'failed') {
          setIsReconnecting(false);
          setCallState('failed');
          setFailureReason('failed');
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected') {
          setIsReconnecting(true);
        } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setIsReconnecting(false);
        } else if (pc.iceConnectionState === 'failed') {
          setIsReconnecting(false);
          setCallState('failed');
          setFailureReason('failed');
        }
      };

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
            callId: id
          });
        }
      };

      // Handle Remote Stream
      pc.ontrack = (event) => {
        console.log('[Call Client] Remote track received:', event.track.kind);
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
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('accept-call', {
          callId: id,
          answer
        });

        await processIceQueue();
      }
      delete (window as any).incomingOffer;

      setCallState('connected');
    } catch (err) {
      console.error('[Call Client] Failed to accept incoming call:', err);
      rejectIncomingCall('failed');
    }
  }, [socket, callType, partner.id, rejectIncomingCall, stopAudioAndVibration]);

  // 8. Outgoing Call Setup
  const initiateCall = useCallback(async (
    type: 'audio' | 'video',
    targetId?: string,
    targetName?: string,
    targetAvatar?: string
  ) => {
    const destId = targetId || activeRecipientId;
    if (!socket || !destId) {
      console.warn('[Call Client] Cannot initiate call without socket or recipient ID');
      return;
    }

    const destName = targetName || activeRecipientName || 'Tolee User';
    const destAvatar = targetAvatar || activeRecipientAvatar || '/default-user-avatar.svg';

    initAudioContext();
    setCallType(type);
    setPartner({ id: destId, name: destName, avatar: destAvatar });
    setCallState('calling');
    setIsMinimized(false);
    playDialTone();

    const callId = 'call-' + Math.random().toString(36).substring(2, 11);
    setCurrentCallId(callId);

    // 40s Client Safeguard Timeout for No Answer
    if (callTimeoutTimerRef.current) clearTimeout(callTimeoutTimerRef.current);
    callTimeoutTimerRef.current = setTimeout(() => {
      if (callStateRef.current === 'calling' || callStateRef.current === 'ringing') {
        setFailureReason('timeout');
        setCallState('failed');
        stopAudioAndVibration();
        playBusyTone();
        setTimeout(() => resetCall(), 3000);
      }
    }, 40000);

    try {
      const constraints = {
        audio: true,
        video: type === 'video' ? { facingMode: 'user' } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (type === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(iceServers);
      peerConnectionRef.current = pc;

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setIsReconnecting(false);
          setCallState('connected');
        } else if (pc.connectionState === 'disconnected') {
          setIsReconnecting(true);
        } else if (pc.connectionState === 'failed') {
          setIsReconnecting(false);
          setCallState('failed');
          setFailureReason('failed');
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected') {
          setIsReconnecting(true);
        } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setIsReconnecting(false);
        } else if (pc.iceConnectionState === 'failed') {
          setIsReconnecting(false);
          setCallState('failed');
          setFailureReason('failed');
        }
      };

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            toUserId: destId,
            candidate: event.candidate,
            callId
          });
        }
      };

      pc.ontrack = (event) => {
        console.log('[Call Client] Remote media track arrived:', event.track.kind);
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call-user', {
        toUserId: destId,
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
      stopAudioAndVibration();
      setTimeout(() => resetCall(), 3000);
    }
  }, [socket, activeRecipientId, activeRecipientName, activeRecipientAvatar, currentUserName, currentUserAvatar, initAudioContext, playDialTone, playBusyTone, stopAudioAndVibration, resetCall]);

  // 9. Camera Flip / Switch (Front vs Back)
  const switchCamera = async () => {
    if (callType !== 'video' || !localStreamRef.current) return;
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: nextMode } },
        audio: false
      }).catch(() => {
        return navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextMode },
          audio: false
        });
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (newVideoTrack && peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
        const oldTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldTrack) oldTrack.stop();

        localStreamRef.current.removeTrack(oldTrack);
        localStreamRef.current.addTrack(newVideoTrack);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        setFacingMode(nextMode);
      }
    } catch (err) {
      console.warn('[Call Client] Failed to switch camera:', err);
    }
  };

  // 10. Mute Mic / Video Controls
  const toggleMuteMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current && callType === 'video') {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoDisabled(!videoTrack.enabled);
      }
    }
  };

  const toggleSpeaker = async () => {
    if (remoteVideoRef.current && 'setSinkId' in remoteVideoRef.current) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter(d => d.kind === 'audiooutput');
        if (outputs.length > 1) {
          const nextDeviceId = isSpeakerOn ? outputs[0].deviceId : outputs[outputs.length - 1].deviceId;
          await (remoteVideoRef.current as any).setSinkId(nextDeviceId);
        }
      } catch (_) {}
    }
    setIsSpeakerOn(prev => !prev);
  };

  // 11. Socket.io Connection & Signaling Event Listeners
  useEffect(() => {
    if (!currentUserId) return;

    const SOCKET_URL = getSocketUrl();
    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500
    });

    s.on('connect', () => {
      console.log('[Call Client] Connected to signaling server:', s.id);
      s.emit('register-user', { userId: currentUserId });
    });

    // Handle Incoming Call Event
    s.on('incoming-call', ({ fromUserId, fromName, fromAvatar, offer, type, callId }) => {
      // Duplicate event & active-call guard
      if (currentCallIdRef.current === callId) return;
      if (callStateRef.current === 'connected' || callStateRef.current === 'incoming') {
        console.log('[Call Client] Busy: already handling a call, rejecting new call');
        s.emit('reject-call', { callId, reason: 'busy' });
        return;
      }

      console.log('[Call Client] Incoming call received from:', fromName);
      setCallType(type);
      setPartner({ id: fromUserId, name: fromName, avatar: fromAvatar || '/default-user-avatar.svg' });
      setCurrentCallId(callId);
      setCallState('incoming');
      setIsMinimized(false);

      (window as any).incomingOffer = offer;
      startRingtoneAndVibration(fromName, type, callId);
    });

    // Handle Remote Ringing Status (Caller Side)
    s.on('call-ringing', () => {
      setCallState('ringing');
    });

    // Handle Call Accepted by Remote Peer
    s.on('call-accepted', async ({ answer }) => {
      stopAudioAndVibration();
      setCallState('connected');
      if (callTimeoutTimerRef.current) {
        clearTimeout(callTimeoutTimerRef.current);
        callTimeoutTimerRef.current = null;
      }
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
      stopAudioAndVibration();
      setFailureReason(reason || 'declined');
      setCallState('failed');
      playBusyTone();
      setTimeout(() => resetCall(), 3500);
    });

    // Handle Call Failure (Busy / Offline / Timeout)
    s.on('call-failed', ({ reason }) => {
      stopAudioAndVibration();
      setFailureReason(reason || 'failed');
      setCallState('failed');
      playBusyTone();
      setTimeout(() => resetCall(), 3500);
    });

    // Handle Call Ended
    s.on('call-ended', () => {
      stopAudioAndVibration();
      setCallState('ended');
      playEndTone();
      setTimeout(() => resetCall(), 1500);
    });

    // Handle Remote ICE Candidates
    s.on('ice-candidate', async ({ candidate }) => {
      if (!candidate) return;
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[Call Client] Error adding ICE candidate:', err);
        }
      } else {
        iceCandidatesQueueRef.current.push(candidate);
      }
    });

    setSocket(s);

    // Global helper for opening outgoing calls from any button in the app
    (window as any).startOutgoingCall = (
      type: 'audio' | 'video',
      targetId?: string,
      targetName?: string,
      targetAvatar?: string
    ) => {
      initiateCall(type, targetId, targetName, targetAvatar);
    };

    return () => {
      s.disconnect();
      stopAudioAndVibration();
      cleanupWebRTC();
      delete (window as any).startOutgoingCall;
    };
  }, [currentUserId, initiateCall, startRingtoneAndVibration, stopAudioAndVibration, playBusyTone, playEndTone, resetCall, cleanupWebRTC]);

  // 12. Multi-Tab Broadcast Channel Sync
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel('tolee_calls');

    bc.onmessage = (event) => {
      const { type, callId } = event.data || {};
      if (type === 'CALL_ANSWERED' || type === 'CALL_REJECTED' || type === 'CALL_ENDED') {
        if (callState === 'incoming' && (!callId || callId === currentCallId)) {
          stopAudioAndVibration();
          resetCall();
        }
      }
    };

    return () => {
      bc.close();
    };
  }, [callState, currentCallId, stopAudioAndVibration, resetCall]);

  // 13. Service Worker Signal & URL Search Params Handling (Push Notifications / PWA)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleIncomingParams = () => {
      const params = new URLSearchParams(window.location.search);
      const callId = params.get('callId');
      const action = params.get('action');
      const incoming = params.get('incoming');
      const callerId = params.get('callerId');
      const callerName = params.get('callerName') || 'Tolee User';
      const callerAvatar = params.get('callerAvatar') || '/default-user-avatar.svg';
      const type = (params.get('callType') as 'audio' | 'video') || 'audio';

      if (callId) {
        if (incoming === 'true' && callState === 'idle') {
          setCallType(type);
          setPartner({ id: callerId || '', name: decodeURIComponent(callerName), avatar: decodeURIComponent(callerAvatar) });
          setCurrentCallId(callId);
          setCallState('incoming');
          startRingtoneAndVibration(decodeURIComponent(callerName), type, callId);
        } else if (action === 'answer' && (callState === 'incoming' || callState === 'idle')) {
          setCallType(type);
          setPartner({ id: callerId || '', name: decodeURIComponent(callerName), avatar: decodeURIComponent(callerAvatar) });
          setCurrentCallId(callId);
          acceptIncomingCall();
        }

        // Clean query params from URL
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('callId');
        cleanUrl.searchParams.delete('action');
        cleanUrl.searchParams.delete('incoming');
        cleanUrl.searchParams.delete('callerId');
        cleanUrl.searchParams.delete('callerName');
        cleanUrl.searchParams.delete('callerAvatar');
        cleanUrl.searchParams.delete('callType');
        window.history.replaceState({}, '', cleanUrl.pathname + (cleanUrl.search ? cleanUrl.search : ''));
      }
    };

    handleIncomingParams();

    if ('serviceWorker' in navigator) {
      const handleSwMessage = (event: MessageEvent) => {
        const { type, callId, callerName, callerId, callerAvatar, callType } = event.data || {};
        if (type === 'INCOMING_CALL_ANSWER_SIGNAL') {
          if (callId) {
            setCurrentCallId(callId);
            setCallType(callType || 'audio');
            setPartner({ id: callerId || '', name: callerName || 'Tolee User', avatar: callerAvatar || '/default-user-avatar.svg' });
            acceptIncomingCall();
          }
        } else if (type === 'INCOMING_CALL_SIGNAL') {
          if (callId && callStateRef.current === 'idle') {
            setCurrentCallId(callId);
            setCallType(callType || 'audio');
            setPartner({ id: callerId || '', name: callerName || 'Tolee User', avatar: callerAvatar || '/default-user-avatar.svg' });
            setCallState('incoming');
            startRingtoneAndVibration(callerName || 'Tolee User', callType || 'audio', callId);
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      };
    }
  }, [callState, acceptIncomingCall, startRingtoneAndVibration]);

  // Duration Counter
  useEffect(() => {
    if (callState === 'connected') {
      setCallDuration(0);
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      // Bind streams safely to DOM video elements
      const timer = setTimeout(() => {
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        if (remoteVideoRef.current && remoteStreamRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
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

  // Trigger global state callback
  useEffect(() => {
    if (onCallStateChange) {
      onCallStateChange(callState !== 'idle');
    }
  }, [callState, onCallStateChange]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (callState === 'idle') return null;

  // ─── Floating Minimized Call Widget ───
  if (isMinimized && callState === 'connected') {
    return (
      <div className="fixed bottom-24 right-4 z-[99999] bg-zinc-950/95 border border-zinc-700/80 shadow-2xl rounded-2xl p-2.5 flex items-center gap-3 text-white backdrop-blur-md animate-fade-in select-none">
        <div className="hidden">
          <video ref={remoteVideoRef} autoPlay playsInline />
          <video ref={localVideoRef} autoPlay playsInline muted />
        </div>
        <div 
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-500/70 relative shrink-0">
            <img src={partner.avatar} alt={partner.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold truncate max-w-[100px]">{partner.name}</span>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              {formatDuration(callDuration)}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsMinimized(false)}
          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          title="Expand Call"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={endCall}
          className="w-9 h-9 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all"
          title="End Call"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ─── Full-Screen Calling / Connected / Reconnecting Experience ───
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 sm:backdrop-blur-md font-sans select-none text-white p-0 sm:p-4">
      <div className="w-full h-full sm:h-[90vh] sm:max-h-[800px] sm:max-w-lg bg-zinc-950 sm:border sm:border-zinc-800/80 sm:rounded-3xl overflow-hidden shadow-2xl relative flex flex-col">

        {/* Minimize Button */}
        {callState === 'connected' && (
          <button 
            onClick={() => setIsMinimized(true)}
            className="absolute top-4 right-4 z-40 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-zinc-200 backdrop-blur-sm transition-all active:scale-95"
            title="Minimize Call"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        )}

        {/* Reconnecting Overlay Banner */}
        {isReconnecting && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-amber-600/90 text-white text-xs font-semibold flex items-center gap-2 shadow-lg backdrop-blur-sm animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Reconnecting...</span>
          </div>
        )}

        {/* ─── 1. Incoming Call / Ringing / Calling Screens ─── */}
        {(callState === 'calling' || callState === 'ringing' || callState === 'incoming' || callState === 'connecting' || callState === 'failed') && (
          <div className="flex-1 flex flex-col items-center justify-between p-6 sm:p-10 text-center bg-gradient-to-b from-zinc-900 via-zinc-950 to-black relative overflow-hidden">
            
            {/* Top Branding / Header */}
            <div className="w-full pt-4">
              <span className="text-[11px] font-bold tracking-widest uppercase text-emerald-400/90 bg-emerald-950/40 border border-emerald-800/30 px-3.5 py-1 rounded-full">
                {callType === 'video' ? '🎥 TOLEE VIDEO CALL' : '📞 TOLEE VOICE CALL'}
              </span>
            </div>

            {/* Caller Profile Avatar with Ripple Wave Effect */}
            <div className="relative my-auto flex flex-col items-center">
              {callState === 'incoming' && (
                <>
                  <div className="absolute -inset-10 rounded-full border border-emerald-500/20 animate-ping pointer-events-none"></div>
                  <div className="absolute -inset-6 rounded-full border border-emerald-500/30 animate-pulse pointer-events-none"></div>
                </>
              )}
              {callState === 'ringing' && (
                <div className="absolute -inset-6 rounded-full border border-teal-500/30 animate-pulse pointer-events-none"></div>
              )}

              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-zinc-800 shadow-2xl relative z-10">
                <img src={partner.avatar} alt={partner.name} className="w-full h-full object-cover" />
              </div>

              <div className="mt-6 space-y-1.5 z-10">
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{partner.name}</h3>
                <p className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-zinc-400">
                  {callState === 'incoming' ? (callType === 'video' ? 'Incoming Video Call...' : 'Incoming Voice Call...') :
                   callState === 'calling' ? 'Calling...' : 
                   callState === 'ringing' ? 'Ringing...' : 
                   callState === 'connecting' ? 'Connecting...' : 
                   failureReason === 'offline' ? 'User is Offline' :
                   failureReason === 'busy' ? 'User is on another call' :
                   failureReason === 'declined' ? 'Call Declined' :
                   failureReason === 'timeout' ? 'No Answer' :
                   'Call Unavailable'}
                </p>
              </div>

              {/* Error Context Banner */}
              {callState === 'failed' && (
                <div className="mt-4 px-5 py-2.5 rounded-2xl bg-red-950/40 border border-red-900/50 max-w-xs text-xs text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>
                    {failureReason === 'offline' ? 'Recipient is offline. A push alert was sent.' : 
                     failureReason === 'busy' ? 'Recipient is currently on another call.' : 
                     failureReason === 'declined' ? 'Call was declined by recipient.' : 
                     failureReason === 'timeout' ? 'No answer from recipient.' : 
                     'Connection lost. Please try again.'}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Actions Row */}
            <div className="pb-8 w-full flex items-center justify-center gap-10 z-10">
              {callState === 'incoming' ? (
                <>
                  <div className="flex flex-col items-center gap-2">
                    <button 
                      onClick={() => rejectIncomingCall('declined')}
                      className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all flex items-center justify-center shadow-2xl border border-red-400/30 text-white"
                      title="Decline Call"
                    >
                      <PhoneOff className="w-7 h-7" />
                    </button>
                    <span className="text-xs font-semibold text-zinc-400">Decline</span>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <button 
                      onClick={acceptIncomingCall}
                      className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center shadow-2xl border border-emerald-400/30 text-white animate-pulse"
                      title="Accept Call"
                    >
                      {callType === 'video' ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
                    </button>
                    <span className="text-xs font-semibold text-emerald-400">Accept</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <button 
                    onClick={endCall}
                    className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all flex items-center justify-center shadow-2xl border border-red-400/30 text-white"
                    title="End Call"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </button>
                  <span className="text-xs font-semibold text-zinc-400">Cancel</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── 2. Connected Audio / Voice Call Screen ─── */}
        {callState === 'connected' && callType === 'audio' && (
          <div className="flex-1 flex flex-col items-center justify-between p-6 sm:p-10 text-center bg-gradient-to-b from-zinc-900 via-zinc-950 to-black relative">
            
            {/* Hidden media elements for Web Audio routing */}
            <div className="hidden">
              <video ref={remoteVideoRef} autoPlay playsInline />
              <video ref={localVideoRef} autoPlay playsInline muted />
            </div>

            <div className="w-full pt-4">
              <span className="text-[11px] font-bold tracking-widest uppercase text-emerald-400/90 bg-emerald-950/40 border border-emerald-800/30 px-3.5 py-1 rounded-full">
                📞 TOLEE VOICE CALL
              </span>
            </div>

            <div className="my-auto space-y-4">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-zinc-800 shadow-2xl mx-auto">
                <img src={partner.avatar} alt={partner.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-white">{partner.name}</h3>
                <p className="text-sm text-emerald-400 font-bold mt-2 flex items-center justify-center gap-2 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  {formatDuration(callDuration)}
                </p>
              </div>
            </div>

            {/* Audio call controls */}
            <div className="pb-8 w-full flex flex-col items-center gap-6">
              <div className="flex gap-6 justify-center">
                <button 
                  onClick={toggleMuteMic}
                  className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${
                    isMuted ? 'bg-zinc-800 border-amber-500 text-amber-500' : 'bg-zinc-900/80 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button 
                  onClick={toggleSpeaker}
                  className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${
                    !isSpeakerOn ? 'bg-zinc-800 border-amber-500 text-amber-500' : 'bg-zinc-900/80 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
                  }`}
                  title={isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
                >
                  {!isSpeakerOn ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </button>
              </div>

              <button 
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all flex items-center justify-center shadow-2xl border border-red-400/30 text-white"
                title="End Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
            </div>
          </div>
        )}

        {/* ─── 3. Connected Video Call Screen ─── */}
        {callState === 'connected' && callType === 'video' && (
          <div className="flex-1 relative bg-black flex flex-col justify-end overflow-hidden">
            
            {/* Fullscreen Remote Video */}
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Float Preview Local Video */}
            <div className="absolute top-4 right-4 w-28 h-40 sm:w-36 sm:h-48 bg-zinc-900 border-2 border-white/20 rounded-2xl overflow-hidden shadow-2xl z-30">
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform -scale-x-100' : ''}`}
              />
              {isVideoDisabled && (
                <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center text-zinc-500 text-[10px]">
                  <VideoOff className="w-6 h-6 text-zinc-600 mb-1" />
                  <span>Camera Off</span>
                </div>
              )}
            </div>

            {/* Top Left Partner Details Badge */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-2xl text-xs flex flex-col z-30 font-mono border border-white/10">
              <span className="font-bold text-white truncate max-w-[130px]">{partner.name}</span>
              <span className="text-emerald-400 font-bold mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                {formatDuration(callDuration)}
              </span>
            </div>

            {/* Bottom Controls Bar */}
            <div className="w-full bg-gradient-to-t from-black/95 via-black/70 to-transparent p-6 flex flex-col items-center gap-4 z-30">
              <div className="flex gap-4 sm:gap-6 justify-center items-center">
                <button 
                  onClick={toggleMuteMic}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all bg-black/70 backdrop-blur-md ${
                    isMuted ? 'border-amber-500 text-amber-500' : 'border-white/20 text-zinc-200 hover:bg-black/90'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button 
                  onClick={toggleVideo}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all bg-black/70 backdrop-blur-md ${
                    isVideoDisabled ? 'border-amber-500 text-amber-500' : 'border-white/20 text-zinc-200 hover:bg-black/90'
                  }`}
                  title={isVideoDisabled ? 'Turn Camera On' : 'Turn Camera Off'}
                >
                  {isVideoDisabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>

                <button 
                  onClick={switchCamera}
                  className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center transition-all bg-black/70 backdrop-blur-md text-zinc-200 hover:bg-black/90"
                  title="Switch Camera"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button 
                  onClick={endCall}
                  className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all flex items-center justify-center text-white shadow-2xl border border-red-400/40"
                  title="End Call"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
