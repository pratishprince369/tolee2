'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { RotateCw, X, Check } from 'lucide-react';
import getCroppedImg from '@/lib/cropImage';

export function ImageCropModal({
  isOpen,
  onClose,
  imageSrc,
  onSave,
  aspectRatio = 1,
  cropShape = 'round',
  title = 'Crop Image',
}: {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onSave: (file: File) => void;
  aspectRatio?: number;
  cropShape?: 'round' | 'rect';
  title?: string;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Required for SSR / Next.js — don't render portal until client is ready
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state when a new image is opened
  useEffect(() => {
    if (isOpen) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCroppedAreaPixels(null);
    }
  }, [isOpen, imageSrc]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      if (croppedImage) {
        onSave(croppedImage);
        onClose();
      }
    } catch (e) {
      console.error('Crop error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted || !isOpen) return null;

  const modal = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'rgba(0,0,0,0.92)',
        touchAction: 'none',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '50%',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
          }}
        >
          <X size={18} />
        </button>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{title}</span>
        <button
          type="button"
          onClick={handleSave}
          disabled={isProcessing || !croppedAreaPixels}
          style={{
            background: isProcessing ? 'rgba(99,102,241,0.5)' : '#6366f1',
            border: 'none',
            borderRadius: 20,
            padding: '7px 18px',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minWidth: 70,
            justifyContent: 'center',
          }}
        >
          {isProcessing ? (
            'Saving…'
          ) : (
            <>
              <Check size={15} />
              Save
            </>
          )}
        </button>
      </div>

      {/* ── Cropper Area (grows to fill screen) ── */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          // Ensure react-easy-crop fills this container
        }}
      >
        {imageSrc ? (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspectRatio}
            cropShape={cropShape}
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            style={{
              containerStyle: {
                background: '#111',
              },
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#aaa',
              fontSize: 14,
            }}
          >
            Loading image…
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div
        style={{
          flexShrink: 0,
          backgroundColor: '#111',
          padding: '16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Zoom slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ color: '#aaa', fontSize: 12, fontWeight: 600, width: 42 }}>Zoom</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.05}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{
              flex: 1,
              height: 4,
              accentColor: '#6366f1',
              cursor: 'pointer',
              // Larger touch target on mobile
              touchAction: 'none',
            }}
          />
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, width: 34, textAlign: 'right' }}>
            {zoom.toFixed(1)}x
          </span>
        </div>

        {/* Rotation slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ color: '#aaa', fontSize: 12, fontWeight: 600, width: 42 }}>Rotate</span>
          <input
            type="range"
            value={rotation}
            min={0}
            max={360}
            step={1}
            onChange={(e) => setRotation(Number(e.target.value))}
            style={{
              flex: 1,
              height: 4,
              accentColor: '#6366f1',
              cursor: 'pointer',
              touchAction: 'none',
            }}
          />
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, width: 34, textAlign: 'right' }}>
            {rotation}°
          </span>
        </div>

        {/* Quick action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => setRotation((prev) => (prev + 90) % 360)}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              color: '#fff',
              padding: '9px 0',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <RotateCw size={14} />
            Rotate 90°
          </button>
          <button
            type="button"
            onClick={() => { setZoom(1); setRotation(0); }}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              color: '#fff',
              padding: '9px 0',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
