'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Camera,
  Image as ImageIcon,
  Type,
  Sparkles,
  SwitchCamera,
  Zap,
  ZapOff,
  Circle,
  Square,
  Loader2,
  AlertCircle,
  Upload,
  ShoppingBag,
  Briefcase,
  Calendar,
  Users,
  Radio,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronRight,
  Palette
} from 'lucide-react';
import { uploadFile } from '@/lib/upload';

interface StoryComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMediaSelected: (mediaUrl: string, mediaType: 'image' | 'video', thumbnailUrl?: string) => void;
}

type ComposerTab = 'hub' | 'camera' | 'gallery' | 'text' | 'tolee';
type ToleeStorySubtype = 'product' | 'service' | 'event' | 'group' | 'radar';

const TEXT_BACKGROUNDS = [
  { id: 'indigo', name: 'Indigo Dream', bg: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' },
  { id: 'sunset', name: 'Sunset Glow', bg: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' },
  { id: 'aurora', name: 'Aurora', bg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' },
  { id: 'berry', name: 'Cosmic Berry', bg: 'linear-gradient(135deg, #831843 0%, #be185d 100%)' },
  { id: 'dark', name: 'Midnight', bg: '#121212' },
  { id: 'gold', name: 'Amber Glow', bg: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' },
  { id: 'ocean', name: 'Deep Ocean', bg: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)' },
];

const TEXT_FONTS = [
  { id: 'sans', name: 'Classic', font: 'font-sans font-bold', canvasFont: 'bold Arial' },
  { id: 'serif', name: 'Serif', font: 'font-serif font-semibold italic', canvasFont: 'italic bold Georgia' },
  { id: 'neon', name: 'Neon', font: 'font-sans font-black tracking-widest uppercase', canvasFont: '900 Arial' },
  { id: 'mono', name: 'Mono', font: 'font-mono font-bold', canvasFont: 'bold Courier New' },
  { id: 'cursive', name: 'Cursive', font: 'font-serif italic font-medium', canvasFont: 'italic Georgia' },
];

const TEXT_COLORS = [
  '#FFFFFF', '#000000', '#FF2A7A', '#FFD300', '#10D300', '#00E8E8', '#FF7F00', '#C084FC'
];

const QUICK_EMOJIS = ['✨', '🔥', '❤️', '🚀', '😍', '🎉', '💯', '👏', '😂'];

export function StoryComposerModal({
  isOpen,
  onClose,
  onMediaSelected,
}: StoryComposerModalProps) {
  const [activeTab, setActiveTab] = useState<ComposerTab>('hub');

  // Camera states
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashOn, setFlashOn] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Uploading state
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Text Story states
  const [textContent, setTextContent] = useState('');
  const [textBgIndex, setTextBgIndex] = useState(0);
  const [textFontIndex, setTextFontIndex] = useState(0);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [textSize, setTextSize] = useState<number>(36);

  // Tolee Special Story states
  const [toleeSubtype, setToleeSubtype] = useState<ToleeStorySubtype>('product');
  const [productTitle, setProductTitle] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [serviceTitle, setServiceTitle] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceLocation, setServiceLocation] = useState('');
  const [serviceContact, setServiceContact] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDateTime, setEventDateTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [groupTitle, setGroupTitle] = useState('');
  const [groupMembers, setGroupMembers] = useState('');
  const [radarTitle, setRadarTitle] = useState('');
  const [radarCategory, setRadarCategory] = useState('Alert');
  const [radarLocation, setRadarLocation] = useState('');

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera tracks helper
  const stopCameraTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  }, []);

  // Reset tab on close
  useEffect(() => {
    if (!isOpen) {
      stopCameraTracks();
      setActiveTab('hub');
      setIsRecordingVideo(false);
      setRecordingSeconds(0);
      setIsProcessing(false);
      setUploadProgress(0);
      setCameraError(null);
    }
  }, [isOpen, stopCameraTracks]);

  // Handle Camera startup
  const startCamera = useCallback(async () => {
    stopCameraTracks();
    setCameraError(null);
    setIsCameraStarting(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported on this browser.');
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
        // Fallback to video-only if audio/microphone is blocked
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
      setIsCameraStarting(false);
    } catch (err: any) {
      console.error('[StoryComposer] Camera init error:', err);
      setIsCameraStarting(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please enable camera access in settings or upload from Gallery.');
      } else {
        setCameraError(err.message || 'Unable to open camera.');
      }
    }
  }, [facingMode, stopCameraTracks]);

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCameraTracks();
    }
    return () => {
      stopCameraTracks();
    };
  }, [isOpen, activeTab, startCamera, stopCameraTracks]);

  // Flash / Torch toggle
  const toggleFlash = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      try {
        const capabilities: any = (videoTrack as any).getCapabilities ? (videoTrack as any).getCapabilities() : {};
        if (capabilities.torch) {
          const next = !flashOn;
          await (videoTrack as any).applyConstraints({
            advanced: [{ torch: next }],
          });
          setFlashOn(next);
        } else {
          setFlashOn(!flashOn);
        }
      } catch (e) {
        console.warn('Torch constraint toggle failed:', e);
      }
    }
  };

  // Switch Camera Front/Back
  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Upload helper
  const handleUploadAndProceed = async (file: File) => {
    setIsProcessing(true);
    setProcessingStatus('Uploading to Tolee Cloud...');
    setUploadProgress(10);

    try {
      const isVideo = file.type.startsWith('video');
      const uploadResult = await uploadFile(file, (percent) => {
        setUploadProgress(percent);
      });

      const optimizedUrl = uploadResult.secure_url;
      let thumbnailUrl: string | undefined = undefined;

      if (isVideo) {
        const rawVideoUrl: string = uploadResult.original_url || uploadResult.secure_url;
        if (rawVideoUrl.includes('res.cloudinary.com') && rawVideoUrl.includes('/video/upload/')) {
          thumbnailUrl = rawVideoUrl
            .replace('/video/upload/', '/video/upload/c_fill,w_400,h_400,g_auto,so_0,q_auto,f_jpg/')
            .replace(/\.([a-zA-Z0-9]+)$/, '.jpg');
        }
      } else {
        thumbnailUrl = optimizedUrl;
      }

      onClose();
      onMediaSelected(optimizedUrl, isVideo ? 'video' : 'image', thumbnailUrl);
    } catch (err: any) {
      console.error('[StoryComposer] Upload error:', err);
      alert('Upload failed: ' + (err.message || 'Please check your connection and try again.'));
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
      setProcessingStatus('');
    }
  };

  // Capture Photo from Camera
  const capturePhoto = async () => {
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
      async (blob) => {
        if (!blob) return;
        const photoFile = new File([blob], `tolee_story_photo_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        await handleUploadAndProceed(photoFile);
      },
      'image/jpeg',
      0.92
    );
  };

  // Video recording controls
  const startRecording = () => {
    if (!streamRef.current || isRecordingVideo) return;
    recordedChunksRef.current = [];

    try {
      const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const recorder = new MediaRecorder(streamRef.current, selectedMime ? { mimeType: selectedMime } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const recordedBlob = new Blob(recordedChunksRef.current, {
          type: selectedMime || 'video/webm',
        });
        const ext = selectedMime.includes('mp4') ? 'mp4' : 'webm';
        const videoFile = new File([recordedBlob], `tolee_story_video_${Date.now()}.${ext}`, {
          type: selectedMime || 'video/webm',
        });
        await handleUploadAndProceed(videoFile);
      };

      recorder.start(100);
      setIsRecordingVideo(true);
      setRecordingSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 59) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('[StoryComposer] Video recording error:', err);
      alert('Unable to record video: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecordingVideo) return;
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    mediaRecorderRef.current.stop();
    setIsRecordingVideo(false);
  };

  // Gallery File selection
  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'video/mp4', 'video/quicktime', 'video/webm'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|mp4|mov|webm)$/i)) {
      alert('Please select a supported image (JPG, PNG, WEBP) or video (MP4, MOV, WEBM) file.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      alert('File is too large. Please select a video under 100MB or an image under 20MB.');
      return;
    }

    handleUploadAndProceed(file);
  };

  // Text Story Generator to high-res Canvas
  const handleRenderTextStory = async () => {
    if (!textContent.trim()) {
      alert('Please type something for your text story!');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Creating your story card...');
    setUploadProgress(20);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      const bgDef = TEXT_BACKGROUNDS[textBgIndex];
      if (bgDef.bg.startsWith('linear-gradient')) {
        // Simple linear gradient approximation
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        if (bgDef.id === 'indigo') {
          grad.addColorStop(0, '#4f46e5');
          grad.addColorStop(1, '#7c3aed');
        } else if (bgDef.id === 'sunset') {
          grad.addColorStop(0, '#f43f5e');
          grad.addColorStop(1, '#fb923c');
        } else if (bgDef.id === 'aurora') {
          grad.addColorStop(0, '#059669');
          grad.addColorStop(1, '#10b981');
        } else if (bgDef.id === 'berry') {
          grad.addColorStop(0, '#831843');
          grad.addColorStop(1, '#be185d');
        } else if (bgDef.id === 'gold') {
          grad.addColorStop(0, '#d97706');
          grad.addColorStop(1, '#f59e0b');
        } else {
          grad.addColorStop(0, '#0284c7');
          grad.addColorStop(1, '#2563eb');
        }
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = bgDef.bg;
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle decorative watermark
      ctx.font = 'bold 28px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.textAlign = 'center';
      ctx.fillText('TOLEE STORIES', canvas.width / 2, 120);

      // Draw Main Text with word wrap
      const fontDef = TEXT_FONTS[textFontIndex];
      const scaledFontSize = Math.floor(textSize * 1.8);
      ctx.font = `${scaledFontSize}px ${fontDef.canvasFont}`;
      ctx.fillStyle = textColor;
      ctx.textAlign = textAlign;

      // Word wrapping logic
      const maxWidth = canvas.width - 160;
      const words = textContent.split(/\s+/);
      const lines: string[] = [];
      let currentLine = '';

      for (let n = 0; n < words.length; n++) {
        const testLine = currentLine ? `${currentLine} ${words[n]}` : words[n];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = words[n];
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      const lineHeight = scaledFontSize * 1.35;
      const totalBlockHeight = lines.length * lineHeight;
      let startY = (canvas.height - totalBlockHeight) / 2 + lineHeight / 2;

      let drawX = canvas.width / 2;
      if (textAlign === 'left') drawX = 100;
      if (textAlign === 'right') drawX = canvas.width - 100;

      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], drawX, startY + i * lineHeight);
      }

      // Convert to blob and upload
      canvas.toBlob(
        async (blob) => {
          if (!blob) throw new Error('Blob generation failed');
          const file = new File([blob], `tolee_text_story_${Date.now()}.jpg`, { type: 'image/jpeg' });
          await handleUploadAndProceed(file);
        },
        'image/jpeg',
        0.92
      );
    } catch (e: any) {
      console.error(e);
      setIsProcessing(false);
      alert('Failed to generate text story: ' + e.message);
    }
  };

  // Tolee-Specific Story Generator
  const handleRenderToleeStory = async () => {
    setIsProcessing(true);
    setProcessingStatus('Creating Tolee Story Card...');
    setUploadProgress(25);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context failed');

      // Background
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Card Container
      const cardX = 80;
      const cardY = 280;
      const cardW = canvas.width - 160;
      const cardH = 1360;

      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 48);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Top Header Badge
      ctx.fillStyle = '#6366f1';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      const badgeText =
        toleeSubtype === 'product'
          ? '🛍️ TOLEE MARKETPLACE'
          : toleeSubtype === 'service'
          ? '💼 TOLEE LOCAL SERVICE'
          : toleeSubtype === 'event'
          ? '📅 TOLEE COMMUNITY EVENT'
          : toleeSubtype === 'group'
          ? '👥 TOLEE COMMUNITY'
          : '🚨 TOLEE RADAR UPDATE';
      ctx.fillText(badgeText, canvas.width / 2, cardY + 100);

      // Dynamic Content
      if (toleeSubtype === 'product') {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 64px Arial';
        ctx.fillText(productTitle || 'Featured Product', canvas.width / 2, cardY + 280);

        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 72px Arial';
        ctx.fillText(`₹${productPrice || '999'}`, canvas.width / 2, cardY + 400);

        if (productDesc) {
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '40px Arial';
          ctx.fillText(productDesc.slice(0, 80), canvas.width / 2, cardY + 540);
        }

        // CTA Button
        drawCanvasButton(ctx, canvas.width / 2, cardY + 1100, 'VIEW PRODUCT ➔', '#6366f1');
      } else if (toleeSubtype === 'service') {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 64px Arial';
        ctx.fillText(serviceTitle || 'Professional Service', canvas.width / 2, cardY + 280);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 54px Arial';
        ctx.fillText(`Rate: ${servicePrice || 'Affordable'}`, canvas.width / 2, cardY + 400);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '44px Arial';
        ctx.fillText(`📍 ${serviceLocation || 'Local Neighborhood'}`, canvas.width / 2, cardY + 540);
        ctx.fillText(`📞 ${serviceContact || 'Direct Contact'}`, canvas.width / 2, cardY + 640);

        drawCanvasButton(ctx, canvas.width / 2, cardY + 1100, 'CONTACT NOW ➔', '#0ea5e9');
      } else if (toleeSubtype === 'event') {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 64px Arial';
        ctx.fillText(eventTitle || 'Community Gathering', canvas.width / 2, cardY + 280);

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 50px Arial';
        ctx.fillText(`🕒 ${eventDateTime || 'This Weekend'}`, canvas.width / 2, cardY + 420);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '44px Arial';
        ctx.fillText(`📍 ${eventLocation || 'Tolee Center'}`, canvas.width / 2, cardY + 550);

        drawCanvasButton(ctx, canvas.width / 2, cardY + 1100, 'JOIN EVENT ➔', '#d97706');
      } else if (toleeSubtype === 'group') {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 64px Arial';
        ctx.fillText(groupTitle || 'Neighborhood Tolee', canvas.width / 2, cardY + 300);

        ctx.fillStyle = '#a855f7';
        ctx.font = 'bold 50px Arial';
        ctx.fillText(`👥 ${groupMembers || '100+'} Active Neighbors`, canvas.width / 2, cardY + 460);

        drawCanvasButton(ctx, canvas.width / 2, cardY + 1100, 'JOIN GROUP ➔', '#9333ea');
      } else {
        // Radar
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 56px Arial';
        ctx.fillText(`[ ${radarCategory.toUpperCase()} ]`, canvas.width / 2, cardY + 280);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 64px Arial';
        ctx.fillText(radarTitle || 'Local Area Alert', canvas.width / 2, cardY + 400);

        ctx.fillStyle = '#fca5a5';
        ctx.font = '44px Arial';
        ctx.fillText(`📍 ${radarLocation || 'Near You'}`, canvas.width / 2, cardY + 530);

        drawCanvasButton(ctx, canvas.width / 2, cardY + 1100, 'VIEW RADAR ➔', '#dc2626');
      }

      // Convert and upload
      canvas.toBlob(
        async (blob) => {
          if (!blob) throw new Error('Blob creation failed');
          const file = new File([blob], `tolee_special_story_${Date.now()}.jpg`, { type: 'image/jpeg' });
          await handleUploadAndProceed(file);
        },
        'image/jpeg',
        0.92
      );
    } catch (e: any) {
      console.error(e);
      setIsProcessing(false);
      alert('Failed to generate Tolee story: ' + e.message);
    }
  };

  const drawCanvasButton = (ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string, color: string) => {
    const btnW = 600;
    const btnH = 110;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(cx - btnW / 2, cy - btnH / 2, btnW, btnH, 55);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy);
    ctx.restore();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-0 md:p-4 select-none">
      {/* Hidden native file input for Gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={handleFilePicked}
      />

      {/* Main Composer Frame */}
      <div className="relative w-full h-full md:h-[92vh] md:max-w-md bg-zinc-950 md:rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-zinc-800">
        
        {/* Processing / Upload Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <div className="p-5 bg-indigo-600/20 rounded-full mb-4 ring-2 ring-indigo-500/30">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
            </div>
            <h3 className="text-lg font-black text-white tracking-tight">{processingStatus || 'Uploading Media...'}</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs">Optimizing resolution & compression for instant 24h playback</p>
            {uploadProgress > 0 && (
              <div className="w-48 bg-zinc-800 h-2 rounded-full overflow-hidden mt-5">
                <div
                  className="bg-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/40 shrink-0 z-20">
          <div className="flex items-center gap-2">
            {activeTab !== 'hub' ? (
              <button
                onClick={() => {
                  stopCameraTracks();
                  setActiveTab('hub');
                }}
                className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <span className="font-bold text-sm text-white tracking-tight">
              {activeTab === 'camera'
                ? 'Camera'
                : activeTab === 'text'
                ? 'Text Story'
                : activeTab === 'tolee'
                ? 'Tolee Story'
                : 'Create Story'}
            </span>
          </div>

          {activeTab === 'text' && (
            <button
              onClick={handleRenderTextStory}
              className="px-4 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md"
            >
              Next
            </button>
          )}

          {activeTab === 'tolee' && (
            <button
              onClick={handleRenderToleeStory}
              className="px-4 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md"
            >
              Generate
            </button>
          )}
        </div>

        {/* ── BODY: SELECTION HUB ── */}
        {activeTab === 'hub' && (
          <div className="flex-1 overflow-y-auto p-5 flex flex-col justify-between">
            <div className="space-y-4 pt-2">
              <div className="text-center mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                  New Story / Status
                </span>
                <h2 className="text-xl font-black text-white mt-2">What would you like to share?</h2>
                <p className="text-xs text-zinc-400 mt-1">Visible to your neighbors and followers for 24 hours</p>
              </div>

              {/* 1. Camera Option */}
              <div
                onClick={() => setActiveTab('camera')}
                className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800 hover:border-indigo-500/50 cursor-pointer transition-all active:scale-[0.98] group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20 group-hover:scale-105 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                    Camera
                    <span className="text-[10px] bg-pink-500/20 text-pink-300 font-semibold px-2 py-0.5 rounded-full">Photo & Video</span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">Snap a photo or record a quick video</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              </div>

              {/* 2. Gallery Option */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800 hover:border-indigo-500/50 cursor-pointer transition-all active:scale-[0.98] group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-white">Gallery / Media</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">Select from photos or videos on your device</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              </div>

              {/* 3. Text Story Option */}
              <div
                onClick={() => setActiveTab('text')}
                className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800 hover:border-indigo-500/50 cursor-pointer transition-all active:scale-[0.98] group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <Type className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                    Text Story
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full">Aa</span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">Gradients, stylish fonts & centered text</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              </div>

              {/* 4. Tolee Special Story */}
              <div
                onClick={() => setActiveTab('tolee')}
                className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 to-purple-950/40 hover:from-indigo-950/60 hover:to-purple-950/60 border border-indigo-800/40 hover:border-indigo-500/50 cursor-pointer transition-all active:scale-[0.98] group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                    Tolee Special
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full">Product / Radar</span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">Showcase Marketplace products, events & radar alerts</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              </div>
            </div>

            <div className="text-center py-4">
              <span className="text-[11px] text-zinc-500">
                Stories disappear automatically after 24 hours
              </span>
            </div>
          </div>
        )}

        {/* ── BODY: CAMERA ── */}
        {activeTab === 'camera' && (
          <div className="relative flex-1 bg-black flex flex-col overflow-hidden">
            {/* Live Camera Viewfinder */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
            />

            {/* Error or Initializing State */}
            {isCameraStarting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3 text-white">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <span className="text-xs font-semibold">Starting camera...</span>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center text-white gap-4">
                <AlertCircle className="w-10 h-10 text-rose-500" />
                <p className="text-xs text-zinc-300 max-w-xs">{cameraError}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg transition-all"
                >
                  Upload from Gallery instead
                </button>
              </div>
            )}

            {/* Recording Timer Indicator */}
            {isRecordingVideo && (
              <div className="absolute top-4 inset-x-0 flex justify-center z-20">
                <div className="flex items-center gap-2 bg-red-600/90 text-white px-3.5 py-1 rounded-full text-xs font-bold tracking-wider backdrop-blur-sm animate-pulse">
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  <span>REC 00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}</span>
                </div>
              </div>
            )}

            {/* Top Camera Controls */}
            <div className="absolute top-4 inset-x-0 flex items-center justify-between px-4 z-10">
              <button
                onClick={toggleFlash}
                className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all active:scale-90"
              >
                {flashOn ? <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" /> : <ZapOff className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleCameraFacing}
                className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all active:scale-90"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            </div>

            {/* Bottom Camera Action Bar */}
            <div className="absolute bottom-6 inset-x-0 flex items-center justify-around px-6 z-10">
              {/* Quick Gallery Shortcut */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-all active:scale-90"
                title="Open Gallery"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              {/* Shutter Capture Button */}
              <div className="flex items-center gap-3">
                {isRecordingVideo ? (
                  <button
                    onClick={stopRecording}
                    className="w-18 h-18 rounded-full border-4 border-red-500 p-1 flex items-center justify-center transition-all scale-105 active:scale-95"
                  >
                    <div className="w-8 h-8 rounded-md bg-red-500" />
                  </button>
                ) : (
                  <div className="flex items-center gap-4">
                    {/* Snap Photo */}
                    <button
                      onClick={capturePhoto}
                      className="w-16 h-16 rounded-full border-4 border-white p-1 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl"
                      title="Take Photo"
                    >
                      <div className="w-full h-full rounded-full bg-white" />
                    </button>

                    {/* Record Video Button */}
                    <button
                      onClick={startRecording}
                      className="w-12 h-12 rounded-full border-2 border-red-500/80 p-1 flex items-center justify-center transition-all hover:scale-105 active:scale-90 bg-red-500/20"
                      title="Record Video"
                    >
                      <div className="w-4 h-4 rounded-full bg-red-500" />
                    </button>
                  </div>
                )}
              </div>

              {/* Switch to Text Composer */}
              <button
                onClick={() => setActiveTab('text')}
                className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-all active:scale-90"
                title="Text Story"
              >
                <Type className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ── BODY: TEXT STORY ── */}
        {activeTab === 'text' && (
          <div
            className="relative flex-1 flex flex-col justify-between p-6 transition-all duration-300"
            style={{ background: TEXT_BACKGROUNDS[textBgIndex].bg }}
          >
            {/* Alignment and Font Controls Header */}
            <div className="flex items-center justify-between gap-2 z-10 pt-2">
              {/* Alignment */}
              <div className="flex bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10">
                <button
                  onClick={() => setTextAlign('left')}
                  className={`p-1.5 rounded-full transition-colors ${textAlign === 'left' ? 'bg-white text-black' : 'text-white'}`}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setTextAlign('center')}
                  className={`p-1.5 rounded-full transition-colors ${textAlign === 'center' ? 'bg-white text-black' : 'text-white'}`}
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setTextAlign('right')}
                  className={`p-1.5 rounded-full transition-colors ${textAlign === 'right' ? 'bg-white text-black' : 'text-white'}`}
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Font Picker */}
              <button
                onClick={() => setTextFontIndex((prev) => (prev + 1) % TEXT_FONTS.length)}
                className="px-3.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white text-xs font-bold backdrop-blur-md border border-white/10 transition-all active:scale-95"
              >
                {TEXT_FONTS[textFontIndex].name}
              </button>

              {/* Background Color Switcher */}
              <button
                onClick={() => setTextBgIndex((prev) => (prev + 1) % TEXT_BACKGROUNDS.length)}
                className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 transition-all active:scale-95"
                title="Change Background"
              >
                <Palette className="w-4 h-4" />
              </button>
            </div>

            {/* Central Editable Textarea */}
            <div className="flex-1 flex items-center justify-center my-6 z-10">
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Write something..."
                rows={4}
                autoFocus
                className={`w-full bg-transparent border-none outline-none resize-none leading-relaxed text-center placeholder-white/40 transition-all ${
                  TEXT_FONTS[textFontIndex].font
                } ${textAlign === 'left' ? 'text-left' : textAlign === 'right' ? 'text-right' : 'text-center'}`}
                style={{
                  color: textColor,
                  fontSize: `${textSize}px`,
                }}
              />
            </div>

            {/* Bottom Customizers: Emojis & Colors */}
            <div className="space-y-3 z-10 bg-black/40 backdrop-blur-md p-3 rounded-3xl border border-white/10">
              {/* Quick Emojis */}
              <div className="flex items-center justify-around">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setTextContent((prev) => prev + emoji)}
                    className="text-lg hover:scale-125 transition-transform active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Color Swatches */}
              <div className="flex items-center justify-center gap-2.5 pt-1">
                {TEXT_COLORS.map((col) => (
                  <button
                    key={col}
                    onClick={() => setTextColor(col)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      textColor === col ? 'scale-125 border-white ring-2 ring-white/30' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── BODY: TOLEE SPECIAL STORIES ── */}
        {activeTab === 'tolee' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Sub-tabs */}
            <div className="flex gap-1.5 p-1 bg-zinc-900 rounded-2xl border border-zinc-800 overflow-x-auto scrollbar-none">
              {(['product', 'service', 'event', 'group', 'radar'] as ToleeStorySubtype[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setToleeSubtype(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-all ${
                    toleeSubtype === tab
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Subtype Form */}
            {toleeSubtype === 'product' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Product Title</label>
                  <input
                    type="text"
                    value={productTitle}
                    onChange={(e) => setProductTitle(e.target.value)}
                    placeholder="e.g. Handmade Ceramic Cup"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Price (₹)</label>
                  <input
                    type="text"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    placeholder="e.g. 499"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Short Description</label>
                  <textarea
                    rows={2}
                    value={productDesc}
                    onChange={(e) => setProductDesc(e.target.value)}
                    placeholder="Brief highlights or condition..."
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>
            )}

            {toleeSubtype === 'service' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Service Title</label>
                  <input
                    type="text"
                    value={serviceTitle}
                    onChange={(e) => setServiceTitle(e.target.value)}
                    placeholder="e.g. Home Plumbing & Repairs"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Price / Rates</label>
                  <input
                    type="text"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    placeholder="e.g. Starting ₹299"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Service Location</label>
                  <input
                    type="text"
                    value={serviceLocation}
                    onChange={(e) => setServiceLocation(e.target.value)}
                    placeholder="e.g. Bandra West, Mumbai"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Contact Details</label>
                  <input
                    type="text"
                    value={serviceContact}
                    onChange={(e) => setServiceContact(e.target.value)}
                    placeholder="Phone or WhatsApp number"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {toleeSubtype === 'event' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Event Name</label>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="e.g. Weekend Cricket Tournament"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Date & Time</label>
                  <input
                    type="text"
                    value={eventDateTime}
                    onChange={(e) => setEventDateTime(e.target.value)}
                    placeholder="e.g. This Sunday at 7:00 AM"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Location / Venue</label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="e.g. Shivaji Park Ground"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {toleeSubtype === 'group' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Group / Tolee Name</label>
                  <input
                    type="text"
                    value={groupTitle}
                    onChange={(e) => setGroupTitle(e.target.value)}
                    placeholder="e.g. Kothrud Residents Club"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Members Count</label>
                  <input
                    type="text"
                    value={groupMembers}
                    onChange={(e) => setGroupMembers(e.target.value)}
                    placeholder="e.g. 240+ Members"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {toleeSubtype === 'radar' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Category</label>
                  <select
                    value={radarCategory}
                    onChange={(e) => setRadarCategory(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Alert">Alert (Urgent)</option>
                    <option value="Secret Food">Secret Food Spot</option>
                    <option value="Local News">Local News</option>
                    <option value="Deals & Offers">Deals & Offers</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Alert Headline</label>
                  <input
                    type="text"
                    value={radarTitle}
                    onChange={(e) => setRadarTitle(e.target.value)}
                    placeholder="e.g. Water Supply Maintenance Alert"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Location</label>
                  <input
                    type="text"
                    value={radarLocation}
                    onChange={(e) => setRadarLocation(e.target.value)}
                    placeholder="e.g. Sector 4 & 5"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <p className="text-[11px] text-zinc-500 pt-2 text-center">
              A responsive 9:16 interactive Story Card will be generated and passed to the Story Editor.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
