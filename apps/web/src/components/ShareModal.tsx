'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, Check, Link as LinkIcon, Copy, Send } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { getFriendsList } from '@/actions/user';
import { incrementShareCount, sharePostToFriends } from '@/actions/post';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  shareUrl: string;
  previewText: string;
  onShareSuccess?: (newShareCount: number) => void;
}

export function ShareModal({
  isOpen,
  onClose,
  postId,
  shareUrl,
  previewText,
  onShareSuccess
}: ShareModalProps) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;

  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && currentUserId) {
      setLoading(true);
      setSelectedIds([]);
      setSearchQuery('');
      setCopied(false);
      
      getFriendsList(currentUserId)
        .then((res) => {
          if (res.success && res.friends) {
            setFriends(res.friends);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching friends list in ShareModal:', err);
          setLoading(false);
        });
    }
  }, [isOpen, currentUserId]);

  if (!isOpen) return null;

  // Filter friends based on search query
  const filteredFriends = friends.filter((friend) =>
    (friend.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (friend.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // Increment share count in DB
      const res = await incrementShareCount(postId);
      if (res.success && res.shareCount !== undefined) {
        if (onShareSuccess) {
          onShareSuccess(res.shareCount);
        }
      }
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleWebShare = async () => {
    if (typeof navigator === 'undefined' || !navigator.share) return;
    try {
      await navigator.share({
        title: 'Tolee Content',
        text: previewText || 'Check out this awesome content on Tolee!',
        url: shareUrl,
      });

      // Increment share count in DB
      const res = await incrementShareCount(postId);
      if (res.success && res.shareCount !== undefined) {
        if (onShareSuccess) {
          onShareSuccess(res.shareCount);
        }
      }
      onClose();
    } catch (err) {
      console.log('Web share cancelled or failed:', err);
    }
  };

  const handleToggleSelectFriend = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSendInstant = async (friendId: string, friendName: string) => {
    setSharing(true);
    try {
      const res = await sharePostToFriends(postId, [friendId], shareUrl, previewText);
      if (res.success && res.shareCount !== undefined) {
        if (onShareSuccess) {
          onShareSuccess(res.shareCount);
        }
        onClose();
      } else {
        alert('Failed to send: ' + (res.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error sharing post instantly:', err);
      alert('Something went wrong while sending.');
    } finally {
      setSharing(false);
    }
  };

  const handleSendMultiple = async () => {
    if (selectedIds.length === 0) return;
    setSharing(true);
    try {
      const res = await sharePostToFriends(postId, selectedIds, shareUrl, previewText);
      if (res.success && res.shareCount !== undefined) {
        if (onShareSuccess) {
          onShareSuccess(res.shareCount);
        }
        onClose();
      } else {
        alert('Failed to send: ' + (res.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error sharing post to multiple friends:', err);
      alert('Something went wrong while sending.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#121212] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Send className="w-5 h-5 text-primary rotate-45" />
            </div>
            <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">Share Content</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Section: Copy & Share Actions */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#181818]/30 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleCopyLink}
            className="flex-1 flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#181818] border border-gray-200 dark:border-gray-800 hover:border-primary/50 dark:hover:border-primary/50 transition-all duration-200 shadow-sm group active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                <LinkIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Copy Link</p>
                <p className="text-xs text-gray-400">Save to clipboard</p>
              </div>
            </div>
            <div className="flex items-center ml-2 shrink-0">
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
              )}
            </div>
          </button>

          {typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.share && (
            <button
              onClick={handleWebShare}
              className="flex-1 flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 border border-indigo-500/20 hover:from-blue-700 hover:to-indigo-700 text-white transition-all duration-200 shadow-md group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl transition-colors">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Share to Apps</p>
                  <p className="text-xs text-blue-100">WhatsApp, SMS, etc.</p>
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Search Friends Section */}
        <div className="px-4 py-3 bg-gray-50/20 dark:bg-black/10 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              className="w-full pl-9 bg-gray-50 dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-800 rounded-xl h-10 text-sm focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Friends List Container */}
        <div className="flex-1 overflow-y-auto p-3 min-h-[220px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Loading friends...</span>
            </div>
          ) : friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-3 text-gray-400">
                <Send className="w-8 h-8 rotate-45" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">No Friends Found</p>
              <p className="text-xs text-gray-500 mt-1 max-w-[240px]">
                You need to have mutual followers to share content internally inside Tolee!
              </p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 font-medium">
              No friends match "{searchQuery}"
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredFriends.map((friend) => {
                const isSelected = selectedIds.includes(friend.id);
                return (
                  <div
                    key={friend.id}
                    onClick={() => handleToggleSelectFriend(friend.id)}
                    className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-primary/5 dark:bg-primary/10 border-primary/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/40 border-transparent'
                    }`}
                  >
                    {/* Friend Left Side (DP + Names) */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <Avatar className={`w-11 h-11 border transition-all ${isSelected ? 'border-primary scale-105' : 'border-gray-100 dark:border-gray-800'}`}>
                          <AvatarImage src={friend.avatar || '/default-user-avatar.svg'} />
                          <AvatarFallback>{(friend.name || 'F')[0]}</AvatarFallback>
                        </Avatar>
                        {isSelected && (
                          <div className="absolute -bottom-1 -right-1 bg-primary text-white p-0.5 rounded-full border border-white dark:border-[#121212]">
                            <Check className="w-2.5 h-2.5 stroke-[4]" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate flex items-center gap-1">
                          {friend.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          @{friend.username}
                        </p>
                      </div>
                    </div>

                    {/* Action Right Side */}
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                      {selectedIds.length === 0 ? (
                        // Instant Single Share Button
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSendInstant(friend.id, friend.name)}
                          disabled={sharing}
                          className="h-8 rounded-lg px-3.5 bg-gray-50 hover:bg-primary/10 dark:bg-gray-800 hover:text-primary dark:hover:bg-primary/20 text-xs font-extrabold transition-all"
                        >
                          Send
                        </Button>
                      ) : (
                        // Checkbox selection state indicator
                        <div
                          onClick={() => handleToggleSelectFriend(friend.id)}
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-primary border-primary text-white scale-110 shadow-sm shadow-primary/20'
                              : 'border-gray-300 dark:border-gray-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer (Sticky Multiple Send Button) */}
        {selectedIds.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-[#0c0c0c] animate-slide-up">
            <div className="text-xs text-gray-500">
              Selected <span className="font-extrabold text-gray-900 dark:text-white">{selectedIds.length}</span> {selectedIds.length === 1 ? 'friend' : 'friends'}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelectedIds([])}
                disabled={sharing}
                className="rounded-xl font-bold text-xs h-10 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Clear
              </Button>
              <Button
                type="button"
                onClick={handleSendMultiple}
                disabled={sharing}
                className="rounded-xl font-bold text-xs h-10 px-5 shadow-lg flex items-center gap-1.5"
              >
                {sharing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-white rotate-45" /> Send to {selectedIds.length} {selectedIds.length === 1 ? 'Friend' : 'Friends'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
