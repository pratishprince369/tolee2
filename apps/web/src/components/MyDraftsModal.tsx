'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Trash2, Send, Clock, Newspaper, Film, Tv, Trophy, Sparkles, AlertTriangle 
} from 'lucide-react';
import { getDrafts, deleteDraft, clearAllDrafts, DraftItem, MAX_DRAFTS_LIMIT } from '@/lib/draftManager';
import { CreatePostModal } from '@/components/CreatePostModal';

interface MyDraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MyDraftsModal({ isOpen, onClose }: MyDraftsModalProps) {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [activeDraftToPublish, setActiveDraftToPublish] = useState<DraftItem | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDrafts();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    const handleUpdate = () => loadDrafts();
    window.addEventListener('tolee_drafts_updated', handleUpdate);
    return () => window.removeEventListener('tolee_drafts_updated', handleUpdate);
  }, [userId]);

  const loadDrafts = () => {
    setDrafts(getDrafts(userId));
  };

  const handleDelete = (id: string) => {
    const updated = deleteDraft(userId, id);
    setDrafts(updated);
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all saved drafts?')) {
      clearAllDrafts(userId);
      setDrafts([]);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'news':
        return <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 gap-1"><Newspaper className="w-3 h-3" /> News</Badge>;
      case 'reel':
        return <Badge className="bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 gap-1"><Film className="w-3 h-3" /> Reel</Badge>;
      case 'screen':
        return <Badge className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 gap-1"><Tv className="w-3 h-3" /> Screen</Badge>;
      case 'win':
        return <Badge className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 gap-1"><Trophy className="w-3 h-3" /> Contest Win</Badge>;
      default:
        return <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 gap-1"><FileText className="w-3 h-3" /> Post</Badge>;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-[550px] p-6 bg-white dark:bg-[#121212] rounded-3xl border-gray-200 dark:border-gray-800 space-y-4">
          <DialogHeader className="border-b border-gray-100 dark:border-zinc-800 pb-3 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                My Saved Drafts ({drafts.length}/{MAX_DRAFTS_LIMIT})
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">Unpublished posts auto-saved locally. Max limit: 3 drafts.</p>
            </div>
            {drafts.length > 0 && (
              <Button size="sm" variant="ghost" onClick={handleClearAll} className="text-xs text-rose-500 hover:bg-rose-50 rounded-xl">
                Clear All
              </Button>
            )}
          </DialogHeader>

          {/* Drafts Alert Warning if Queue Full */}
          {drafts.length >= MAX_DRAFTS_LIMIT && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Draft queue is full ({drafts.length}/3). Please publish or delete drafts before creating new ones.</span>
            </div>
          )}

          {/* Drafts List */}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {drafts.length > 0 ? (
              drafts.map((draft) => (
                <div 
                  key={draft.id}
                  className="p-4 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    {getTypeBadge(draft.postType)}
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(draft.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(draft.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {draft.headline && (
                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-white line-clamp-1">
                      {draft.headline}
                    </h4>
                  )}

                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                    {draft.content || <span className="italic text-gray-400">No text content</span>}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200/50 dark:border-zinc-800/50">
                    <span className="text-[10px] font-bold text-gray-400">
                      {draft.mediaList?.length || 0} media attached
                    </span>

                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDelete(draft.id)}
                        className="text-xs text-rose-500 hover:bg-rose-50 rounded-xl"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setActiveDraftToPublish(draft);
                          onClose();
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5 mr-1" /> Publish Now
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 space-y-2">
                <FileText className="w-10 h-10 text-gray-300 mx-auto" />
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">No pending drafts</h4>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">Any unsaved post, reel, or news article will automatically appear here.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pre-filled CreatePostModal for 1-Click Publishing */}
      {activeDraftToPublish && (
        <CreatePostModal
          defaultTab={activeDraftToPublish.postType}
          defaultOpen={true}
          onPost={() => {
            deleteDraft(userId, activeDraftToPublish.id);
            setActiveDraftToPublish(null);
          }}
        />
      )}
    </>
  );
}
