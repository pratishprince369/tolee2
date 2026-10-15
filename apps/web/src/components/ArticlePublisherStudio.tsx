'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, ImageIcon, Link as LinkIcon, Bold, Italic, 
  Heading1, Heading2, Quote, List, ListOrdered, Plus, 
  Trash2, ChevronDown, Check, Loader2, Sparkles, Globe, 
  ExternalLink, Eye, Edit3, X, UploadCloud, FileText, Share2
} from 'lucide-react';
import { uploadFile } from '@/lib/upload';
import { saveNewsDraft, publishNews } from '@/actions/news';

interface ContentBlock {
  id: string;
  type: 'paragraph' | 'h1' | 'h2' | 'blockquote' | 'bullet_list' | 'numbered_list' | 'image';
  value: string;
  caption?: string;
}

const CATEGORIES = [
  'General', 'Technology', 'Business', 'Science', 'Local News', 
  'Politics', 'Sports', 'Education', 'Lifestyle', 'NASA', 
  'Discovery', 'National Geographic', 'Documentary', 'Space', 'History', 'Real Estate'
];

interface ArticlePublisherStudioProps {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  initialData?: any;
}

export function ArticlePublisherStudio({ user, initialData }: ArticlePublisherStudioProps) {
  const router = useRouter();
  
  // Article Core Fields
  const [title, setTitle] = useState(initialData?.headline || '');
  const [category, setCategory] = useState(initialData?.category || 'Technology');
  const [tags, setTags] = useState(initialData?.tags || '');
  const [sourceUrl, setSourceUrl] = useState(initialData?.sourceUrl || '');
  
  // Cover Media (Fully Optional)
  const [coverUrl, setCoverUrl] = useState<string>(() => {
    if (initialData?.post?.mediaUrls) {
      return initialData.post.mediaUrls.split(',')[0] || '';
    }
    return '';
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Content Blocks
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => {
    if (initialData?.content) {
      try {
        const parsed = JSON.parse(initialData.content);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        return [{ id: '1', type: 'paragraph', value: initialData.content }];
      }
    }
    return [
      { id: '1', type: 'paragraph', value: '' }
    ];
  });

  const [activeBlockId, setActiveBlockId] = useState<string>('1');
  const [activeMode, setActiveMode] = useState<'edit' | 'preview'>('edit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Backlink / Link Insertion Modal
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Inline Image Upload Input
  const inlineImageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBlockIndex, setUploadingBlockIndex] = useState<number | null>(null);

  // Auto-resize textarea references
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (titleTextareaRef.current) {
      titleTextareaRef.current.style.height = 'auto';
      titleTextareaRef.current.style.height = `${titleTextareaRef.current.scrollHeight}px`;
    }
  }, [title]);

  // Handle Cover Image Selection
  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const localPreview = URL.createObjectURL(file);
    setCoverUrl(localPreview);
  };

  const removeCover = () => {
    setCoverUrl('');
    setCoverFile(null);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  // Block Operations
  const updateBlockValue = (id: string, value: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, value } : b));
  };

  const changeBlockType = (id: string, type: ContentBlock['type']) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, type } : b));
  };

  const addBlockBelow = (index: number, type: ContentBlock['type'] = 'paragraph') => {
    const newBlock: ContentBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      value: ''
    };
    const updated = [...blocks];
    updated.splice(index + 1, 0, newBlock);
    setBlocks(updated);
    setActiveBlockId(newBlock.id);
  };

  const removeBlock = (id: string) => {
    if (blocks.length <= 1) {
      setBlocks([{ id: `block-${Date.now()}`, type: 'paragraph', value: '' }]);
      return;
    }
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  // Insert Link / Backlink into Active Block
  const openLinkModal = () => {
    setLinkText('');
    setLinkUrl('');
    setIsLinkModalOpen(true);
  };

  const handleInsertLink = () => {
    if (!linkUrl.trim()) {
      setIsLinkModalOpen(false);
      return;
    }
    const cleanUrl = linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    const displayText = linkText.trim() || cleanUrl;
    const markdownLink = `[${displayText}](${cleanUrl})`;

    setBlocks(prev => prev.map(b => {
      if (b.id === activeBlockId) {
        const separator = b.value.length > 0 && !b.value.endsWith(' ') ? ' ' : '';
        return { ...b, value: `${b.value}${separator}${markdownLink} ` };
      }
      return b;
    }));

    setIsLinkModalOpen(false);
    setLinkText('');
    setLinkUrl('');
  };

  // Upload inline image for a block
  const handleInlineImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadingBlockIndex === null) return;

    try {
      setStatusMessage('Uploading image...');
      const uploadRes = await uploadFile(file);
      const updated = [...blocks];
      updated[uploadingBlockIndex] = {
        id: updated[uploadingBlockIndex].id,
        type: 'image',
        value: uploadRes.secure_url,
        caption: file.name.replace(/\.[^/.]+$/, '')
      };
      setBlocks(updated);
      setStatusMessage(null);
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setErrorMessage('Failed to upload image. Please try again.');
    } finally {
      setUploadingBlockIndex(null);
      if (inlineImageInputRef.current) inlineImageInputRef.current.value = '';
    }
  };

  // Save / Publish Flow
  const handlePublishOrSave = async (isDraft = false) => {
    setErrorMessage(null);
    setStatusMessage(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorMessage('Please enter an article title before publishing.');
      return;
    }

    // Filter valid content blocks
    const filledBlocks = blocks.filter(b => b.value.trim().length > 0);
    if (filledBlocks.length === 0 && !isDraft) {
      setErrorMessage('Please write some content for your article.');
      return;
    }

    try {
      if (isDraft) {
        setIsSavingDraft(true);
      } else {
        setIsSubmitting(true);
      }

      // 1. Upload cover image if a new local file was selected
      let finalCoverUrl = coverUrl;
      if (coverFile) {
        setStatusMessage('Uploading cover image...');
        const uploadRes = await uploadFile(coverFile);
        finalCoverUrl = uploadRes.secure_url;
      }

      // 2. Extract quick summary for SEO
      const firstParagraph = filledBlocks.find(b => b.type === 'paragraph')?.value || cleanTitle;
      const cleanSummary = firstParagraph.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').slice(0, 180);

      // 3. Save Draft
      setStatusMessage(isDraft ? 'Saving draft...' : 'Preparing article...');
      const draftRes = await saveNewsDraft({
        postId: initialData?.postId,
        headline: cleanTitle,
        category,
        summary: cleanSummary,
        metaDescription: cleanSummary,
        tags,
        sourceUrl: sourceUrl.trim() || undefined,
        mediaUrls: finalCoverUrl || undefined,
        mediaTypes: finalCoverUrl ? 'image' : undefined,
        content: JSON.stringify(filledBlocks.length > 0 ? filledBlocks : blocks),
        status: isDraft ? 'draft' : 'published',
        selectedToleeIds: []
      });

      if (!draftRes.success || !draftRes.postId) {
        throw new Error(draftRes.error || 'Failed to save news article');
      }

      if (isDraft) {
        setStatusMessage('Draft saved successfully!');
        setTimeout(() => setStatusMessage(null), 3000);
        return;
      }

      // 4. Publish Article Live
      setStatusMessage('Publishing article to Tolee News...');
      const publishRes = await publishNews(draftRes.postId, {
        visibility: 'public',
        selectedToleeIds: []
      });

      if (!publishRes.success || !publishRes.slug) {
        throw new Error(publishRes.error || 'Failed to publish article');
      }

      // 5. Navigate to the live article
      router.push(`/news/${publishRes.slug}`);
    } catch (err: any) {
      console.error('Error in article publishing:', err);
      setErrorMessage(err.message || 'Something went wrong while publishing.');
    } finally {
      setIsSubmitting(false);
      setIsSavingDraft(false);
    }
  };

  // Helper to render text with live clickable markdown and raw links
  const renderFormattedPreview = (text: string) => {
    if (!text) return null;
    const parts = [];
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g;
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      if (match[1] && match[2]) {
        parts.push(
          <a
            key={match.index}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 dark:text-teal-400 font-semibold underline underline-offset-2 hover:text-teal-700"
          >
            {match[1]}
          </a>
        );
      } else if (match[3]) {
        parts.push(
          <a
            key={match.index}
            href={match[3]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 dark:text-teal-400 font-semibold underline underline-offset-2 hover:text-teal-700 break-all"
          >
            {match[3]}
          </a>
        );
      }
      lastIndex = linkRegex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    return parts;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0c0c0e] text-slate-900 dark:text-zinc-100 pb-28">
      
      {/* ── TOP LINKEDIN-STYLE FLOATING HEADER ── */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800/80 shadow-xs px-4 sm:px-8 py-2.5">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: User Identity & Navigation */}
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={() => router.push('/news')}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-800 transition-colors"
              title="Back to News Feed"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <Avatar className="w-9 h-9 border border-slate-200 dark:border-zinc-700">
                <AvatarImage src={user?.image || '/default-user-avatar.svg'} />
                <AvatarFallback>{user?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight line-clamp-1">
                  {user?.name || 'My Article'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                  Individual article <ChevronDown className="w-3 h-3 opacity-60" />
                </span>
              </div>
            </div>
          </div>

          {/* Center: Formatting Toolbar (LinkedIn Style) */}
          <div className="flex items-center bg-slate-100 dark:bg-zinc-800/80 rounded-2xl p-1 gap-0.5 border border-slate-200/60 dark:border-zinc-700/60">
            {/* Style Selector */}
            <div className="relative group">
              <button 
                type="button"
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 rounded-xl flex items-center gap-1 transition-colors"
              >
                Style <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              <div className="absolute left-0 mt-1 hidden group-hover:block bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl py-1.5 w-36 z-50">
                <button
                  type="button"
                  onClick={() => changeBlockType(activeBlockId, 'paragraph')}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-600 flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5" /> Normal Text
                </button>
                <button
                  type="button"
                  onClick={() => changeBlockType(activeBlockId, 'h1')}
                  className="w-full text-left px-3 py-1.5 text-xs font-extrabold hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-600 flex items-center gap-2"
                >
                  <Heading1 className="w-3.5 h-3.5" /> Heading 1
                </button>
                <button
                  type="button"
                  onClick={() => changeBlockType(activeBlockId, 'h2')}
                  className="w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-600 flex items-center gap-2"
                >
                  <Heading2 className="w-3.5 h-3.5" /> Heading 2
                </button>
                <button
                  type="button"
                  onClick={() => changeBlockType(activeBlockId, 'blockquote')}
                  className="w-full text-left px-3 py-1.5 text-xs italic hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-600 flex items-center gap-2"
                >
                  <Quote className="w-3.5 h-3.5" /> Quote
                </button>
              </div>
            </div>

            <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-700 mx-1" />

            {/* Quick Block Type Shortcuts */}
            <button
              type="button"
              onClick={() => changeBlockType(activeBlockId, 'h1')}
              className="p-1.5 text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 rounded-xl transition-colors"
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => changeBlockType(activeBlockId, 'bullet_list')}
              className="p-1.5 text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 rounded-xl transition-colors"
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => changeBlockType(activeBlockId, 'numbered_list')}
              className="p-1.5 text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 rounded-xl transition-colors"
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => changeBlockType(activeBlockId, 'blockquote')}
              className="p-1.5 text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 rounded-xl transition-colors"
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-700 mx-1" />

            {/* Insert Link / Backlink Tool */}
            <button
              type="button"
              onClick={openLinkModal}
              className="px-2 py-1 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors"
              title="Add Backlink / Hyperlink"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Link</span>
            </button>

            {/* Add Image Block */}
            <button
              type="button"
              onClick={() => {
                const newIndex = blocks.length - 1;
                setUploadingBlockIndex(newIndex + 1);
                addBlockBelow(newIndex, 'image');
                setTimeout(() => inlineImageInputRef.current?.click(), 50);
              }}
              className="p-1.5 text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 rounded-xl transition-colors"
              title="Insert Image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Mode Toggle & Publish Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveMode(prev => prev === 'edit' ? 'preview' : 'edit')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              {activeMode === 'edit' ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              <span>{activeMode === 'edit' ? 'Preview' : 'Editor'}</span>
            </button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSavingDraft || isSubmitting}
              onClick={() => handlePublishOrSave(true)}
              className="rounded-xl text-xs font-bold border-slate-300 dark:border-zinc-700 hover:bg-slate-100"
            >
              {isSavingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Save Draft
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isSubmitting || isSavingDraft}
              onClick={() => handlePublishOrSave(false)}
              className="bg-gradient-to-r from-teal-600 to-[#087A76] hover:from-teal-700 hover:to-[#06615e] text-white font-bold text-xs rounded-xl shadow-sm px-4 flex items-center gap-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>Publish Article →</>
              )}
            </Button>
          </div>

        </div>
      </header>

      {/* Hidden File Inputs */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        onChange={handleCoverSelect}
        className="hidden"
      />
      <input
        ref={inlineImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleInlineImageSelect}
        className="hidden"
      />

      {/* Feedback Messages */}
      {statusMessage && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-teal-800 dark:text-teal-300 text-xs font-semibold px-4 py-2.5 rounded-2xl flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-teal-600 animate-pulse" />
            <span>{statusMessage}</span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs font-semibold px-4 py-2.5 rounded-2xl flex items-center justify-between animate-in fade-in">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage(null)} className="p-1 hover:text-rose-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN STUDIO CANVAS (MATCHING LINKEDIN REFERENCE) ── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 pt-6 sm:pt-10">

        {activeMode === 'preview' ? (
          /* ── PREVIEW MODE ── */
          <div className="bg-white dark:bg-[#121214] rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 p-6 sm:p-12 shadow-sm space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              {category}
            </div>

            {coverUrl && (
              <div className="w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-sm max-h-[460px]">
                <img src={coverUrl} alt="Article Cover" className="w-full h-full object-cover" />
              </div>
            )}

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white leading-tight">
              {title || 'Untitled Article'}
            </h1>

            <div className="flex items-center gap-3 py-3 border-y border-slate-100 dark:border-zinc-800/60 text-xs text-slate-500 dark:text-zinc-400">
              <Avatar className="w-9 h-9">
                <AvatarImage src={user?.image || '/default-user-avatar.svg'} />
                <AvatarFallback>{user?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">{user?.name}</span>
                <span>Published on Tolee News</span>
              </div>
            </div>

            <div className="space-y-5 pt-2 text-slate-800 dark:text-zinc-200 leading-relaxed text-[16px]">
              {blocks.map((b, idx) => {
                if (b.type === 'h1') {
                  return <h2 key={idx} className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white pt-4">{b.value}</h2>;
                }
                if (b.type === 'h2') {
                  return <h3 key={idx} className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white pt-2">{b.value}</h3>;
                }
                if (b.type === 'blockquote') {
                  return (
                    <blockquote key={idx} className="border-l-4 border-teal-500 pl-4 py-1 italic bg-slate-50 dark:bg-zinc-900/50 rounded-r-xl text-slate-700 dark:text-zinc-300">
                      {renderFormattedPreview(b.value)}
                    </blockquote>
                  );
                }
                if (b.type === 'bullet_list') {
                  return (
                    <ul key={idx} className="list-disc list-inside space-y-1.5 pl-2 text-slate-800 dark:text-zinc-300">
                      {b.value.split('\n').filter(Boolean).map((item, i) => (
                        <li key={i}>{renderFormattedPreview(item.replace(/^[•*-]\s*/, ''))}</li>
                      ))}
                    </ul>
                  );
                }
                if (b.type === 'numbered_list') {
                  return (
                    <ol key={idx} className="list-decimal list-inside space-y-1.5 pl-2 text-slate-800 dark:text-zinc-300">
                      {b.value.split('\n').filter(Boolean).map((item, i) => (
                        <li key={i}>{renderFormattedPreview(item.replace(/^\d+[\.\)]\s*/, ''))}</li>
                      ))}
                    </ol>
                  );
                }
                if (b.type === 'image') {
                  return (
                    <div key={idx} className="space-y-1.5 my-4">
                      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 max-h-[400px]">
                        <img src={b.value} alt={b.caption || 'Article media'} className="w-full h-full object-cover" />
                      </div>
                      {b.caption && <p className="text-xs text-center text-slate-400 italic">{b.caption}</p>}
                    </div>
                  );
                }
                return (
                  <p key={idx} className="whitespace-pre-line text-slate-800 dark:text-zinc-200">
                    {renderFormattedPreview(b.value)}
                  </p>
                );
              })}
            </div>

            {sourceUrl && (
              <div className="pt-6 border-t border-slate-100 dark:border-zinc-800 text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Official Backlink & Source</span>
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-teal-600 dark:text-teal-400 underline font-semibold flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> {sourceUrl}
                </a>
              </div>
            )}
          </div>
        ) : (
          /* ── WRITING STUDIO (LINKEDIN STYLE) ── */
          <div className="space-y-8 bg-white dark:bg-[#121214] rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 p-6 sm:p-12 shadow-sm">
            
            {/* 1. COVER MEDIA AREA (OPTIONAL) */}
            <div>
              {coverUrl ? (
                <div className="relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-black max-h-[440px]">
                  <img src={coverUrl} alt="Cover" className="w-full h-full object-cover max-h-[440px]" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <Button 
                      type="button" 
                      size="sm" 
                      onClick={() => coverInputRef.current?.click()}
                      className="bg-white/90 hover:bg-white text-slate-900 font-bold rounded-xl text-xs flex items-center gap-1 shadow-md"
                    >
                      <ImageIcon className="w-3.5 h-3.5" /> Change cover
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="destructive"
                      onClick={removeCover}
                      className="rounded-xl text-xs font-bold flex items-center gap-1 shadow-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </Button>
                  </div>
                </div>
              ) : (
                /* LinkedIn-like cover placeholder */
                <div 
                  onClick={() => coverInputRef.current?.click()}
                  className="w-full bg-[#f3f2ef]/80 dark:bg-zinc-900/60 border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-teal-500/60 dark:hover:border-teal-500/60 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-800 shadow-sm border border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-center text-slate-400 group-hover:text-teal-600 transition-colors">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                      Add a cover image or video to your article.
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      (Optional — you can also publish without an image)
                    </p>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="mt-1 rounded-full text-xs font-bold border-slate-300 dark:border-zinc-700 pointer-events-none group-hover:border-teal-600 group-hover:text-teal-600"
                  >
                    <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Upload from computer
                  </Button>
                </div>
              )}
            </div>

            {/* 2. TITLE INPUT (LARGE, FRAMELESS) */}
            <div>
              <textarea
                ref={titleTextareaRef}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Title"
                rows={1}
                className="w-full resize-none border-none outline-none focus:ring-0 bg-transparent text-3xl sm:text-5xl font-black text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-zinc-600 leading-tight"
              />
            </div>

            {/* 3. FULL-LENGTH BODY CONTENT BLOCKS */}
            <div className="space-y-4 pt-2">
              {blocks.map((block, index) => {
                const isSelected = activeBlockId === block.id;

                return (
                  <div 
                    key={block.id}
                    onClick={() => setActiveBlockId(block.id)}
                    className={`relative group rounded-2xl transition-all ${
                      isSelected 
                        ? 'ring-2 ring-teal-500/30 bg-teal-50/10 dark:bg-teal-950/10' 
                        : 'hover:bg-slate-50/60 dark:hover:bg-zinc-900/40'
                    } p-2`}
                  >
                    {/* Block Toolbar / Controls on Hover/Focus */}
                    <div className="absolute right-2 -top-3 hidden group-hover:flex items-center gap-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-sm rounded-xl px-1.5 py-0.5 z-10">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); addBlockBelow(index, 'paragraph'); }}
                        className="p-1 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700"
                        title="Add paragraph below"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700"
                        title="Delete block"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Rendering by Block Type */}
                    {block.type === 'h1' && (
                      <input
                        type="text"
                        value={block.value}
                        onChange={e => updateBlockValue(block.id, e.target.value)}
                        placeholder="Heading 1..."
                        className="w-full bg-transparent border-none outline-none focus:ring-0 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white placeholder:text-slate-300"
                      />
                    )}

                    {block.type === 'h2' && (
                      <input
                        type="text"
                        value={block.value}
                        onChange={e => updateBlockValue(block.id, e.target.value)}
                        placeholder="Heading 2..."
                        className="w-full bg-transparent border-none outline-none focus:ring-0 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white placeholder:text-slate-300"
                      />
                    )}

                    {block.type === 'blockquote' && (
                      <div className="flex gap-2">
                        <div className="w-1 bg-teal-500 rounded-full shrink-0" />
                        <textarea
                          value={block.value}
                          onChange={e => updateBlockValue(block.id, e.target.value)}
                          placeholder="Quote text..."
                          rows={2}
                          className="w-full resize-none italic bg-transparent border-none outline-none focus:ring-0 text-slate-700 dark:text-zinc-300 placeholder:text-slate-300 text-[15px]"
                        />
                      </div>
                    )}

                    {block.type === 'bullet_list' && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block">Bullet List (One item per line)</span>
                        <textarea
                          value={block.value}
                          onChange={e => updateBlockValue(block.id, e.target.value)}
                          placeholder="• First point&#10;• Second point&#10;• Third point"
                          rows={3}
                          className="w-full resize-none bg-transparent border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-sm focus:ring-1 focus:ring-teal-500 text-slate-800 dark:text-zinc-200"
                        />
                      </div>
                    )}

                    {block.type === 'numbered_list' && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block">Numbered List (One item per line)</span>
                        <textarea
                          value={block.value}
                          onChange={e => updateBlockValue(block.id, e.target.value)}
                          placeholder="1. Step one&#10;2. Step two&#10;3. Step three"
                          rows={3}
                          className="w-full resize-none bg-transparent border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-sm focus:ring-1 focus:ring-teal-500 text-slate-800 dark:text-zinc-200"
                        />
                      </div>
                    )}

                    {block.type === 'image' && (
                      <div className="space-y-2">
                        {block.value ? (
                          <div className="relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 max-h-[380px]">
                            <img src={block.value} alt="Inline article image" className="w-full h-full object-cover" />
                            <Button 
                              type="button" 
                              size="sm" 
                              variant="destructive"
                              onClick={() => removeBlock(block.id)}
                              className="absolute top-2 right-2 rounded-xl text-xs font-bold"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Image
                            </Button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => {
                              setUploadingBlockIndex(index);
                              inlineImageInputRef.current?.click();
                            }}
                            className="p-6 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl text-center cursor-pointer hover:border-teal-500"
                          >
                            <ImageIcon className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                            <span className="text-xs font-bold text-slate-600 dark:text-zinc-300">Click to upload inline image</span>
                          </div>
                        )}
                        <input
                          type="text"
                          value={block.caption || ''}
                          onChange={e => {
                            const updated = [...blocks];
                            updated[index] = { ...updated[index], caption: e.target.value };
                            setBlocks(updated);
                          }}
                          placeholder="Add image caption / credit (optional)..."
                          className="w-full text-xs text-center bg-transparent border-none outline-none text-slate-400 placeholder:text-slate-300 italic"
                        />
                      </div>
                    )}

                    {block.type === 'paragraph' && (
                      <textarea
                        value={block.value}
                        onChange={e => updateBlockValue(block.id, e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            addBlockBelow(index, 'paragraph');
                          }
                        }}
                        placeholder={index === 0 ? "Write here. You can also paste backlinks, add @mentions, or use formatting tools above..." : "Type text..."}
                        rows={Math.max(2, block.value.split('\n').length)}
                        className="w-full resize-none bg-transparent border-none outline-none focus:ring-0 text-[16px] text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 leading-relaxed"
                      />
                    )}
                  </div>
                );
              })}

              {/* Bottom Quick-Add Bar */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addBlockBelow(blocks.length - 1, 'paragraph')}
                  className="rounded-full text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-1 border border-slate-200 dark:border-zinc-800"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Paragraph
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addBlockBelow(blocks.length - 1, 'h2')}
                  className="rounded-full text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-1 border border-slate-200 dark:border-zinc-800"
                >
                  <Heading2 className="w-3.5 h-3.5" /> Add Subheading
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addBlockBelow(blocks.length - 1, 'bullet_list')}
                  className="rounded-full text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-1 border border-slate-200 dark:border-zinc-800"
                >
                  <List className="w-3.5 h-3.5" /> Add Bullet Points
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={openLinkModal}
                  className="rounded-full text-xs font-bold text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 flex items-center gap-1 border border-teal-200 dark:border-teal-800/60"
                >
                  <LinkIcon className="w-3.5 h-3.5" /> Insert Backlink
                </Button>
              </div>
            </div>

            {/* 4. ARTICLE SEO & BACKLINK SETTINGS */}
            <div className="pt-8 border-t border-slate-200/80 dark:border-zinc-800/80 space-y-4">
              <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                Article Settings & Backlinks
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Article Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Keywords & Tags (comma separated)</label>
                  <Input
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder="e.g. AI, Startup, Social Media, Growth"
                    className="text-xs rounded-xl border-slate-200 dark:border-zinc-800"
                  />
                </div>
              </div>

              {/* Source Link / Website Backlink */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-teal-600" /> External Source / Canonical Backlink (Optional)
                </label>
                <Input
                  value={sourceUrl}
                  onChange={e => setSourceUrl(e.target.value)}
                  placeholder="https://yourwebsite.com/original-article"
                  className="text-xs rounded-xl border-slate-200 dark:border-zinc-800"
                />
                <p className="text-[10px] text-slate-400">
                  Provide your target website or company URL to receive official backlink attribution in the article footer.
                </p>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ── BACKLINK / LINK INSERTION MODAL ── */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-teal-600">
                <LinkIcon className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Insert Backlink / Hyperlink</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsLinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Add a clickable link to your content. Readers can click this link to visit your website or blog.
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Anchor Text (Display Text)</label>
                <Input
                  value={linkText}
                  onChange={e => setLinkText(e.target.value)}
                  placeholder="e.g. Visit My Website or Check Out Tolee"
                  className="text-xs rounded-xl"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Web Address / URL *</label>
                <Input
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsLinkModalOpen(false)}
                className="rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleInsertLink}
                disabled={!linkUrl.trim()}
                className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold"
              >
                Insert Link
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
