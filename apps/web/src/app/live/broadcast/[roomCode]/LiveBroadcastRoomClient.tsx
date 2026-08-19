'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Radio, 
  Eye, 
  Users, 
  Heart, 
  Flame, 
  Sparkles, 
  Share2, 
  Send, 
  Copy, 
  Check, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Tv, 
  MessageSquare, 
  X, 
  ArrowLeft, 
  Maximize2,
  Minimize2,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import { 
  LiveBroadcastItem, 
  getLiveBroadcastDetails, 
  joinLiveAsCoHost, 
  updateLiveViewerCount, 
  endLiveBroadcast 
} from '@/actions/liveStream';

interface LiveBroadcastRoomClientProps {
  roomCode: string;
}

export default function LiveBroadcastRoomClient({ roomCode }: LiveBroadcastRoomClientProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [broadcast, setBroadcast] = useState<LiveBroadcastItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(1);
  const [isHost, setIsHost] = useState(false);
  const [isCoHost, setIsCoHost] = useState(false);

  // Media streams
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Live Chat & Reactions
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; user: string; text: string; time: string; isHost?: boolean }>>([
    { id: '1', user: 'Tolee Live System', text: '🔴 Welcome to the live broadcast! Keep comments respectful.', time: 'Just now', isHost: true }
  ]);
  const [commentInput, setCommentInput] = useState('');
  const [floatingReactions, setFloatingReactions] = useState<Array<{ id: string; emoji: string; left: number }>>([]);

  // End Stream Summary Modal
  const [streamSummary, setStreamSummary] = useState<{ peakViewers: number; durationMinutes: number } | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initial Load & Auth Check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/live/broadcast/${roomCode}`)}`);
      return;
    }
    if (status === 'authenticated') {
      loadBroadcastDetails();
    }
  }, [status, roomCode]);

  const loadBroadcastDetails = async () => {
    setLoading(true);
    const res = await getLiveBroadcastDetails(roomCode);
    if (res.success && res.broadcast) {
      setBroadcast(res.broadcast);
      setViewerCount(res.broadcast.viewerCount || 1);

      const currentUserId = (session?.user as any)?.id;
      const hostFlag = res.broadcast.hostId === currentUserId;
      const coHostFlag = res.broadcast.coHosts?.some(c => c.id === currentUserId && c.role !== 'host');

      setIsHost(hostFlag);
      setIsCoHost(coHostFlag);

      if (hostFlag || coHostFlag) {
        startLocalCamera();
      } else {
        // Track viewer count increment for audience
        updateLiveViewerCount(roomCode, 1);
      }
    }
    setLoading(false);
  };

  const startLocalCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('[LiveRoom] Camera start warning:', err);
    }
  };

  const stopLocalCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
  };

  const handleToggleCam = () => {
    if (localStreamRef.current) {
      const vTrack = localStreamRef.current.getVideoTracks()[0];
      if (vTrack) {
        vTrack.enabled = !vTrack.enabled;
        setIsCamOn(vTrack.enabled);
      }
    }
  };

  const handleToggleMic = () => {
    if (localStreamRef.current) {
      const aTrack = localStreamRef.current.getAudioTracks()[0];
      if (aTrack) {
        aTrack.enabled = !aTrack.enabled;
        setIsMicOn(aTrack.enabled);
      }
    }
  };

  const handleJoinAsCoHost = async () => {
    const res = await joinLiveAsCoHost({ roomCode, inviteToken: inviteToken || undefined });
    if (res.success && res.broadcast) {
      setBroadcast(res.broadcast);
      setIsCoHost(true);
      startLocalCamera();
      alert('🎉 You are now live on split-screen as a Guest Speaker!');
    } else {
      alert(res.error || 'Could not join as co-host.');
    }
  };

  const handleCopyGuestLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.tolee.in';
    const guestUrl = `${origin}/live/broadcast/${roomCode}?invite=${broadcast?.inviteToken || 'guest'}`;
    navigator.clipboard.writeText(guestUrl);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      user: session?.user?.name || 'Viewer',
      text: commentInput.trim(),
      time: 'Now',
      isHost
    };

    setChatMessages(prev => [...prev, newMsg]);
    setCommentInput('');
  };

  const triggerReaction = (emoji: string) => {
    const id = `react-${Date.now()}-${Math.random()}`;
    const left = Math.floor(Math.random() * 60) + 20; // 20% to 80%
    setFloatingReactions(prev => [...prev, { id, emoji, left }]);

    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 2800);
  };

  const handleEndStream = async () => {
    if (!window.confirm('Are you sure you want to end this live broadcast for all viewers?')) return;
    
    stopLocalCamera();
    const res = await endLiveBroadcast(roomCode);
    if (res.success) {
      setStreamSummary({
        peakViewers: res.peakViewers || viewerCount,
        durationMinutes: res.durationMinutes || 1
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b13] text-gray-200 p-6 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-t-red-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-400 text-sm font-medium animate-pulse">Connecting to live broadcast stream...</p>
      </div>
    );
  }

  // Stream Ended Summary Modal
  if (streamSummary) {
    return (
      <div className="min-h-screen bg-[#070b13] text-[#e2e8f0] font-sans p-6 flex items-center justify-center">
        <div className="bg-[#0b1220] border border-[#1b2b48] rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-800/60 flex items-center justify-center mx-auto text-red-400">
            <Radio className="w-8 h-8" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Live Broadcast Concluded</h2>
            <p className="text-xs text-gray-400">Thank you for streaming on Tolee Live!</p>
          </div>

          <div className="grid grid-cols-2 gap-3 py-3 border-y border-[#16253f]">
            <div className="bg-[#060c16] rounded-xl p-3">
              <span className="text-2xl font-extrabold text-cyan-400">{streamSummary.peakViewers}</span>
              <span className="text-[11px] text-gray-400 block font-semibold">Peak Viewers</span>
            </div>
            <div className="bg-[#060c16] rounded-xl p-3">
              <span className="text-2xl font-extrabold text-emerald-400">{streamSummary.durationMinutes}m</span>
              <span className="text-[11px] text-gray-400 block font-semibold">Stream Duration</span>
            </div>
          </div>

          <Link
            href="/feed"
            className="w-full block py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm shadow-md"
          >
            Back to Tolee Feed
          </Link>
        </div>
      </div>
    );
  }

  const coHostsList = broadcast?.coHosts || [];
  const isMultiHost = coHostsList.length > 1;

  return (
    <div className="min-h-screen bg-[#050811] text-[#e2e8f0] font-sans pb-16 pt-16 px-2 sm:px-4 lg:px-8">
      
      {/* Floating Animated Reactions Container */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingReactions.map(r => (
          <div
            key={r.id}
            style={{ left: `${r.left}%` }}
            className="absolute bottom-16 text-3xl sm:text-4xl animate-float-reaction"
          >
            {r.emoji}
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto">
        
        {/* Top Live Bar */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link 
              href="/feed" 
              className="p-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-gray-400 hover:text-white transition-all text-xs font-semibold flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Feed</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-red-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-red-950/60 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white" />
                LIVE
              </span>

              {/* Real-time Viewers Badge */}
              <span className="px-3 py-1 rounded-full bg-[#0d1628] border border-[#1d2f50] text-cyan-300 font-bold text-xs flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>{viewerCount} viewers watching</span>
              </span>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            {/* Multi-Host News Media Guest Invite Button */}
            {(isHost || isCoHost) && (
              <button
                onClick={handleCopyGuestLink}
                className="px-3.5 py-1.5 rounded-xl bg-[#1a122e] hover:bg-[#251b3d] border border-purple-800/60 text-purple-300 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                title="Invite Guest Speaker for News Media Split-Screen"
              >
                {copiedInvite ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <UserPlus className="w-3.5 h-3.5" />}
                <span>{copiedInvite ? 'Link Copied!' : 'Invite Guest Speaker'}</span>
              </button>
            )}

            {/* If user is viewer with invite token, give Join button */}
            {!isHost && !isCoHost && (
              <button
                onClick={handleJoinAsCoHost}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Join as Speaker</span>
              </button>
            )}

            {isHost && (
              <button
                onClick={handleEndStream}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>End Stream</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Broadcast Layout: Left = Video Screen / Grid | Right = Live Chat & Reactions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* ══════════════════════════════════════════════════════════════
              LEFT: LIVE VIDEO STREAM / MULTI-HOST NEWS MEDIA GRID (8 COLS)
          ══════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Live Video Frame */}
            <div className="relative aspect-video w-full rounded-3xl bg-[#060c16] border border-[#16253f] overflow-hidden shadow-2xl flex items-center justify-center group">
              
              {/* Multi-Host News Media Split-Screen Grid */}
              {isMultiHost ? (
                <div className="w-full h-full grid grid-cols-1 sm:grid-cols-2 gap-1 bg-black p-1">
                  {/* Host Camera Feed */}
                  <div className="relative w-full h-full bg-[#09111e] rounded-2xl overflow-hidden flex items-center justify-center">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted={isHost}
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white font-bold text-[10px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span>{broadcast?.hostName} (Host)</span>
                    </div>
                  </div>

                  {/* Co-Host / Guest Speaker Screen */}
                  <div className="relative w-full h-full bg-[#0e172a] rounded-2xl overflow-hidden flex items-center justify-center border border-purple-800/40">
                    <div className="text-center p-4">
                      <div className="w-12 h-12 rounded-full bg-purple-950 border border-purple-700/60 flex items-center justify-center mx-auto text-purple-300 font-bold text-base mb-2">
                        {coHostsList[1]?.name?.[0] || 'G'}
                      </div>
                      <span className="text-xs font-bold text-white block">{coHostsList[1]?.name || 'Guest Speaker'}</span>
                      <span className="text-[10px] text-purple-400">Live Co-Host</span>
                    </div>
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white font-bold text-[10px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                      <span>{coHostsList[1]?.name || 'Guest Speaker'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Single Host Full-Width Video */
                <div className="w-full h-full relative">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted={isHost}
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-black/70 backdrop-blur-md text-white font-bold text-xs flex items-center gap-1.5 border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span>{broadcast?.hostName}</span>
                  </div>
                </div>
              )}

              {/* Host Floating Media Controls Overlay */}
              {(isHost || isCoHost) && (
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    onClick={handleToggleCam}
                    className={`p-2 rounded-xl backdrop-blur-md border transition-all ${
                      isCamOn ? 'bg-black/60 border-white/20 text-white' : 'bg-red-600 border-red-500 text-white'
                    }`}
                    title="Toggle Camera"
                  >
                    {isCamOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={handleToggleMic}
                    className={`p-2 rounded-xl backdrop-blur-md border transition-all ${
                      isMicOn ? 'bg-black/60 border-white/20 text-white' : 'bg-red-600 border-red-500 text-white'
                    }`}
                    title="Toggle Mic"
                  >
                    {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>
                </div>
              )}

            </div>

            {/* Broadcast Details Info Card */}
            <div className="p-5 bg-[#0b1220] border border-[#182842] rounded-2xl">
              <div className="flex items-baseline justify-between flex-wrap gap-2 mb-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  {broadcast?.title}
                </h1>
                <span className="text-xs text-gray-400 font-semibold">
                  Started {new Date(broadcast?.startedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {broadcast?.description && (
                <p className="text-xs text-gray-300 leading-relaxed mb-3">
                  {broadcast.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-[#16253f] flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Broadcaster:</span>
                  <span className="font-bold text-cyan-400">{broadcast?.hostName}</span>
                </div>

                {/* Reaction Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => triggerReaction('❤️')}
                    className="p-2 rounded-xl bg-[#142238] hover:bg-rose-950/80 border border-rose-900/40 text-rose-400 transition-transform active:scale-125"
                    title="Send Love"
                  >
                    <Heart className="w-4 h-4 fill-rose-500" />
                  </button>
                  <button
                    onClick={() => triggerReaction('🔥')}
                    className="p-2 rounded-xl bg-[#142238] hover:bg-amber-950/80 border border-amber-900/40 text-amber-400 transition-transform active:scale-125"
                    title="Send Fire"
                  >
                    <Flame className="w-4 h-4 fill-amber-500" />
                  </button>
                  <button
                    onClick={() => triggerReaction('👏')}
                    className="p-2 rounded-xl bg-[#142238] hover:bg-blue-950/80 border border-blue-900/40 text-blue-400 transition-transform active:scale-125 text-sm"
                    title="Send Applause"
                  >
                    👏
                  </button>
                  <button
                    onClick={() => triggerReaction('🚀')}
                    className="p-2 rounded-xl bg-[#142238] hover:bg-purple-950/80 border border-purple-900/40 text-purple-400 transition-transform active:scale-125 text-sm"
                    title="Send Rocket"
                  >
                    🚀
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* ══════════════════════════════════════════════════════════════
              RIGHT: REAL-TIME LIVE CHAT & COMMENTS STREAM (4 COLS)
          ══════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-4 bg-[#0b1220] border border-[#182842] rounded-3xl p-4 shadow-2xl flex flex-col h-[560px]">
            
            <div className="pb-3 mb-3 border-b border-[#16253f] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <span>Live Chat &amp; Q&amp;A</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                REALTIME
              </span>
            </div>

            {/* Chat Messages List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 text-xs pr-1">
              {chatMessages.map(msg => (
                <div key={msg.id} className="p-2.5 bg-[#060c16] border border-[#142036] rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${msg.isHost ? 'text-rose-400' : 'text-cyan-300'}`}>
                      {msg.user} {msg.isHost && '👑'}
                    </span>
                    <span className="text-[10px] text-gray-500">{msg.time}</span>
                  </div>
                  <p className="text-gray-200 leading-relaxed text-[11px]">
                    {msg.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleSendComment} className="pt-3 mt-2 border-t border-[#16253f] flex gap-2">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Say something in live chat..."
                className="flex-1 bg-[#060c16] border border-[#182842] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/60"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-md active:scale-95 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

          </div>

        </div>

      </div>

    </div>
  );
}
