'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toggleFollow } from '@/actions/user';

export function FollowButton({ targetUserId, initialIsFollowing }: { targetUserId: string, initialIsFollowing: boolean }) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    setLoading(true);
    const originalState = isFollowing;
    // Optimistic UI update
    setIsFollowing(!isFollowing);
    
    try {
      const result = await toggleFollow(targetUserId);
      if (!result.success) {
        // Revert if failed
        setIsFollowing(originalState);
        console.error(result.error || "Failed to follow user");
      } else {
        setIsFollowing(result.isFollowing!);
      }
    } catch (err) {
      setIsFollowing(originalState);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleFollow} 
      disabled={loading}
      variant={isFollowing ? "outline" : "default"}
      className="w-full sm:w-auto font-bold px-8 rounded-full shadow-md"
    >
      {isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
}
