'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Zap,
  ZapOff,
  Grid3X3,
  SwitchCamera,
  Image as ImageIcon,
  Circle,
  AlertCircle,
  Loader2,
  Square,
} from 'lucide-react';
import { MediaItem } from '@/components/UploadContext';

interface InstagramReelsCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMediaCaptured: (item: MediaItem) => void;
  onOpenGallery: () => void;
}

export function InstagramReelsCameraModal({
  isOpen,
  onClose,
  onMediaCaptured,
  onOpenGallery,
}: InstagramReelsCameraModalProps) {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashOn, setFlashOn] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [activeTab, setActiveTab] = useState<'POST' | 'STORY' | 'REEL'>('REEL');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up all video tracks
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    stopTracks();
    setCameraError(null);
    setIsInitializing(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: true,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (audioErr) {
        // Fallback to video-only if microphone is unavailable/blocked
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1080 },
            height: { ideal: 1920 },
          },
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsInitializing(false);
    } catch (err: any) {
      console.error('[InstagramCamera] Camera access error:', err);
      setIsInitializing(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in browser settings, or select media from Gallery below.');
      } else {
        setCameraError(err.message || 'Unable to start camera.');
      }
    }
  }, [facingMode, stopTracks]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopTracks();
      setIsRecording(false);
      setRecordingSeconds(0);
      setFlashOn(false);
    }
    return () => {
      stopTracks();
    };
  }, [isOpen, startCamera, stopTracks]);

  // Flash / Torch toggle
  const toggleFlash = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      try {
        const capabilities: any = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        if (capabilities.torch) {
          const nextState = !flashOn;
          await (videoTrack as any).applyConstraints({
            advanced: [{ torch: nextState }],
          });
          setFlashOn(nextState);
          return;
        }
      } catch (err) {
        console.warn('Torch constraint not applied:', err);
      }
    }
    setFlashOn((prev) => !prev);
  };

  // Flip front/back camera
  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Take high-res still photo
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `tolee_snap_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const url = URL.createObjectURL(file);
        stopTracks();
        onMediaCaptured({
          type: 'image',
          url,
          file,
        });
        onClose();
      },
      'image/jpeg',
      0.95
    );
  };

  // Start video recording
  const handleStartRecording = () => {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];

    try {
      const mimeType = MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const file = new File([blob], `tolee_reel_${Date.now()}.${ext}`, { type: mimeType });
        const url = URL.createObjectURL(file);
        stopTracks();
        onMediaCaptured({
          type: 'video',
          url,
          file,
        });
        onClose();
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            handleStopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      alert('Unable to record video: ' + err.message);
    }
  };

  // Stop video recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-200">
      {/* ── Top Header Controls ── */}
      <div className="relative z-30 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 active:scale-95 text-white transition-all backdrop-blur-md cursor-pointer"
          title="Close Camera"
        >
          <X className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Center: Flash & Grid Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleFlash}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all backdrop-blur-md cursor-pointer ${
              flashOn ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30' : 'bg-black/40 text-white hover:bg-black/60'
            }`}
            title="Toggle Flash / Torch"
          >
            {flashOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={() => setShowGrid((g) => !g)}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all backdrop-blur-md cursor-pointer ${
              showGrid ? 'bg-white/20 text-white' : 'bg-black/40 text-white/50 hover:text-white'
            }`}
            title="Toggle Rule-of-Thirds Grid"
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
        </div>

        {/* Right Brand / Reel Indicator */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white">
          <span className="text-xs font-black tracking-wider text-teal-400">TOLEE</span>
        </div>
      </div>

      {/* ── Center Camera Viewfinder ── */}
      <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center bg-zinc-950">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover transition-transform duration-300 ${
            facingMode === 'user' ? '-scale-x-100' : 'scale-x-100'
          }`}
        />

        {/* 3x3 Rule-of-Thirds Grid (Matching Instagram Screenshot) */}
        {showGrid && !cameraError && (
          <div className="absolute inset-0 pointer-events-none z-10 flex flex-col">
            <div className="flex-1 flex border-b border-white/20">
              <div className="flex-1 border-r border-white/20" />
              <div className="flex-1 border-r border-white/20" />
              <div className="flex-1" />
            </div>
            <div className="flex-1 flex border-b border-white/20">
              <div className="flex-1 border-r border-white/20" />
              <div className="flex-1 border-r border-white/20" />
              <div className="flex-1" />
            </div>
            <div className="flex-1 flex">
              <div className="flex-1 border-r border-white/20" />
              <div className="flex-1 border-r border-white/20" />
              <div className="flex-1" />
            </div>
          </div>
        )}

        {/* Recording Timer Badge */}
        {isRecording && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-red-600/90 backdrop-blur-md px-4 py-1.5 rounded-full text-white font-extrabold text-xs shadow-xl animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-white" />
            <span>
              00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds} / 01:00
            </span>
          </div>
        )}

        {/* Loading Spinner */}
        {isInitializing && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20">
            <Loader2 className="w-10 h-10 text-white animate-spin mb-2" />
            <p className="text-white text-xs font-semibold">Starting Camera...</p>
          </div>
        )}

        {/* Camera Permission or Device Error Fallback */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 bg-zinc-950/95">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-white font-extrabold text-base mb-1">Camera Permission Needed</h3>
            <p className="text-zinc-400 text-xs max-w-xs mb-6 leading-relaxed">
              {cameraError}
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenGallery();
                }}
                className="w-full py-3.5 px-5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-teal-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Choose from Gallery</span>
              </button>
              <button
                type="button"
                onClick={startCamera}
                className="w-full py-2.5 px-4 rounded-full bg-zinc-800 text-zinc-300 font-semibold text-xs hover:bg-zinc-700 active:scale-95 transition-all cursor-pointer"
              >
                Retry Camera
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Controls Bar (Instagram Style) ── */}
      <div className="relative z-30 flex flex-col bg-gradient-to-t from-black via-black/90 to-transparent pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] px-6">
        {/* Main Action Trigger Row: Gallery, Capture Shutter, Switch Camera */}
        <div className="flex items-center justify-between max-w-md mx-auto w-full mb-5">
          {/* Bottom-Left: Gallery Button (Opens native mobile photo/video gallery) */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenGallery();
            }}
            className="flex flex-col items-center gap-1 group active:scale-90 transition-all cursor-pointer"
            title="Open Phone Gallery"
          >
            <div className="w-12 h-12 rounded-2xl bg-zinc-900/80 border-2 border-white/40 flex items-center justify-center text-white backdrop-blur-md group-hover:border-white shadow-lg shadow-black/50 transition-all">
              <ImageIcon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-white/80 tracking-wide">Gallery</span>
          </button>

          {/* Center: Concentric Instagram-Style Shutter Button */}
          <div className="relative flex items-center justify-center">
            {isRecording ? (
              // Stop Recording Button
              <button
                type="button"
                onClick={handleStopRecording}
                className="w-20 h-20 rounded-full border-4 border-red-500 flex items-center justify-center bg-black/40 backdrop-blur-md active:scale-95 transition-all cursor-pointer"
                title="Stop Recording"
              >
                <Square className="w-7 h-7 fill-red-500 text-red-500 rounded-sm" />
              </button>
            ) : (
              // Capture Photo (Click) / Record Video (Long Press or Mode)
              <button
                type="button"
                onClick={activeTab === 'STORY' || activeTab === 'REEL' ? handleStartRecording : handleCapturePhoto}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 bg-white/10 backdrop-blur-sm active:scale-90 hover:scale-105 transition-all shadow-2xl cursor-pointer"
                title={activeTab === 'REEL' ? 'Record Reel Video' : 'Capture Photo'}
              >
                <div
                  className={`w-full h-full rounded-full transition-all ${
                    activeTab === 'REEL' ? 'bg-red-500' : 'bg-white'
                  }`}
                />
              </button>
            )}
          </div>

          {/* Bottom-Right: Switch Front/Back Camera */}
          <button
            type="button"
            onClick={handleSwitchCamera}
            className="flex flex-col items-center gap-1 group active:scale-90 transition-all cursor-pointer"
            title="Flip Camera"
          >
            <div className="w-12 h-12 rounded-2xl bg-zinc-900/80 border-2 border-white/40 flex items-center justify-center text-white backdrop-blur-md group-hover:border-white shadow-lg shadow-black/50 transition-all">
              <SwitchCamera className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-white/80 tracking-wide">Flip</span>
          </button>
        </div>

        {/* Bottom Mode Switcher (POST / STORY / REEL) matching Instagram screenshot */}
        <div className="flex items-center justify-center gap-8 text-xs font-black tracking-widest text-zinc-400">
          <button
            type="button"
            onClick={() => setActiveTab('POST')}
            className={`transition-all pb-1 ${
              activeTab === 'POST' ? 'text-white border-b-2 border-white font-extrabold scale-105' : 'hover:text-white/80'
            }`}
          >
            POST
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('STORY')}
            className={`transition-all pb-1 ${
              activeTab === 'STORY' ? 'text-white border-b-2 border-white font-extrabold scale-105' : 'hover:text-white/80'
            }`}
          >
            STORY
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('REEL')}
            className={`transition-all pb-1 ${
              activeTab === 'REEL' ? 'text-white border-b-2 border-teal-400 text-teal-400 font-extrabold scale-105' : 'hover:text-white/80'
            }`}
          >
            REEL
          </button>
        </div>
      </div>
    </div>
  );
}
