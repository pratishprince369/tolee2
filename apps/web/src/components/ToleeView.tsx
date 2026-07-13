'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal, 
  Image as ImageIcon, Video, FileText, ChevronRight,
  Trophy, Users, Calendar, BookOpen, Star, ShieldCheck,
  TrendingUp, PlayCircle, StopCircle, MapPin, Globe, AlertTriangle, Search, Repeat, Store,
  UtensilsCrossed, ShoppingBag, CheckCircle2, Lock,
  VideoOff, Mic, MicOff, Monitor, Radio, Sparkles
} from 'lucide-react';

import { CreatePostModal } from '@/components/CreatePostModal';
import { PostCarousel } from '@/components/PostCarousel';
import { OptimisticPostCard } from '@/components/OptimisticPostCard';
import { ManageToleeModal } from '@/components/ManageToleeModal';
import { createPost, toggleLike, addComment, getLikes, getComments, toggleSavePost, toggleRepost, getReposts, updatePostVisibility, deletePostPermanently, editPostCaption } from '@/actions/post';
import { joinTolee, leaveToleeGroup, startLiveSession, endLiveSession, requestToJoinLive, handleLiveJoinRequest, getLiveJoinRequests, getMemberLiveStatus } from '@/actions/tolee';
import { io } from 'socket.io-client';
import { createMeeting, getToleeMeetings, updateMeetingStatus } from '@/actions/meeting';


function getSocketUrl() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (typeof window === 'undefined') return 'http://localhost:4000';
  const h = window.location.hostname;
  const isLocal = h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.') || h.startsWith('10.') || h.startsWith('172.');
  return isLocal ? `http://${h}:4000` : 'https://api.tolee.in';
}
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Share2, LogOut, Copy } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { ReShareModal } from '@/components/ReShareModal';
import { ShareModal } from '@/components/ShareModal';
import { ViewTracker } from '@/components/ViewTracker';
import { formatViewCount } from '@/lib/utils';
import { triggerAuthModal } from '@/components/AuthModal';

export function ToleeView({ toleeData, currentUserId }: { toleeData: any, currentUserId: string | null }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { tolee, posts, leaderboard, membershipStatus, role } = toleeData || {};
  const isAdmin = role === 'admin';
  const isMember = membershipStatus === 'approved';
  
  const [activeTab, setActiveTab] = useState(isMember ? 'community' : 'about');
  const [isJoining, setIsJoining] = useState(false);
  
  const searchParams = useSearchParams();
  const [showCongrats, setShowCongrats] = useState(false);

  React.useEffect(() => {
    if (searchParams?.get('created') === 'true') {
      setShowCongrats(true);
      const newUrl = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    }
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'live' && isMember) {
      setActiveTab('live');
    }
  }, [searchParams, isMember]);

  // Masterclass Live Stage States
  const [isLive, setIsLive] = useState(tolee?.isLive || false);
  const [liveSessionType, setLiveSessionType] = useState<'public' | 'private' | null>(tolee?.liveSessionType || null);
  const [liveHostId, setLiveHostId] = useState<string | null>(tolee?.liveHostId || null);
  const [liveViewerCount, setLiveViewerCount] = useState(tolee?.liveViewerCount || 0);
  const [liveStartedAt, setLiveStartedAt] = useState<string | null>(tolee?.liveStartedAt ? new Date(tolee.liveStartedAt).toISOString() : null);
  const [myLiveRequestStatus, setMyLiveRequestStatus] = useState<string | null>(null);
  const [liveJoinRequests, setLiveJoinRequests] = useState<any[]>([]);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number, emoji: string, style: React.CSSProperties }[]>([]);
  const emojiIdCounter = useRef(0);
  const socketRef = useRef<any>(null);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isUserJoined, setIsUserJoined] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [liveChatMessages, setLiveChatMessages] = useState<any[]>([]);
  const [liveChatInput, setLiveChatInput] = useState('');
  
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const memberPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const memberVideoRef = useRef<HTMLVideoElement>(null);
  const [meetingsList, setMeetingsList] = useState<any[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  const isAdminRef = useRef(isAdmin);
  useEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);

  // Fetch active Google Meet sessions on Live tab click
  useEffect(() => {
    if (activeTab === 'live' && tolee?.id) {
      const loadMeetings = async () => {
        setLoadingMeetings(true);
        const res = await getToleeMeetings(tolee.id);
        if (res.success) {
          setMeetingsList(res.meetings || []);
        }
        setLoadingMeetings(false);
      };
      loadMeetings();
    }
  }, [activeTab, tolee?.id]);

  const handleStartInstantMeeting = async () => {
    try {
      const title = window.prompt("Enter Meeting Title:", `${tolee.name} Masterclass`) || `${tolee.name} Masterclass`;
      const visibility = window.confirm("Make this a Public Meeting? (Press OK for Public, Cancel for Private/Waiting Room)") ? 'public' : 'private';
      
      const res = await createMeeting({
        title,
        type: 'meeting',
        visibility,
        toleeId: tolee.id
      });

      if (res.success && res.meeting) {
        router.push(`/live/meeting/${res.meeting.meetingCode}`);
      } else {
        alert("Failed to start meeting: " + (res.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEndMeeting = async (meetingId: string) => {
    if (!window.confirm("Are you sure you want to end this live meeting and clean up all resources?")) {
      return;
    }
    try {
      const res = await updateMeetingStatus(meetingId, 'end');
      if (res.success) {
        alert("Meeting ended and resources cleaned up successfully.");
        const loadRes = await getToleeMeetings(tolee.id);
        if (loadRes.success) {
          setMeetingsList(loadRes.meetings || []);
        }
      } else {
        alert("Failed to end meeting: " + (res.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while ending the meeting.");
    }
  };

  // ICE servers config with TURN fallback for NAT traversal
  const iceServersConfig = useRef({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
    ]
  });

  const triggerFloatingEmoji = (emoji: string) => {
    const id = emojiIdCounter.current++;
    const randomX = Math.floor(Math.random() * 80) + 10;
    const randomSize = Math.floor(Math.random() * 20) + 20;
    const style: React.CSSProperties = {
      position: 'absolute',
      bottom: '0px',
      left: `${randomX}%`,
      fontSize: `${randomSize}px`,
      zIndex: 50,
      pointerEvents: 'none',
      animation: 'floatUp 3s ease-out forwards',
    };
    setFloatingEmojis(prev => [...prev, { id, emoji, style }]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(item => item.id !== id));
    }, 3000);
  };

  const startLiveBroadcast = async () => {
    try {
      const type = window.confirm("Do you want to host a Public Live Session? (Press OK for Public, Cancel for Private)") ? 'public' : 'private';

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      cameraStreamRef.current = stream;
      
      const res = await startLiveSession(tolee.id, type);
      if (!res.success) {
        alert("Failed to start live session: " + res.error);
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      setIsLive(true);
      setLiveSessionType(type);
      setLiveHostId(currentUserId);
      setIsCamOn(true);
      setIsMicOn(true);
      setViewerCount(1);
      
      setLiveChatMessages([
        { sender: 'System 🤖', avatar: '', message: `🔴 Live Masterclass started as ${type} session!`, time: 'Now', isSystem: true }
      ]);

      setTimeout(() => {
        if (videoElementRef.current) {
          videoElementRef.current.srcObject = stream;
        }
      }, 300);

      if (socketRef.current?.connected) {
        socketRef.current.emit('tolee-live-started', { toleeId: tolee.id, type });
        socketRef.current.emit('tolee-participant-joined', { toleeId: tolee.id, userId: currentUserId, name: session?.user?.name || 'Admin', avatar: session?.user?.image || '' });
      }
    } catch (err) {
      console.error('Failed to start camera:', err);
      alert('Camera access is required to host the Live Masterclass.');
    }
  };

  const toggleCamera = () => {
    if (cameraStreamRef.current) {
      const videoTrack = cameraStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (cameraStreamRef.current) {
      const audioTrack = cameraStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const replaceVideoTrack = (newStream: MediaStream) => {
    const videoTrack = newStream.getVideoTracks()[0];
    peerConnectionsRef.current.forEach(pc => {
      const senders = pc.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');
      if (videoSender && videoTrack) {
        videoSender.replaceTrack(videoTrack).catch(err => {
          console.log('[WebRTC] Failed to replace video track:', err);
        });
      }
    });
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      if (videoElementRef.current && cameraStreamRef.current) {
        videoElementRef.current.srcObject = cameraStreamRef.current;
        replaceVideoTrack(cameraStreamRef.current);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        setIsScreenSharing(true);
        if (videoElementRef.current) {
          videoElementRef.current.srcObject = stream;
          replaceVideoTrack(stream);
        }
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          if (videoElementRef.current && cameraStreamRef.current) {
            videoElementRef.current.srcObject = cameraStreamRef.current;
            replaceVideoTrack(cameraStreamRef.current);
          }
        };
      } catch (err) {
        console.error('Failed to screenshare:', err);
      }
    }
  };

  const stopLiveBroadcast = async () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }

    // Close all viewer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    
    await endLiveSession(tolee.id);

    setIsLive(false);
    setLiveSessionType(null);
    setLiveHostId(null);
    setIsScreenSharing(false);
    setIsUserJoined(false);
    setViewerCount(0);
    setLiveChatMessages([]);
    setLiveJoinRequests([]);

    if (socketRef.current?.connected) {
      socketRef.current.emit('tolee-live-ended', { toleeId: tolee.id });
    }
  };

  const handleJoinLiveClick = async () => {
    if (liveSessionType === 'public') {
      joinLiveBroadcast();
    } else {
      const res = await requestToJoinLive(tolee.id);
      if (res.success) {
        setMyLiveRequestStatus('pending');
        if (socketRef.current?.connected) {
          socketRef.current.emit('tolee-join-request', {
            toleeId: tolee.id,
            userId: currentUserId,
            name: session?.user?.name || 'User',
            avatar: session?.user?.image || ''
          });
        }
        alert("Join request sent to Admin. Please wait for approval.");
      } else {
        alert("Request failed: " + res.error);
      }
    }
  };

  const joinLiveBroadcast = () => {
    console.log(`[DEBUG] [User Joined Live] User: ${currentUserId} (${session?.user?.name || 'User'}) joined live session for Tolee ID: ${tolee.id}`);
    setIsUserJoined(true);
    setLiveChatMessages([
      { sender: 'System 🤖', avatar: '', message: '👋 You joined the Live Masterclass. Hello!', time: 'Now', isSystem: true }
    ]);
    if (socketRef.current?.connected) {
      socketRef.current.emit('tolee-participant-joined', {
        toleeId: tolee.id,
        userId: currentUserId,
        name: session?.user?.name || 'User',
        avatar: session?.user?.image || ''
      });
    }
  };

  const leaveLiveBroadcast = () => {
    setIsUserJoined(false);
    setLiveChatMessages([]);
    if (memberPeerConnectionRef.current) {
      memberPeerConnectionRef.current.close();
      memberPeerConnectionRef.current = null;
    }
    if (socketRef.current?.connected) {
      socketRef.current.emit('tolee-participant-left', {
        toleeId: tolee.id,
        userId: currentUserId,
        name: session?.user?.name || 'User'
      });
    }
  };

  const raiseHand = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('tolee-live-hand-raise', {
        toleeId: tolee.id,
        userId: currentUserId,
        name: session?.user?.name || 'User',
        avatar: session?.user?.image || ''
      });
      alert("Hand raised! Request sent to Admin to speak.");
    }
  };

  const sendReaction = (emoji: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('tolee-live-reaction', { toleeId: tolee.id, emoji });
    } else {
      triggerFloatingEmoji(emoji);
    }
  };

  const sendLiveChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveChatInput.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sender = session?.user?.name || 'User';
    const avatar = session?.user?.image || '/default-user-avatar.svg';
    const message = liveChatInput.trim();

    if (socketRef.current?.connected) {
      socketRef.current.emit('tolee-live-chat', {
        toleeId: tolee.id,
        sender,
        avatar,
        message,
        time
      });
    } else {
      setLiveChatMessages(prev => [...prev, { sender, avatar, message, time }]);
    }
    setLiveChatInput('');
  };

  // Socket Connection and initial state sync effects
  // IMPORTANT: Only depend on currentUserId so socket is NOT re-created when isLive/isAdmin changes.
  // Re-creating the socket mid-handshake destroys all WebRTC peer connections => black screen.
  useEffect(() => {
    if (!currentUserId) return;

    const SOCKET_URL = getSocketUrl();
    console.log('[Live View Socket] Connecting to:', SOCKET_URL);
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Live View Socket] Connected!', socket.id);
      socket.emit('join-tolee-room', { toleeId: tolee.id, userId: currentUserId });
    });

    socket.on('tolee-viewer-count-update', ({ viewerCount }: { viewerCount: number }) => {
      console.log('[DEBUG] [Viewer Count Updated] Real-time viewers:', viewerCount);
      setViewerCount(viewerCount);
    });

    socket.on('tolee-webrtc-offer', async ({ offer, fromUserId }: any) => {
      if (isAdminRef.current) return; // Only viewers handle offers
      console.log('[WebRTC] Viewer received offer from host:', fromUserId);
      
      // Close existing peer connection if any
      if (memberPeerConnectionRef.current) {
        memberPeerConnectionRef.current.close();
        memberPeerConnectionRef.current = null;
      }

      const pc = new RTCPeerConnection(iceServersConfig.current);
      memberPeerConnectionRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('tolee-webrtc-ice-candidate', {
            toleeId: tolee.id,
            toUserId: fromUserId,
            candidate: event.candidate,
            fromUserId: currentUserId
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC] Viewer ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          console.warn('[WebRTC] ICE connection failed - attempting restart');
          pc.restartIce();
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Viewer connection state:', pc.connectionState);
      };

      pc.ontrack = (event) => {
        console.log('[WebRTC] Remote track received! kind:', event.track.kind, 'readyState:', event.track.readyState);
        // Use event.streams[0] if available, otherwise create a new MediaStream from the track
        const stream = event.streams?.[0] || new MediaStream([event.track]);
        remoteStreamRef.current = stream;
        console.log('[WebRTC] Remote stream ID:', stream.id, 'tracks:', stream.getTracks().map(t => `${t.kind}:${t.readyState}`));
        
        // Assign to video element immediately if available
        if (memberVideoRef.current) {
          memberVideoRef.current.srcObject = stream;
          memberVideoRef.current.play().catch(e => console.log('[WebRTC] Auto-play blocked:', e));
          console.log('[WebRTC] Stream assigned to member video element');
        } else {
          console.log('[WebRTC] memberVideoRef not ready yet, stream buffered in remoteStreamRef');
        }
      };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        if (socketRef.current) {
          socketRef.current.emit('tolee-webrtc-answer', {
            toleeId: tolee.id,
            toUserId: fromUserId,
            answer,
            fromUserId: currentUserId
          });
          console.log('[WebRTC] Answer sent back to host');
        }
      } catch (err) {
        console.error('[WebRTC] Error handling offer:', err);
      }
    });

    socket.on('tolee-webrtc-answer', async ({ answer, fromUserId }: any) => {
      if (!isAdminRef.current) return; // Only host handles answers
      console.log('[WebRTC] Host received answer from viewer:', fromUserId);
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log('[WebRTC] Remote description set for viewer:', fromUserId);
        } catch (err) {
          console.error('[WebRTC] Error setting remote answer:', err);
        }
      } else {
        console.warn('[WebRTC] No peer connection found for viewer:', fromUserId);
      }
    });

    socket.on('tolee-webrtc-ice-candidate', async ({ candidate, fromUserId }: any) => {
      const pc = isAdminRef.current 
        ? peerConnectionsRef.current.get(fromUserId)
        : memberPeerConnectionRef.current;
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[WebRTC] Error adding ICE candidate:', err);
        }
      }
    });

    socket.on('tolee-live-started', ({ type }: { type: 'public' | 'private' }) => {
      setIsLive(true);
      setLiveSessionType(type);
      setMyLiveRequestStatus(null);
      setLiveChatMessages([
        { sender: 'System 🤖', avatar: '', message: `🔴 Live session has started!`, time: 'Now', isSystem: true }
      ]);
    });

    socket.on('tolee-live-ended', () => {
      setIsLive(false);
      setLiveSessionType(null);
      setLiveHostId(null);
      setIsUserJoined(false);
      setMyLiveRequestStatus(null);
      setLiveChatMessages([]);
      // Clean up viewer peer connection
      if (memberPeerConnectionRef.current) {
        memberPeerConnectionRef.current.close();
        memberPeerConnectionRef.current = null;
      }
      remoteStreamRef.current = null;
      alert("The host has ended the live session.");
    });

    socket.on('tolee-join-request', ({ userId, name, avatar }: any) => {
      if (isAdminRef.current) {
        setLiveJoinRequests(prev => {
          if (prev.some(r => r.userId === userId)) return prev;
          return [...prev, { id: `temp-${userId}`, userId, user: { name, username: name, avatar } }];
        });
        setLiveChatMessages(prev => [
          ...prev,
          { sender: 'System 🤖', avatar: '', message: `🔔 ${name} wants to join this live session.`, time: 'Now', isSystem: true }
        ]);
      }
    });

    socket.on('tolee-join-response', ({ userId, approved }: any) => {
      if (userId === currentUserId) {
        if (approved) {
          setMyLiveRequestStatus('approved');
          joinLiveBroadcast();
        } else {
          setMyLiveRequestStatus('rejected');
          alert("Your request to join the live session was rejected by the admin.");
        }
      }
    });

    socket.on('tolee-participant-joined', async ({ userId, name }: any) => {
      setLiveChatMessages(prev => [
        ...prev,
        { sender: 'System 🤖', avatar: '', message: `👤 ${name} joined the live session.`, time: 'Now', isSystem: true }
      ]);

      if (isAdminRef.current) {
        if (userId === currentUserId) return; // Ignore host
        console.log('[WebRTC] Host initiating connection for viewer:', userId);

        // Close existing connection for this viewer if any
        const existingPc = peerConnectionsRef.current.get(userId);
        if (existingPc) {
          existingPc.close();
          peerConnectionsRef.current.delete(userId);
        }

        const pc = new RTCPeerConnection(iceServersConfig.current);
        peerConnectionsRef.current.set(userId, pc);

        // Add media tracks to the connection
        const activeStream = cameraStreamRef.current || screenStreamRef.current;
        if (activeStream) {
          activeStream.getTracks().forEach(track => {
            pc.addTrack(track, activeStream);
            console.log('[WebRTC] Added track to peer connection:', track.kind, track.readyState);
          });
        } else {
          console.error('[WebRTC] ERROR: No active stream (camera/screen) to send to viewer!');
        }

        pc.onicecandidate = (event) => {
          if (event.candidate && socketRef.current) {
            socketRef.current.emit('tolee-webrtc-ice-candidate', {
              toleeId: tolee.id,
              toUserId: userId,
              candidate: event.candidate,
              fromUserId: currentUserId
            });
          }
        };

        pc.oniceconnectionstatechange = () => {
          console.log(`[WebRTC] Host ICE state for ${userId}:`, pc.iceConnectionState);
        };

        pc.onconnectionstatechange = () => {
          console.log(`[WebRTC] Host connection state for ${userId}:`, pc.connectionState);
        };

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (socketRef.current) {
            socketRef.current.emit('tolee-webrtc-offer', {
              toleeId: tolee.id,
              toUserId: userId,
              offer,
              fromUserId: currentUserId
            });
            console.log('[WebRTC] Offer sent to viewer:', userId);
          }
        } catch (err) {
          console.error('[WebRTC] Error creating offer for new viewer:', err);
        }
      }
    });

    socket.on('tolee-participant-left', ({ userId, name }: any) => {
      setLiveChatMessages(prev => [
        ...prev,
        { sender: 'System 🤖', avatar: '', message: `👤 ${name} left the live session.`, time: 'Now', isSystem: true }
      ]);

      if (isAdminRef.current) {
        const pc = peerConnectionsRef.current.get(userId);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(userId);
        }
      }
    });

    socket.on('tolee-live-chat', ({ sender, avatar, message, time }: any) => {
      setLiveChatMessages(prev => [
        ...prev,
        { sender, avatar, message, time }
      ]);
    });

    socket.on('tolee-live-reaction', ({ emoji }: any) => {
      triggerFloatingEmoji(emoji);
    });

    socket.on('tolee-live-hand-raise', ({ userId, name }: any) => {
      setLiveChatMessages(prev => [
        ...prev,
        { sender: 'System 🤖', avatar: '', message: `🖐️ ${name} raised hand to request speaking.`, time: 'Now', isSystem: true }
      ]);
    });

    socket.on('tolee-live-speak-action', ({ userId, action }: any) => {
      if (userId === currentUserId) {
        if (action === 'approve') {
          alert("Admin approved you to speak. Your mic is now active.");
          setIsMicOn(true);
        } else if (action === 'mute') {
          alert("Admin muted you.");
          setIsMicOn(false);
        }
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();
      if (memberPeerConnectionRef.current) {
        memberPeerConnectionRef.current.close();
        memberPeerConnectionRef.current = null;
      }
      remoteStreamRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  useEffect(() => {
    if (activeTab === 'live') {
      if (isAdmin) {
        getLiveJoinRequests(tolee.id).then(res => {
          if (res.success && res.requests) {
            setLiveJoinRequests(res.requests);
          }
        });
      } else {
        if (liveSessionType === 'public') {
          joinLiveBroadcast();
        } else {
          getMemberLiveStatus(tolee.id).then(res => {
            if (res.success && res.status) {
              setMyLiveRequestStatus(res.status);
              if (res.status === 'approved') {
                joinLiveBroadcast();
              }
            }
          });
        }
      }
    }
  }, [activeTab, isAdmin, tolee.id, liveSessionType]);

  // Cleanup media streams on unmount
  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);



  React.useEffect(() => {
    if (currentUserId) return;

    // Timer to trigger AuthModal after 10 seconds
    const timer = setTimeout(() => {
      if (!document.querySelector('[role="dialog"]')) {
        triggerAuthModal('Sign up or log in to continue enjoying Tolee.');
      }
    }, 10000);

    // Global click listener to intercept guest clicks
    const handleGlobalClick = (e: MouseEvent) => {
      // If a modal dialog is already open (like AuthModal), let the clicks pass through
      if (document.querySelector('[role="dialog"]')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      triggerAuthModal('Sign up or log in to continue enjoying Tolee.');
    };

    document.addEventListener('click', handleGlobalClick, true);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, [currentUserId]);

  if (!tolee) {
    return <div className="min-h-screen flex items-center justify-center text-white">Tolee not found</div>;
  }

  const [localPosts, setLocalPosts] = React.useState<any[]>(posts || []);
  React.useEffect(() => {
    setLocalPosts(posts || []);
  }, [posts]);

  const handleNewPost = (post: any, postData: any) => {
    if (post) {
      const isAnon = !!post.isAnonymous;
      const newLocalPost = {
        id: post.id,
        authorId: isAnon ? null : post.authorId,
        visibility: post.visibility,
        author: isAnon ? 'Anonymous' : (post.author?.username || post.author?.name || 'Anonymous'),
        authorAvatar: isAnon ? '/default-user-avatar.svg' : (post.author?.avatar || '/default-user-avatar.svg'),
        isAnonymous: isAnon,
        content: post.caption || '',
        image: post.mediaTypes && post.mediaTypes.split(',')[0] === 'image' ? post.mediaUrls?.split(/,(?=https?:\/\/)/)[0] : null,
        video: post.mediaTypes && post.mediaTypes.split(',')[0] === 'video' ? post.mediaUrls?.split(/,(?=https?:\/\/)/)[0] : null,
        mediaUrls: post.mediaUrls || null,
        mediaTypes: post.mediaTypes || null,
        likes: 0,
        comments: 0,
        reposts: 0,
        time: 'Just now',
        role: post.authorId === tolee.ownerId ? 'Admin' : 'Member',
        isWin: post.postType === 'win',
        postType: post.postType,
        worldProjectId: null,
        worldProject: null,
        likedByMe: false,
        savedByMe: false,
        repostedByMe: false,
        resharedByUser: null,
        createdAt: post.createdAt
      };
      setLocalPosts(prev => [newLocalPost, ...prev]);
    }
  };

  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [activeLikePost, setActiveLikePost] = useState<string | null>(null);
  const [activeRepostPost, setActiveRepostPost] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isRepostModalLoading, setIsRepostModalLoading] = useState(false);
  const [modalLikes, setModalLikes] = useState<any[]>([]);
  const [modalComments, setModalComments] = useState<any[]>([]);
  const [modalReposts, setModalReposts] = useState<any[]>([]);

  // Exclusions and Options Dialog States
  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([]);
  const [hiddenUsernames, setHiddenUsernames] = useState<string[]>([]);
  const [hiddenToleeNames, setHiddenToleeNames] = useState<string[]>([]);
  const [activeOptionsPost, setActiveOptionsPost] = useState<any | null>(null);

  const [reshareModalOpen, setReshareModalOpen] = useState(false);
  const [selectedPostIdForReshare, setSelectedPostIdForReshare] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedPostForShare, setSelectedPostForShare] = useState<any | null>(null);

  const handleReshareSuccess = (id: string) => {
    setLocalPosts((currentPosts: any[]) => 
      currentPosts.map((post: any) => 
        post.id === id 
          ? { 
              ...post, 
              reposts: (post.reposts || 0) + 1,
              repostedByMe: true
            } 
          : post
      )
    );
  };

  const handleProfileClick = (e: React.MouseEvent, username: string) => {
    e.stopPropagation();
    if (!currentUserId) {
      triggerAuthModal('Login or create an account to view user profiles.');
      return;
    }
    router.push(`/u/${username}`);
  };

  const handleSave = async (id: string) => {
    if (!currentUserId) {
      triggerAuthModal('Login or create an account to save posts in this community.');
      return;
    }
    setLocalPosts((currentPosts: any[]) => 
      currentPosts.map((post: any) => 
        post.id === id 
          ? { 
              ...post, 
              savedByMe: !post.savedByMe
            } 
          : post
      )
    );
    await toggleSavePost(id);
  };

  const handleRepost = async (id: string) => {
    if (!currentUserId) {
      triggerAuthModal('Login or create an account to repost posts in this community.');
      return;
    }
    setLocalPosts((currentPosts: any[]) => 
      currentPosts.map((post: any) => 
        post.id === id 
          ? { 
              ...post, 
              reposts: post.repostedByMe ? Math.max(0, (post.reposts || 1) - 1) : (post.reposts || 0) + 1,
              repostedByMe: !post.repostedByMe
            } 
          : post
      )
    );
    await toggleRepost(id);
  };

  const handleLike = async (id: string) => {
    if (!currentUserId) {
      triggerAuthModal('Login or create an account to like posts in this community.');
      return;
    }
    setLocalPosts((currentPosts: any[]) => 
      currentPosts.map((post: any) => 
        post.id === id 
          ? { 
              ...post, 
              likes: post.likedByMe ? post.likes - 1 : post.likes + 1,
              likedByMe: !post.likedByMe
            } 
          : post
      )
    );
    await toggleLike(id);
  };

  const handleCommentSubmit = async (postId: string) => {
    if (!currentUserId) {
      triggerAuthModal('Login or create an account to comment on posts in this community.');
      return;
    }
    if (!commentText.trim()) return;
    
    const text = commentText;
    setCommentText('');

    const tempId = 'temp-' + Date.now();
    const optimisticComment = {
      id: tempId,
      content: text,
      author: {
        name: session?.user?.name || 'You',
        username: (session?.user as any)?.username || 'me',
        avatar: session?.user?.image
      },
      createdAt: new Date().toISOString()
    };

    setLocalPosts((currentPosts: any[]) =>
      currentPosts.map((post: any) =>
        post.id === postId
          ? {
              ...post,
              comments: post.comments + 1,
              commentsList: [...(post.commentsList || []), optimisticComment]
            }
          : post
      )
    );
    
    const res = await addComment(postId, text);
    if (!res.success) {
      setLocalPosts((currentPosts: any[]) =>
        currentPosts.map((post: any) =>
          post.id === postId
            ? {
                ...post,
                comments: post.comments - 1,
                commentsList: (post.commentsList || []).filter((c: any) => c.id !== tempId)
              }
            : post
        )
      );
      alert("Failed to add comment. Please try again.");
    } else {
      if (activeCommentPost === postId) {
        setModalComments(prev => [res.comment, ...prev]);
      }
    }
  };

  const openLikesModal = async (postId: string) => {
    if (!currentUserId) {
      triggerAuthModal('Login or create an account to see who liked this post.');
      return;
    }
    setActiveLikePost(postId);
    setIsModalLoading(true);
    const res = await getLikes(postId);
    if (res.success) {
      setModalLikes(res.likes);
    }
    setIsModalLoading(false);
  };

  const openCommentsModal = async (postId: string) => {
    if (!currentUserId) {
      triggerAuthModal('Login or create an account to view and post comments.');
      return;
    }
    setActiveCommentPost(postId);
    setIsModalLoading(true);
    const res = await getComments(postId);
    if (res.success) {
      setModalComments(res.comments);
    }
    setIsModalLoading(false);
  };

  const openRepostsModal = async (postId: string) => {
    if (!currentUserId) {
      triggerAuthModal('Login or create an account to see who reposted this post.');
      return;
    }
    setActiveRepostPost(postId);
    setIsRepostModalLoading(true);
    const res = await getReposts(postId);
    if (res.success) {
      setModalReposts(res.reposts || []);
    }
    setIsRepostModalLoading(false);
  };

  const handleJoin = async () => {
    if (!currentUserId) {
      triggerAuthModal('Login or create an account to join this Tolee community.');
      return;
    }
    setIsJoining(true);
    await joinTolee(tolee.id);
    setIsJoining(false);
  };

  const handleCopyLink = () => {
    const groupUrl = typeof window !== 'undefined' ? `${window.location.origin}/t/${tolee.slug}` : '';
    navigator.clipboard.writeText(groupUrl);
    alert('Tolee group link copied to clipboard!');
  };

  const handleCopyToleeId = () => {
    navigator.clipboard.writeText(tolee.id);
    alert('Tolee ID copied to clipboard!');
  };

  const handleReportGroup = () => {
    alert('Thank you for reporting this group. Our moderation team will review it.');
  };

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave this Tolee group?')) return;
    setIsJoining(true);
    const res = await leaveToleeGroup(tolee.id);
    setIsJoining(false);
    if (res.success) {
      alert('You have successfully left the group.');
      router.refresh();
    } else {
      alert(res.error || 'Failed to leave group.');
    }
  };

  const isPending = membershipStatus === 'pending';
  const isModerator = role === 'moderator' || isAdmin;

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] font-sans text-gray-900 dark:text-gray-100 w-full max-w-full overflow-x-hidden">
      {/* Tolee Banner & Header */}
      <div className="w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="w-full h-48 md:h-64 relative bg-gray-200 dark:bg-gray-900">
          <img src={tolee.banner || '/default-tolee-cover.svg'} alt={tolee.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>
        
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6 pb-6 -mt-16 relative z-10 w-full">
            <div className="w-32 h-32 rounded-2xl border-4 border-white dark:border-black overflow-hidden bg-white shadow-lg">
              <img src={tolee.avatar || '/default-tolee-avatar.svg'} alt={tolee.name} className="w-full h-full object-cover" />
            </div>
            
            <div className="flex-grow mb-2 min-w-0 w-full">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-1 break-words">
                {tolee.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm font-medium text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary" /> 
                  Created by {tolee.admin?.name || 'Admin'}
                </span>
                <span className="hidden sm:inline text-gray-400">•</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {formatViewCount(tolee.membersCount || 0)} Members</span>
              </div>
            </div>
            
            <div className="flex gap-2 mb-2 w-full md:w-auto items-center">
              {isLive && (
                <Button 
                  onClick={() => {
                    setActiveTab('live');
                    if (!isAdmin && !isUserJoined) {
                      handleJoinLiveClick();
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-4 rounded-xl shadow-lg flex items-center gap-2 animate-pulse h-10 flex-shrink-0"
                >
                  <Radio className="w-4 h-4 animate-ping text-white" />
                  🔴 LIVE NOW
                </Button>
              )}
              {isAdmin ? (
                <div className="flex-1 md:flex-initial">
                  <ManageToleeModal tolee={tolee}>
                    <Button variant="outline" className="w-full font-bold px-6 shadow-md">Manage Tolee</Button>
                  </ManageToleeModal>
                </div>
              ) : isMember ? (
                <div className="flex flex-1 gap-2 min-w-0">
                  <Button variant="outline" className="flex-1 font-bold px-3 text-sm shadow-md truncate" disabled>Joined</Button>
                  <Button 
                    onClick={() => router.push(`/chat?toleeId=${tolee.id}`)}
                    className="flex-1 font-bold px-3 text-sm shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-1.5 transition-all truncate"
                  >
                    <MessageCircle className="w-4 h-4 text-white flex-shrink-0" />
                    <span className="truncate">Chat Room</span>
                  </Button>
                </div>
              ) : isPending ? (
                <Button disabled variant="outline" className="flex-1 font-bold px-6 shadow-md truncate">Requested</Button>
              ) : (
                <Button 
                  onClick={handleJoin} 
                  disabled={isJoining}
                  className="flex-1 font-bold px-4 shadow-md bg-[#0a7c85] hover:bg-[#0a7c85]/90 text-white rounded-full transition-colors h-10 flex items-center justify-center truncate"
                >
                  {isJoining ? 'Processing...' : tolee.isPrivate ? 'Request to Join' : 'Join Tolee'}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300 shadow-md flex items-center justify-center p-0 cursor-pointer flex-shrink-0">
                  <MoreHorizontal className="w-5 h-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-900 rounded-xl p-1.5 shadow-lg">
                  <DropdownMenuItem onClick={handleCopyLink} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer">
                    <Share2 className="w-4 h-4 text-gray-500" />
                    Share Tolee Link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyToleeId} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer">
                    <Copy className="w-4 h-4 text-gray-500" />
                    Copy Tolee ID
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleReportGroup} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer text-amber-600 dark:text-amber-500">
                    <AlertTriangle className="w-4 h-4" />
                    Report Group
                  </DropdownMenuItem>
                  {isMember && !isAdmin && (
                    <>
                      <DropdownMenuSeparator className="my-1 border-gray-100 dark:border-zinc-900" />
                      <DropdownMenuItem onClick={handleLeave} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-500 cursor-pointer">
                        <LogOut className="w-4 h-4" />
                        Leave Group
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Tolee Navigation Tabs */}
          <div className="flex overflow-x-auto hide-scrollbar border-b border-gray-100 dark:border-gray-800">
            {['about', 'community', 'live', 'classroom', 'calendar', 'members', 'leaderboard', 'marketplace'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab 
                    ? 'border-[#0a7c85] text-[#0a7c85]' 
                    : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab === 'live' ? 'Live Masterclass 🎓' : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 pt-8 pb-24 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Feed / Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Create Post Card */}
            {activeTab === 'community' && isMember && (
              <Card className="border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-[#121212]">
                <div className="p-4 flex gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={session?.user?.image || '/default-user-avatar.svg'} />
                    <AvatarFallback>{session?.user?.name?.[0] || 'ME'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow">
                    <CreatePostModal 
                      onPost={handleNewPost}
                      toleeId={tolee.id}
                      toleeName={tolee.name}
                      toleeSlug={tolee.slug}
                    >
                      <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-base py-3 px-4 text-left text-gray-500 cursor-text hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        {tolee.pendingPostApproval && !isModerator ? "Write a post for admin approval..." : "Share something with the community..."}
                      </div>
                    </CreatePostModal>
                    
                    <div className="flex flex-wrap gap-2 justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex gap-1 flex-wrap">
                        <CreatePostModal 
                          onPost={handleNewPost}
                          toleeId={tolee.id}
                        >
                          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-primary rounded-lg h-9 px-3"><ImageIcon className="w-4 h-4 mr-2" /> Image</Button>
                        </CreatePostModal>
                        
                        <CreatePostModal 
                          onPost={handleNewPost}
                          toleeId={tolee.id}
                        >
                          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-primary rounded-lg h-9 px-3"><Video className="w-4 h-4 mr-2" /> Video</Button>
                        </CreatePostModal>
                      </div>
                      
                      <CreatePostModal 
                        onPost={handleNewPost}
                        toleeId={tolee.id}
                      >
                        <Button size="sm" className="font-bold px-6 rounded-lg">Post</Button>
                      </CreatePostModal>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Private Tolee Warning */}
            {!isMember && tolee.isPrivate && activeTab !== 'about' ? (
              <Card className="border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-[#121212] p-10 text-center flex flex-col items-center">
                <ShieldCheck className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
                <h2 className="text-xl font-bold mb-2">This is a Private Tolee</h2>
                <p className="text-gray-500 mb-6">You need to be a member to see this content.</p>
                {isPending ? (
                  <Button disabled variant="outline">Request Pending</Button>
                ) : (
                  <Button onClick={handleJoin} disabled={isJoining} className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-8">{isJoining ? 'Requesting...' : 'Request to Join'}</Button>
                )}
              </Card>
            ) : (
              <>
                {/* About Tab Content (Skool Style) */}
                {activeTab === 'about' && (
                  <div className="space-y-0 bg-white dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                    {/* Big Media - Main showcase with teal gradient overlay */}
                    <div className="w-full aspect-video bg-gray-900 relative overflow-hidden">
                       <img src={tolee.banner || '/default-tolee-cover.svg'} alt="Preview" className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-gradient-to-br from-[#0a7c85]/50 via-transparent to-black/40" />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-20 h-20 border border-white/40 bg-[#0a7c85]/20 rounded-full flex items-center justify-center backdrop-blur-sm cursor-pointer hover:bg-[#0a7c85]/40 transition-colors shadow-2xl">
                            <PlayCircle className="w-10 h-10 text-white ml-1" />
                          </div>
                       </div>
                    </div>
                    {/* Thumbnails below */}
                    <div className="flex gap-3 px-6 pt-4 pb-2 overflow-x-auto hide-scrollbar">
                       <div className="w-28 aspect-video rounded-xl flex-shrink-0 overflow-hidden relative cursor-pointer border-2 border-[#0a7c85]">
                         <img src={tolee.banner || '/default-tolee-cover.svg'} className="w-full h-full object-cover" />
                       </div>
                       <div className="w-28 aspect-video bg-[#0a7c85]/10 rounded-xl flex-shrink-0 flex items-center justify-center cursor-pointer hover:bg-[#0a7c85]/20 transition-colors border border-[#0a7c85]/20">
                         <PlayCircle className="w-8 h-8 text-[#0a7c85]" />
                       </div>
                       <div className="w-28 aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                         <img src={tolee.avatar || '/default-tolee-avatar.svg'} className="w-full h-full object-cover" />
                       </div>
                    </div>
                    {/* Tags / Metadata */}
                    <div className="flex flex-wrap gap-x-6 gap-y-4 px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2 text-[15px] font-bold text-gray-900 dark:text-white">
                        <Globe className="w-5 h-5 text-[#0a7c85]" /> {tolee.isPrivate ? 'Private' : 'Public'}
                      </div>
                      <div className="flex items-center gap-2 text-[15px] font-bold text-gray-900 dark:text-white">
                        <Users className="w-5 h-5 text-[#0a7c85]" /> {formatViewCount(tolee.membersCount || 0)} members
                      </div>
                      <div className="flex items-center gap-2 text-[15px] font-bold text-gray-900 dark:text-white">
                        <Bookmark className="w-5 h-5 text-[#0a7c85]" /> Free
                      </div>
                      <div className="flex items-center gap-2 text-[15px] font-bold text-gray-900 dark:text-white ml-auto">
                        <Avatar className="w-6 h-6 border border-gray-200 dark:border-gray-800"><AvatarImage src={tolee.admin?.avatar}/><AvatarFallback>A</AvatarFallback></Avatar> 
                        By {tolee.admin?.name || 'Admin'} <ShieldCheck className="w-5 h-5 text-[#0a7c85]"/>
                      </div>
                    </div>
                    {/* Description Text */}
                    <div className="p-6 pt-4 text-[15px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed pb-12">
                       {tolee.description || (
                         <>
                           <p className="mb-4">Welcome to {tolee.name}!</p>
                           <p className="mb-4">What you get:</p>
                           <ul className="list-disc pl-5 space-y-2 mb-4">
                             <li>Access to all community discussions and resources</li>
                             <li>Exclusive masterclasses and video content</li>
                             <li>Direct networking with like-minded individuals</li>
                           </ul>
                           <p>Join us to share knowledge, collaborate on projects, and master the future together!</p>
                         </>
                       )}
                    </div>
                  </div>
                )}

                {/* Posts Feed */}
                {activeTab === 'community' && (
                  <>
                    <OptimisticPostCard />
                    {(() => {
                      const visiblePosts = localPosts.filter((post: any) => 
                        !hiddenPostIds.includes(post.id) &&
                        !hiddenUsernames.includes(post.author) &&
                        !hiddenToleeNames.includes(tolee.name)
                      );
                      return visiblePosts.map((post: any) => {
                    if (post.postType === 'world_project') {
                      const wp = post.worldProject;
                      if (!wp) return null;

                      let pagePrefix = '';
                      let actionText = '';
                      let TypeIcon = Globe;
                      let gradientClass = '';

                      if (wp.type === 'WEBSITE') {
                        pagePrefix = 'micro-website';
                        actionText = 'Visit Website';
                        TypeIcon = Globe;
                        gradientClass = 'from-blue-600 to-cyan-500';
                      } else if (wp.type === 'BLOG') {
                        pagePrefix = 'blog';
                        actionText = 'Read Blog';
                        TypeIcon = BookOpen;
                        gradientClass = 'from-purple-600 to-indigo-500';
                      } else if (wp.type === 'RESTAURANT') {
                        pagePrefix = 'restaurant';
                        actionText = 'Order Menu';
                        TypeIcon = UtensilsCrossed;
                        gradientClass = 'from-orange-500 to-red-500';
                      } else if (wp.type === 'STORE') {
                        pagePrefix = 'store';
                        actionText = 'Shop Products';
                        TypeIcon = ShoppingBag;
                        gradientClass = 'from-emerald-600 to-teal-500';
                      }

                      const projectUrl = `/${pagePrefix}/${wp.slug}`;
                      const bannerImg = wp.bannerImage || null;

                      return (
                        <Card key={post.id} className="border-indigo-100 dark:border-indigo-950/30 shadow-md bg-white dark:bg-[#121212] overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800">
                          
                          {/* Shared group/Tolee context banner */}
                          <div className="px-4 py-2.5 border-b border-indigo-50/50 dark:border-indigo-950/20 flex items-center justify-between bg-indigo-50/20 dark:bg-indigo-950/5">
                            <div className="flex items-center gap-2">
                              <TypeIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                                Tolee World {wp.type.toLowerCase()}
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                              Shared in {tolee.name}
                            </span>
                          </div>

                          {/* Creator Info Header */}
                          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div 
                                onClick={(e) => handleProfileClick(e, post.author)}
                                className="cursor-pointer"
                              >
                                <Avatar className="w-9 h-9 border border-gray-100 dark:border-gray-800 shadow-sm">
                                  <AvatarImage src={post.authorAvatar || '/default-user-avatar.svg'} />
                                  <AvatarFallback>{post.author?.[0] || 'U'}</AvatarFallback>
                                </Avatar>
                              </div>
                              <div className="flex flex-col -space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span 
                                    onClick={(e) => handleProfileClick(e, post.author)}
                                    className="font-bold text-[14px] cursor-pointer hover:underline"
                                  >
                                    {post.author}
                                  </span>
                                  <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 text-[9px] h-4 px-1">
                                    Creator
                                  </Badge>
                                </div>
                                <span className="text-[11px] text-gray-500">{post.time}</span>
                              </div>
                            </div>

                            {/* Three-Dot Options Menu Trigger */}
                            <button 
                              onClick={(e) => { e.stopPropagation(); setActiveOptionsPost(post); }}
                              className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/80 active:bg-gray-200 dark:active:bg-gray-700 transition-colors focus:outline-none"
                            >
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                          </CardHeader>

                          {/* Project Content Block */}
                          <CardContent className="px-3 py-2">
                            <div 
                              onClick={() => router.push(projectUrl)} 
                              className="block group/preview cursor-pointer"
                            >
                              <div className="relative rounded-xl overflow-hidden bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 transition-all duration-300 group-hover/preview:border-indigo-300 dark:group-hover/preview:border-indigo-800">
                                
                                {/* Project Banner */}
                                <div className="relative aspect-[16/9] w-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden flex items-center justify-center">
                                  {bannerImg ? (
                                    <img 
                                      src={bannerImg} 
                                      alt={wp.name || 'Project'} 
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover/preview:scale-105"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600&auto=format&fit=crop';
                                      }}
                                    />
                                  ) : (
                                    <div className={`w-full h-full bg-gradient-to-tr ${gradientClass} opacity-80 flex flex-col items-center justify-center text-white p-4`}>
                                      <TypeIcon className="w-12 h-12 stroke-[1.5]" />
                                      <span className="text-[12px] font-bold mt-2 uppercase tracking-widest">{wp.type}</span>
                                    </div>
                                  )}
                                  
                                  {/* Overlay Indicator */}
                                  <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-bold text-[12px] shadow-md flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                                    <span>LIVE</span>
                                  </div>
                                </div>

                                {/* Project Details */}
                                <div className="p-4 flex flex-col gap-1.5">
                                  <h3 className="font-extrabold text-[16px] text-gray-900 dark:text-zinc-50 tracking-tight leading-tight group-hover/preview:text-indigo-600 dark:group-hover/preview:text-indigo-400 transition-colors">
                                    {wp.name}
                                  </h3>

                                  {wp.description && (
                                    <p className="text-[13px] text-gray-600 dark:text-zinc-400 line-clamp-2 leading-relaxed mt-1">
                                      {wp.description}
                                    </p>
                                  )}

                                  {post.location && (
                                    <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-zinc-500 mt-1">
                                      <MapPin className="w-3.5 h-3.5" />
                                      <span>{post.location}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>

                          {/* Footer Actions */}
                          <CardFooter className="px-4 pb-4 pt-2 flex flex-col gap-2.5 border-t border-gray-100 dark:border-gray-800/50 mt-2">
                            <div className="flex items-center justify-between w-full pt-1">
                              <div className="flex items-center gap-4">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleLike(post.id); }} 
                                  className="transition-transform duration-200 active:scale-125 focus:outline-none text-gray-700 dark:text-gray-300 hover:text-red-500"
                                >
                                  <Heart className={`w-5 h-5 transition-colors ${post.likedByMe ? 'fill-red-500 text-red-500' : 'fill-transparent'}`} />
                                </button>

                                <button 
                                  onClick={(e) => { e.stopPropagation(); openCommentsModal(post.id); }} 
                                  className="transition-transform duration-200 active:scale-110 focus:outline-none text-gray-700 dark:text-gray-300 hover:text-blue-500"
                                >
                                  <MessageCircle className="w-5 h-5 fill-transparent transition-colors" />
                                </button>

                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (!currentUserId) {
                                      triggerAuthModal('Login or create an account to repost posts in this community.');
                                      return;
                                    }
                                    setSelectedPostIdForReshare(post.id);
                                    setReshareModalOpen(true);
                                  }} 
                                  className="transition-transform duration-300 hover:rotate-180 active:scale-125 focus:outline-none text-gray-700 dark:text-gray-300 hover:text-green-500"
                                >
                                  <Repeat className={`w-5 h-5 transition-colors ${post.repostedByMe ? 'text-green-500 font-bold' : ''}`} />
                                </button>
                              </div>

                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (!currentUserId) {
                                      triggerAuthModal('Login or create an account to share posts in this community.');
                                      return;
                                    }
                                    setSelectedPostForShare({
                                      ...post,
                                      caption: wp.description || `Check out this creator project: ${wp.name}`,
                                      mediaUrls: bannerImg,
                                      mediaTypes: 'image',
                                      toleeSlug: tolee.slug
                                    });
                                    setShareModalOpen(true);
                                  }} 
                                  className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50 hover:text-indigo-600 transition-colors focus:outline-none"
                                >
                                  <Send className="w-4 h-4" />
                                  <span>Share</span>
                                </button>

                                <Button 
                                  onClick={() => router.push(projectUrl)}
                                  size="sm" 
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 rounded-lg flex items-center gap-1"
                                >
                                  {actionText}
                                </Button>
                              </div>
                            </div>

                            {/* Interactive Stats display */}
                            <div className="flex flex-col gap-0.5 w-full text-[12px] font-semibold text-gray-600 dark:text-zinc-400 px-0.5">
                              <div className="flex items-center gap-3">
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openLikesModal(post.id); }} 
                                  className="cursor-pointer hover:underline"
                                >
                                  {post.likes} {post.likes === 1 ? 'like' : 'likes'}
                                </span>
                                {post.reposts > 0 && (
                                  <span 
                                    onClick={(e) => { e.stopPropagation(); openRepostsModal(post.id); }}
                                    className="cursor-pointer hover:underline"
                                  >
                                    {post.reposts} {post.reposts === 1 ? 'repost' : 'reposts'}
                                  </span>
                                )}
                              </div>
                              {post.comments > 0 ? (
                                <div 
                                  className="text-[12px] text-gray-400 hover:underline cursor-pointer mt-0.5" 
                                  onClick={(e) => { e.stopPropagation(); openCommentsModal(post.id); }}
                                >
                                  View all {post.comments} comments
                                </div>
                              ) : (
                                <div 
                                  className="text-[12px] text-gray-400 hover:underline cursor-pointer mt-0.5"
                                  onClick={(e) => { e.stopPropagation(); openCommentsModal(post.id); }}
                                >
                                  Add a comment...
                                </div>
                              )}
                            </div>
                          </CardFooter>
                        </Card>
                      );
                    }

                    if (post.isMarketplace) {
                      return (
                        <Card 
                          key={post.id} 
                          onClick={() => {
                            if (!currentUserId) {
                              triggerAuthModal('Login or create an account to view marketplace listings.');
                              return;
                            }
                            router.push(`/marketplace/listing/${post.id}`);
                          }}
                          className="border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212] overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.01] cursor-pointer group rounded-2xl flex flex-col relative border"
                        >
                          {/* Premium Seller Info Bar */}
                          <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/50 bg-gray-50/30 dark:bg-white/[0.01]">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-9 h-9 border border-gray-100 dark:border-gray-800 shadow-sm">
                                <AvatarImage src={post.authorAvatar || '/default-user-avatar.svg'} />
                                <AvatarFallback>{post.author?.[0] || 'U'}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col -space-y-0.5">
                                <span className="font-bold text-[14px] text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                                  {post.author}
                                </span>
                                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                                  Seller
                                </span>
                              </div>
                            </div>
                            
                            {/* Premium Marketplace Badge */}
                            <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                              <Store className="w-3.5 h-3.5" /> Marketplace
                            </Badge>
                          </div>

                          {/* Group Context Banner */}
                          <div className="px-4 py-2 bg-blue-50/50 dark:bg-blue-900/10 text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 border-b border-blue-100/30 dark:border-blue-900/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse"></span>
                            Shared in {tolee.name}
                          </div>

                          {/* Responsive Product Layout */}
                          <div className="flex flex-col sm:flex-row gap-5 p-5">
                            {/* Image */}
                            <div className="w-full sm:w-[200px] h-[150px] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 relative shrink-0 shadow-inner">
                              <img 
                                src={post.image || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80'} 
                                alt={post.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-md px-3 py-1 rounded-lg text-white font-extrabold text-xs tracking-wide shadow-md">
                                {post.price}
                              </div>
                            </div>

                            {/* Details */}
                            <div className="flex-1 flex flex-col justify-between py-1">
                              <div className="space-y-2">
                                <h3 className="font-extrabold text-lg md:text-xl text-gray-900 dark:text-white leading-tight group-hover:text-primary transition-colors line-clamp-1">
                                  {post.title}
                                </h3>
                                <p className="text-[13px] text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                                  {post.content}
                                </p>
                              </div>

                              <div className="mt-4 flex items-center justify-between">
                                <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                                  Listed on {post.time}
                                </span>
                                <Button 
                                  size="sm" 
                                  className="font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-md rounded-xl transition-all group-hover:translate-x-0.5"
                                >
                                  View Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    }

                    return (
                      <Card key={post.id} className="border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-[#121212] overflow-hidden transition-all duration-300">
                        <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-2">
                            {post.isAnonymous ? (
                              <Avatar className="w-9 h-9 border border-gray-100 dark:border-gray-800 shadow-sm">
                                <AvatarImage src="/default-user-avatar.svg" />
                                <AvatarFallback>A</AvatarFallback>
                              </Avatar>
                            ) : (
                              <div 
                                onClick={(e) => handleProfileClick(e, post.author)}
                                className="cursor-pointer"
                              >
                                <Avatar className="w-9 h-9 border border-gray-100 dark:border-gray-800 shadow-sm">
                                  <AvatarImage src={post.authorAvatar || '/default-user-avatar.svg'} />
                                  <AvatarFallback>{post.author?.[0] || 'U'}</AvatarFallback>
                                </Avatar>
                              </div>
                            )}
                            <div className="flex flex-col -space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                {post.isAnonymous ? (
                                  <span className="font-bold text-[14px]">
                                    Anonymous
                                  </span>
                                ) : (
                                  <span 
                                    onClick={(e) => handleProfileClick(e, post.author)}
                                    className="font-bold text-[14px] cursor-pointer hover:underline"
                                  >
                                    {post.author || 'Unknown User'}
                                  </span>
                                )}
                                {post.role === 'Moderator' && <Badge variant="secondary" className="bg-primary/10 text-primary text-[9px] h-4 px-1">MOD</Badge>}
                                {post.role === 'Admin' && <Badge variant="secondary" className="bg-red-500/10 text-red-500 text-[9px] h-4 px-1">ADMIN</Badge>}
                              </div>
                              <span className="text-[11px] text-gray-500 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                <span>{post.time}</span>
                                {post.visibility === 'hidden_from_others' && <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-1 rounded font-medium">Only visible to you (hidden from others)</span>}
                                {post.visibility === 'hidden_from_public' && <span className="text-[10px] text-blue-500 bg-blue-500/10 px-1 rounded font-medium">Hidden from Public</span>}
                                {post.visibility === 'only_me' && <span className="text-[10px] text-purple-500 bg-purple-500/10 px-1 rounded font-medium">Only Me</span>}
                              </span>
                               {(() => {
                                 const count = post.reposts || 0;
                                 if (count === 0) return null;
  
                                 if (count === 1) {
                                   let displayName = "";
                                   let avatarUrl = "";
                                   let profileUsername = "";
  
                                   if (post.repostedByMe && session?.user) {
                                     displayName = session.user.name || (session.user as any).username || "You";
                                     avatarUrl = session.user.image || "";
                                     profileUsername = (session.user as any).username || "";
                                   } else if (post.resharedByUser) {
                                     displayName = post.resharedByUser.name || post.resharedByUser.username || "Someone";
                                     avatarUrl = post.resharedByUser.avatar || "";
                                     profileUsername = post.resharedByUser.username || "";
                                   } else {
                                     displayName = "1 person";
                                   }
  
                                   if (!avatarUrl && profileUsername) {
                                     avatarUrl = '/default-user-avatar.svg';
                                   }
  
                                   return (
                                     <div 
                                       onClick={(e) => { e.stopPropagation(); openRepostsModal(post.id); }}
                                       className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400 pl-0.5 animate-in fade-in duration-300 cursor-pointer hover:text-green-500 transition-colors w-fit"
                                     >
                                       <Repeat className="w-3.5 h-3.5 text-green-500" />
                                       <span>ReShared by</span>
                                       {avatarUrl && (
                                         <Avatar className="w-4.5 h-4.5 border border-gray-200 dark:border-zinc-800 scale-90">
                                           <AvatarImage src={avatarUrl} />
                                           <AvatarFallback className="text-[7px]">{displayName[0]}</AvatarFallback>
                                         </Avatar>
                                       )}
                                       {profileUsername ? (
                                         <span 
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             handleProfileClick(e, profileUsername);
                                           }}
                                           className="font-bold hover:underline text-gray-700 dark:text-gray-300 cursor-pointer"
                                         >
                                           {displayName}
                                         </span>
                                       ) : (
                                         <span className="font-bold text-gray-700 dark:text-gray-300">{displayName}</span>
                                       )}
                                     </div>
                                   );
                                 }
  
                                 // Count > 1
                                 return (
                                   <div 
                                     onClick={(e) => { e.stopPropagation(); openRepostsModal(post.id); }}
                                     className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400 pl-0.5 animate-in fade-in duration-300 cursor-pointer hover:text-green-500 transition-colors w-fit"
                                   >
                                     <Repeat className="w-3.5 h-3.5 text-green-500" />
                                     <span>{count} people re-shared this</span>
                                   </div>
                                 );
                               })()}
                            </div>
                          </div>
                          {/* Options button */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveOptionsPost({ ...post, toleeName: tolee.name, toleeSlug: tolee.slug }); }}
                            className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/80 active:bg-gray-200 dark:active:bg-gray-700 transition-colors focus:outline-none"
                          >
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </CardHeader>
                        
                        <CardContent className="px-3 py-2">
                          {post.isWin && (
                            <div className="mb-2 inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                              <Trophy className="w-3 h-3" /> Community Win
                            </div>
                          )}
                          {post.postType === 'poll' && (
                            <div className="mb-2 inline-flex items-center gap-1.5 bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              📊 Community Poll
                            </div>
                          )}
                          {post.postType === 'event' && (
                            <div className="mb-2 inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              📅 Event
                            </div>
                          )}
                          {post.postType === 'announcement' && (
                            <div className="mb-2 inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              📢 Announcement
                            </div>
                          )}
                          {post.postType === 'question' && (
                            <div className="mb-2 inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              ❓ Question
                            </div>
                          )}
                          <p className="text-[14px] leading-snug whitespace-pre-wrap mb-2">{post.content}</p>
                          
                          {(post.mediaUrls || post.image || post.video) && (
                            <div className="mt-2 mx-0.5">
                              <PostCarousel 
                                mediaUrls={post.mediaUrls || post.image || post.video || ''} 
                                mediaTypes={post.mediaTypes || (post.image ? 'image' : 'video')} 
                                postId={post.id} 
                              />
                            </div>
                          )}
                        </CardContent>
  
                        <CardFooter className="px-4 pb-4 flex flex-col gap-3">
                          {/* Instagram-Style Icon-Only Action Bar */}
                          <div className="flex items-center justify-between w-full pt-2 border-t border-gray-100 dark:border-gray-800/50">
                            <div className="flex items-center gap-4">
                              {/* 1. Like Icon */}
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (!currentUserId) { triggerAuthModal('Login or create an account to like posts.'); return; }
                                  handleLike(post.id); 
                                }} 
                                className="transition-transform duration-200 active:scale-125 focus:outline-none text-gray-700 dark:text-gray-300 hover:text-red-500"
                              >
                                <Heart className={`w-6 h-6 transition-colors ${post.likedByMe ? 'fill-red-500 text-red-500' : 'fill-transparent'}`} />
                              </button>
  
                              {/* 2. Comment Icon */}
                              <button 
                                onClick={(e) => { e.stopPropagation(); openCommentsModal(post.id); }} 
                                className="transition-transform duration-200 active:scale-110 focus:outline-none text-gray-700 dark:text-gray-300 hover:text-blue-500"
                              >
                                <MessageCircle className="w-6 h-6 fill-transparent transition-colors" />
                              </button>
  
                              {/* 3. ReShare/Repost Icon */}
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (!currentUserId) {
                                    triggerAuthModal('Login or create an account to repost posts in this community.');
                                    return;
                                  }
                                  setSelectedPostIdForReshare(post.id);
                                  setReshareModalOpen(true);
                                }} 
                                className="transition-transform duration-300 hover:rotate-180 active:scale-125 focus:outline-none text-gray-700 dark:text-gray-300 hover:text-green-500"
                              >
                                <Repeat className={`w-6 h-6 transition-colors ${post.repostedByMe ? 'text-green-500 font-bold' : ''}`} />
                              </button>
  
                              {/* 4. Link Share Icon */}
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (!currentUserId) {
                                    triggerAuthModal('Login or create an account to share posts in this community.');
                                    return;
                                  }
                                  setSelectedPostForShare(post);
                                  setShareModalOpen(true);
                                }} 
                                className="transition-transform duration-200 active:scale-110 focus:outline-none text-gray-700 dark:text-gray-300 hover:text-primary"
                              >
                                <Send className="w-6 h-6 fill-transparent transition-colors" />
                              </button>
                            </div>
  
                            {/* 5. Save/Bookmark Icon (Right Aligned) */}
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                if (!currentUserId) { triggerAuthModal('Login or create an account to save posts.'); return; }
                                handleSave(post.id); 
                              }} 
                              className="flex items-center gap-1 transition-transform duration-200 active:scale-125 focus:outline-none text-gray-700 dark:text-gray-300 hover:text-yellow-500"
                            >
                              <Bookmark className={`w-6 h-6 transition-colors ${post.savedByMe ? 'fill-black dark:fill-white text-black dark:text-white' : 'fill-transparent'}`} />
                              {(post.savesCount || 0) > 0 && (
                                <span className="text-[13px] font-semibold">{formatViewCount(post.savesCount)}</span>
                              )}
                            </button>
                          </div>
  
                          <div className="flex flex-col gap-0.5 w-full text-[13px] font-semibold text-gray-800 dark:text-gray-200 px-0.5 relative">
                            {(!post.mediaTypes?.includes('video') && !post.video) && (
                              <ViewTracker contentId={post.id} contentType="post" />
                            )}
                            <div className="flex items-center gap-3">
                              <span 
                                onClick={(e) => { e.stopPropagation(); openLikesModal(post.id); }} 
                                className="cursor-pointer hover:underline"
                              >
                                {formatViewCount(post.likes)} {post.likes === 1 ? 'like' : 'likes'}
                              </span>
                              <span className="text-gray-500 font-medium">
                                {formatViewCount(post.views || 0)} {post.views === 1 ? 'view' : 'views'}
                              </span>
                              <span className="text-gray-500 font-medium">
                                {formatViewCount(post.shareCount || 0)} {post.shareCount === 1 ? 'share' : 'shares'}
                              </span>
                            </div>
                            {post.reposts > 0 && (
                              <span 
                                onClick={(e) => { e.stopPropagation(); openRepostsModal(post.id); }}
                                className="text-[12px] text-gray-500 font-medium cursor-pointer hover:underline"
                              >
                                {formatViewCount(post.reposts)} {post.reposts === 1 ? 'repost' : 'reposts'}
                              </span>
                            )}
                            {post.comments > 0 ? (
                              <div 
                                className="text-[13px] text-gray-500 dark:text-gray-400 font-normal hover:underline cursor-pointer mt-0.5" 
                                onClick={(e) => { e.stopPropagation(); openCommentsModal(post.id); }}
                              >
                                View all {formatViewCount(post.comments)} comments
                              </div>
                            ) : (
                              <div 
                                className="text-[13px] text-gray-500 dark:text-gray-400 font-normal hover:underline cursor-pointer mt-0.5"
                                onClick={(e) => { e.stopPropagation(); openCommentsModal(post.id); }}
                              >
                                Add a comment...
                              </div>
                            )}
                          </div>
                        </CardFooter>
                      </Card>
                    );
                  });
                })()}
              </>
            )}

            {activeTab === 'live' && (
                  <div className="space-y-6">
                    {/* Header Banner */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-900 to-indigo-950 p-8 text-white shadow-xl border border-teal-500/20">
                      <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
                      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="flex h-2.5 w-2.5 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-teal-400"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                              Tolee Interactive Room
                            </span>
                          </div>
                          <h2 className="text-3xl font-extrabold tracking-tight">Group & Student Meetings Stage</h2>
                          <p className="text-gray-300 mt-2 max-w-xl text-sm leading-relaxed">
                            Start instant meetings, webinars, or classes, share screen, track attendance, and record sessions.
                          </p>
                        </div>
                        
                        {isAdmin && (
                          <Button 
                            onClick={handleStartInstantMeeting}
                            className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold px-8 py-6 rounded-xl shadow-lg shadow-teal-500/25 flex items-center gap-2 transform active:scale-95 transition-all"
                          >
                            <Video className="w-5 h-5" />
                            Start Instant Meeting 🚀
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Active Meetings List Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full bg-red-400 opacity-75 rounded-full"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        Active Live Rooms
                      </h3>

                      {loadingMeetings ? (
                        <div className="text-center py-12 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl">
                          <Loader2 className="w-6 h-6 animate-spin text-teal-500 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">Loading active rooms...</p>
                        </div>
                      ) : meetingsList.length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl text-gray-500 text-sm">
                          No active meetings in this group right now.
                          {isAdmin && (
                            <p className="text-xs text-zinc-500 mt-1">Click "Start Instant Meeting" above to host one.</p>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {meetingsList.map(meeting => (
                            <Card key={meeting.id} className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                              <CardHeader className="p-5 pb-3">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 font-bold">
                                      <Badge variant="outline" className="border-teal-500/35 text-teal-600 dark:text-teal-400 capitalize text-[10px]">
                                        {meeting.type}
                                      </Badge>
                                      <Badge variant="outline" className="border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:border-zinc-400 capitalize text-[10px]">
                                        {meeting.visibility}
                                      </Badge>
                                    </div>
                                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-white mt-1 pr-6 line-clamp-1">{meeting.title}</h4>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="px-5 py-0">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <Avatar className="w-5 h-5">
                                    <AvatarImage src={meeting.host.avatar} />
                                    <AvatarFallback className="text-[9px] bg-zinc-800 font-bold text-teal-400">{meeting.host.name[0]}</AvatarFallback>
                                  </Avatar>
                                  <span>Hosted by <span className="font-bold text-gray-800 dark:text-zinc-200">{meeting.host.name}</span></span>
                                </div>
                              </CardContent>
                              <CardFooter className="p-5 pt-4 flex gap-3">
                                <Button 
                                  onClick={() => router.push(`/live/meeting/${meeting.meetingCode}`)}
                                  className="flex-1 bg-[#0a7c85] hover:bg-[#0a7c85]/90 text-white font-bold rounded-xl text-xs py-5"
                                >
                                  {meeting.hostId === currentUserId ? 'Rejoin Meeting' : 'Join Meeting'}
                                </Button>
                                {(isAdmin || meeting.hostId === currentUserId) && (
                                  <Button
                                    onClick={() => handleEndMeeting(meeting.id)}
                                    variant="destructive"
                                    className="font-bold rounded-xl bg-red-650 hover:bg-red-750 text-white text-xs py-5 px-4 flex items-center gap-1.5"
                                  >
                                    🛑 End Meeting
                                  </Button>
                                )}
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Classroom Tab Content */}
                {activeTab === 'classroom' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { id: 1, title: 'Foundations & Basics', lessons: 12, time: '3h 45m', progress: 100, img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800' },
                      { id: 2, title: 'Advanced Automation Tools', lessons: 8, time: '5h 20m', progress: 45, img: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800' },
                      { id: 3, title: 'Scaling Your System', lessons: 15, time: '12h 10m', progress: 10, img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800' },
                      { id: 4, title: 'Case Studies & ROI', lessons: 6, time: '2h 15m', progress: 0, img: 'https://images.unsplash.com/photo-1551288049-bbdac8a28a80?w=800' },
                    ].map((course) => (
                      <Card key={course.id} className="overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212] group cursor-pointer hover:shadow-md transition-all">
                        <div className="h-44 bg-gray-200 dark:bg-gray-800 relative">
                          <img src={course.img} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center border border-white/50 group-hover:scale-110 transition-transform">
                              <PlayCircle className="w-6 h-6 text-white fill-current" />
                            </div>
                          </div>
                        </div>
                        <CardContent className="p-5">
                          <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{course.title}</h3>
                          <p className="text-sm text-gray-500 mb-4">{course.lessons} Lessons • {course.time}</p>
                          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mb-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${course.progress}%` }}></div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{course.progress === 100 ? 'Completed' : 'In Progress'}</span>
                            <p className="text-xs font-semibold text-gray-500">{course.progress}% Complete</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Members Tab Content */}
                {activeTab === 'members' && (
                  <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212] shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                      <h3 className="font-bold text-lg">Community Members</h3>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input placeholder="Find a member..." className="pl-9 h-9 w-64 rounded-full bg-gray-50 dark:bg-gray-900 border-none" />
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {(toleeData.members && toleeData.members.length > 0 ? toleeData.members : [
                        { id: 'admin', name: tolee.admin?.name || 'Admin', role: 'Admin', avatar: tolee.avatar || '/default-tolee-avatar.svg' }
                      ]).map((member: any) => (
                        <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-11 h-11 border-2 border-white dark:border-gray-800">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback>{member.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-bold text-[15px]">{member.name}</h4>
                              <span className="text-xs text-gray-500">{member.role}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => {
                                if (!currentUserId) {
                                  triggerAuthModal('Login or create an account to message other members.');
                                  return;
                                }
                              }}
                              variant="outline" 
                              size="sm" 
                              className="h-8 rounded-full font-bold"
                            >
                              Message
                            </Button>
                            <Button 
                              onClick={() => {
                                if (!currentUserId) {
                                  triggerAuthModal('Login or create an account to see member details.');
                                  return;
                                }
                              }}
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-full"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 text-center border-t border-gray-100 dark:border-gray-800">
                      <p className="text-sm text-gray-500">Showing {tolee.membersCount} total members</p>
                    </div>
                  </Card>
                )}

                {/* Leaderboard Tab Content */}
                {activeTab === 'leaderboard' && (
                  <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212] shadow-sm">
                    <CardHeader className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold flex items-center gap-2"><Trophy className="w-6 h-6 text-yellow-500" /> Leaderboard</h3>
                          <p className="text-sm text-gray-500 mt-1">Top contributors in the last 30 days</p>
                        </div>
                        <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                          <Button variant="ghost" size="sm" className="bg-white dark:bg-black shadow-sm font-bold">All Time</Button>
                          <Button variant="ghost" size="sm" className="text-gray-500">Monthly</Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                              <th className="px-6 py-4">Rank</th>
                              <th className="px-6 py-4">Member</th>
                              <th className="px-6 py-4">Level</th>
                              <th className="px-6 py-4 text-right">Points</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {leaderboard.map((user: any, index: number) => (
                              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                <td className="px-6 py-4">
                                  <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                                    index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                                    index === 1 ? 'bg-gray-100 text-gray-700' : 
                                    index === 2 ? 'bg-amber-100 text-amber-700' : 'text-gray-500'
                                  }`}>
                                    {index + 1}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="w-10 h-10">
                                      <AvatarImage src={user.avatar} />
                                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-bold text-[15px]">{user.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-primary fill-current" />
                                    <span className="font-semibold text-sm">Level {user.level}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <span className="font-extrabold text-primary">{user.points.toLocaleString()}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Marketplace Tab Content */}
                {activeTab === 'marketplace' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {toleeData.listings && toleeData.listings.length > 0 ? (
                      toleeData.listings.map((item: any) => (
                        <Card 
                          key={item.id} 
                          onClick={() => {
                            if (!currentUserId) {
                              triggerAuthModal('Login or create an account to view marketplace listings.');
                              return;
                            }
                            router.push(`/marketplace/listing/${item.id}`);
                          }}
                          className="overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212] group cursor-pointer hover:shadow-lg transition-all rounded-2xl flex flex-col"
                        >
                          <div className="h-48 bg-gray-100 dark:bg-gray-800 relative overflow-hidden shrink-0">
                            <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <Badge className="absolute top-3 right-3 bg-white/90 dark:bg-black/90 text-black dark:text-white font-bold">{item.price}</Badge>
                          </div>
                          <CardContent className="p-4 flex-1 flex flex-col justify-between">
                            <div>
                              <h3 className="font-bold text-lg mb-1 line-clamp-1">{item.title}</h3>
                              <p className="text-sm text-gray-500 mb-4">Sold by {item.seller}</p>
                            </div>
                            <Button className="w-full font-bold rounded-xl mt-auto bg-blue-600 hover:bg-blue-700 text-white">View Details</Button>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl">
                        <Store className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No group listings yet</h3>
                        <p className="text-sm text-gray-500 max-w-sm">Be the first to list a product, service, property, or job in this Tolee community!</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            
            {/* Join Group Card (Sticky for non-members) */}
            {!isMember && (
              <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212] shadow-xl overflow-hidden sticky top-20 rounded-3xl">
                {/* Group Preview Header */}
                <div className="p-6 flex flex-col items-center border-b border-gray-100 dark:border-gray-800">
                  <Avatar className="w-20 h-20 rounded-full border-4 border-white dark:border-[#121212] shadow-md mb-3 ring-2 ring-[#0a7c85]/20">
                    <AvatarImage src={tolee.avatar || '/default-tolee-avatar.svg'} />
                    <AvatarFallback>{tolee.name[0]}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-extrabold text-xl text-center text-gray-900 dark:text-white leading-tight mb-1">{tolee.name}</h3>
                  <a href={`/t/${tolee.slug}`} className="text-xs text-sky-600 font-medium hover:underline">tolee.in/t/{tolee.slug}</a>
                </div>
                
                <CardContent className="p-5">
                  <p className="text-[13px] text-gray-600 dark:text-gray-400 mb-5 text-center leading-relaxed">
                    Welcome to {tolee.name}!
                  </p>
                  
                  {/* Stats Grid with vertical separators */}
                  <div className="grid grid-cols-3 gap-0 text-center mb-6 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                    <div className="py-3 px-2 border-r border-gray-100 dark:border-gray-800">
                      <div className="text-xl font-bold text-gray-900 dark:text-white">{formatViewCount(tolee.membersCount || 0)}</div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-0.5">Members</div>
                    </div>
                    <div className="py-3 px-2 border-r border-gray-100 dark:border-gray-800">
                      <div className="text-xl font-bold text-[#0a7c85]">{formatViewCount(tolee.membersCount > 5 ? Math.floor(tolee.membersCount * 0.1) : 1)}</div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-0.5">Online</div>
                    </div>
                    <div className="py-3 px-2">
                      <div className="text-xl font-bold text-gray-900 dark:text-white">1</div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-0.5">Admin</div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleJoin} 
                    disabled={isJoining || isPending}
                    className="w-full py-6 text-[14px] font-extrabold bg-[#0a7c85] hover:bg-[#0a7c85]/90 text-white shadow-md rounded-xl mb-4 transition-all hover:scale-[1.02] uppercase tracking-wide"
                  >
                    {isPending ? 'REQUEST PENDING' : isJoining ? 'JOINING...' : 'JOIN GROUP'}
                  </Button>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-[11px] text-gray-400 font-medium">Powered by</span>
                    <span className="text-[11px] font-extrabold text-[#0a7c85] tracking-tight">tolee</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* About Card */}
            <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212] shadow-sm rounded-2xl">
              <CardHeader className="p-5 pb-2">
                <h3 className="font-bold text-lg flex items-center gap-2"><BookOpen className="w-5 h-5 text-[#0a7c85]" /> About this Tolee</h3>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  {tolee.description || `Welcome to ${tolee.name}!`}
                </p>
                <div className="flex flex-col gap-3 text-sm">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-[#0a7c85] shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Admin</p>
                      <p className="text-gray-500">{tolee.admin?.name || 'Admin'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {tolee.isPrivate ? (
                      <AlertTriangle className="w-5 h-5 text-[#0a7c85] shrink-0" />
                    ) : (
                      <Globe className="w-5 h-5 text-[#0a7c85] shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {tolee.isPrivate ? 'Private Tolee' : 'Public Tolee'}
                      </p>
                      <p className="text-gray-500">
                        {tolee.isPrivate ? "Only members can see who's in the tolee and what they post." : "Anyone can see who's in the tolee and what they post."}
                      </p>
                    </div>
                  </div>
                  {tolee.pendingPostApproval && (
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-[#0a7c85] shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Post Approval On</p>
                        <p className="text-gray-500">Admins/Moderators must approve posts.</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Rules Card */}
            {tolee.rules && (
              <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212] shadow-sm rounded-2xl">
                <CardHeader className="p-5 pb-2">
                  <h3 className="font-bold text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-[#0a7c85]" /> Tolee Rules</h3>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <ul className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
                    {tolee.rules.split('\n').map((rule: string, i: number) => rule.trim() ? (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#0a7c85] shrink-0 inline-block" />
                        {rule.trim()}
                      </li>
                    ) : null)}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Leaderboard Preview Card */}
            <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212] shadow-sm rounded-2xl">
              <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2"><Trophy className="w-5 h-5 text-[#0a7c85]" /> Leaderboard</h3>
                <span className="text-xs text-[#0a7c85] font-bold cursor-pointer hover:underline">View all</span>
              </CardHeader>
              <CardContent className="p-5 pt-2">
                <div className="flex flex-col gap-4">
                  {leaderboard.slice(0, 3).map((user: any, index: number) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`font-bold text-sm w-4 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-700' : 'text-gray-500'}`}>
                          {index + 1}
                        </span>
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.avatar || '/default-user-avatar.svg'} />
                          <AvatarFallback>{user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</span>
                          <span className="text-xs text-gray-500">Level {user.level}</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#0a7c85] bg-[#0a7c85]/10 px-2.5 py-1 rounded-full">{user.points} pts</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>

      {/* Facebook Style Comments Modal */}
      <Dialog open={!!activeCommentPost} onOpenChange={(open) => {
        if (!open) {
          setActiveCommentPost(null);
          setModalComments([]);
        }
      }}>
        <DialogContent className="sm:max-w-[500px] bg-white/90 dark:bg-[#121212]/90 backdrop-blur-xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden border-gray-200/50 dark:border-gray-800/50 shadow-2xl rounded-3xl">
          <DialogHeader className="p-4 border-b border-gray-100/50 dark:border-gray-800/50 shrink-0 bg-white/50 dark:bg-black/50">
            <DialogTitle className="text-center font-bold text-lg tracking-tight">Post Comments</DialogTitle>
          </DialogHeader>
          
          {(() => {
            const post = localPosts.find((p: any) => p.id === activeCommentPost);
            if (!post) return null;
            return (
              <>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <div className="p-4 border-b border-gray-100/30 dark:border-gray-800/30 bg-gray-50/30 dark:bg-white/5">
                    <div className="flex items-center gap-2 mb-3">
                      <Avatar className="w-10 h-10 border-2 border-primary/20">
                        <AvatarImage src={post.authorAvatar || '/default-user-avatar.svg'} />
                        <AvatarFallback>{post.author?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-bold text-[15px] flex items-center gap-1.5">
                          {post.author}
                          {post.role === 'Admin' && <Badge className="bg-red-500/10 text-red-500 text-[9px] h-4">ADMIN</Badge>}
                        </div>
                        <div className="text-[11px] text-gray-500">{post.time}</div>
                      </div>
                    </div>
                    <p className="text-[14px] leading-snug whitespace-pre-wrap text-gray-800 dark:text-gray-200">{post.content}</p>
                    {(post.mediaUrls || post.image || post.video) && (
                      <div className="mt-3 mx-0.5">
                        <PostCarousel 
                          mediaUrls={post.mediaUrls || post.image || post.video || ''} 
                          mediaTypes={post.mediaTypes || (post.image ? 'image' : 'video')} 
                          postId={post.id} 
                        />
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center text-[11px] text-gray-500 mt-4 px-1">
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors" onClick={() => { setActiveCommentPost(null); openLikesModal(post.id); }}>
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                          <Heart className="w-3 h-3 text-primary fill-primary" />
                        </div>
                        <span className="font-bold">{post.likes} Reactions</span>
                      </div>
                      <span className="font-medium">{post.comments} comments</span>
                    </div>
                  </div>

                  <div className="p-4 space-y-5">
                    {isModalLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-sm text-gray-500 font-medium">Loading conversation...</p>
                      </div>
                    ) : modalComments.length > 0 ? (
                      modalComments.map((comment: any, idx: number) => (
                        <div key={idx} className="flex gap-3 group">
                          <Avatar className="w-9 h-9 shrink-0 border border-gray-100 dark:border-gray-800">
                            <AvatarImage src={comment.author?.avatar || '/default-user-avatar.svg'} />
                            <AvatarFallback>{comment.author?.name?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col max-w-[85%]">
                            <div className="bg-gray-100/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl rounded-tl-none px-4 py-2.5 text-sm shadow-sm border border-white/10">
                              <span className="font-bold mb-0.5 block text-[13px] text-primary/90">{comment.author?.username || comment.author?.name || 'User'}</span>
                              <span className="text-gray-800 dark:text-gray-200 leading-relaxed">{comment.content}</span>
                            </div>
                            <div className="flex gap-4 text-[11px] text-gray-500 font-bold ml-2 mt-1.5 uppercase tracking-tight opacity-70">
                              <span className="cursor-pointer hover:text-primary transition-colors">Like</span>
                              <span className="cursor-pointer hover:text-primary transition-colors">Reply</span>
                              <span className="font-normal text-[10px] lowercase">Just now</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-20 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center">
                          <MessageCircle className="w-8 h-8 text-gray-300" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">No comments yet</p>
                          <p className="text-xs text-gray-500 mt-1">Be the first one to share your thoughts!</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-gray-100/50 dark:border-gray-800/50 shrink-0 bg-white/80 dark:bg-black/80 backdrop-blur-md">
                  <div className="flex gap-3 items-center">
                    <Avatar className="w-8 h-8 hidden sm:flex">
                      <AvatarImage src={session?.user?.image || ''} />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex gap-2 items-center bg-gray-100 dark:bg-white/5 rounded-2xl px-4 py-1 border border-transparent focus-within:border-primary/30 transition-all">
                      <Input 
                        placeholder="Write a public comment..." 
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 px-0 text-sm h-10"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCommentSubmit(post.id);
                        }}
                      />
                      <Button variant="ghost" size="sm" onClick={() => handleCommentSubmit(post.id)} className="text-primary hover:bg-transparent p-1">
                        <Send className="w-5 h-5 fill-current" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Facebook Style Likes Modal */}
      <Dialog open={!!activeLikePost} onOpenChange={(open) => {
        if (!open) {
          setActiveLikePost(null);
          setModalLikes([]);
        }
      }}>
        <DialogContent className="sm:max-w-[420px] bg-white/90 dark:bg-[#121212]/90 backdrop-blur-xl p-0 gap-0 overflow-hidden border-gray-200/50 dark:border-gray-800/50 shadow-2xl rounded-3xl">
          <DialogHeader className="p-4 border-b border-gray-100/50 dark:border-gray-800/50 bg-white/50 dark:bg-black/50">
            <DialogTitle className="text-center font-bold text-lg flex items-center justify-center gap-2">
               People who reacted
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5 custom-scrollbar">
            {isModalLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-gray-500 font-medium">Fetching reactions...</p>
              </div>
            ) : modalLikes.length > 0 ? (
              modalLikes.map((user: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-11 h-11 border border-gray-100 dark:border-gray-800 shadow-sm transition-transform group-hover:scale-105">
                        <AvatarImage src={user.avatar || '/default-user-avatar.svg'} />
                        <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-900 rounded-full p-[2px] shadow-sm">
                        <div className="bg-primary rounded-full p-0.5">
                          <Heart className="w-2.5 h-2.5 text-white fill-current" />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-[15px] group-hover:text-primary transition-colors">{user.username || user.name}</span>
                      <span className="text-[11px] text-gray-500 font-medium uppercase tracking-tighter opacity-70">Member</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 rounded-full border-primary/20 hover:bg-primary/5 hover:text-primary font-bold text-xs px-4">View Profile</Button>
                </div>
              ))
            ) : (
              <div className="text-center py-16 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center">
                  <Heart className="w-8 h-8 text-gray-300" />
                </div>
                <p className="font-bold text-gray-500">No reactions yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Instagram Style Post Options Modal / Bottom Sheet */}
      <Dialog open={!!activeOptionsPost} onOpenChange={(open) => {
        if (!open) {
          setActiveOptionsPost(null);
        }
      }}>
        <DialogContent className="sm:max-w-[400px] w-full bg-[#1c1c1e] text-white p-0 gap-0 overflow-hidden border border-gray-800 shadow-2xl rounded-3xl">
          <div className="flex flex-col text-center divide-y divide-gray-800/80">
            {session?.user && activeOptionsPost && (
              ((session.user as any).id === activeOptionsPost.authorId || 
               (session.user as any).username === activeOptionsPost.author)
            ) ? (
              <>
                <div className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider bg-white/[0.02]">
                  Post Controls (Owner)
                </div>
                <button 
                  onClick={async () => {
                    const newCaption = window.prompt("Edit your post caption:", activeOptionsPost.content);
                    if (newCaption !== null) {
                      const res = await editPostCaption(activeOptionsPost.id, newCaption);
                      if (res.success) {
                        setLocalPosts((posts: any[]) => 
                          posts.map((p: any) => p.id === activeOptionsPost.id ? { ...p, content: newCaption } : p)
                        );
                        alert('Post caption updated successfully.');
                      } else {
                        alert(res.error || 'Failed to edit post.');
                      }
                    }
                    setActiveOptionsPost(null);
                  }}
                  className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
                >
                  Edit Post
                </button>
                <button 
                  onClick={async () => {
                    const res = await updatePostVisibility(activeOptionsPost.id, 'hidden_from_others');
                    if (res.success) {
                      setLocalPosts((posts: any[]) => 
                        posts.map((p: any) => p.id === activeOptionsPost.id ? { ...p, visibility: 'hidden_from_others' } : p)
                      );
                      alert('Post visibility updated to: Hide from Others');
                    } else {
                      alert(res.error || 'Failed to update visibility.');
                    }
                    setActiveOptionsPost(null);
                  }}
                  className={`py-4 font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px] ${activeOptionsPost.visibility === 'hidden_from_others' ? 'text-green-500 font-bold' : 'text-white'}`}
                >
                  Hide from Others {activeOptionsPost.visibility === 'hidden_from_others' ? '✓' : ''}
                </button>
                <button 
                  onClick={async () => {
                    const res = await updatePostVisibility(activeOptionsPost.id, 'hidden_from_public');
                    if (res.success) {
                      setLocalPosts((posts: any[]) => 
                        posts.map((p: any) => p.id === activeOptionsPost.id ? { ...p, visibility: 'hidden_from_public' } : p)
                      );
                      alert('Post visibility updated to: Hide from Public');
                    } else {
                      alert(res.error || 'Failed to update visibility.');
                    }
                    setActiveOptionsPost(null);
                  }}
                  className={`py-4 font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px] ${activeOptionsPost.visibility === 'hidden_from_public' ? 'text-green-500 font-bold' : 'text-white'}`}
                >
                  Hide from Public {activeOptionsPost.visibility === 'hidden_from_public' ? '✓' : ''}
                </button>
                <button 
                  onClick={async () => {
                    const res = await updatePostVisibility(activeOptionsPost.id, 'only_me');
                    if (res.success) {
                      setLocalPosts((posts: any[]) => 
                        posts.map((p: any) => p.id === activeOptionsPost.id ? { ...p, visibility: 'only_me' } : p)
                      );
                      alert('Post visibility updated to: Only Me');
                    } else {
                      alert(res.error || 'Failed to update visibility.');
                    }
                    setActiveOptionsPost(null);
                  }}
                  className={`py-4 font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px] ${activeOptionsPost.visibility === 'only_me' ? 'text-green-500 font-bold' : 'text-white'}`}
                >
                  Only Me {activeOptionsPost.visibility === 'only_me' ? '✓' : ''}
                </button>
                {activeOptionsPost.visibility !== 'public' && (
                  <button 
                    onClick={async () => {
                      const res = await updatePostVisibility(activeOptionsPost.id, 'public');
                      if (res.success) {
                        setLocalPosts((posts: any[]) => 
                          posts.map((p: any) => p.id === activeOptionsPost.id ? { ...p, visibility: 'public' } : p)
                        );
                        alert('Post visibility updated to: Public');
                      } else {
                        alert(res.error || 'Failed to update visibility.');
                      }
                      setActiveOptionsPost(null);
                    }}
                    className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
                  >
                    Make Public
                  </button>
                )}
                <button 
                  onClick={async () => {
                    const confirmDelete = window.confirm("Are you sure you want to permanently delete this post? This action cannot be undone.");
                    if (confirmDelete) {
                      const res = await deletePostPermanently(activeOptionsPost.id);
                      if (res.success) {
                        setLocalPosts((posts: any[]) => posts.filter((p: any) => p.id !== activeOptionsPost.id));
                        alert('Post permanently deleted.');
                      } else {
                        alert(res.error || 'Failed to delete post.');
                      }
                    }
                    setActiveOptionsPost(null);
                  }}
                  className="py-4 text-red-500 font-bold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
                >
                  Delete Permanently
                </button>
                <button 
                  onClick={async () => {
                    const shareUrl = `${window.location.origin}/t/${activeOptionsPost.toleeSlug}`;
                    try {
                      await navigator.clipboard.writeText(shareUrl);
                      alert('Post link copied to clipboard!');
                    } catch (err) {
                      console.error('Failed to copy link:', err);
                    }
                    setActiveOptionsPost(null);
                  }}
                  className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
                >
                  Copy Link
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => {
                    if (activeOptionsPost) {
                      alert('Thank you for reporting. We will review this post.');
                      setHiddenPostIds(prev => [...prev, activeOptionsPost.id]);
                    }
                    setActiveOptionsPost(null);
                  }}
                  className="py-4 text-red-500 font-bold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
                >
                  Report as Spam
                </button>
                <button 
                  onClick={() => {
                    if (activeOptionsPost) {
                      setHiddenUsernames(prev => [...prev, activeOptionsPost.author]);
                      alert(`Hiding future posts from @${activeOptionsPost.author}.`);
                    }
                    setActiveOptionsPost(null);
                  }}
                  className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
                >
                  Hide Posts from This User
                </button>
                <button 
                  onClick={() => {
                    if (activeOptionsPost && activeOptionsPost.toleeName) {
                      setHiddenToleeNames(prev => [...prev, activeOptionsPost.toleeName]);
                      alert(`Hiding future posts from Tolee: ${activeOptionsPost.toleeName}.`);
                    }
                    setActiveOptionsPost(null);
                  }}
                  className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
                >
                  Hide Posts from This Group
                </button>
                <button 
                  onClick={async () => {
                    if (activeOptionsPost) {
                      const shareUrl = `${window.location.origin}/t/${activeOptionsPost.toleeSlug}`;
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                        alert('Post link copied to clipboard!');
                      } catch (err) {
                        console.error('Failed to copy link:', err);
                      }
                    }
                    setActiveOptionsPost(null);
                  }}
                  className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
                >
                  Copy Link
                </button>
                <button 
                  onClick={() => {
                    if (activeOptionsPost) {
                      setHiddenPostIds(prev => [...prev, activeOptionsPost.id]);
                    }
                    setActiveOptionsPost(null);
                  }}
                  className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
                >
                  Not Interested
                </button>
              </>
            )}
            <button 
              onClick={() => setActiveOptionsPost(null)}
              className="py-4 text-gray-400 hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ReShares List Modal */}
      <Dialog open={!!activeRepostPost} onOpenChange={(open) => {
        if (!open) {
          setActiveRepostPost(null);
          setModalReposts([]);
        }
      }}>
        <DialogContent className="sm:max-w-[420px] bg-white/90 dark:bg-[#121212]/90 backdrop-blur-xl p-0 gap-0 overflow-hidden border-gray-200/50 dark:border-gray-800/50 shadow-2xl rounded-3xl">
          <DialogHeader className="p-4 border-b border-gray-100/50 dark:border-gray-800/50 bg-white/50 dark:bg-black/50">
            <DialogTitle className="text-center font-bold text-lg flex items-center justify-center gap-2">
              <Repeat className="w-5 h-5 text-green-500" /> People who re-shared
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5 custom-scrollbar">
            {isRepostModalLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-gray-500 font-medium">Fetching reposts...</p>
              </div>
            ) : modalReposts.length > 0 ? (
              modalReposts.map((user: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-11 h-11 border border-gray-100 dark:border-gray-800 shadow-sm transition-transform group-hover:scale-105">
                        <AvatarImage src={user.avatar || '/default-user-avatar.svg'} />
                        <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-900 rounded-full p-[2px] shadow-sm">
                        <div className="bg-green-500 rounded-full p-0.5">
                          <Repeat className="w-2.5 h-2.5 text-white stroke-[2.5]" />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-[15px] group-hover:text-primary transition-colors text-black dark:text-white">
                        {user.name || user.username}
                      </span>
                      {user.username && (
                        <span className="text-xs text-gray-500">@{user.username}</span>
                      )}
                      <span className="text-[10px] text-gray-400 font-medium">
                        {user.repostedAt ? new Date(user.repostedAt).toLocaleDateString() : 'ReShared'}
                      </span>
                    </div>
                  </div>
                  {user.username ? (
                    <Link href={`/u/${user.username}`} onClick={() => setActiveRepostPost(null)}>
                      <Button variant="outline" size="sm" className="h-8 rounded-full border-primary/20 hover:bg-primary/5 hover:text-primary font-bold text-xs px-4">
                        View Profile
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" disabled className="h-8 rounded-full border-gray-200 text-gray-400 font-bold text-xs px-4">
                      Anonymous
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-16 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center">
                  <Repeat className="w-8 h-8 text-gray-300" />
                </div>
                <p className="font-bold text-gray-500">No reshares yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ReShareModal 
        isOpen={reshareModalOpen}
        onClose={() => setReshareModalOpen(false)}
        postId={selectedPostIdForReshare || ''}
        onSuccess={handleReshareSuccess}
      />

      {selectedPostForShare && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setSelectedPostForShare(null);
          }}
          postId={selectedPostForShare.id}
          shareUrl={`${window.location.origin}/t/${tolee.slug}`}
          previewText={selectedPostForShare.content || 'Check out this post on Tolee!'}
          postMediaUrl={selectedPostForShare.mediaUrls}
          postMediaType={selectedPostForShare.mediaTypes}
          postAuthor={selectedPostForShare.author}
          postAuthorAvatar={selectedPostForShare.authorAvatar}
          postCaption={selectedPostForShare.content || selectedPostForShare.caption}
          onShareSuccess={(newShareCount) => {
            setLocalPosts((currentPosts: any[]) => 
              currentPosts.map((p: any) => 
                p.id === selectedPostForShare.id 
                  ? { ...p, shareCount: newShareCount }
                  : p
              )
            );
          }}
        />
      )}

      {/* Congratulations Success Dialog Overlay */}
      <Dialog open={showCongrats} onOpenChange={setShowCongrats}>
        <DialogContent className="sm:max-w-md bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-8 gap-0 overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-2xl rounded-3xl animate-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <span className="absolute -top-1 -right-1 text-2xl animate-bounce duration-1000">🎉</span>
              <span className="absolute -bottom-1 -left-1 text-2xl animate-bounce delay-200">✨</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Congratulations!
              </h2>
              <p className="text-slate-500 dark:text-zinc-400 text-sm font-semibold">
                Your new Tolee group has been created successfully.
              </p>
            </div>
            <div className="w-full bg-slate-50 dark:bg-zinc-950 rounded-2xl p-4 border border-slate-100 dark:border-zinc-800/80 space-y-2 text-left">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 dark:text-zinc-500 font-extrabold uppercase tracking-wider">Tolee Name</span>
                <span className="font-bold text-gray-900 dark:text-white">{tolee.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 dark:text-zinc-500 font-extrabold uppercase tracking-wider">Privacy</span>
                <span className="font-bold text-gray-900 dark:text-white capitalize flex items-center gap-1">
                  {tolee.isPrivate ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                  {tolee.isPrivate ? 'Private' : 'Public'}
                </span>
              </div>
            </div>
            <div className="w-full">
              <Button 
                className="w-full h-12 text-sm font-black rounded-xl bg-gradient-to-r from-[#0d9488] to-[#0f766e] hover:from-[#0f766e] hover:to-[#0d9488] text-white shadow-md border-0 active:scale-95 transition-all"
                onClick={() => setShowCongrats(false)}
              >
                Explore my Tolee Group
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
