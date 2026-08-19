'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Radio, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Copy, 
  Check, 
  Users, 
  Sparkles, 
  Globe, 
  ShieldCheck, 
  X, 
  RefreshCw,
  Link as LinkIcon,
  Layers,
  Tv
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { startLiveBroadcast } from '@/actions/liveStream';

interface LiveBroadcastStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  toleeId?: string;
  toleeName?: string;
  onStreamStarted?: (roomCode: string, postId?: string) => void;
}

export function LiveBroadcastStudioModal({
  isOpen,
  onClose,
  toleeId,
  toleeName,
  onStreamStarted
}: LiveBroadcastStudioModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [destination, setDestination] = useState<'feed' | 'community'>(toleeId ? 'community' : 'feed');
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera preview
  useEffect(() => {
    if (isOpen) {
      startCameraPreview();
    } else {
      stopCameraPreview();
    }
    return () => {
      stopCameraPreview();
    };
  }, [isOpen]);

  const startCameraPreview = async () => {
    try {
      setPreviewError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('[LiveStudio] Camera preview warning:', err);
      setPreviewError('Camera access required for live broadcast preview. You can still start your broadcast.');
    }
  };

  const stopCameraPreview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const toggleCam = () => {
    if (streamRef.current) {
      const vTrack = streamRef.current.getVideoTracks()[0];
      if (vTrack) {
        vTrack.enabled = !vTrack.enabled;
        setIsCamOn(vTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const aTrack = streamRef.current.getAudioTracks()[0];
      if (aTrack) {
        aTrack.enabled = !aTrack.enabled;
        setIsMicOn(aTrack.enabled);
      }
    }
  };

  const handleStartBroadcast = async () => {
    if (!title.trim()) {
      alert('Please enter a title for your live stream.');
      return;
    }

    setIsStarting(true);
    const res = await startLiveBroadcast({
      title: title.trim(),
      description: description.trim(),
      toleeId: destination === 'community' ? toleeId : undefined,
      toleeName: destination === 'community' ? toleeName : undefined,
    });

    if (res.success && res.roomCode) {
      stopCameraPreview();
      onClose();
      if (onStreamStarted) {
        onStreamStarted(res.roomCode, res.postId);
      }
      router.push(`/live/broadcast/${res.roomCode}`);
    } else {
      alert(res.error || 'Failed to launch live stream.');
      setIsStarting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0b1220] border border-[#1b2b48] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#142036] flex items-center justify-between bg-[#070d18]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-950 border border-red-800/60 flex items-center justify-center text-red-500 shadow-md">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Go Live • Broadcast Studio</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800/50 uppercase tracking-wider">
                  Live Feed &amp; Webinar
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Stream live to your followers with multi-host split-screen guest invites &amp; real-time viewers.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-[#142036] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          
          {/* Live Camera & Mic Preview Screen */}
          <div className="relative aspect-video w-full rounded-2xl bg-[#060c16] border border-[#16253f] overflow-hidden flex items-center justify-center shadow-inner">
            <video
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${isCamOn ? 'block' : 'hidden'}`}
            />

            {!isCamOn && (
              <div className="flex flex-col items-center text-gray-500 gap-2">
                <VideoOff className="w-10 h-10" />
                <span className="font-semibold">Camera is Turned Off</span>
              </div>
            )}

            {previewError && isCamOn && (
              <div className="absolute inset-0 bg-black/60 p-4 flex flex-col items-center justify-center text-center text-amber-300">
                <p className="text-xs">{previewError}</p>
              </div>
            )}

            {/* Live Camera Overlay Controls */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-red-600/90 text-white font-extrabold text-[10px] flex items-center gap-1.5 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  PREVIEW READY
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleCam}
                  className={`p-2 rounded-xl backdrop-blur-md border transition-all ${
                    isCamOn
                      ? 'bg-black/60 border-white/20 text-white hover:bg-black/80'
                      : 'bg-red-600 border-red-500 text-white'
                  }`}
                  title={isCamOn ? 'Turn Camera Off' : 'Turn Camera On'}
                >
                  {isCamOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={toggleMic}
                  className={`p-2 rounded-xl backdrop-blur-md border transition-all ${
                    isMicOn
                      ? 'bg-black/60 border-white/20 text-white hover:bg-black/80'
                      : 'bg-red-600 border-red-500 text-white'
                  }`}
                  title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
                >
                  {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Form Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-gray-300 font-bold mb-1">
                Live Broadcast Title / Headline *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Special Community Live Showcase &amp; Discussion"
                className="w-full bg-[#060c16] border border-[#182842] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/60 font-semibold"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-bold mb-1">
                Description / Discussion Topics (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="What will you talk about in this live stream? Add agenda or guest details..."
                className="w-full bg-[#060c16] border border-[#182842] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500/60 resize-none leading-relaxed"
              />
            </div>

            {/* Destination Selector */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div
                onClick={() => setDestination('feed')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  destination === 'feed'
                    ? 'bg-[#14233c] border-cyan-500/70 text-white'
                    : 'bg-[#060c16] border-[#16253f] text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-0.5 text-xs">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>Public Feed &amp; Followers</span>
                </div>
                <p className="text-[11px] text-gray-400">Stream to all Tolee users</p>
              </div>

              <div
                onClick={() => setDestination('community')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  destination === 'community'
                    ? 'bg-[#14233c] border-cyan-500/70 text-white'
                    : 'bg-[#060c16] border-[#16253f] text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-0.5 text-xs">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>{toleeName || 'Specific Community'}</span>
                </div>
                <p className="text-[11px] text-gray-400">Stream inside community group</p>
              </div>
            </div>

            {/* Multi-Host News Media Webinar Feature Banner */}
            <div className="p-3 bg-gradient-to-r from-[#181126] to-[#0f1d38] border border-purple-900/40 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-800/60 flex items-center justify-center text-purple-400">
                  <Tv className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white text-xs block">Multi-Host News Media Split-Screen</span>
                  <span className="text-[11px] text-purple-300">Invite guests/speakers to join your stream with split-screen video!</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#142036] bg-[#070d18] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-gray-400 hover:text-white font-bold text-xs"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStartBroadcast}
            disabled={isStarting}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-red-950/60 active:scale-95 transition-all disabled:opacity-50"
          >
            {isStarting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
            <span>{isStarting ? 'Launching Stream...' : '🔴 Start Live Broadcast'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
