"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageCropModal } from '@/components/ImageCropModal';
import { checkUsernameAvailability } from '@/actions/user';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export function EditProfileModal({ user, children }: { user: any, children: React.ReactNode }) {
  const router = useRouter();
  const { update } = useSession();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const isUsernamePermanent = !!user.username;
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    checked: boolean;
    available: boolean;
    reason?: string;
  }>({ checked: false, available: false });

  const [formData, setFormData] = useState({
    username: user.username || '',
    name: user.name || '',
    bio: user.bio || '',
    location: user.location || '',
    website: user.website || '',
    avatar: user.avatar || '',
    coverImage: user.coverImage || '',
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // Cropping states
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropType, setCropType] = useState<'avatar' | 'coverImage'>('avatar');

  useEffect(() => {
    if (isUsernamePermanent || !formData.username.trim()) {
      setValidationResult({ checked: false, available: false });
      return;
    }

    const cleanUsername = formData.username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      setValidationResult({ checked: true, available: false, reason: 'Username must be at least 3 characters long.' });
      return;
    }
    if (cleanUsername.length > 30) {
      setValidationResult({ checked: true, available: false, reason: 'Username cannot exceed 30 characters.' });
      return;
    }
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      setValidationResult({ checked: true, available: false, reason: 'Username can only contain letters, numbers, and underscores.' });
      return;
    }

    setIsValidating(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailability(cleanUsername);
        if (res.success) {
          setValidationResult({ checked: true, available: !!res.available, reason: res.reason });
        } else {
          setValidationResult({ checked: true, available: false, reason: 'Error checking availability.' });
        }
      } catch {
        setValidationResult({ checked: true, available: false, reason: 'Error checking availability.' });
      } finally {
        setIsValidating(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [formData.username, isUsernamePermanent]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'username') {
      setFormData(prev => ({ ...prev, [name]: value.replace(/\s+/g, '') }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCropImageSrc(dataUrl);
        setCropType('avatar');
        setCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCropImageSrc(dataUrl);
        setCropType('coverImage');
        setCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = (file: File) => {
    setCropModalOpen(false);
    const objectUrl = URL.createObjectURL(file);
    if (cropType === 'avatar') {
      setAvatarFile(file);
      setFormData(prev => ({ ...prev, avatar: objectUrl }));
    } else {
      setCoverFile(file);
      setFormData(prev => ({ ...prev, coverImage: objectUrl }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      let finalAvatarUrl = formData.avatar;
      let finalCoverUrl = formData.coverImage;

      if (avatarFile) {
        const uploadData = new FormData();
        uploadData.append('file', avatarFile);
        const res = await fetch('/api/upload', { method: 'POST', body: uploadData });
        const data = await res.json();
        if (data.success) {
          finalAvatarUrl = `${data.url}?v=${Date.now()}`;
        } else {
          setIsLoading(false);
          alert("Avatar upload failed. Please check your storage settings.");
          return;
        }
      }

      if (coverFile) {
        const uploadData = new FormData();
        uploadData.append('file', coverFile);
        const res = await fetch('/api/upload', { method: 'POST', body: uploadData });
        const data = await res.json();
        if (data.success) {
          finalCoverUrl = data.url;
        } else {
          setIsLoading(false);
          alert("Cover image upload failed. Please check your storage settings.");
          return;
        }
      }

      const payload = {
        ...formData,
        avatar: finalAvatarUrl,
        coverImage: finalCoverUrl
      };

      console.log('UPDATING PROFILE WITH PAYLOAD (MODAL):', payload);

      if (payload.avatar.startsWith('blob:') || payload.coverImage.startsWith('blob:')) {
        console.error("CRITICAL ERROR: Attempted to save a blob URL to the database from modal!");
        alert("Internal Error: Temporary image URL detected. Upload failed.");
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        // Update the session in NextAuth
        await update({ image: finalAvatarUrl, username: formData.username });
        
        setOpen(false);
        router.refresh(); // Refresh the page to show new data
      } else {
        console.error("Failed to update profile");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Username Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Username</label>
              {isUsernamePermanent && (
                <span className="text-[11px] text-gray-400 font-semibold flex items-center gap-1">
                  🔒 Permanent URL
                </span>
              )}
            </div>
            {isUsernamePermanent ? (
              <div className="relative">
                <Input
                  name="username"
                  value={formData.username}
                  disabled
                  className="w-full h-11 bg-gray-50 dark:bg-gray-900/60 cursor-not-allowed opacity-75 font-semibold text-gray-500 dark:text-gray-400 rounded-xl"
                />
                <p className="text-[11px] text-gray-400 mt-1 italic">
                  Username is permanent and cannot be changed.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Choose your unique username"
                    className="w-full h-11 pr-10 bg-white dark:bg-gray-900/40 rounded-xl"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isValidating && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                    {!isValidating && validationResult.checked && validationResult.available && (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                    {!isValidating && validationResult.checked && !validationResult.available && (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>

                {validationResult.checked && (
                  <div className="text-xs font-semibold">
                    {validationResult.available ? (
                      <span className="text-green-600 dark:text-green-400">✅ Available</span>
                    ) : (
                      <span className="text-red-500">❌ {validationResult.reason}</span>
                    )}
                  </div>
                )}
                
                {/* Dynamic Preview */}
                <div className="text-[11px] font-mono text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/30 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-900/40 truncate">
                  Profile Link: tolee.in/u/{formData.username ? formData.username.trim().toLowerCase() : 'yourname'}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Bio</label>
            <textarea 
              name="bio" 
              value={formData.bio} 
              onChange={handleChange} 
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Tell us about yourself..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Location</label>
            <Input name="location" value={formData.location} onChange={handleChange} placeholder="e.g. Mumbai, India" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Website</label>
            <Input name="website" value={formData.website} onChange={handleChange} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Profile Picture</label>
            <div className="flex items-center gap-4">
              <img 
                src={formData.avatar || `/default-user-avatar.svg`} 
                alt="Avatar" 
                className="w-12 h-12 rounded-full object-cover border border-gray-200" 
              />
              <Input type="file" accept="image/*" onChange={handleAvatarChange} className="cursor-pointer" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Wall Cover Image</label>
            <div className="flex flex-col gap-2">
              <img 
                src={formData.coverImage || `/default-user-cover.svg`} 
                alt="Cover" 
                className="w-full h-24 rounded-lg object-cover border border-gray-200" 
              />
              <Input type="file" accept="image/*" onChange={handleCoverChange} className="cursor-pointer" />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" className="mr-2" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || (!isUsernamePermanent && formData.username.trim() !== '' && !validationResult.available) || (!isUsernamePermanent && formData.username.trim() === '')}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      {/* Image Crop Modal */}
      {cropImageSrc && (
        <ImageCropModal
          isOpen={cropModalOpen}
          onClose={() => setCropModalOpen(false)}
          imageSrc={cropImageSrc}
          onSave={handleCropSave}
          aspectRatio={cropType === 'avatar' ? 1 : 3} // Wide Cover Aspect Ratio
          cropShape={cropType === 'avatar' ? 'round' : 'rect'}
          title={cropType === 'avatar' ? 'Adjust Profile Picture' : 'Adjust Cover Photo'}
        />
      )}
      </DialogContent>
    </Dialog>
  );
}
