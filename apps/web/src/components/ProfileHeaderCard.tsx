'use client';

import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Link as LinkIcon, Calendar, Trophy, Star, ShieldCheck, Mail, Edit3, Camera } from 'lucide-react';
import { FollowButton } from '@/components/FollowButton';
import { EditProfileModal } from '@/components/EditProfileModal';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ImageCropModal } from '@/components/ImageCropModal';

export function ProfileHeaderCard({ 
  user, 
  isMe, 
  currentUserId, 
  isFollowing 
}: { 
  user: any; 
  isMe: boolean; 
  currentUserId: string | undefined; 
  isFollowing: boolean;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [isUploading, setIsUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Cropping states
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropType, setCropType] = useState<'avatar' | 'coverImage'>('avatar');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'coverImage') => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setCropImageSrc(url);
      setCropType(type);
      setCropModalOpen(true);
      // Reset input so the same file can be selected again
      e.target.value = '';
    }
  };

  const handleUpload = async (file: File, type: 'avatar' | 'coverImage') => {
    setCropModalOpen(false);
    setIsUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      
      // 1. Upload the image to get the URL
      const res = await fetch('/api/upload', { method: 'POST', body: uploadData });
      const data = await res.json();
      
      if (data.success) {
        // 2. Update the user profile with the new URL
        const payload = {
          name: user.name || '',
          bio: user.bio || '',
          location: user.location || '',
          website: user.website || '',
          avatar: type === 'avatar' ? data.url : (user.avatar || ''),
          coverImage: type === 'coverImage' ? data.url : (user.coverImage || ''),
        };

        console.log('UPDATING PROFILE WITH PAYLOAD:', payload);

        if (payload.avatar.startsWith('blob:') || payload.coverImage.startsWith('blob:')) {
           console.error("CRITICAL ERROR: Attempted to save a blob URL to the database!");
           alert("Internal Error: Temporary image URL detected. Upload failed.");
           setIsUploading(false);
           return;
        }

        const updateRes = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (updateRes.ok) {
          // Update the session image in the header
          if (type === 'avatar') {
            await update({ image: data.url });
          }
          
          alert(`${type === 'avatar' ? 'Profile picture' : 'Cover photo'} updated successfully!`);
          window.location.reload(); // Force a full reload to show the new image
        } else {
          const errData = await updateRes.json();
          alert("Failed to update profile: " + (errData.error || "Unknown error"));
        }
      } else {
        alert(`Upload failed: ${data.error || "Unknown error"}${data.details ? `\n\nDetails: ${data.details}` : ''}`);
      }
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-[#121212] overflow-hidden mb-8">
      {/* Cover Image */}
      <div 
        className="h-48 bg-gradient-to-r from-primary/80 to-accent/80 relative bg-cover bg-center group z-10"
        style={user.coverImage ? { backgroundImage: `url(${user.coverImage})` } : { backgroundImage: `url(/default-user-cover.svg)` }}
      >
        <div className="absolute inset-0 bg-black/10"></div>
        
        {isMe && (
          <>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={coverInputRef}
              onChange={(e) => handleFileChange(e, 'coverImage')} 
            />
            <Button 
              variant="secondary" 
              className="absolute bottom-4 right-4 bg-white/80 dark:bg-black/80 hover:bg-white dark:hover:bg-black backdrop-blur-sm text-sm font-bold shadow-md z-50"
              onClick={() => coverInputRef.current?.click()}
              disabled={isUploading}
            >
              <Camera className="w-4 h-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Edit cover photo'}
            </Button>
          </>
        )}
      </div>
      
      <CardContent className="px-4 sm:px-8 pb-8 relative">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-end mb-8 relative z-20">
          {/* Avatar container with better spacing */}
          <div className="relative group z-20 -mt-16 sm:-mt-20">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white dark:border-[#121212] overflow-hidden shadow-2xl bg-white relative">
              <img 
                src={user.avatar || `/default-user-avatar.svg`} 
                alt={user.name} 
                className="w-full h-full object-cover" 
              />
            </div>
            {isMe && (
              <>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={avatarInputRef}
                  onChange={(e) => handleFileChange(e, 'avatar')} 
                />
                <button 
                  className="absolute bottom-1 right-1 w-10 h-10 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full flex items-center justify-center border-2 border-primary shadow-xl transition-all active:scale-95 z-[100]"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    avatarInputRef.current?.click();
                  }}
                  disabled={isUploading}
                  type="button"
                  title="Update Profile Picture"
                >
                  <Camera className="w-5 h-5 text-primary" />
                </button>
              </>
            )}
          </div>
          
          <div className="flex-grow text-center sm:text-left mb-2 pt-2 sm:pt-0">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-2 mb-1">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">{user.name}</h1>
              <div className="flex items-center gap-2 mb-1">
                {user.isVerified && <ShieldCheck className="w-6 h-6 text-primary fill-primary/10" />}
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold">
                  Lvl {user.level || 1}
                </Badge>
              </div>
            </div>
            <p className="text-lg text-gray-500 font-medium mb-4">@{user.username}</p>
            
            <div className="flex flex-wrap justify-center sm:justify-start gap-y-2 gap-x-5 text-sm font-medium text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary/70" /> {user.location || 'Everywhere'}</span>
              <span className="flex items-center gap-1.5"><LinkIcon className="w-4 h-4 text-primary/70" /> <a href={user.website || '#'} className="text-primary hover:underline">{user.website ? user.website.replace(/^https?:\/\//, '') : 'tolee.in'}</a></span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary/70" /> Joined {user.joinedDate || 'Recently'}</span>
            </div>
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto mt-4 sm:mt-0">
            {!isMe && currentUserId && (
              <FollowButton targetUserId={user.id} initialIsFollowing={isFollowing} />
            )}
            {isMe && (
              <EditProfileModal user={user}>
                <Button variant="outline" className="flex-grow sm:flex-grow-0 font-bold px-8 rounded-full shadow-md border-primary/20 hover:bg-primary/5">Edit Profile</Button>
              </EditProfileModal>
            )}
            <Button variant="outline" className="w-12 px-0 rounded-full border-gray-200"><Mail className="w-5 h-5 text-gray-600" /></Button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto sm:mx-0">
          <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-8 text-center sm:text-left italic opacity-90">
            {user.bio || "No bio yet. Sharing the Tolee spirit!"}
          </p>
        </div>

        {/* Gamification Stats - Fixed NaN bug and improved UI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-8 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-col items-center justify-center p-4 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 transition-colors hover:bg-gray-50">
            <Trophy className="w-7 h-7 text-yellow-500 mb-2" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{user.level || 1}</span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Level</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 transition-colors hover:bg-gray-50">
            <Star className="w-7 h-7 text-primary mb-2" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {user.points ? (user.points >= 1000 ? `${(user.points / 1000).toFixed(1)}k` : user.points) : '0'}
            </span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Points</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 transition-colors hover:bg-gray-50">
            <ShieldCheck className="w-7 h-7 text-green-500 mb-2" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{user.trustScore || 100}%</span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Trust Score</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 transition-colors hover:bg-gray-50">
            <Edit3 className="w-7 h-7 text-purple-500 mb-2" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{user.posts?.length || 0}</span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Posts</span>
          </div>
        </div>
      </CardContent>

      {/* Image Crop Modal */}
      {cropImageSrc && (
        <ImageCropModal
          isOpen={cropModalOpen}
          onClose={() => setCropModalOpen(false)}
          imageSrc={cropImageSrc}
          onSave={(file) => handleUpload(file, cropType)}
          aspectRatio={cropType === 'avatar' ? 1 : 3}
          cropShape={cropType === 'avatar' ? 'round' : 'rect'}
          title={cropType === 'avatar' ? 'Adjust Profile Picture' : 'Adjust Cover Photo'}
        />
      )}
    </Card>
  );
}
