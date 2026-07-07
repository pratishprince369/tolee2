'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, Edit2, Eye, Link as LinkIcon, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { deleteNews } from '@/actions/news';

interface NewsCardMenuProps {
  postId: string;
  slug: string;
  canEdit: boolean;
}

export function NewsCardMenu({ postId, slug, canEdit }: NewsCardMenuProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/news/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this news article? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    const res = await deleteNews(postId);
    setIsDeleting(false);

    if (res.success) {
      alert('News article deleted successfully.');
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete news article.');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          onClick={(e) => e.stopPropagation()} 
          className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center text-white focus:outline-none transition-colors"
        >
          <MoreVertical className="w-4.5 h-4.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-[#121212] border border-gray-150 dark:border-zinc-850 rounded-xl shadow-lg p-1">
        {canEdit && (
          <DropdownMenuItem 
            onClick={() => router.push(`/news/edit/${postId}`)}
            className="flex items-center gap-2 cursor-pointer font-bold py-2.5 px-3 hover:bg-gray-50 dark:hover:bg-zinc-900 text-xs text-gray-700 dark:text-zinc-300 rounded-lg"
          >
            <Edit2 className="w-4 h-4" /> Edit News
          </DropdownMenuItem>
        )}
        <DropdownMenuItem 
          onClick={() => router.push(`/news/${slug}`)}
          className="flex items-center gap-2 cursor-pointer font-bold py-2.5 px-3 hover:bg-gray-55 dark:hover:bg-zinc-900 text-xs text-gray-700 dark:text-zinc-300 rounded-lg"
        >
          <Eye className="w-4 h-4" /> View
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleCopyLink}
          className="flex items-center gap-2 cursor-pointer font-bold py-2.5 px-3 hover:bg-gray-55 dark:hover:bg-zinc-900 text-xs text-gray-700 dark:text-zinc-300 rounded-lg"
        >
          <LinkIcon className="w-4 h-4" /> Copy Link
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem 
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 cursor-pointer font-bold py-2.5 px-3 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs text-red-650 dark:text-red-400 rounded-lg"
          >
            <Trash2 className="w-4 h-4" /> {isDeleting ? 'Deleting...' : 'Delete'}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
