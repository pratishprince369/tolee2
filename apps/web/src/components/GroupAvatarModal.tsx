'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, ZoomIn, ZoomOut, RotateCcw, Upload, Check, AlertCircle, Loader2, X } from 'lucide-react';
import getCroppedImg from '@/lib/cropImage';
import { uploadFile } from '@/lib/upload';
import { updateGroupAvatar } from '@/actions/tolee';

interface GroupAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  toleeId: string;
  toleeName: string;
  currentAvatar: string;
  onAvatarUpdated: (newAvatarUrl: string) => void;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function GroupAvatarModal({
  isOpen,
  onClose,
  toleeId,
  toleeName,
  currentAvatar,
  onAvatarUpdated,
}: GroupAvatarModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('avatar.jpg');
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedImageSrc(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  const onCropComplete = useCallback((_croppedArea: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMessage('Unsupported format. Please select a JPEG, PNG, or WebP image.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage('Image is too large. Maximum file size allowed is 10 MB.');
      return;
    }

    setSelectedFileName(file.name);
    if (selectedImageSrc) {
      try { URL.revokeObjectURL(selectedImageSrc); } catch (_) {}
    }
    const objectUrl = URL.createObjectURL(file);
    setSelectedImageSrc(objectUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    e.target.value = '';
  };

  const handleResetCrop = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleSave = async () => {
    if (!selectedImageSrc || !croppedAreaPixels) return;

    try {
      setIsSaving(true);
      setErrorMessage(null);

      // 1. Crop image to exact 1:1 square
      const croppedFile = await getCroppedImg(selectedImageSrc, croppedAreaPixels, 0);
      if (!croppedFile) {
        throw new Error('Failed to process cropped image.');
      }

      // 2. Upload to storage
      const uploadRes = await uploadFile(croppedFile);
      if (!uploadRes || !uploadRes.secure_url) {
        throw new Error('Image upload failed. Please try again.');
      }

      // 3. Persist to database
      const dbRes = await updateGroupAvatar(toleeId, uploadRes.secure_url, uploadRes.public_id);
      if (!dbRes.success) {
        throw new Error(dbRes.error || 'Failed to save group profile picture.');
      }

      // 4. Update UI & notify
      setSuccessMessage('Group profile picture updated successfully!');
      onAvatarUpdated(uploadRes.secure_url);

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Error saving group avatar:', err);
      setErrorMessage(err.message || 'An error occurred while saving profile picture.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSaving) onClose(); }}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white dark:bg-[#121214] border-gray-200 dark:border-zinc-800 rounded-3xl">
        <DialogHeader className="p-5 border-b border-gray-150 dark:border-zinc-800/80 flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-teal-600" />
            <span>Edit Group Profile Picture</span>
          </DialogTitle>
        </DialogHeader>

        {/* Hidden Native File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="p-6 space-y-5">
          {/* Messages */}
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 rounded-xl text-xs text-teal-700 dark:text-teal-300 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {!selectedImageSrc ? (
            /* Current Avatar Preview & Upload Prompt */
            <div className="flex flex-col items-center justify-center py-6 space-y-5 text-center">
              <div className="relative group">
                <div className="w-36 h-36 rounded-full border-4 border-white dark:border-zinc-800 shadow-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 aspect-square flex items-center justify-center">
                  <img
                    src={currentAvatar || '/default-tolee-avatar.svg'}
                    alt={toleeName}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-xs font-semibold">Change Photo</span>
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {toleeName}
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-xs">
                  Preferred size: 800 × 800 px (square). Supported formats: JPEG, PNG, or WebP up to 10 MB.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs px-5 py-2.5 shadow-sm flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload New Picture</span>
              </Button>
            </div>
          ) : (
            /* Interactive Cropping View */
            <div className="space-y-4">
              <div className="relative w-full h-64 sm:h-72 bg-neutral-900 rounded-2xl overflow-hidden shadow-inner">
                <Cropper
                  image={selectedImageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              {/* Zoom & Adjustment Controls */}
              <div className="flex items-center gap-3 px-2">
                <ZoomOut className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-lg appearance-none"
                />
                <ZoomIn className="w-4 h-4 text-gray-400 shrink-0" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetCrop}
                  className="rounded-lg text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white ml-2 flex items-center gap-1"
                  title="Reset Position"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </Button>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                <span>Drag to reposition image</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                >
                  Choose another photo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 dark:bg-zinc-900/40 border-t border-gray-150 dark:border-zinc-800/80 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSaving}
            onClick={onClose}
            className="rounded-xl text-xs font-semibold"
          >
            Cancel
          </Button>
          {selectedImageSrc && (
            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={handleSave}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs px-5 flex items-center gap-1.5 shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Profile Picture</span>
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
