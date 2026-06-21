'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Mic, MicOff, Video, VideoOff, Users, Loader2, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import dynamic from 'next/dynamic';
import { sendMeetingInvitationToAllMembers } from '@/actions/meeting';

const MeetingRoom = dynamic(() => import('@/components/meeting/MeetingRoom'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
        <p className="text-sm font-semibold text-zinc-400">Loading meeting room...</p>
      </div>
    </div>
  )
});

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

interface MeetingClientWrapperProps {
  meetingCode: string;
  initialMeeting: any;
  currentUser: {
    id: string;
    name: string;
    avatar: string;
    username: string;
  };
  initialNeedsApproval: boolean;
}

export default function MeetingClientWrapper({
  meetingCode,
  initialMeeting,
  currentUser,
  initialNeedsApproval,
}: MeetingClientWrapperProps) {
  const router = useRouter();
  
  // States
  const [meeting, setMeeting] = useState(initialMeeting || {});
  const [needsApproval, setNeedsApproval] = useState(initialNeedsApproval);
  const [approvalStatus, setApprovalStatus] = useState<'idle' | 'requested' | 'approved' | 'rejected'>('idle');
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [invitesSent, setInvitesSent] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Lobby Media states
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // 1. Handle socket registration & waiting room notifications
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Meeting Client] Connected to signaling:', socket.id);
      socket.emit('register-user', { userId: currentUser.id });
    });

    // If we need approval, listen for the host's decision
    socket.on('meeting-join-response', ({ approved }) => {
      console.log('[Meeting Client] Received join response:', approved);
      if (approved) {
        setApprovalStatus('approved');
        setNeedsApproval(false);
      } else {
        setApprovalStatus('rejected');
      }
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentUser.id]);

  // 2. Handle camera/mic preview in Lobby
  useEffect(() => {
    if (hasJoined || needsApproval) {
      stopPreview();
      return;
    }

    startPreview();

    return () => {
      stopPreview();
    };
  }, [hasJoined, needsApproval, isCamOn]);

  const startPreview = async () => {
    try {
      if (localStreamRef.current) {
        stopPreview();
      }

      setPreviewError(null);
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPreviewError('Media access is not supported by your browser or connection type (requires HTTPS).');
        return;
      }
      const constraints = {
        video: isCamOn ? { width: 640, height: 360, facingMode: 'user' } : false,
        audio: true // Keep microphone active, we can mute track digitally
      };

      if (!isCamOn && !isMicOn) {
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      // Digital muting of mic/cam based on buttons
      stream.getAudioTracks().forEach(track => {
        track.enabled = isMicOn;
      });

      if (isCamOn && previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('[Lobby Preview] Media Access Denied:', err);
      setPreviewError('Could not access camera or microphone. Please check system permissions.');
    }
  };

  const stopPreview = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
  };

  const toggleMic = () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = newState;
      });
    }
  };

  const toggleCamera = () => {
    setIsCamOn(!isCamOn);
  };

  // 3. User requests access to private meeting
  const requestAccess = () => {
    setApprovalStatus('requested');
    if (socketRef.current) {
      socketRef.current.emit('meeting-join-request', {
        meetingCode,
        userId: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar
      });
    }
  };

  // 4. Clean exit
  const handleExit = () => {
    stopPreview();
    if (meeting.tolee?.slug) {
      router.push(`/t/${meeting.tolee.slug}`);
    } else {
      router.push('/');
    }
  };

  // Hydration guard: render loading skeleton until client is mounted
  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
          <p className="text-sm font-semibold text-zinc-400">Loading interactive session...</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: Waiting Room / Needs Host Approval Screen
  // ----------------------------------------------------
  if (needsApproval) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 px-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl space-y-6">
          <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">Private Meeting</h1>
            <p className="text-zinc-400 text-sm">
              This meeting is locked. You need approval from the host to join.
            </p>
          </div>

          {approvalStatus === 'idle' && (
            <Button
              onClick={requestAccess}
              className="w-full py-6 bg-[#0a7c85] hover:bg-[#0a7c85]/90 text-white font-bold rounded-xl text-base shadow-lg shadow-teal-500/10"
            >
              Ask to Join
            </Button>
          )}

          {approvalStatus === 'requested' && (
            <div className="bg-zinc-800/50 rounded-xl p-4 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
              <p className="text-sm font-semibold text-zinc-300">Asking to join...</p>
              <p className="text-xs text-zinc-500">You will join when the host admits you.</p>
            </div>
          )}

          {approvalStatus === 'rejected' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
              <p className="text-sm font-bold text-red-500">Request Denied</p>
              <p className="text-xs text-red-400/80 mt-1">The host declined your request to join.</p>
            </div>
          )}

          <Button
            variant="ghost"
            onClick={handleExit}
            className="text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 w-full font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const handleSendInvitations = async () => {
    if (!meeting?.id) return;
    setSendingInvites(true);
    try {
      const res = await sendMeetingInvitationToAllMembers(meeting.id);
      if (res.success) {
        setInvitesSent(true);
        alert(`🔔 Invitations sent to all ${res.count} members of the group!`);
      } else {
        alert("Failed to send invitations: " + (res.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while sending invitations.");
    } finally {
      setSendingInvites(false);
    }
  };

  // ----------------------------------------------------
  // RENDER: Joining Meeting Spinner Loader
  // ----------------------------------------------------
  if (isJoining && !hasJoined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
          <p className="text-sm font-semibold text-zinc-400">Joining Meeting...</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: Full LiveKit Meeting Room (Joined State)
  // ----------------------------------------------------
  if (hasJoined) {
    return (
      <MeetingRoom
        meetingCode={meetingCode}
        meeting={meeting}
        currentUser={currentUser}
        initialMicOn={isMicOn}
        initialCamOn={isCamOn}
        onLeaveMeeting={handleExit}
      />
    );
  }

  // ----------------------------------------------------
  // RENDER: Google Meet Pre-join Lobby / Device Check Screen
  // ----------------------------------------------------
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 px-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        
        {/* Left: Camera Preview Box */}
        <div className="md:col-span-7 flex flex-col gap-4">
          <div className="relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center">
            {isCamOn ? (
              <video
                ref={previewVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 select-none">
                <Avatar className="w-20 h-20 border-2 border-zinc-700">
                  <AvatarImage src={currentUser?.avatar} />
                  <AvatarFallback className="bg-zinc-800 text-2xl font-bold text-teal-400">
                    {currentUser?.name ? currentUser.name[0] : 'U'}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm font-semibold text-zinc-400">Your camera is off</p>
              </div>
            )}

            {/* Media toggle floating buttons */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3 z-10">
              <Button
                size="icon"
                onClick={toggleMic}
                className={`w-12 h-12 rounded-full border transition-all ${
                  isMicOn 
                    ? 'bg-zinc-900/80 border-zinc-700 hover:bg-zinc-800 text-white' 
                    : 'bg-red-600 border-red-500 hover:bg-red-700 text-white'
                }`}
              >
                {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>

              <Button
                size="icon"
                onClick={toggleCamera}
                className={`w-12 h-12 rounded-full border transition-all ${
                  isCamOn 
                    ? 'bg-zinc-900/80 border-zinc-700 hover:bg-zinc-800 text-white' 
                    : 'bg-red-600 border-red-500 hover:bg-red-700 text-white'
                }`}
              >
                {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>
            </div>
          </div>
          
          {previewError && (
            <p className="text-xs text-red-500 text-center font-medium">{previewError}</p>
          )}
        </div>

        {/* Right: Join Info & Action Panel */}
        <div className="md:col-span-5 flex flex-col justify-center space-y-6 text-center md:text-left bg-zinc-900/30 border border-zinc-800/30 p-8 rounded-2xl backdrop-blur-md">
          <div className="space-y-2">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">
              Ready to connect?
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-white line-clamp-2">
              {meeting?.title || 'Interactive Meeting'}
            </h1>
            <p className="text-xs text-zinc-500 font-mono tracking-wider">
              Meeting code: {meetingCode}
            </p>
          </div>

          {meeting?.description && (
            <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">
              {meeting.description}
            </p>
          )}

          <div className="h-[1px] bg-zinc-800 my-2" />

          <div className="flex flex-col gap-3">
            {meeting?.hostId === currentUser?.id && meeting?.toleeId && (
              <Button
                onClick={handleSendInvitations}
                disabled={sendingInvites || invitesSent}
                className={`w-full py-6 font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 transition-all ${
                  invitesSent 
                    ? 'bg-zinc-850 text-zinc-500 border border-zinc-800/50 cursor-default' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/10'
                }`}
              >
                {sendingInvites ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending Invitations...
                  </>
                ) : invitesSent ? (
                  <>
                    🔔 Invitations Sent! ✓
                  </>
                ) : (
                  <>
                    🔔 Send Invitation to All Members
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={() => {
                setIsJoining(true);
                stopPreview();
                setTimeout(() => {
                  setHasJoined(true);
                }, 500);
              }}
              className="w-full py-6 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold rounded-xl text-base shadow-lg shadow-teal-500/20 transform active:scale-98 transition-all"
            >
              Join Meeting
            </Button>
            
            <Button
              variant="outline"
              onClick={handleExit}
              className="w-full py-6 border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-bold rounded-xl"
            >
              Cancel
            </Button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
