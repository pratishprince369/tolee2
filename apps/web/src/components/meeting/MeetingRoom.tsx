'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  LiveKitRoom, 
  RoomAudioRenderer, 
  useTracks, 
  useLocalParticipant,
  useRoomContext,
  VideoTrack,
  useParticipants,
  useConnectionState
} from '@livekit/components-react';
import { Track, Room } from 'livekit-client';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, 
  MessageSquare, Users, BarChart3, HelpCircle, Hand, 
  Sparkles, ShieldAlert, Lock, Unlock, Settings, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import MeetingSidebar from './MeetingSidebar';
import { sendMeetingInvitationToAllMembers, updateMeetingStatus } from '@/actions/meeting';
import { io, Socket } from 'socket.io-client';

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


interface MeetingRoomProps {
  meetingCode: string;
  meeting: any;
  currentUser: {
    id: string;
    name: string;
    avatar: string;
    username: string;
  };
  initialMicOn: boolean;
  initialCamOn: boolean;
  onLeaveMeeting: () => void;
}

export default function MeetingRoom({
  meetingCode,
  meeting,
  currentUser,
  initialMicOn,
  initialCamOn,
  onLeaveMeeting,
}: MeetingRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch token
  useEffect(() => {
    async function fetchToken() {
      try {
        const res = await fetch(`/api/livekit-token?room=${meetingCode}`);
        if (!res.ok) {
          throw new Error('Failed to fetch meeting token');
        }
        const data = await res.json();
        setToken(data.token);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Could not connect to meeting room.');
      }
    }
    fetchToken();
  }, [meetingCode]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white">
        <div className="max-w-md p-8 bg-zinc-900 border border-zinc-800 rounded-2xl text-center shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Connection Error</h2>
          <p className="text-zinc-400 text-sm mb-6">{error}</p>
          <Button onClick={onLeaveMeeting} className="w-full bg-[#0a7c85]">Exit Meeting</Button>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white">
        <LoaderSpinner message="Joining Meeting..." />
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://tolee-live.livekit.cloud'}
      connect={true}
      video={initialCamOn}
      audio={initialMicOn}
      data-lk-theme="default"
      className="flex flex-col h-screen bg-zinc-950 overflow-hidden font-sans"
    >
      <RoomAudioRenderer />
      <MeetingRoomInner 
        meeting={meeting}
        meetingCode={meetingCode}
        currentUser={currentUser}
        onLeave={onLeaveMeeting}
      />
    </LiveKitRoom>
  );
}

// ----------------------------------------------------
// MeetingRoomInner Component
// ----------------------------------------------------
function MeetingRoomInner({ meeting, meetingCode, currentUser, onLeave }: {
  meeting: any;
  meetingCode: string;
  currentUser: any;
  onLeave: () => void;
}) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const participants = useParticipants();
  const connectionState = useConnectionState();

  // WebRTC Tracks (Camera + ScreenShare)
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false }
    ],
    { onlySubscribed: false }
  );

  // States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'people' | 'polls' | 'qa'>('chat');
  const [handRaised, setHandRaised] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<any[]>([]);
  const [raisedHands, setRaisedHands] = useState<string[]>([]); // Identities of users with raised hands
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isLocked, setIsLocked] = useState(meeting?.isLocked ?? false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [invitesSent, setInvitesSent] = useState(false);
  const [isRecording, setIsRecording] = useState(meeting?.isRecording ?? false);

  // Heartbeat effect (runs every 30s to prevent meeting timeout)
  useEffect(() => {
    if (!meeting?.id) return;
    
    const sendPulse = () => {
      import('@/actions/meeting').then(({ heartbeatMeeting }) => {
        heartbeatMeeting(meeting.id);
      });
    };

    sendPulse(); // Initial heartbeat
    const interval = setInterval(sendPulse, 30000);
    return () => clearInterval(interval);
  }, [meeting?.id]);

  // Tab Close / Navigator offline detection for host
  useEffect(() => {
    const isHost = meeting?.hostId === currentUser?.id;
    if (!isHost || !meeting?.id) return;

    const handleTabClose = () => {
      fetch('/api/meeting/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meeting.id }),
        keepalive: true
      });
    };

    window.addEventListener('beforeunload', handleTabClose);
    return () => {
      window.removeEventListener('beforeunload', handleTabClose);
    };
  }, [meeting?.id, meeting?.hostId, currentUser?.id]);

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

  const toggleRecording = async () => {
    if (!meeting?.id) return;
    try {
      const action = isRecording ? 'stop' : 'start';
      const res = await fetch('/api/recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meeting.id, action })
      });
      const data = await res.json();
      if (data.success) {
        setIsRecording(!isRecording);
        alert(`Recording ${action === 'start' ? 'started' : 'stopped'} successfully!`);
      } else {
        alert(`Failed to control recording: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error controlling recording');
    }
  };

  // Initialize Socket.IO connection
  useEffect(() => {
    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });
    setSocket(s);

    s.on('connect', () => {
      console.log('[Meeting Room] Connected to Socket.IO signaling server');
      s.emit('register-user', { userId: currentUser.id });
      s.emit('meeting-join-room', { meetingCode, userId: currentUser.id });
    });

    return () => {
      s.disconnect();
    };
  }, [meetingCode, currentUser.id]);

  // References
  const emojiIdRef = useRef(0);

  // 1. Data Channel Handler (Reactions & Hand Raises)
  useEffect(() => {
    const handleData = (payload: Uint8Array, participant: any) => {
      try {
        const decoder = new TextDecoder();
        const data = JSON.parse(decoder.decode(payload));

        if (data.type === 'reaction') {
          triggerFloatingEmoji(data.emoji, participant?.name || 'User');
        } else if (data.type === 'hand-raise') {
          if (data.state) {
            setRaisedHands(prev => [...new Set([...prev, participant.identity])]);
          } else {
            setRaisedHands(prev => prev.filter(id => id !== participant.identity));
          }
        }
      } catch (err) {
        console.error('[WebRTC Data Channel] Error decoding packet:', err);
      }
    };

    room.on('dataReceived', handleData);
    return () => {
      room.off('dataReceived', handleData);
    };
  }, [room]);

  // 2. Broadcast Local Reaction
  const sendReaction = (emoji: string) => {
    try {
      const encoder = new TextEncoder();
      const packet = encoder.encode(JSON.stringify({ type: 'reaction', emoji }));
      localParticipant.publishData(packet, { reliable: true });
      triggerFloatingEmoji(emoji, currentUser.name);
    } catch (err) {
      console.error('Failed to send reaction:', err);
    }
  };

  const triggerFloatingEmoji = (emoji: string, senderName: string) => {
    const id = emojiIdRef.current++;
    const randomLeft = 10 + Math.random() * 40; // bottom center-left area
    const randomRotate = -20 + Math.random() * 40;

    const newEmoji = {
      id,
      emoji,
      senderName,
      style: {
        position: 'absolute',
        bottom: '80px',
        left: `${randomLeft}%`,
        transform: `rotate(${randomRotate}deg)`,
        animation: 'floatUp 4.5s ease-out forwards',
        fontSize: '2rem',
        pointerEvents: 'none',
        zIndex: 50,
      } as React.CSSProperties
    };

    setFloatingEmojis(prev => [...prev, newEmoji]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== id));
    }, 4500);
  };

  // 3. Toggle Hand Raise
  const toggleHandRaise = () => {
    const nextState = !handRaised;
    setHandRaised(nextState);

    try {
      const encoder = new TextEncoder();
      const packet = encoder.encode(JSON.stringify({ type: 'hand-raise', state: nextState }));
      localParticipant.publishData(packet, { reliable: true });

      if (nextState) {
        setRaisedHands(prev => [...new Set([...prev, localParticipant.identity])]);
      } else {
        setRaisedHands(prev => prev.filter(id => id !== localParticipant.identity));
      }
    } catch (err) {
      console.error('Failed to publish hand raise:', err);
    }
  };

  // 4. Media controllers
  const toggleMic = () => {
    localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  };

  const toggleCamera = () => {
    localParticipant.setCameraEnabled(!isCameraEnabled);
  };

  const toggleScreenShare = () => {
    localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
  };

  const toggleSidebar = (tab: 'chat' | 'people' | 'polls' | 'qa') => {
    if (sidebarOpen && sidebarTab === tab) {
      setSidebarOpen(false);
    } else {
      setSidebarTab(tab);
      setSidebarOpen(true);
    }
  };

  // Filter presentation tracks vs normal camera tracks
  const screenShareTracks = tracks.filter(t => t.source === Track.Source.ScreenShare);
  const cameraTracks = tracks.filter(t => t.source === Track.Source.Camera);
  const isSomeonePresenting = screenShareTracks.length > 0;

  if (connectionState === 'connecting' || connectionState === 'reconnecting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white">
        <LoaderSpinner message={connectionState === 'connecting' ? "Connecting to media server..." : "Reconnecting to media server..."} />
      </div>
    );
  }

  if (connectionState === 'disconnected') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6">
        <div className="max-w-md w-full p-8 bg-zinc-900 border border-zinc-800 rounded-2xl text-center shadow-2xl space-y-6">
          <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
            <ShieldAlert className="w-6 h-6 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Connection Failed</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Could not establish connection to the meeting server. Please verify your internet connection or that the LiveKit configuration is correct on the server.
            </p>
          </div>
          <Button onClick={onLeave} className="w-full bg-[#0a7c85] hover:bg-[#0a7c85]/90 py-5 rounded-xl font-bold text-sm transition-all">
            Exit Meeting
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative select-none">
      
      {/* Dynamic Keyframes for floating reactions */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.6) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: translateY(-20px) scale(1.1);
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-380px) scale(1.3) rotate(15deg);
            opacity: 0;
          }
        }
      `}</style>

      {/* Floating Emojis Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
        {floatingEmojis.map(item => (
          <div key={item.id} style={item.style} className="flex flex-col items-center">
            <span>{item.emoji}</span>
            <span className="text-[9px] bg-black/60 text-zinc-300 px-1 py-0.5 rounded-md backdrop-blur-sm mt-0.5 max-w-[80px] truncate">
              {item.senderName}
            </span>
          </div>
        ))}
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-grow flex flex-col p-4 relative overflow-hidden bg-zinc-950">
          
          {/* Top header information overlay */}
          <div className="absolute top-4 left-6 z-10 flex items-center gap-3">
            <span className="bg-black/65 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-zinc-800 text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              {meeting?.type ? meeting.type.toUpperCase() : 'MEETING'}
            </span>
            <span className="bg-black/65 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-zinc-800 text-xs font-semibold text-zinc-400">
              {meetingCode}
            </span>
            {isRecording && (
              <span className="bg-red-600/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-red-500 text-xs font-bold text-white flex items-center gap-1.5 animate-pulse shadow-lg shadow-red-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                Recording Status: ON
              </span>
            )}
          </div>

          {/* Presentation Mode Layout */}
          {isSomeonePresenting ? (
            <div className="w-full h-full grid grid-rows-12 gap-4">
              <div className="row-span-9 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 relative shadow-2xl">
                <VideoTrack trackRef={screenShareTracks[0] as any} className="w-full h-full object-contain" />
                <div className="absolute bottom-4 left-4 bg-black/75 px-3.5 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-300">
                  🖥️ Screen share by {screenShareTracks[0].participant.name || 'User'}
                </div>
              </div>
              
              {/* SpeakerStrip underneath presentation screen */}
              <div className="row-span-3 flex gap-3 overflow-x-auto py-1 hide-scrollbar">
                {cameraTracks.map(track => (
                  <div key={track.participant.sid} className="w-[180px] aspect-video flex-shrink-0">
                    <ParticipantCard 
                      track={track} 
                      handRaised={raisedHands.includes(track.participant.identity)} 
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Traditional Video Tiles Grid */
            <div className="w-full h-full flex items-center justify-center">
              {participants.length <= 1 ? (
                // Only local participant is present
                <div className="max-w-md text-center p-8 bg-zinc-900/40 border border-zinc-900 rounded-2xl space-y-4">
                  <Sparkles className="w-10 h-10 text-teal-400 mx-auto" />
                  <h3 className="text-lg font-bold">You are the only host in the room</h3>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Share your meeting link or invite your group members. Anyone with the code can join.
                  </p>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono text-sm tracking-wider text-teal-300 mb-2">
                    tolee.in/live/meeting/{meetingCode}
                  </div>

                  {meeting?.hostId === currentUser?.id && meeting?.toleeId && (
                    <Button
                      onClick={handleSendInvitations}
                      disabled={sendingInvites || invitesSent}
                      className={`w-full py-5 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all ${
                        invitesSent 
                          ? 'bg-zinc-800 text-zinc-500 border border-zinc-800/80 cursor-default' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                      }`}
                    >
                      {sendingInvites ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
                </div>
              ) : (
                <div className={`grid w-full h-full gap-4 ${
                  tracks.length <= 2 ? 'grid-cols-1 md:grid-cols-2' :
                  tracks.length <= 4 ? 'grid-cols-2' :
                  'grid-cols-2 lg:grid-cols-3'
                }`}>
                  {tracks.map(track => (
                    <ParticipantCard 
                      key={track.participant.sid} 
                      track={track} 
                      handRaised={raisedHands.includes(track.participant.identity)} 
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Meeting Right Sidebar component */}
        {sidebarOpen && (
          <MeetingSidebar
            meeting={meeting}
            meetingId={meeting.id}
            currentUser={currentUser}
            activeTab={sidebarTab}
            onClose={() => setSidebarOpen(false)}
            socket={socket}
          />
        )}
      </div>

      {/* Control Console Bottom Bar */}
      <div className="bg-zinc-900 border-t border-zinc-800/80 p-5 flex items-center justify-between z-10">
        
        {/* Left: Meeting Metadata */}
        <div className="hidden md:flex flex-col">
          <p className="text-sm font-bold text-white max-w-[200px] truncate">{meeting.title}</p>
          <p className="text-[10px] text-zinc-500 font-medium">Tolee Media Gateway Server-4</p>
        </div>

        {/* Center: Main controls */}
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            onClick={toggleMic}
            className={`w-12 h-12 rounded-full border transition-all ${
              isMicrophoneEnabled 
                ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white' 
                : 'bg-red-500/20 border-red-500/30 hover:bg-red-500/35 text-red-500'
            }`}
          >
            {isMicrophoneEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>

          <Button
            size="icon"
            onClick={toggleCamera}
            className={`w-12 h-12 rounded-full border transition-all ${
              isCameraEnabled 
                ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white' 
                : 'bg-red-500/20 border-red-500/30 hover:bg-red-500/35 text-red-500'
            }`}
          >
            {isCameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          <Button
            size="icon"
            onClick={toggleScreenShare}
            className={`w-12 h-12 rounded-full border transition-all ${
              isScreenShareEnabled 
                ? 'bg-teal-500/20 border-teal-500/30 text-teal-400 hover:bg-teal-500/30' 
                : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white'
            }`}
          >
            <Monitor className="w-5 h-5" />
          </Button>

          <Button
            size="icon"
            onClick={toggleHandRaise}
            className={`w-12 h-12 rounded-full border transition-all ${
              handRaised 
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30' 
                : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white'
            }`}
          >
            <Hand className="w-5 h-5" />
          </Button>

          {/* Quick Reaction Bar */}
          <div className="hidden lg:flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-full ml-2">
            {['❤️', '👏', '😂', '🔥', '🎉', '👍'].map(emoji => (
              <button 
                key={emoji}
                onClick={() => sendReaction(emoji)}
                className="hover:scale-125 transition-transform px-1"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Host Recording Control */}
          {meeting?.hostId === currentUser?.id && (
            <Button
              size="icon"
              onClick={toggleRecording}
              className={`w-12 h-12 rounded-full border transition-all ml-2 ${
                isRecording 
                  ? 'bg-red-600 border-red-500 hover:bg-red-700 text-white animate-pulse' 
                  : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white'
              }`}
              title={isRecording ? "Stop Recording" : "Start Recording"}
            >
              <span className="text-base">🎥</span>
            </Button>
          )}

          <Button
            size="icon"
            onClick={() => setShowExitConfirm(true)}
            className="w-12 h-12 rounded-full bg-red-600 border border-red-500 hover:bg-red-700 text-white ml-2"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>

        {/* Right: Sidebar buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => toggleSidebar('chat')}
            className={`w-10 h-10 rounded-xl ${sidebarOpen && sidebarTab === 'chat' ? 'text-teal-400 bg-zinc-800' : 'text-zinc-400 hover:text-white'}`}
          >
            <MessageSquare className="w-5 h-5" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => toggleSidebar('people')}
            className={`w-10 h-10 rounded-xl relative ${sidebarOpen && sidebarTab === 'people' ? 'text-teal-400 bg-zinc-800' : 'text-zinc-400 hover:text-white'}`}
          >
            <Users className="w-5 h-5" />
            {raisedHands.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-zinc-900" />
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => toggleSidebar('polls')}
            className={`w-10 h-10 rounded-xl ${sidebarOpen && sidebarTab === 'polls' ? 'text-teal-400 bg-zinc-800' : 'text-zinc-400 hover:text-white'}`}
          >
            <BarChart3 className="w-5 h-5" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => toggleSidebar('qa')}
            className={`w-10 h-10 rounded-xl ${sidebarOpen && sidebarTab === 'qa' ? 'text-teal-400 bg-zinc-800' : 'text-zinc-400 hover:text-white'}`}
          >
            <HelpCircle className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Exit confirmation popup */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-sm w-full text-center space-y-4">
            <h3 className="text-lg font-bold font-sans text-white">Leave Meeting?</h3>
            <p className="text-zinc-400 text-xs">
              Are you sure you want to disconnect from this live session?
            </p>
            <div className="flex flex-col gap-2 pt-2">
              {meeting?.hostId === currentUser?.id ? (
                <>
                  <Button 
                    onClick={async () => {
                      await updateMeetingStatus(meeting.id, 'end');
                      onLeave();
                    }} 
                    className="w-full bg-red-600 hover:bg-red-700 font-bold py-5 rounded-xl text-sm"
                  >
                    🛑 End Meeting for All
                  </Button>
                  <Button 
                    onClick={onLeave} 
                    variant="outline" 
                    className="w-full border-zinc-700 hover:bg-zinc-800 text-zinc-300 py-5 rounded-xl text-xs"
                  >
                    Leave Meeting (Keep Room Open)
                  </Button>
                </>
              ) : (
                <Button onClick={onLeave} className="w-full bg-red-600 hover:bg-red-700 py-5 rounded-xl font-bold text-sm">
                  Leave Meeting
                </Button>
              )}
              <Button 
                onClick={() => setShowExitConfirm(false)} 
                variant="ghost" 
                className="w-full text-zinc-400 hover:text-white mt-1 font-bold text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ----------------------------------------------------
// ParticipantCard Component
// ----------------------------------------------------
function ParticipantCard({ track, handRaised }: { track: any; handRaised: boolean }) {
  const isSpeaking = track.participant.isSpeaking;
  const isMuted = !track.participant.isMicrophoneEnabled;
  const videoOn = track.participant.isCameraEnabled;

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden bg-zinc-900 border transition-all ${
      isSpeaking ? 'border-teal-400 shadow-lg shadow-teal-500/5' : 'border-zinc-800'
    }`}>
      
      {/* Video stream rendering */}
      {videoOn && track.publication && !track.placeholder ? (
        <VideoTrack trackRef={track} className="w-full h-full object-cover scale-x-[-1]" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-900">
          <Avatar className="w-16 h-16 border-2 border-zinc-800">
            <AvatarFallback className="bg-zinc-800 text-lg font-bold text-teal-400">
              {track.participant.name ? track.participant.name[0] : 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Floating indicators */}
      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/5 text-[10px] font-bold text-zinc-300 flex items-center gap-1.5">
        {track.participant.name || 'Participant'}
        {isMuted && <MicOff className="w-3 h-3 text-red-500" />}
      </div>

      {handRaised && (
        <div className="absolute top-3 right-3 bg-amber-500 text-black p-1.5 rounded-full shadow-lg border border-zinc-950 animate-bounce">
          <Hand className="w-3.5 h-3.5 fill-black" />
        </div>
      )}

      {isSpeaking && (
        <span className="absolute top-3 left-3 bg-teal-400 text-black px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
          Speaking
        </span>
      )}
    </div>
  );
}

// Simple loader helper
function LoaderSpinner({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
      <p className="text-sm font-semibold text-zinc-400">{message}</p>
    </div>
  );
}
