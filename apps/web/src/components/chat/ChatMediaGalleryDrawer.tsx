'use client';

import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, FileText, Link2, ExternalLink, Download, X, Play, Loader2 } from 'lucide-react';
import { fetchChatMediaGallery } from '@/actions/chat';

interface ChatMediaGalleryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatName: string;
  onOpenMediaViewer?: (media: { url: string; type: 'image' | 'video' }) => void;
}

export function ChatMediaGalleryDrawer({
  isOpen,
  onClose,
  chatId,
  chatName,
  onOpenMediaViewer
}: ChatMediaGalleryDrawerProps) {
  const [activeTab, setActiveTab] = useState<'media' | 'docs' | 'links'>('media');
  const [loading, setLoading] = useState(false);
  const [gallery, setGallery] = useState<{ media: any[]; docs: any[]; links: any[] }>({
    media: [],
    docs: [],
    links: []
  });

  useEffect(() => {
    if (!isOpen || !chatId) return;

    let isCancelled = false;
    setLoading(true);

    fetchChatMediaGallery(chatId).then((res) => {
      if (!isCancelled && res.success) {
        setGallery({
          media: res.media || [],
          docs: res.docs || [],
          links: res.links || []
        });
      }
      if (!isCancelled) setLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, chatId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[380px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 select-none">
      {/* Header */}
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-zinc-900 dark:text-white">Media, Links & Docs</h3>
          <p className="text-xs text-zinc-400 truncate max-w-[240px]">{chatName}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-1">
        <button
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-2 text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'media'
              ? 'bg-white dark:bg-zinc-800 text-primary dark:text-teal-400 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Media ({gallery.media.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className={`flex-1 py-2 text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'docs'
              ? 'bg-white dark:bg-zinc-800 text-primary dark:text-teal-400 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Docs ({gallery.docs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('links')}
          className={`flex-1 py-2 text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'links'
              ? 'bg-white dark:bg-zinc-800 text-primary dark:text-teal-400 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Links ({gallery.links.length})</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs">Loading shared content...</span>
          </div>
        ) : activeTab === 'media' ? (
          gallery.media.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-zinc-400 text-xs gap-2">
              <ImageIcon className="w-8 h-8 stroke-1 text-zinc-300" />
              <span>No shared photos or videos yet</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {gallery.media.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onOpenMediaViewer?.({ url: item.url, type: item.type })}
                  className="aspect-square rounded-2xl overflow-hidden bg-zinc-950 relative group cursor-pointer border border-zinc-200/50 dark:border-zinc-800 shadow-xs"
                >
                  {item.type === 'video' ? (
                    <>
                      <video src={item.url} className="w-full h-full object-cover pointer-events-none" preload="metadata" muted />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                    </>
                  ) : (
                    <img src={item.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  )}
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'docs' ? (
          gallery.docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-zinc-400 text-xs gap-2">
              <FileText className="w-8 h-8 stroke-1 text-zinc-300" />
              <span>No shared documents yet</span>
            </div>
          ) : (
            <div className="space-y-2">
              {gallery.docs.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center justify-between p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{doc.name || 'Document'}</p>
                      <p className="text-[10px] text-zinc-400">{new Date(doc.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-zinc-400 hover:text-zinc-700 dark:hover:text-white" />
                </a>
              ))}
            </div>
          )
        ) : (
          gallery.links.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-zinc-400 text-xs gap-2">
              <Link2 className="w-8 h-8 stroke-1 text-zinc-300" />
              <span>No shared links yet</span>
            </div>
          ) : (
            <div className="space-y-2">
              {gallery.links.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-teal-600 dark:text-teal-400 truncate group-hover:underline">
                        {link.url}
                      </p>
                      <p className="text-[10px] text-zinc-400">{new Date(link.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-primary" />
                </a>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
