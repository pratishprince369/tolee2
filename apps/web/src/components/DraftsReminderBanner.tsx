'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FileText, AlertTriangle, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDrafts, DraftItem, MAX_DRAFTS_LIMIT } from '@/lib/draftManager';
import { MyDraftsModal } from '@/components/MyDraftsModal';

export function DraftsReminderBanner() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (session?.user) {
      checkDrafts();
    }
  }, [session, userId]);

  useEffect(() => {
    const handleUpdate = () => checkDrafts();
    window.addEventListener('tolee_drafts_updated', handleUpdate);
    return () => window.removeEventListener('tolee_drafts_updated', handleUpdate);
  }, [userId]);

  const checkDrafts = () => {
    if (!session?.user) return;
    const current = getDrafts(userId);
    setDrafts(current);
  };

  if (!session?.user || drafts.length === 0 || dismissed) {
    return null;
  }

  const isMaxedOut = drafts.length >= MAX_DRAFTS_LIMIT;

  return (
    <>
      <div className={`fixed bottom-20 sm:bottom-6 right-4 z-40 max-w-md w-[calc(100vw-2rem)] p-4 rounded-3xl border shadow-xl backdrop-blur-md transition-all ${
        isMaxedOut 
          ? 'bg-amber-500/90 text-white border-amber-600 shadow-amber-500/20' 
          : 'bg-indigo-900/90 text-white border-indigo-700 shadow-indigo-900/20'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl shrink-0">
              {isMaxedOut ? <AlertTriangle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm leading-snug">
                {isMaxedOut ? `Draft Queue Full (${drafts.length}/3)` : `You have ${drafts.length} pending draft(s)`}
              </h4>
              <p className="text-[11px] opacity-90 leading-tight mt-0.5">
                {isMaxedOut 
                  ? 'Please publish or delete drafts to create new posts.' 
                  : 'Publish or delete them to clear your queue.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="bg-white text-gray-900 hover:bg-gray-100 rounded-full font-bold text-xs px-3 shadow-sm"
            >
              View Drafts <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
              className="text-white hover:bg-white/20 rounded-full w-7 h-7 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <MyDraftsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
