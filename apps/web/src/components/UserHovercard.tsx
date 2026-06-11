'use client';

import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { getUserPreviewAction } from '@/actions/user';
import Link from 'next/link';

interface UserHovercardProps {
  username: string;
  children: React.ReactNode;
}

interface UserPreviewData {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  isVerified: boolean;
  _count: {
    followers: number;
    following: number;
  };
}

export function UserHovercard({ username, children }: UserHovercardProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<UserPreviewData | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUserData = async () => {
    if (userData) return;
    setLoading(true);
    try {
      const res = await getUserPreviewAction(username);
      if (res.success && res.user) {
        setUserData(res.user as UserPreviewData);
      }
    } catch (err) {
      console.error('Error fetching user preview data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = () => {
    if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
    hoverTimeout.current = setTimeout(() => {
      setOpen(true);
      fetchUserData();
    }, 450); // 450ms delay to prevent accidental hovers
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    leaveTimeout.current = setTimeout(() => {
      setOpen(false);
    }, 300); // Small grace period before closing
  };

  return (
    <div 
      className="relative inline-block z-30"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="cursor-pointer inline-block">{children}</div>

      {open && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-gray-200/60 dark:border-zinc-800/80 rounded-2xl p-4 shadow-xl select-none animate-in fade-in zoom-in-95 duration-200"
          onMouseEnter={() => {
            if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
          }}
          onMouseLeave={handleMouseLeave}
        >
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : userData ? (
            <div className="space-y-3.5">
              {/* Header: DP and Follow button */}
              <div className="flex items-start justify-between gap-3">
                <Avatar className="w-14 h-14 border border-gray-100 dark:border-zinc-800 shadow-sm">
                  <AvatarImage src={userData.avatar || '/default-user-avatar.svg'} />
                  <AvatarFallback>{(userData.name || 'U')[0]}</AvatarFallback>
                </Avatar>
                
                <Link href={`/u/${userData.username}`} onClick={() => setOpen(false)}>
                  <Button size="sm" className="h-8 text-xs font-bold rounded-lg px-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md">
                    Profile
                  </Button>
                </Link>
              </div>

              {/* Names */}
              <div>
                <h4 className="font-extrabold text-[15px] text-gray-900 dark:text-white leading-snug flex items-center gap-1">
                  {userData.name}
                  {userData.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-primary fill-primary/10" />}
                </h4>
                <p className="text-xs text-gray-400">@{userData.username}</p>
              </div>

              {/* Bio */}
              {userData.bio ? (
                <p className="text-xs text-gray-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                  {userData.bio}
                </p>
              ) : (
                <p className="text-[11px] text-gray-400 italic">No bio written yet.</p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs font-semibold pt-1 border-t border-gray-100 dark:border-zinc-900 text-gray-700 dark:text-zinc-300">
                <div className="flex gap-1">
                  <span className="text-gray-900 dark:text-white font-black">{userData._count.followers}</span>
                  <span className="text-gray-400 font-medium">Followers</span>
                </div>
                <div className="flex gap-1">
                  <span className="text-gray-900 dark:text-white font-black">{userData._count.following}</span>
                  <span className="text-gray-400 font-medium">Following</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-gray-400">
              Failed to load profile.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
