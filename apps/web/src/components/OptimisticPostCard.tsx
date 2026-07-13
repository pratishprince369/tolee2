'use client';

import React, { useEffect, useState } from 'react';
import { 
  Loader2, AlertCircle, RefreshCw, Trophy, Newspaper, Pin, 
  Play, Film, Users, MapPin 
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUpload } from './UploadContext';
import { useSession } from 'next-auth/react';

export function OptimisticPostCard() {
  const { data: session } = useSession();
  const { task, retryUpload, cancelUpload } = useUpload();
  const [objectUrls, setObjectUrls] = useState<string[]>([]);

  // We only show this card if a post is uploading, processing, or failed to upload
  if (task.state === 'idle' || task.state === 'success' || !task.postData) {
    return null;
  }

  // Generate object URLs for local File previews to ensure media displays instantly
  useEffect(() => {
    if (task.mediaItems && task.mediaItems.length > 0) {
      const urls = task.mediaItems.map(item => {
        if (item.file) {
          return URL.createObjectURL(item.file);
        }
        return item.url;
      });
      setObjectUrls(urls);
      
      // Cleanup URLs on unmount or item change
      return () => {
        urls.forEach(url => {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
      };
    } else {
      setObjectUrls([]);
    }
  }, [task.mediaItems]);

  const pData = task.postData;
  const isAnon = !!pData.isAnonymous;
  const authorName = isAnon ? 'Anonymous' : (session?.user?.name || (session?.user as any)?.username || 'You');
  const authorAvatar = isAnon ? '/default-user-avatar.svg' : (session?.user?.image || '/default-user-avatar.svg');

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] bg-white dark:bg-[#0c0c0e] rounded-[24px] overflow-hidden transition-all duration-300 mb-6 border relative animate-pulse-subtle">
      <style>{`
        @keyframes pulseSubtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.96; }
        }
        .animate-pulse-subtle {
          animation: pulseSubtle 3s infinite ease-in-out;
        }
      `}</style>

      {/* Post Context/Tolee Header */}
      <div className="px-5 py-2.5 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-[11px] font-extrabold text-primary dark:text-zinc-200 uppercase tracking-widest">
            {pData.toleeName || 'Tolee Group'}
          </span>
        </div>
        
        {/* Upload Status Tag */}
        <div>
          {task.state === 'uploading' && (
            <span className="inline-flex items-center gap-1 bg-[#0a7c85]/10 text-[#0a7c85] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
              <Loader2 className="w-3 h-3 animate-spin" /> Uploading {task.totalProgress}%
            </span>
          )}
          {task.state === 'processing' && (
            <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
              <Loader2 className="w-3 h-3 animate-spin" /> Processing Post
            </span>
          )}
          {task.state === 'error' && (
            <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-500 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
              <AlertCircle className="w-3 h-3 text-red-500" /> Upload Failed
            </span>
          )}
        </div>
      </div>

      {/* Card Header (Author Info) */}
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <AvatarImage src={authorAvatar} alt={authorName} />
            <AvatarFallback>{authorName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-[14.5px] text-zinc-900 dark:text-zinc-50 leading-none">
              {authorName}
            </span>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-semibold mt-1">
              {task.state === 'error' ? 'Failed just now' : 'Publishing now...'}
            </span>
          </div>
        </div>
      </CardHeader>

      {/* Card Content */}
      <CardContent className="px-5 py-2 space-y-3">
        {/* Badges based on type */}
        <div className="flex flex-wrap items-center gap-2">
          {pData.postType === 'requirement' && (
            <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-500 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
              <Pin className="w-3 h-3 rotate-45" /> Requirement
            </span>
          )}
          {pData.postType === 'win' && (
            <span className="inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-600 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
              <Trophy className="w-3 h-3" /> Tolee Win
            </span>
          )}
          {pData.postType === 'news' && (
            <span className="inline-flex items-center gap-1 bg-[#e6f4f5] dark:bg-[#0a7c85]/20 text-[#0a7c85] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
              <Newspaper className="w-3 h-3" /> Tolee News
            </span>
          )}
          {pData.location && (
            <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
              <MapPin className="w-3 h-3" /> {pData.subLocation ? `${pData.subLocation}, ` : ''}{pData.location}
            </span>
          )}
        </div>

        {/* News Headline & Summary preview */}
        {pData.postType === 'news' && (
          <div className="space-y-1.5 border-l-2 border-primary/20 pl-3">
            {pData.headline && (
              <h3 className="font-extrabold text-[16px] text-zinc-900 dark:text-zinc-50 leading-snug">
                {pData.headline}
              </h3>
            )}
            {pData.summary && (
              <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400 font-medium">
                {pData.summary}
              </p>
            )}
          </div>
        )}

        {/* Post Text content */}
        {pData.content && (
          <p className="text-[14.5px] leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
            {pData.content}
          </p>
        )}

        {/* Media items previews */}
        {objectUrls.length > 0 && (
          <div className={`grid gap-2 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 ${objectUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {objectUrls.slice(0, 4).map((url, idx) => {
              const type = task.mediaItems[idx]?.type;
              return (
                <div key={idx} className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
                  {type === 'video' ? (
                    <>
                      <video src={url} className="w-full h-full object-cover" muted playsInline />
                      <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-lg">
                          {task.uploadType === 'reel' ? <Film className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white fill-white" />}
                        </div>
                      </div>
                    </>
                  ) : (
                    <img src={url} alt="Upload preview" className="w-full h-full object-cover" />
                  )}
                  {objectUrls.length > 4 && idx === 3 && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white font-extrabold text-sm">
                      +{objectUrls.length - 3} More
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Error Alert Display & Actions */}
        {task.state === 'error' && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col gap-3">
            <div className="flex gap-2 text-xs text-red-500 font-bold leading-normal">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{task.errorMessage || 'Publishing failed. Please check your connection.'}</span>
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                onClick={retryUpload} 
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-[11px] uppercase tracking-wider py-1.5 h-8 rounded-lg flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} /> Retry Publish
              </Button>
              <Button 
                onClick={cancelUpload} 
                variant="ghost" 
                size="sm"
                className="text-zinc-500 hover:text-zinc-300 font-bold text-[11px] py-1.5 h-8"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Progress Bar Footer for active uploads */}
      {(task.state === 'uploading' || task.state === 'processing') && (
        <CardFooter className="px-5 pb-4 pt-1 flex flex-col gap-1.5 border-t border-zinc-50 dark:border-zinc-900/40 mt-3">
          <div className="flex items-center justify-between w-full text-[10px] text-zinc-500 font-black uppercase tracking-wider">
            <span>
              {task.state === 'uploading' 
                ? `Uploading attachment ${task.currentFileIndex + 1} of ${task.filesCount}` 
                : 'Processing and indexing post...'}
            </span>
            <span>{task.state === 'processing' ? '95%' : `${task.totalProgress}%`}</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              style={{ width: `${task.state === 'processing' ? 95 : task.totalProgress}%` }}
              className="h-full bg-gradient-to-r from-primary via-[#0a7c85] to-indigo-600 rounded-full transition-all duration-300 ease-out"
            />
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
