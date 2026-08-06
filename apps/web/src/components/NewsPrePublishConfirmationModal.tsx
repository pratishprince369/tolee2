'use client';

import React, { useState } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Newspaper, CheckCircle2, Edit3, Send, Sparkles, Tag, Globe, ArrowRight 
} from 'lucide-react';

export interface NewsConfirmationData {
  headline: string;
  content: string;
  summary?: string;
  category?: string;
  metaDescription?: string;
  keywords?: string;
  tags?: string;
  selectedTolees: string[];
}

interface NewsPrePublishConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: NewsConfirmationData;
  onConfirmPublish: (updatedData: NewsConfirmationData) => void;
}

export function NewsPrePublishConfirmationModal({
  isOpen,
  onClose,
  initialData,
  onConfirmPublish,
}: NewsPrePublishConfirmationModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [headline, setHeadline] = useState(initialData.headline);
  const [category, setCategory] = useState(initialData.category || 'General News');
  const [summary, setSummary] = useState(initialData.summary || '');
  const [tags, setTags] = useState(initialData.tags || '');

  const slugPreview = headline
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const handlePublish = () => {
    onConfirmPublish({
      ...initialData,
      headline,
      category,
      summary,
      tags,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-[550px] p-6 bg-white dark:bg-[#121212] rounded-3xl border-gray-200 dark:border-gray-800 space-y-4">
        <DialogHeader className="border-b border-gray-100 dark:border-zinc-800 pb-3">
          <DialogTitle className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Confirm News Publication
            </span>
            <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              AI Optimized
            </Badge>
          </DialogTitle>
          <p className="text-xs text-gray-400 mt-1">
            Review your headline, category, and SEO parameters before final publication.
          </p>
        </DialogHeader>

        {isEditing ? (
          /* Inline Editor Mode */
          <div className="space-y-3 py-1 text-xs">
            <div>
              <label className="font-bold text-gray-700 dark:text-gray-300">News Headline</label>
              <Input 
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="mt-1 font-bold rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300">Category</label>
                <Input 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300">SEO Tags (comma separated)</label>
                <Input 
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="news, breaking, update"
                  className="mt-1 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-gray-700 dark:text-gray-300">Short Summary</label>
              <textarea 
                value={summary}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSummary(e.target.value)}
                rows={2}
                className="mt-1 w-full p-2.5 bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 font-sans"
              />
            </div>
          </div>
        ) : (
          /* Preview Mode */
          <div className="space-y-3 py-1">
            <div className="p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] uppercase font-extrabold text-indigo-600 border-indigo-200">
                  {category}
                </Badge>
                <span className="text-[10px] font-mono text-gray-400">
                  tolee.in/news/{slugPreview || 'article-slug'}
                </span>
              </div>

              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white leading-snug">
                {headline || 'Untitled News Article'}
              </h3>

              {summary && (
                <p className="text-xs text-gray-500 line-clamp-2">
                  {summary}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span className="flex items-center gap-1 font-semibold">
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                Publishing to {initialData.selectedTolees.length} Tolee group(s)
              </span>
              {tags && (
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Tag className="w-3 h-3" /> {tags.split(',').slice(0, 3).join(', ')}
                </span>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-gray-100 dark:border-zinc-800 pt-3 flex flex-row items-center justify-between gap-2">
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs font-bold text-gray-600 dark:text-gray-300 rounded-xl"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1" />
            {isEditing ? 'View Preview' : 'Edit Details'}
          </Button>

          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onClose}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handlePublish}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Final Publish
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
