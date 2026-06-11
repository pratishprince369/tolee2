'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Sparkles } from 'lucide-react';

interface FollowRequestUser {
  id: string;
  username: string | null;
  name: string;
  avatar: string | null;
  isVerified: boolean;
}

export function PendingFollowRequests({
  initialRequests,
  respondAction
}: {
  initialRequests: FollowRequestUser[];
  respondAction: (followerId: string, action: 'approve' | 'reject') => Promise<any>;
}) {
  const [requests, setRequests] = useState<FollowRequestUser[]>(initialRequests);
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (requests.length === 0) return null;

  const handleResponse = async (followerId: string, action: 'approve' | 'reject') => {
    setProcessingId(followerId);
    try {
      const res = await respondAction(followerId, action);
      if (res.success) {
        // Animate removal
        setRequests(prev => prev.filter(r => r.id !== followerId));
      } else {
        alert(res.error || "Failed to process follow request");
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="mb-8 border border-[#efefef] dark:border-zinc-800 bg-[#fafafa]/50 dark:bg-zinc-900/30 backdrop-blur-md p-5 rounded-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4.5 h-4.5 text-blue-500 animate-pulse" />
        <h2 className="text-[13px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">
          Follow Requests ({requests.length})
        </h2>
      </div>

      <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
        {requests.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between gap-4 p-3 bg-white dark:bg-zinc-950/45 rounded-xl border border-gray-100 dark:border-zinc-900/60 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border border-gray-200/50 dark:border-zinc-800">
                <AvatarImage src={user.avatar || '/default-user-avatar.svg'} />
                <AvatarFallback>{user.name[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[14px] text-gray-900 dark:text-white truncate">
                    {user.name}
                  </span>
                  {user.isVerified && (
                    <div className="w-[14px] h-[14px] bg-[#0095f6] rounded-full flex items-center justify-center text-white">
                      <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current stroke-[3]"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    </div>
                  )}
                </div>
                <p className="text-[11.5px] text-gray-400 truncate">@{user.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                disabled={processingId === user.id}
                onClick={() => handleResponse(user.id, 'approve')}
                className="bg-[#0095f6] hover:bg-[#1877f2] disabled:opacity-50 text-white font-semibold text-[12px] px-3.5 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-sm active:scale-95"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Approve</span>
              </button>
              <button
                disabled={processingId === user.id}
                onClick={() => handleResponse(user.id, 'reject')}
                className="bg-[#efefef] dark:bg-[#262626] hover:bg-[#dbdbdb] dark:hover:bg-[#363636] disabled:opacity-50 text-black dark:text-white font-semibold text-[12px] px-3.5 py-1.5 rounded-lg flex items-center gap-1 transition-all active:scale-95"
              >
                <X className="w-3.5 h-3.5 stroke-[3]" />
                <span>Ignore</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
