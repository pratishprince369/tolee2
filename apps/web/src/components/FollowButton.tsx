'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { toggleFollow } from '@/actions/user';
import { Check, Clock, UserPlus, Loader2 } from 'lucide-react';

interface FollowButtonProps {
  targetUserId: string;
  targetUsername?: string;
  initialIsFollowing?: boolean;
  initialStatus?: 'approved' | 'pending' | null;
  size?: 'default' | 'sm' | 'lg' | 'xs';
  className?: string;
  sourcePostId?: string;
}

export function FollowButton({
  targetUserId,
  targetUsername,
  initialIsFollowing = false,
  initialStatus = null,
  size = 'sm',
  className = '',
  sourcePostId,
}: FollowButtonProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [status, setStatus] = useState<'approved' | 'pending' | null>(() => {
    if (initialStatus) return initialStatus;
    return initialIsFollowing ? 'approved' : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialStatus !== undefined && initialStatus !== null) {
      setStatus(initialStatus);
    } else if (initialIsFollowing !== undefined) {
      setStatus(initialIsFollowing ? 'approved' : null);
    }
  }, [initialStatus, initialIsFollowing]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      const targetLabel = targetUsername ? `@${targetUsername}` : 'this creator';
      if (confirm(`Please sign in to follow ${targetLabel} on Tolee. Go to login page now?`)) {
        const currentUrl = typeof window !== 'undefined' ? window.location.href : '/';
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(currentUrl)}`);
      }
      return;
    }

    const currentUserId = (session.user as any)?.id;
    if (currentUserId && currentUserId === targetUserId) {
      alert("You cannot follow yourself.");
      return;
    }

    const originalStatus = status;
    setLoading(true);

    // Optimistic UI update: toggle between null and approved
    const nextStatus = status ? null : 'approved';
    setStatus(nextStatus);

    try {
      const result = await toggleFollow(targetUserId, sourcePostId);
      if (!result.success) {
        setStatus(originalStatus);
        alert(result.error || 'Failed to update follow status');
      } else {
        if (result.status === 'pending') {
          setStatus('pending');
        } else if (result.isFollowing) {
          setStatus('approved');
        } else {
          setStatus(null);
        }
      }
    } catch (err: any) {
      setStatus(originalStatus);
      console.error('Error toggling follow:', err);
      alert(err?.message || 'Network error while updating follow');
    } finally {
      setLoading(false);
    }
  };

  const isFollowing = status === 'approved';
  const isPending = status === 'pending';

  return (
    <Button
      type="button"
      onClick={handleFollow}
      disabled={loading}
      size={size}
      variant={isFollowing ? 'outline' : isPending ? 'outline' : 'default'}
      className={`rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer h-8 px-4 ${
        isFollowing
          ? 'border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/30'
          : isPending
          ? 'border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20'
          : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
      } ${className}`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isFollowing ? (
        <span className="flex items-center gap-1">
          <Check className="w-3.5 h-3.5 text-teal-600" />
          <span>Following</span>
        </span>
      ) : isPending ? (
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          <span>Requested</span>
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <UserPlus className="w-3.5 h-3.5" />
          <span>Follow</span>
        </span>
      )}
    </Button>
  );
}
