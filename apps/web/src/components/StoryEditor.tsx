'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Smile, 
  Music, 
  Sparkles, 
  Maximize2, 
  ChevronDown, 
  ArrowRight, 
  CornerUpLeft, 
  CornerUpRight, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Type, 
  Check, 
  Trash2, 
  Compass, 
  Hash, 
  AlertTriangle 
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession } from 'next-auth/react';
import { createTestStory } from '@/actions/highlight';
import { uploadFile } from '@/lib/upload';

interface StoryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  userAvatar?: string;
  userName?: string;
  onStoryPublished?: () => void; // callback after publishing
}

interface FloatingElement {
  id: string;
  type: 'text' | 'emoji' | 'sticker' | 'music';
  text?: string;
  emoji?: string;
  stickerType?: 'location' | 'hashtag';
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  size: number; // scale (e.g. 1)
  rotation: number; // degrees (0 - 360)
  color?: string;
  font?: string;
  highlight?: boolean;
  songTitle?: string;
  artist?: string;
}

interface DrawingPath {
  points: { x: number; y: number }[];
  color: string;
  size: number;
  type: 'brush' | 'neon' | 'highlighter' | 'eraser';
}

const CURATED_FONTS = [
  { name: 'Classic', value: 'font-sans font-bold' },
  { name: 'Serif', value: 'font-serif font-semibold italic' },
  { name: 'Neon', value: 'font-sans font-black tracking-widest uppercase' },
  { name: 'Modern', value: 'font-mono font-bold uppercase' },
  { name: 'Cursive', value: 'font-serif italic tracking-wide font-medium' }
];

const CURATED_COLORS = [
  '#FFFFFF', '#000000', '#FF2A7A', '#FF7F00', '#FFD300', 
  '#10D300', '#00E8E8', '#007FFF', '#7F00FF', '#FF00A0'
];

const CURATED_STICKERS = [
  { type: 'location', label: '📍 Location', placeholder: 'Enter Location...' },
  { type: 'hashtag', label: '# Hashtag', placeholder: 'Enter Hashtag...' }
];

const POPULAR_SONGS = [
  { id: '1', title: 'Summer Breeze', artist: 'H1 Music', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150' },
  { id: '2', title: 'Good Vibes Only', artist: 'The Shakes', cover: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=150' },
  { id: '3', title: 'Midnight City', artist: 'Outrun', cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=150' },
  { id: '4', title: 'Chill Chill', artist: 'Lofi Beats', cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=150' }
];

const STYLES_FILTERS = [
  { name: 'Normal', filter: 'none' },
  { name: 'Vintage', filter: 'sepia(0.5) contrast(1.1) brightness(0.95)' },
  { name: 'B&W', filter: 'grayscale(1) contrast(1.15)' },
  { name: 'Warm', filter: 'saturate(1.25) sepia(0.2) hue-rotate(-10deg)' },
  { name: 'Cool', filter: 'saturate(0.9) hue-rotate(15deg) contrast(1.05)' },
  { name: 'Vivid', filter: 'saturate(1.5) contrast(1.1)' },
  { name: 'Blurry', filter: 'blur(3px) brightness(1.05)' }
];

export function StoryEditor({
  isOpen,
  onClose,
  mediaUrl,
  mediaType,
  userAvatar,
  userName,
  onStoryPublished
}: StoryEditorProps) {
  const { data: session } = useSession();
  
  // Base media states
  const [activeTool, setActiveTool] = useState<'none' | 'text' | 'stickers' | 'music' | 'restyle' | 'resize'>('none');
  const [caption, setCaption] = useState('');
  const [closeFriends, setCloseFriends] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Resize & rotation states
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  // Restyle/Filters state
  const [activeFilter, setActiveFilter] = useState('none');
  const [brushColor, setBrushColor] = useState('#FF2A7A');
  const [brushSize, setBrushSize] = useState(6);
  const [activeBrushType, setActiveBrushType] = useState<'brush' | 'neon' | 'highlighter' | 'eraser'>('brush');
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);
  const [undonePaths, setUndonePaths] = useState<DrawingPath[]>([]);
  
  // Floating Elements states
  const [elements, setElements] = useState<FloatingElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Text tools states
  const [isTextEditing, setIsTextEditing] = useState(false);
  const [currentTextValue, setCurrentTextValue] = useState('');
  const [currentTextColor, setCurrentTextColor] = useState('#FFFFFF');
  const [currentTextFont, setCurrentTextFont] = useState(CURATED_FONTS[0].value);
  const [currentTextHighlight, setCurrentTextHighlight] = useState(false);

  // Sticker tool states
  const [showStickerTypeInput, setShowStickerTypeInput] = useState<'location' | 'hashtag' | null>(null);
  const [stickerInputValue, setStickerInputValue] = useState('');

  // Music tool states
  const [selectedSong, setSelectedSong] = useState<any | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  // Video playback preview state
  const [videoPlaying, setVideoPlaying] = useState(true);
  const [videoMuted, setVideoMuted] = useState(true);

  // HTML Refs
  const workspaceRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Dragging active element state variables
  const dragInfo = useRef<{ id: string; startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const isDrawing = useRef(false);

  // Pre-load draft state if saved
  useEffect(() => {
    if (isOpen && mediaUrl) {
      const draft = localStorage.getItem(`story_draft_${mediaUrl}`);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setElements(parsed.elements || []);
          setDrawingPaths(parsed.drawingPaths || []);
          setActiveFilter(parsed.activeFilter || 'none');
          setScale(parsed.scale || 1);
          setRotation(parsed.rotation || 0);
          setOffsetX(parsed.offsetX || 0);
          setOffsetY(parsed.offsetY || 0);
          setCaption(parsed.caption || '');
        } catch (e) {
          console.error("Failed to load draft story", e);
        }
      }
    }
  }, [isOpen, mediaUrl]);

  // Auto-save draft on every modification
  const saveStoryDraft = useCallback(() => {
    if (!mediaUrl) return;
    const draftData = {
      elements,
      drawingPaths,
      activeFilter,
      scale,
      rotation,
      offsetX,
      offsetY,
      caption
    };
    localStorage.setItem(`story_draft_${mediaUrl}`, JSON.stringify(draftData));
  }, [mediaUrl, elements, drawingPaths, activeFilter, scale, rotation, offsetX, offsetY, caption]);

  useEffect(() => {
    if (isOpen) {
      saveStoryDraft();
    }
  }, [elements, drawingPaths, activeFilter, scale, rotation, offsetX, offsetY, caption, isOpen, saveStoryDraft]);

  // Clear draft upon successful publish
  const clearStoryDraft = () => {
    if (mediaUrl) {
      localStorage.removeItem(`story_draft_${mediaUrl}`);
    }
  };

  // Setup drawing canvas resize listener
  const setupCanvas = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Redraw all paths
    redrawCanvas();
  }, [drawingPaths]);

  useEffect(() => {
    if (activeTool === 'restyle') {
      setTimeout(setupCanvas, 100);
    }
  }, [activeTool, setupCanvas]);

  const redrawCanvas = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawingPaths.forEach(path => {
      if (path.points.length < 2) return;
      ctx.beginPath();
      
      // Brush options
      ctx.globalAlpha = path.type === 'highlighter' ? 0.4 : 1.0;
      ctx.lineWidth = path.type === 'highlighter' ? path.size * 2 : path.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (path.type === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.shadowBlur = 0;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = path.color;
        
        if (path.type === 'neon') {
          ctx.shadowColor = path.color;
          ctx.shadowBlur = 12;
        } else {
          ctx.shadowBlur = 0;
        }
      }

      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    });

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
  };

  // Canvas drawing mouse/touch handlers
  const handleCanvasStart = (clientX: number, clientY: number) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    isDrawing.current = true;
    const newPath: DrawingPath = {
      points: [{ x, y }],
      color: brushColor,
      size: brushSize,
      type: activeBrushType
    };

    setDrawingPaths(prev => [...prev, newPath]);
    setUndonePaths([]); // Clear redo buffer
  };

  const handleCanvasMove = (clientX: number, clientY: number) => {
    if (!isDrawing.current) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setDrawingPaths(prev => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last) {
        last.points.push({ x, y });
      }
      return next;
    });

    redrawCanvas();
  };

  const handleCanvasEnd = () => {
    isDrawing.current = false;
  };

  const undoLastPath = () => {
    if (drawingPaths.length === 0) return;
    setDrawingPaths(prev => {
      const next = [...prev];
      const removed = next.pop();
      if (removed) setUndonePaths(u => [...u, removed]);
      return next;
    });
    setTimeout(redrawCanvas, 50);
  };

  const redoLastPath = () => {
    if (undonePaths.length === 0) return;
    setUndonePaths(prev => {
      const next = [...prev];
      const restored = next.pop();
      if (restored) setDrawingPaths(d => [...d, restored]);
      return next;
    });
    setTimeout(redrawCanvas, 50);
  };

  // Elements interaction handlers (Dragging)
  const handleElementDragStart = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.stopPropagation();
    setSelectedElementId(id);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const el = elements.find(item => item.id === id);
    if (!el) return;

    dragInfo.current = {
      id,
      startX: clientX,
      startY: clientY,
      initialX: el.x,
      initialY: el.y
    };
  };

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragInfo.current || !workspaceRef.current) return;
    const info = dragInfo.current;
    const rect = workspaceRef.current.getBoundingClientRect();

    const diffX = clientX - info.startX;
    const diffY = clientY - info.startY;

    // Convert pixel difference to percentage offsets
    const pctDiffX = (diffX / rect.width) * 100;
    const pctDiffY = (diffY / rect.height) * 100;

    let targetX = Math.min(95, Math.max(5, info.initialX + pctDiffX));
    let targetY = Math.min(95, Math.max(5, info.initialY + pctDiffY));

    setElements(prev => prev.map(el => {
      if (el.id === info.id) {
        return { ...el, x: targetX, y: targetY };
      }
      return el;
    }));
  }, [elements]);

  const handleDragEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragInfo.current || !workspaceRef.current) return;
    
    // Check if element is dropped over trash can area
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;

    const rect = workspaceRef.current.getBoundingClientRect();
    const bottomCenterTrashZoneY = rect.bottom - 90;
    const bottomCenterTrashZoneX = rect.left + rect.width / 2;

    const distance = Math.sqrt(
      Math.pow(clientX - bottomCenterTrashZoneX, 2) + Math.pow(clientY - bottomCenterTrashZoneY, 2)
    );

    // If within 60px of the bottom center trash icon, delete
    if (distance < 70) {
      setElements(prev => prev.filter(el => el.id !== dragInfo.current?.id));
      setSelectedElementId(null);
    }

    dragInfo.current = null;
  };

  // Add floating text
  const openTextTool = (textEl?: FloatingElement) => {
    if (textEl) {
      setCurrentTextValue(textEl.text || '');
      setCurrentTextColor(textEl.color || '#FFFFFF');
      setCurrentTextFont(textEl.font || CURATED_FONTS[0].value);
      setCurrentTextHighlight(textEl.highlight || false);
      setSelectedElementId(textEl.id);
    } else {
      setCurrentTextValue('');
      setCurrentTextColor('#FFFFFF');
      setCurrentTextFont(CURATED_FONTS[0].value);
      setCurrentTextHighlight(false);
      setSelectedElementId(null);
    }
    setIsTextEditing(true);
  };

  const handleSaveText = () => {
    if (!currentTextValue.trim()) {
      setIsTextEditing(false);
      return;
    }

    if (selectedElementId && elements.some(el => el.id === selectedElementId && el.type === 'text')) {
      // Edit existing
      setElements(prev => prev.map(el => {
        if (el.id === selectedElementId) {
          return {
            ...el,
            text: currentTextValue,
            color: currentTextColor,
            font: currentTextFont,
            highlight: currentTextHighlight
          };
        }
        return el;
      }));
    } else {
      // Create new
      const newText: FloatingElement = {
        id: Math.random().toString(),
        type: 'text',
        text: currentTextValue,
        color: currentTextColor,
        font: currentTextFont,
        highlight: currentTextHighlight,
        x: 45,
        y: 40,
        size: 1.0,
        rotation: 0
      };
      setElements(prev => [...prev, newText]);
    }

    setIsTextEditing(false);
    setCurrentTextValue('');
  };

  // Add sticker / hashtag / location
  const handleAddStickerSticker = (type: 'location' | 'hashtag', value: string) => {
    if (!value.trim()) return;
    const newSticker: FloatingElement = {
      id: Math.random().toString(),
      type: 'sticker',
      stickerType: type,
      text: type === 'hashtag' ? `#${value.replace('#', '')}` : `📍 ${value}`,
      x: 45,
      y: 45,
      size: 1.1,
      rotation: 0
    };
    setElements(prev => [...prev, newSticker]);
    setShowStickerTypeInput(null);
    setStickerInputValue('');
    setActiveTool('none');
  };

  const handleAddEmojiSticker = (emoji: string) => {
    const newEmoji: FloatingElement = {
      id: Math.random().toString(),
      type: 'emoji',
      emoji,
      x: 50,
      y: 50,
      size: 1.4,
      rotation: 0
    };
    setElements(prev => [...prev, newEmoji]);
    setActiveTool('none');
  };

  // Add background music
  const handleSelectSong = (song: any) => {
    setSelectedSong(song);
    // Play synthetic chime track for visual presentation
    setIsMusicPlaying(true);
    
    // Add Music Sticker to Canvas
    const exists = elements.some(el => el.type === 'music');
    if (!exists) {
      const newMusicSticker: FloatingElement = {
        id: Math.random().toString(),
        type: 'music',
        songTitle: song.title,
        artist: song.artist,
        x: 35,
        y: 65,
        size: 1.0,
        rotation: 0
      };
      setElements(prev => [...prev, newMusicSticker]);
    } else {
      setElements(prev => prev.map(el => {
        if (el.type === 'music') {
          return { ...el, songTitle: song.title, artist: song.artist };
        }
        return el;
      }));
    }
    setActiveTool('none');
  };

  // Direct Publish flow
  const handlePublishSubmit = async () => {
    if (isPublishing) return;
    setIsPublishing(true);

    try {
      let finalComposedUrl = mediaUrl;
      let finalOverlaysJson: string | undefined = undefined;

      if (mediaType === 'image') {
        // Compose image canvas client-side to bake filters, texts, emojis, and drawings!
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          // 1. Draw base image
          const baseImg = new Image();
          baseImg.crossOrigin = 'anonymous';
          
          await new Promise<void>((resolve, reject) => {
            baseImg.onload = () => resolve();
            baseImg.onerror = () => reject(new Error("Failed to load base image"));
            baseImg.src = mediaUrl;
          });

          // Draw image respecting scale, offset, and filter
          ctx.save();
          
          // Apply active filter
          if (activeFilter === 'vintage') {
            ctx.filter = 'sepia(0.5) contrast(1.1) brightness(0.95)';
          } else if (activeFilter === 'bw') {
            ctx.filter = 'grayscale(1) contrast(1.15)';
          } else if (activeFilter === 'vivid') {
            ctx.filter = 'saturate(1.5) contrast(1.1)';
          } else if (activeFilter === 'blur') {
            ctx.filter = 'blur(6px) brightness(1.05)';
          }
          
          // Draw image filled to viewport
          ctx.translate(canvas.width / 2 + (offsetX * 10), canvas.height / 2 + (offsetY * 10));
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.scale(scale, scale);
          
          // Compute draw dimensions (center cropped)
          const imgRatio = baseImg.width / baseImg.height;
          const canvasRatio = canvas.width / canvas.height;
          let drawW = canvas.width;
          let drawH = canvas.height;
          if (imgRatio > canvasRatio) {
            drawW = canvas.height * imgRatio;
          } else {
            drawH = canvas.width / imgRatio;
          }

          ctx.drawImage(baseImg, -drawW / 2, -drawH / 2, drawW, drawH);
          ctx.restore();

          // 2. Comport brush drawings (re-scaling brush canvas to high resolution viewport)
          if (drawingPaths.length > 0 && drawingCanvasRef.current) {
            const tempCanvas = drawingCanvasRef.current;
            const wRatio = canvas.width / tempCanvas.width;
            const hRatio = canvas.height / tempCanvas.height;

            drawingPaths.forEach(path => {
              if (path.points.length < 2) return;
              ctx.beginPath();
              ctx.globalAlpha = path.type === 'highlighter' ? 0.4 : 1.0;
              ctx.lineWidth = (path.type === 'highlighter' ? path.size * 2 : path.size) * wRatio;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';

              if (path.type === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
              } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = path.color;
                if (path.type === 'neon') {
                  ctx.shadowColor = path.color;
                  ctx.shadowBlur = 15 * wRatio;
                } else {
                  ctx.shadowBlur = 0;
                }
              }

              ctx.moveTo(path.points[0].x * wRatio, path.points[0].y * hRatio);
              for (let i = 1; i < path.points.length; i++) {
                ctx.lineTo(path.points[i].x * wRatio, path.points[i].y * hRatio);
              }
              ctx.stroke();
            });
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
          }

          // 3. Draw each floating element
          elements.forEach(el => {
            ctx.save();
            // Convert percentages to absolute X,Y
            const absX = (el.x / 100) * canvas.width;
            const absY = (el.y / 100) * canvas.height;
            
            ctx.translate(absX, absY);
            ctx.rotate((el.rotation * Math.PI) / 180);
            
            const fontSize = Math.floor(40 * el.size);
            
            if (el.type === 'text' && el.text) {
              ctx.font = `${fontSize}px ${el.font?.includes('serif') ? 'Georgia' : el.font?.includes('mono') ? 'Courier New' : 'Arial'}`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              
              const lines = el.text.split('\n');
              const lineHeight = fontSize * 1.25;
              
              lines.forEach((line, idx) => {
                const textWidth = ctx.measureText(line).width;
                const offsetLineY = (idx - (lines.length - 1) / 2) * lineHeight;

                if (el.highlight) {
                  ctx.fillStyle = el.color === '#FFFFFF' ? '#000000' : '#FFFFFF';
                  ctx.fillRect(-textWidth / 2 - 12, offsetLineY - fontSize / 2 - 6, textWidth + 24, fontSize + 12);
                }
                
                ctx.fillStyle = el.color || '#FFFFFF';
                ctx.fillText(line, 0, offsetLineY);
              });

            } else if (el.type === 'emoji' && el.emoji) {
              const emojiSize = Math.floor(64 * el.size);
              ctx.font = `${emojiSize}px Apple Color Emoji, Segoe UI Emoji, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(el.emoji, 0, 0);

            } else if (el.type === 'sticker' && el.text) {
              // Location or Hashtag sticker card
              const tagWidth = ctx.measureText(el.text).width + 36;
              const tagHeight = fontSize + 24;

              ctx.fillStyle = el.stickerType === 'location' ? '#EAEAEA' : '#6366F1';
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 3;
              
              // Draw rounded rect
              ctx.beginPath();
              ctx.roundRect(-tagWidth / 2, -tagHeight / 2, tagWidth, tagHeight, 16);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = el.stickerType === 'location' ? '#000000' : '#FFFFFF';
              ctx.font = `bold ${fontSize}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(el.text, 0, 0);

            } else if (el.type === 'music' && el.songTitle) {
              // Music badge
              const label = `🎵 ${el.songTitle} - ${el.artist || 'Artist'}`;
              ctx.font = `bold ${fontSize}px sans-serif`;
              const tagWidth = ctx.measureText(label).width + 36;
              const tagHeight = fontSize + 24;

              ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
              ctx.beginPath();
              ctx.roundRect(-tagWidth / 2, -tagHeight / 2, tagWidth, tagHeight, 16);
              ctx.fill();

              ctx.fillStyle = '#FFFFFF';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(label, 0, 0);
            }

            ctx.restore();
          });
        }

        // 4. Export Canvas to Cloudinary direct upload
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const base64Blob = await (await fetch(dataUrl)).blob();
        
        // Convert blob to File object to pass to uploadFile
        const file = new File([base64Blob], "story_composed.jpg", { type: "image/jpeg" });
        const uploadResult = await uploadFile(file);
        finalComposedUrl = uploadResult.secure_url;

      } else {
        // Video story: Serialize overlays elements as metadata JSON object
        finalOverlaysJson = JSON.stringify({
          elements,
          activeFilter,
          scale,
          rotation,
          offsetX,
          offsetY,
          music: selectedSong ? { id: selectedSong.id, title: selectedSong.title, artist: selectedSong.artist } : null
        });
      }

      // 5. Submit story creation to Next.js API/action
      const res = await createTestStory(
        finalComposedUrl,
        mediaType,
        undefined, // auto-generated
        caption || undefined,
        finalOverlaysJson,
        closeFriends
      );

      if (res.success) {
        clearStoryDraft();
        setPublishSuccess(true);
        setTimeout(() => {
          setPublishSuccess(false);
          setIsPublishing(false);
          onClose();
          if (onStoryPublished) onStoryPublished();
        }, 1500);
      } else {
        alert(res.error || "Failed to publish story.");
        setIsPublishing(false);
      }

    } catch (err: any) {
      console.error(err);
      alert("Error occurred while saving story: " + (err.message || 'Network failure.'));
      setIsPublishing(false);
    }
  };

  // Video track toggle handlers
  const handleTogglePlayVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
    setVideoPlaying(!videoPlaying);
  };

  const handleToggleMuteVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoMuted;
    setVideoMuted(!videoMuted);
  };

  // Global mouse move handlers for draggable elements
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
    const handleGlobalTouchMove = (e: TouchEvent) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY);

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (dragInfo.current) {
        handleDragEnd(e as any);
      }
    };
    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (dragInfo.current) {
        handleDragEnd(e as any);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: true });
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [handleDragMove]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/98 dark:bg-black/99 select-none overflow-hidden touch-none">
      
      {/* ── CENTRALIZED WORKSPACE (9:16 PREVIEW) ── */}
      <div 
        ref={workspaceRef}
        className="relative w-full h-full md:w-[420px] md:h-[90vh] md:max-h-[780px] md:rounded-[2.5rem] bg-[#1a1a1a] shadow-2xl flex flex-col justify-between overflow-hidden border border-zinc-800"
      >
        {/* Background Visual Render card */}
        <div 
          className="absolute inset-0 z-0 flex items-center justify-center bg-black overflow-hidden"
          onClick={() => setSelectedElementId(null)}
        >
          {mediaType === 'video' ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              autoPlay
              playsInline
              loop
              muted={videoMuted}
              className="w-full h-full object-cover transition-all"
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg) translate(${offsetX}px, ${offsetY}px)`,
                filter: STYLES_FILTERS.find(f => f.name === activeFilter)?.filter || 'none'
              }}
              onPlay={() => setVideoPlaying(true)}
              onPause={() => setVideoPlaying(false)}
            />
          ) : (
            <img
              src={mediaUrl}
              alt="Story"
              className="w-full h-full object-cover select-none pointer-events-none transition-all"
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg) translate(${offsetX}px, ${offsetY}px)`,
                filter: STYLES_FILTERS.find(f => f.name === activeFilter)?.filter || 'none'
              }}
              draggable={false}
            />
          )}

          {/* SVG filter or Brush drawing canvas */}
          {activeTool === 'restyle' && (
            <canvas
              ref={drawingCanvasRef}
              className="absolute inset-0 z-10 touch-none pointer-events-auto cursor-crosshair"
              onMouseDown={(e) => handleCanvasStart(e.clientX, e.clientY)}
              onMouseMove={(e) => handleCanvasMove(e.clientX, e.clientY)}
              onMouseUp={handleCanvasEnd}
              onMouseLeave={handleCanvasEnd}
              onTouchStart={(e) => handleCanvasStart(e.touches[0].clientX, e.touches[0].clientY)}
              onTouchMove={(e) => handleCanvasMove(e.touches[0].clientX, e.touches[0].clientY)}
              onTouchEnd={handleCanvasEnd}
            />
          )}
        </div>

        {/* ── TOP ACTION NAVIGATION ── */}
        <div className="absolute inset-x-0 top-0 pt-5 pb-16 px-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex items-center justify-between z-20 pointer-events-none">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/35 hover:bg-black/60 text-white backdrop-blur-sm pointer-events-auto transition-transform active:scale-90"
            aria-label="Back"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Video state overlays */}
          {mediaType === 'video' && (
            <div className="flex gap-2 pointer-events-auto">
              <button
                onClick={handleTogglePlayVideo}
                className="p-2 rounded-full bg-black/35 hover:bg-black/60 text-white backdrop-blur-sm transition-transform active:scale-95"
              >
                {videoPlaying ? <Pause className="w-4.5 h-4.5 fill-white" /> : <Play className="w-4.5 h-4.5 fill-white" />}
              </button>
              <button
                onClick={handleToggleMuteVideo}
                className="p-2 rounded-full bg-black/35 hover:bg-black/60 text-white backdrop-blur-sm transition-transform active:scale-95"
              >
                {videoMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT VERTICAL INSTAGRAM-STYLE TOOLBAR ── */}
        {activeTool === 'none' && (
          <div className="absolute top-20 right-4 z-20 flex flex-col gap-4 pointer-events-auto">
            {/* Text Aa */}
            <button
              onClick={() => openTextTool()}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/15 transition-all group-active:scale-90">
                <Type className="w-5.5 h-5.5 stroke-[2.2]" />
              </div>
              <span className="text-[10px] text-zinc-200 font-bold text-shadow">Text</span>
            </button>

            {/* Stickers Smiley */}
            <button
              onClick={() => setActiveTool('stickers')}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/15 transition-all group-active:scale-90">
                <Smile className="w-5.5 h-5.5 stroke-[2.2]" />
              </div>
              <span className="text-[10px] text-zinc-200 font-bold text-shadow">Stickers</span>
            </button>

            {/* Music */}
            <button
              onClick={() => setActiveTool('music')}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/15 transition-all group-active:scale-90">
                <Music className="w-5.5 h-5.5 stroke-[2.2]" />
              </div>
              <span className="text-[10px] text-zinc-200 font-bold text-shadow">Music</span>
            </button>

            {/* Restyle / Magic wand */}
            <button
              onClick={() => setActiveTool('restyle')}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/15 transition-all group-active:scale-90">
                <Sparkles className="w-5.5 h-5.5 stroke-[2.2]" />
              </div>
              <span className="text-[10px] text-zinc-200 font-bold text-shadow">Restyle</span>
            </button>

            {/* Resize / Crop */}
            <button
              onClick={() => setActiveTool('resize')}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/15 transition-all group-active:scale-90">
                <Maximize2 className="w-5.5 h-5.5 stroke-[2.2]" />
              </div>
              <span className="text-[10px] text-zinc-200 font-bold text-shadow">Resize</span>
            </button>
          </div>
        )}

        {/* ── DRAGGABLE OVERLAID FLOATING ELEMENTS ── */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {elements.map((el) => {
            const isSelected = selectedElementId === el.id;
            
            return (
              <div
                key={el.id}
                onMouseDown={(e) => handleElementDragStart(e, el.id)}
                onTouchStart={(e) => handleElementDragStart(e, el.id)}
                onDoubleClick={() => el.type === 'text' && openTextTool(el)}
                className={`absolute pointer-events-auto cursor-grab active:cursor-grabbing select-none ${
                  isSelected ? 'ring-2 ring-indigo-500/80 ring-offset-2 ring-offset-black/20 rounded-xl' : ''
                }`}
                style={{
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  transform: `translate(-50%, -50%) rotate(${el.rotation}deg) scale(${el.size})`,
                  transformOrigin: 'center center'
                }}
              >
                {/* TEXT widget */}
                {el.type === 'text' && el.text && (
                  <span 
                    className={`block px-3 py-1.5 rounded-2xl text-center whitespace-pre-wrap select-none leading-normal font-black text-xl tracking-tight transition-all duration-75 ${
                      el.highlight 
                        ? el.color === '#FFFFFF' ? 'bg-black text-white' : 'bg-white text-black' 
                        : 'text-shadow-heavy'
                    } ${el.font}`}
                    style={{ color: el.highlight ? undefined : el.color }}
                  >
                    {el.text}
                  </span>
                )}

                {/* EMOJI widget */}
                {el.type === 'emoji' && el.emoji && (
                  <span className="block text-5xl filter drop-shadow-md select-none">{el.emoji}</span>
                )}

                {/* STICKER tag */}
                {el.type === 'sticker' && el.text && (
                  <span className={`block px-4 py-2 rounded-2xl border-2 text-sm font-black tracking-tight select-none shadow-md ${
                    el.stickerType === 'location' 
                      ? 'bg-zinc-100/90 text-zinc-900 border-zinc-200' 
                      : 'bg-indigo-600/95 text-white border-indigo-400'
                  }`}>
                    {el.text}
                  </span>
                )}

                {/* MUSIC sticker */}
                {el.type === 'music' && el.songTitle && (
                  <div className="flex items-center gap-2.5 px-4 py-2 bg-black/75 text-white rounded-2xl border border-white/20 shadow-lg select-none">
                    <Music className="w-4 h-4 text-indigo-400 animate-bounce" />
                    <div className="flex flex-col max-w-[120px]">
                      <span className="text-xs font-black truncate">{el.songTitle}</span>
                      <span className="text-[9px] text-zinc-400 truncate">{el.artist}</span>
                    </div>
                  </div>
                )}

                {/* Micro resizing elements panel for focused item */}
                {isSelected && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-2.5 bg-black/80 backdrop-blur-md rounded-full px-3 py-1 border border-white/20 z-50 shadow-xl scale-75">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setElements(prev => prev.map(item => item.id === el.id ? { ...item, size: Math.max(0.4, item.size - 0.1) } : item));
                      }}
                      className="text-white hover:text-indigo-400 p-0.5 text-xs font-black"
                    >
                      A-
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setElements(prev => prev.map(item => item.id === el.id ? { ...item, size: Math.min(3.0, item.size + 0.1) } : item));
                      }}
                      className="text-white hover:text-indigo-400 p-0.5 text-xs font-black"
                    >
                      A+
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setElements(prev => prev.map(item => item.id === el.id ? { ...item, rotation: (item.rotation + 15) % 360 } : item));
                      }}
                      className="text-white hover:text-indigo-400 p-0.5"
                    >
                      ↻
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── DRAGGABLE TRASH CAN DETECTING ZONE ── */}
        {selectedElementId && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 animate-bounce">
            <div className="w-14 h-14 rounded-full bg-red-600/10 backdrop-blur-sm border border-red-500/30 flex items-center justify-center text-red-400 shadow-2xl">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            <span className="text-[10px] text-red-400 font-bold bg-black/60 rounded-full px-2 py-0.5 border border-red-500/20">Drag here to delete</span>
          </div>
        )}

        {/* ── SUB-TOOL CONTROL PANELS (STSTICKERS / RESTYLE / RESIZE etc.) ── */}
        
        {/* Restyle (Drawing Brush / Neon / Highlighter) */}
        {activeTool === 'restyle' && (
          <div className="absolute inset-x-0 bottom-0 z-30 bg-zinc-950/95 rounded-t-[2rem] border-t border-zinc-800 p-4 pb-8 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase tracking-wider">Restyle & Draw</span>
              <div className="flex gap-2">
                <button onClick={undoLastPath} className="p-1.5 bg-zinc-900 rounded-lg hover:bg-zinc-800 text-white text-xs font-bold"><CornerUpLeft className="w-4 h-4" /></button>
                <button onClick={redoLastPath} className="p-1.5 bg-zinc-900 rounded-lg hover:bg-zinc-800 text-white text-xs font-bold"><CornerUpRight className="w-4 h-4" /></button>
                <button onClick={() => { setDrawingPaths([]); setUndonePaths([]); setTimeout(redrawCanvas, 50); }} className="p-1.5 bg-zinc-900 rounded-lg hover:bg-zinc-800 text-red-400 text-xs font-bold">Clear</button>
              </div>
            </div>

            {/* Brush Type Selector */}
            <div className="grid grid-cols-4 gap-2">
              {(['brush', 'neon', 'highlighter', 'eraser'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setActiveBrushType(type)}
                  className={`py-2 text-[10px] uppercase font-black tracking-wider rounded-xl transition-all border ${
                    activeBrushType === type 
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Curated Color Grid */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {CURATED_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setBrushColor(color)}
                  className={`w-8 h-8 rounded-full border-2 shrink-0 transition-transform active:scale-90 ${
                    brushColor === color ? 'border-white scale-110 shadow-lg' : 'border-zinc-800'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Filters Slider Selector */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Filter Styles</span>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
                {STYLES_FILTERS.map(style => (
                  <button
                    key={style.name}
                    onClick={() => setActiveFilter(style.name)}
                    className={`px-4 py-2 text-xs font-bold rounded-full shrink-0 border transition-all ${
                      activeFilter === style.name
                        ? 'bg-white text-zinc-950 border-white shadow-md'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setActiveTool('none')}
              className="w-full py-3 bg-zinc-850 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase transition-all"
            >
              Done Drawing
            </button>
          </div>
        )}

        {/* Stickers Grid */}
        {activeTool === 'stickers' && (
          <div className="absolute inset-x-0 bottom-0 z-30 bg-zinc-950/95 rounded-t-[2rem] border-t border-zinc-800 p-4 pb-8 space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-200">
            <span className="block text-xs font-black text-white uppercase tracking-wider mb-2">Add Stickers & Emojis</span>

            {/* Custom Tag Buttons (Hashtag/Location) */}
            <div className="grid grid-cols-2 gap-2.5">
              {CURATED_STICKERS.map(tag => (
                <button
                  key={tag.type}
                  onClick={() => setShowStickerTypeInput(tag.type as any)}
                  className="py-3 bg-zinc-900 border border-zinc-800 text-white rounded-2xl flex items-center justify-center gap-2 text-xs font-bold hover:bg-zinc-850"
                >
                  {tag.label}
                </button>
              ))}
            </div>

            {/* Sticker Custom Input Overlay */}
            {showStickerTypeInput && (
              <div className="space-y-2 p-3 bg-zinc-900 border border-zinc-800 rounded-2xl animate-in fade-in duration-100">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                  Add {showStickerTypeInput === 'location' ? 'Location' : 'Hashtag'} Sticker
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={stickerInputValue}
                    onChange={(e) => setStickerInputValue(e.target.value)}
                    placeholder={showStickerTypeInput === 'location' ? 'New York City...' : 'vibeoftheday...'}
                    className="flex-grow bg-zinc-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddStickerSticker(showStickerTypeInput, stickerInputValue);
                    }}
                  />
                  <button
                    onClick={() => handleAddStickerSticker(showStickerTypeInput, stickerInputValue)}
                    className="px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Emojis selection Grid */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-2">Emojis</span>
              <div className="grid grid-cols-8 gap-2.5 text-2xl py-1 select-none">
                {['❤️', '🔥', '😂', '🔥', '👏', '😍', '🎉', '🌟', 
                  '💯', '✨', '🎈', '🍕', '🐱', '🕶️', '🚀', '🌈',
                  '📍', '💡', '🎵', '👀', '💯', '🎨', '💼', '🏡'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleAddEmojiSticker(emoji)}
                    className="hover:scale-125 transition-transform active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setActiveTool('none')}
              className="w-full py-3 bg-zinc-850 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase transition-all"
            >
              Close Stickers
            </button>
          </div>
        )}

        {/* Music list Selection */}
        {activeTool === 'music' && (
          <div className="absolute inset-x-0 bottom-0 z-30 bg-zinc-950/95 rounded-t-[2rem] border-t border-zinc-800 p-4 pb-8 space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-200">
            <span className="block text-xs font-black text-white uppercase tracking-wider mb-2">Select Soundtrack</span>

            <div className="flex flex-col gap-2.5">
              {POPULAR_SONGS.map(song => (
                <div
                  key={song.id}
                  onClick={() => handleSelectSong(song)}
                  className="flex items-center gap-3.5 p-2 rounded-2xl hover:bg-white/5 active:bg-white/10 cursor-pointer transition-colors group"
                >
                  <img src={song.cover} alt={song.title} className="w-12 h-12 rounded-xl object-cover" />
                  <div className="flex-grow flex flex-col">
                    <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{song.title}</span>
                    <span className="text-[11px] text-zinc-400">{song.artist}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                    <Play className="w-3.5 h-3.5 fill-white" />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveTool('none')}
              className="w-full py-3 bg-zinc-850 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase transition-all"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Resize (Crop, Rotate, Zoom) */}
        {activeTool === 'resize' && (
          <div className="absolute inset-x-0 bottom-0 z-30 bg-zinc-950/95 rounded-t-[2rem] border-t border-zinc-800 p-4 pb-8 space-y-4 animate-in slide-in-from-bottom duration-200">
            <span className="block text-xs font-black text-white uppercase tracking-wider">Resize / Zoom / Position</span>

            {/* Rotation controls */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setRotation(r => (r - 90 + 360) % 360)}
                className="py-2.5 bg-zinc-900 text-white text-xs font-bold rounded-xl border border-zinc-800 hover:bg-zinc-850"
              >
                Rotate Left ↺
              </button>
              <button
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="py-2.5 bg-zinc-900 text-white text-xs font-bold rounded-xl border border-zinc-800 hover:bg-zinc-850"
              >
                Rotate Right ↻
              </button>
            </div>

            {/* Zoom slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-zinc-400 font-bold uppercase">
                <span>Scale / Zoom</span>
                <span>{scale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 bg-zinc-800 h-1 rounded-full cursor-pointer"
              />
            </div>

            {/* Free X/Y Position offsets */}
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => setOffsetX(x => x - 25)} className="py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white text-xs font-bold rounded-xl">◀ Left</button>
              <button onClick={() => setOffsetY(y => y - 25)} className="py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white text-xs font-bold rounded-xl">▲ Up</button>
              <button onClick={() => setOffsetY(y => y + 25)} className="py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white text-xs font-bold rounded-xl">▼ Down</button>
              <button onClick={() => setOffsetX(x => x + 25)} className="py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white text-xs font-bold rounded-xl">Right ▶</button>
            </div>

            <button
              onClick={() => { setScale(1.0); setRotation(0); setOffsetX(0); setOffsetY(0); }}
              className="w-full py-2 bg-zinc-900 border border-zinc-800 text-red-400 hover:bg-zinc-850 text-[11px] font-bold uppercase rounded-xl transition-all"
            >
              Reset Position
            </button>

            <button
              onClick={() => setActiveTool('none')}
              className="w-full py-3 bg-zinc-850 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase transition-all"
            >
              Done Resizing
            </button>
          </div>
        )}

        {/* ── CENTRALIZED FLOATING TEXT TOOL MODAL ── */}
        {isTextEditing && (
          <div className="absolute inset-0 z-45 bg-black/85 backdrop-blur-md flex flex-col justify-between p-4 pt-10">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between">
              {/* Highlight background text toggle */}
              <button
                onClick={() => setCurrentTextHighlight(!currentTextHighlight)}
                className={`px-3 py-1 text-xs font-black uppercase rounded-full border transition-all ${
                  currentTextHighlight 
                    ? 'bg-white text-black border-white' 
                    : 'bg-transparent text-white border-white/20'
                }`}
              >
                Highlight Box
              </button>
              
              {/* Done button */}
              <button
                onClick={handleSaveText}
                className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-transform active:scale-95"
              >
                <Check className="w-5 h-5" />
              </button>
            </div>

            {/* Input Element */}
            <div className="flex-grow flex items-center justify-center">
              <textarea
                value={currentTextValue}
                onChange={(e) => setCurrentTextValue(e.target.value)}
                placeholder="Type here..."
                autoFocus
                className={`bg-transparent text-center border-none outline-none focus:ring-0 text-3xl font-black resize-none max-w-full max-h-[40vh] w-full ${
                  currentTextHighlight 
                    ? currentTextColor === '#FFFFFF' ? 'bg-black/90 p-4 rounded-3xl text-white' : 'bg-white/95 p-4 rounded-3xl text-black' 
                    : ''
                } ${currentTextFont}`}
                style={{ color: currentTextHighlight ? undefined : currentTextColor }}
              />
            </div>

            {/* Curated Font & Color Panel at the bottom */}
            <div className="space-y-4 pb-6">
              {/* Fonts */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {CURATED_FONTS.map(font => (
                  <button
                    key={font.name}
                    onClick={() => setCurrentTextFont(font.value)}
                    className={`px-4 py-2 text-xs font-bold rounded-full shrink-0 border transition-all ${
                      currentTextFont === font.value
                        ? 'bg-white text-zinc-950 border-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    {font.name}
                  </button>
                ))}
              </div>

              {/* Colors */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {CURATED_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setCurrentTextColor(color)}
                    className={`w-8 h-8 rounded-full border-2 shrink-0 transition-transform active:scale-90 ${
                      currentTextColor === color ? 'border-white scale-110 shadow-lg' : 'border-zinc-800'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── BOTTOM PUBLISH PANEL (CAPTION & BUTTONS) ── */}
        {activeTool === 'none' && !isTextEditing && (
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-4 z-20 pointer-events-auto">
            {/* Caption text bar */}
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full bg-black/45 border border-white/10 rounded-full px-5 py-3 text-xs text-white placeholder-zinc-400 font-semibold focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
            />

            {/* Publish controls Row */}
            <div className="flex items-center justify-between gap-3">
              {/* Your Story button */}
              <button
                disabled={isPublishing}
                onClick={() => { setCloseFriends(false); handlePublishSubmit(); }}
                className="flex-grow flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900/90 border border-zinc-800 text-white rounded-full hover:bg-zinc-800 transition-all active:scale-95 text-xs font-black shadow-md disabled:opacity-50"
              >
                <Avatar className="w-5 h-5 border border-white/20">
                  <AvatarImage src={userAvatar || '/default-user-avatar.svg'} />
                  <AvatarFallback>{userName ? userName.charAt(0) : 'U'}</AvatarFallback>
                </Avatar>
                Your stories
              </button>

              {/* Close Friends button */}
              <button
                disabled={isPublishing}
                onClick={() => { setCloseFriends(true); handlePublishSubmit(); }}
                className={`flex-grow flex items-center justify-center gap-2 px-4 py-3 rounded-full transition-all active:scale-95 text-xs font-black shadow-md disabled:opacity-50 ${
                  closeFriends 
                    ? 'bg-green-600/90 text-white border border-green-500' 
                    : 'bg-zinc-900/90 border border-zinc-800 text-white hover:bg-zinc-800'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-black">★</div>
                Close Friends
              </button>

              {/* Publish icon arrow circle */}
              <button
                disabled={isPublishing}
                onClick={() => { setCloseFriends(false); handlePublishSubmit(); }}
                className="w-11 h-11 bg-white hover:bg-zinc-100 text-black rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 disabled:opacity-50"
                aria-label="Publish story"
              >
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {/* ── LOADING PUBLISHING SCREEN OVERLAY ── */}
        {isPublishing && (
          <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center text-white gap-4">
            {publishSuccess ? (
              <div className="flex flex-col items-center gap-3 animate-in zoom-in-90 duration-300">
                <div className="w-16 h-16 rounded-full bg-green-600 text-white flex items-center justify-center text-2xl font-black shadow-2xl">✓</div>
                <span className="text-sm font-black uppercase tracking-wider">Published successfully!</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <span className="w-10 h-10 rounded-full border-4 border-white/20 border-t-indigo-500 animate-spin" />
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider animate-pulse">Composing & Publishing...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
