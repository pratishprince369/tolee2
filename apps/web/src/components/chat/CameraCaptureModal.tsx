'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Video, X, RefreshCw, Check, Circle, SwitchCamera, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureComplete: (file: File, kind: 'image' | 'video') => void;
}

export function CameraCaptureModal({ isOpen, onClose, onCaptureComplete }: CameraCaptureModalProps) {
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Preview captured state
  const [capturedPreview, setCapturedPreview] = useState<{
    url: string;
    file: File;
    kind: 'image' | 'video';
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or reconfigure camera stream
  useEffect(() => {
    if (!isOpen) {
      cleanupStream();
      setCapturedPreview(null);
      setIsRecording(false);
      setRecordingSeconds(0);
      return;
    }

    startCamera();

    return () => {
      cleanupStream();
    };
  }, [isOpen, facingMode]);

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const startCamera = async () => {
    setErrorMsg(null);
    cleanupStream();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error("[Camera] Failed to access media devices:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Camera or Microphone permission was denied. Please allow camera access in browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMsg('No camera or microphone device found on this system.');
      } else {
        // Fallback without audio constraint
        try {
          const videoOnlyStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode }
          });
          streamRef.current = videoOnlyStream;
          if (videoRef.current) {
            videoRef.current.srcObject = videoOnlyStream;
            videoRef.current.play().catch(() => {});
          }
        } catch (videoOnlyErr: any) {
          setErrorMsg('Unable to access camera: ' + (videoOnlyErr.message || 'Device error'));
        }
      }
    }
  };

  const handleToggleFacingMode = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Capture still photo
  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally if front-facing selfie
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const filename = `camera_photo_${Date.now()}.jpg`;
      const file = new File([blob], filename, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(file);

      setCapturedPreview({
        url: previewUrl,
        file,
        kind: 'image'
      });
      cleanupStream();
    }, 'image/jpeg', 0.92);
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
        const filename = `camera_video_${Date.now()}.${ext}`;
        const file = new File([blob], filename, { type: mimeType });
        const previewUrl = URL.createObjectURL(file);

        setCapturedPreview({
          url: previewUrl,
          file,
          kind: 'video'
        });
        cleanupStream();
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("[Camera] Failed to start video recording:", err);
      alert("Video recording could not start: " + err.message);
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

  const handleRetake = () => {
    if (capturedPreview?.url) {
      URL.revokeObjectURL(capturedPreview.url);
    }
    setCapturedPreview(null);
    setRecordingSeconds(0);
    startCamera();
  };

  const handleUseCaptured = () => {
    if (!capturedPreview) return;
    onCaptureComplete(capturedPreview.file, capturedPreview.kind);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-950 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl flex flex-col aspect-[3/4] sm:aspect-auto sm:h-[600px]">
        {/* Header Controls */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center gap-2">
            {!capturedPreview && (
              <div className="flex bg-black/40 backdrop-blur-md rounded-full p-0.5 border border-white/10">
                <button
                  type="button"
                  onClick={() => setMode('photo')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${mode === 'photo' ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  Photo
                </button>
                <button
                  type="button"
                  onClick={() => setMode('video')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${mode === 'video' ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  Video
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!capturedPreview && (
              <button
                type="button"
                onClick={handleToggleFacingMode}
                className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors border border-white/10"
                title="Switch Camera"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors border border-white/10"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {errorMsg ? (
            <div className="p-6 text-center max-w-sm text-zinc-300 space-y-3">
              <AlertCircle className="w-10 h-10 mx-auto text-rose-500 animate-pulse" />
              <p className="text-sm font-medium">{errorMsg}</p>
              <Button onClick={startCamera} variant="outline" className="text-xs rounded-xl mt-2 border-zinc-700">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try Again
              </Button>
            </div>
          ) : capturedPreview ? (
            capturedPreview.kind === 'image' ? (
              <img
                src={capturedPreview.url}
                alt="Captured"
                className="w-full h-full object-contain"
              />
            ) : (
              <video
                src={capturedPreview.url}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            )
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
          )}

          {/* Video Recording Timer Indicator */}
          {isRecording && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-black animate-pulse shadow-lg">
              <Circle className="w-2.5 h-2.5 fill-white" />
              <span>
                {Math.floor(recordingSeconds / 60)}:
                {recordingSeconds % 60 < 10 ? '0' : ''}
                {recordingSeconds % 60}
              </span>
            </div>
          )}
        </div>

        {/* Bottom Shutter & Action Bar */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-900 flex items-center justify-around z-20">
          {capturedPreview ? (
            <div className="flex items-center justify-between w-full px-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleRetake}
                className="rounded-full px-5 text-xs font-bold border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200"
              >
                <RefreshCw className="w-4 h-4 mr-1.5" /> Retake
              </Button>

              <Button
                type="button"
                onClick={handleUseCaptured}
                className="rounded-full px-6 text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-lg"
              >
                <Check className="w-4 h-4 mr-1.5" /> Use {capturedPreview.kind === 'image' ? 'Photo' : 'Video'}
              </Button>
            </div>
          ) : mode === 'photo' ? (
            <button
              type="button"
              onClick={handleTakePhoto}
              className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 group hover:scale-105 active:scale-95 transition-transform"
              title="Take Photo"
            >
              <div className="w-full h-full bg-white rounded-full transition-colors" />
            </button>
          ) : (
            <button
              type="button"
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 group hover:scale-105 active:scale-95 transition-transform ${isRecording ? 'border-red-500' : ''}`}
              title={isRecording ? "Stop Recording" : "Start Recording"}
            >
              {isRecording ? (
                <div className="w-6 h-6 bg-red-600 rounded-md animate-pulse" />
              ) : (
                <div className="w-full h-full bg-red-600 rounded-full" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
