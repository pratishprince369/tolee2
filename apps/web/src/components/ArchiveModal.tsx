'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getArchivedPosts, restorePost, deletePostPermanently } from '@/actions/post';
import { 
  X, Grid, List, Trash2, RefreshCw, Trophy, Heart, MessageCircle, Eye, Film, ImageIcon, Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostRestored?: () => void;
}

export function ArchiveModal({ isOpen, onClose, onPostRestored }: ArchiveModalProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'reels'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [actioningPostId, setActioningPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<any | null>(null); // For grid-tap action dialog

  const getVideoPoster = (mediaUrl: string | null, postType?: string) => {
    const isMobileApp = typeof window !== 'undefined' && (
      !!(window as any).ToleeNative || 
      !!(window as any).AndroidBridge || 
      !!(window as any).AndroidGoogleAuth
    );
    
    if (!isMobileApp) return undefined;
    if (!mediaUrl) return undefined;

    if (mediaUrl.includes('res.cloudinary.com')) {
      const cleanUrl = mediaUrl.trim();
      const dimensions = postType === 'reel' ? 'w_480,h_640' : 'w_480,h_480';
      
      if (cleanUrl.includes('/video/upload/')) {
        return cleanUrl
          .replace('/video/upload/', `/video/upload/c_fill,${dimensions},g_auto,so_0,q_auto,f_jpg/`)
          .replace(/\.[^/.]+$/, ".jpg");
      }
      return cleanUrl.replace(/\.[^/.]+$/, ".jpg");
    }

    return mediaUrl + '#t=0.1';
  };

  const fetchArchived = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getArchivedPosts();
      if (res.success && res.posts) {
        setPosts(res.posts);
      }
    } catch (err) {
      console.error('Failed to fetch archived posts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchArchived();
    }
  }, [isOpen, fetchArchived]);

  const handleRestore = async (postId: string) => {
    if (actioningPostId) return;
    setActioningPostId(postId);
    try {
      const res = await restorePost(postId);
      if (res.success) {
        // Optimistic update
        setPosts(prev => prev.filter(p => p.id !== postId));
        setSelectedPost(null);
        if (onPostRestored) onPostRestored();
      } else {
        alert(res.error || 'Failed to restore post.');
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong.');
    } finally {
      setActioningPostId(null);
    }
  };

  const handleDelete = async (postId: string) => {
    if (actioningPostId) return;
    const confirmDelete = window.confirm('Are you sure you want to permanently delete this post? This cannot be undone.');
    if (!confirmDelete) return;

    setActioningPostId(postId);
    try {
      const res = await deletePostPermanently(postId);
      if (res.success) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        setSelectedPost(null);
      } else {
        alert(res.error || 'Failed to delete post.');
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong.');
    } finally {
      setActioningPostId(null);
    }
  };

  // Separate posts and reels
  const archivedFeedPosts = posts.filter(
    p => p.postType !== 'reel' && !(p.mediaTypes === 'video' && p.mediaUrls)
  );
  
  const archivedReels = posts.filter(
    p => p.postType === 'reel' || (p.mediaTypes === 'video' && p.mediaUrls)
  );

  const displayedContent = activeTab === 'posts' ? archivedFeedPosts : archivedReels;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-2xl w-[94vw] h-[85vh] md:h-[75vh] bg-white dark:bg-[#121212] p-0 flex flex-col overflow-hidden rounded-3xl shadow-2xl border border-gray-100 dark:border-zinc-800 gap-0">
          
          {/* Header */}
          <DialogHeader className="p-4 border-b border-gray-100 dark:border-zinc-800/80 flex flex-row items-center justify-between shrink-0 bg-gray-50/50 dark:bg-zinc-900/20">
            <div>
              <DialogTitle className="text-lg font-black text-slate-800 dark:text-zinc-100 tracking-tight flex items-center gap-1.5">
                <span className="bg-primary/10 text-primary p-1.5 rounded-xl text-xs font-black dark:bg-primary/20">ARCHIVE</span>
                <span>Archive Manager</span>
              </DialogTitle>
              <p className="text-[11px] text-gray-400 mt-0.5">Manage and restore your hidden posts and reels</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors mr-6 md:mr-0"
            >
              <X className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
            </button>
          </DialogHeader>

          {/* Navigation Controls */}
          <div className="px-4 py-3 bg-white dark:bg-[#121212] border-b border-gray-50 dark:border-zinc-800/50 flex items-center justify-between shrink-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList variant="line" className="h-9">
                <TabsTrigger value="posts" className="px-3 py-1 font-bold text-xs uppercase tracking-wider">
                  Posts ({archivedFeedPosts.length})
                </TabsTrigger>
                <TabsTrigger value="reels" className="px-3 py-1 font-bold text-xs uppercase tracking-wider">
                  Reels ({archivedReels.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-zinc-900 rounded-xl p-0.5">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-800 shadow-sm text-primary' : 'text-gray-400'}`}
                title="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-zinc-800 shadow-sm text-primary' : 'text-gray-400'}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/30 dark:bg-[#121212]">
            {isLoading ? (
              // Loading State Skeletons
              viewMode === 'grid' ? (
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <Skeleton key={n} className="aspect-square w-full rounded-2xl bg-gray-100 dark:bg-zinc-800" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4 max-w-md mx-auto">
                  {[1, 2, 3].map(n => (
                    <Skeleton key={n} className="h-32 w-full rounded-2xl bg-gray-100 dark:bg-zinc-800" />
                  ))}
                </div>
              )
            ) : displayedContent.length === 0 ? (
              // Empty State
              <div className="text-center py-20 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-900 rounded-full flex items-center justify-center">
                  <Film className="w-7 h-7 text-gray-400 dark:text-zinc-500" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-700 dark:text-zinc-200">No archived {activeTab} yet</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-[280px] mx-auto">
                    Archived posts and reels are hidden from your profile but safe in this private directory.
                  </p>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              // GRID VIEW
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                {displayedContent.map((post) => {
                  const hasVideo = post.mediaTypes?.includes('video') || post.postType === 'reel';
                  const thumbnail = post.mediaUrls ? post.mediaUrls.split(/,(?=https?:\/\/)/)[0] : null;

                  return (
                    <div 
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="group relative aspect-square w-full rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-sm border border-gray-100/50 dark:border-zinc-800/50 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                    >
                      {thumbnail ? (
                        hasVideo ? (
                          <div className="relative w-full h-full">
                            <video src={thumbnail} poster={getVideoPoster(thumbnail, post.postType)} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                            <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm rounded-lg p-1 text-white">
                              <Film className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ) : (
                          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="w-full h-full p-3 flex flex-col justify-between bg-gradient-to-br from-indigo-50/50 to-slate-100 dark:from-zinc-900 dark:to-zinc-950">
                          <p className="text-[10px] md:text-xs font-semibold text-slate-700 dark:text-zinc-300 line-clamp-4">
                            {post.caption}
                          </p>
                          {post.postType === 'win' && (
                            <span className="inline-flex w-fit items-center gap-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 px-1 rounded text-[8px] font-black">
                              <Trophy className="w-2.5 h-2.5" /> WIN
                            </span>
                          )}
                        </div>
                      )}

                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-bold text-sm">
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4 fill-white" /> {post._count?.likes || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4 fill-white" /> {post._count?.comments || 0}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // LIST VIEW
              <div className="space-y-4 max-w-md mx-auto">
                {displayedContent.map((post) => {
                  const hasVideo = post.mediaTypes?.includes('video') || post.postType === 'reel';
                  const thumbnail = post.mediaUrls ? post.mediaUrls.split(/,(?=https?:\/\/)/)[0] : null;

                  return (
                    <div 
                      key={post.id}
                      className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 shadow-sm flex flex-col gap-3"
                    >
                      <div className="flex gap-3">
                        {/* Visual Preview */}
                        {thumbnail ? (
                          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-50 dark:bg-zinc-800 flex-shrink-0 border border-gray-100 dark:border-zinc-800">
                            {hasVideo ? (
                              <video src={thumbnail} poster={getVideoPoster(thumbnail, post.postType)} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                            ) : (
                              <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-gray-50 dark:bg-zinc-950 p-2 flex items-center justify-center flex-shrink-0 border border-gray-100 dark:border-zinc-800 text-center">
                            <span className="text-[10px] text-gray-400 font-bold line-clamp-3 leading-tight">{post.caption}</span>
                          </div>
                        )}

                        {/* Text / Captions & Stats */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[10px] text-gray-400 font-medium">
                                {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              {post.postType === 'win' && (
                                <span className="inline-flex items-center gap-0.5 bg-yellow-500/10 text-yellow-600 px-1 rounded text-[8px] font-black">
                                  <Trophy className="w-2.5 h-2.5" /> WIN
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-700 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                              {post.caption}
                            </p>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-4 text-xs font-semibold text-gray-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Heart className="w-3.5 h-3.5" /> {post._count?.likes || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-3.5 h-3.5" /> {post._count?.comments || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" /> {post._count?.views || 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Controls Footer */}
                      <div className="flex items-center gap-2 pt-2.5 border-t border-gray-50 dark:border-zinc-800/50">
                        <button
                          onClick={() => handleRestore(post.id)}
                          disabled={actioningPostId !== null}
                          className="flex-1 bg-gray-50 dark:bg-zinc-800/60 hover:bg-gray-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-bold py-2 rounded-xl border border-gray-100 dark:border-zinc-800 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                        >
                          {actioningPostId === post.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5 text-primary" />
                          )}
                          <span>Restore to Profile</span>
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          disabled={actioningPostId !== null}
                          className="flex-shrink-0 bg-red-50/50 hover:bg-red-50 text-red-600 p-2 rounded-xl border border-red-100/50 active:scale-[0.98] transition-all"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Grid Tap Action Sheet/Dialog */}
      {selectedPost && (
        <Dialog open={!!selectedPost} onOpenChange={(open) => { if (!open) setSelectedPost(null); }}>
          <DialogContent className="sm:max-w-[400px] w-full bg-[#1c1c1e] text-white p-0 gap-0 overflow-hidden border border-gray-800 shadow-2xl rounded-3xl">
            <div className="flex flex-col text-center divide-y divide-gray-800/80">
              <div className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider bg-white/[0.02] flex items-center justify-center gap-2">
                {selectedPost.postType === 'reel' || (selectedPost.mediaTypes === 'video' && selectedPost.mediaUrls) ? (
                  <Film className="w-3.5 h-3.5" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5" />
                )}
                <span>Manage Archived Content</span>
              </div>
              
              <button 
                onClick={() => handleRestore(selectedPost.id)}
                disabled={actioningPostId !== null}
                className="py-4 text-emerald-500 font-bold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px] flex items-center justify-center gap-1.5"
              >
                {actioningPostId === selectedPost.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>Restore to Profile</span>
              </button>

              <button 
                onClick={() => handleDelete(selectedPost.id)}
                disabled={actioningPostId !== null}
                className="py-4 text-red-500 font-bold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px] flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Permanently</span>
              </button>

              <button 
                onClick={() => setSelectedPost(null)}
                className="py-4 text-gray-400 hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
              >
                Cancel
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
