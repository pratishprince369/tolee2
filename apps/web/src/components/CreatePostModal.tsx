'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Image as ImageIcon, Video, Paperclip, CheckCircle2, ShieldCheck, Globe, Trophy, X, Sparkles, Newspaper, ChevronDown } from 'lucide-react';

import { getSidebarData } from '@/actions/user';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AIImageGeneratorModal } from '@/components/AIImageGeneratorModal';
import { AIVideoGeneratorModal } from '@/components/AIVideoGeneratorModal';
import { useUpload } from './UploadContext';
import { askAIWriter } from '@/actions/ai-helper';

export function CreatePostModal({ 
  children, 
  onPost, 
  videoOnly = false, 
  toleeId, 
  toleeName, 
  toleeSlug,
  defaultTab = 'regular'
}: { 
  children: React.ReactNode, 
  onPost?: (post: any, postData?: any) => void, 
  videoOnly?: boolean, 
  toleeId?: string, 
  toleeName?: string, 
  toleeSlug?: string,
  defaultTab?: string
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [postType, setPostType] = useState(defaultTab || 'regular'); // regular, win, news
  
  // Basic states
  const [content, setContent] = useState('');
  const [selectedTolees, setSelectedTolees] = useState<string[]>(toleeId ? [toleeId] : []);
  const [mediaList, setMediaList] = useState<{ type: 'image' | 'video'; url: string; file?: File }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [joinedTolees, setJoinedTolees] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { startUpload, task } = useUpload();

  // News composer states
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('General News');
  const [seoMetaDesc, setSeoMetaDesc] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [seoTags, setSeoTags] = useState('');
  const [showSeoSettings, setShowSeoSettings] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);

  const isUploading = task.state === 'uploading' || task.state === 'processing';

  const handleAIImageSelected = (url: string) => {
    setMediaList(prev => [...prev, { type: 'image', url }]);
  };

  const handleAIVideoSelected = (url: string) => {
    setMediaList(prev => [...prev, { type: 'video', url }]);
  };

  // Sync tab open state
  useEffect(() => {
    if (isOpen) {
      getSidebarData().then(res => {
        if (res.success) {
          const allTolees = [...(res.managedTolees || []), ...(res.joinedTolees || [])];
          setJoinedTolees(allTolees);
          if (selectedTolees.length === 0 && allTolees.length > 0) {
            setSelectedTolees(toleeId ? [toleeId] : [allTolees[0].id]);
          }
        }
      });
      setPostType(defaultTab || 'regular');
    }
  }, [isOpen, defaultTab]);

  const toggleTolee = (id: string) => {
    setSelectedTolees(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedTolees.length === joinedTolees.length) {
      setSelectedTolees([]);
    } else {
      setSelectedTolees(joinedTolees.map(t => t.id));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newItems: typeof mediaList = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = URL.createObjectURL(file);
        const fileType = file.type.startsWith('video/') ? 'video' : 'image';
        newItems.push({ type: fileType, url, file });
      }
      setMediaList(prev => [...prev, ...newItems]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const newItems: typeof mediaList = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = URL.createObjectURL(file);
        const fileType = file.type.startsWith('video/') ? 'video' : 'image';
        newItems.push({ type: fileType, url, file });
      }
      setMediaList(prev => [...prev, ...newItems]);
    }
  };

  // AI assistant handlers
  const runAIAssistance = async (actionType: 'headline' | 'summary' | 'content' | 'seo') => {
    setIsGeneratingAI(true);
    let prompt = '';
    const contextText = `Headline: ${headline}\nSummary: ${summary}\nContent: ${content}`;

    if (actionType === 'headline') {
      prompt = `Suggest a catchy, professional news headline based on this content:\n\n${content || summary}`;
    } else if (actionType === 'summary') {
      prompt = `Write a 1-sentence engaging summary hook for a news article with headline: "${headline}" and content:\n\n${content}`;
    } else if (actionType === 'content') {
      prompt = `Refine, improve, and expand this draft news article content to make it more informative and ready to publish:\n\n${content}`;
    } else if (actionType === 'seo') {
      prompt = `Based on this news headline: "${headline}" and content: "${content}", output a JSON strictly matching format: {"metaDescription": "Concise summary", "keywords": "kw1, kw2", "tags": "tag1, tag2"}. Output only JSON, no markdown.`;
    }

    try {
      const res = await askAIWriter(prompt, contextText);
      if (res.success && res.text) {
        if (actionType === 'headline') {
          setHeadline(res.text.replace(/["']/g, '').trim());
        } else if (actionType === 'summary') {
          setSummary(res.text.replace(/["']/g, '').trim());
        } else if (actionType === 'content') {
          setContent(res.text);
        } else if (actionType === 'seo') {
          try {
            const cleanText = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanText);
            if (parsed.metaDescription) setSeoMetaDesc(parsed.metaDescription);
            if (parsed.keywords) setSeoKeywords(parsed.keywords);
            if (parsed.tags) setSeoTags(parsed.tags);
          } catch (e) {
            setSeoMetaDesc(res.text.slice(0, 150));
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handlePost = async () => {
    if (onPost && isPostReady) {
      const firstSelectedTolee = joinedTolees.find(t => t.id === selectedTolees[0]);
      
      const postData = {
        content,
        postType,
        toleeName: selectedTolees.length === 1 ? firstSelectedTolee?.name : `${selectedTolees.length} Tolees`,
        toleeSlug: selectedTolees.length === 1 ? firstSelectedTolee?.slug : 'multiple',
        selectedToleeIds: selectedTolees,
        // Optional news meta data
        ...(postType === 'news' ? {
          headline,
          summary,
          category,
          metaDescription: seoMetaDesc,
          keywords: seoKeywords,
          tags: seoTags,
        } : {})
      };

      // Start global upload & creation task
      startUpload(
        mediaList,
        postData,
        videoOnly ? 'reel' : 'feed',
        onPost
      );

      // Instantly reset modal form and close it
      setContent('');
      setHeadline('');
      setSummary('');
      setSeoMetaDesc('');
      setSeoKeywords('');
      setSeoTags('');
      setMediaList([]);
      setSelectedTolees(toleeId ? [toleeId] : []);
      setIsOpen(false);
    }
  };

  const isPostReady = postType === 'news'
    ? (headline.trim().length > 0 && content.trim().length > 0 && selectedTolees.length > 0)
    : (content.trim().length > 0 && selectedTolees.length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="sm:max-w-[550px] p-0 bg-white dark:bg-[#121212] overflow-y-auto max-h-[78vh] sm:max-h-[82vh] rounded-2xl border-gray-200 dark:border-gray-800 relative"
      >
        {/* Drag & drop overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-[#0a7c85]/10 dark:bg-[#0a7c85]/20 backdrop-blur-xs flex items-center justify-center border-2 border-dashed border-[#0a7c85] rounded-2xl z-50 pointer-events-none">
            <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl shadow-md text-center">
              <Paperclip className="w-8 h-8 text-[#0a7c85] mx-auto animate-bounce mb-2" />
              <p className="text-xs font-bold">Drop files here to attach to post</p>
            </div>
          </div>
        )}

        {/* Header */}
        <DialogHeader className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-bold">{videoOnly ? 'Upload Reel' : 'Create Post'}</DialogTitle>
          {!videoOnly && (
            <div className="flex bg-gray-100 dark:bg-gray-900 rounded-full p-1 border border-gray-200 dark:border-gray-800 select-none">
              <button 
                type="button"
                onClick={() => setPostType('regular')}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${postType === 'regular' ? 'bg-white dark:bg-black shadow-sm text-[#0a7c85]' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Post
              </button>
              <button 
                type="button"
                onClick={() => setPostType('win')}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-1 ${postType === 'win' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Trophy className="w-4 h-4" /> Win
              </button>
              <button 
                type="button"
                onClick={() => setPostType('news')}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-1 ${postType === 'news' ? 'bg-[#e6f4f5] dark:bg-[#0a7c85]/20 text-[#0a7c85] shadow-sm' : 'text-gray-500 hover:text-[#0a7c85]'}`}
              >
                <Newspaper className="w-4 h-4" /> News
              </button>
            </div>
          )}
        </DialogHeader>

        {/* User Info */}
        <div className="p-4 flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={session?.user?.image || '/default-user-avatar.svg'} />
            <AvatarFallback>{session?.user?.name?.[0] || 'ME'}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">{session?.user?.name || 'Anonymous User'}</h3>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Globe className="w-3 h-3 text-[#0a7c85]" /> Visible to {selectedTolees.length} selected Tolees
            </span>
          </div>
        </div>

        {/* Form Inputs based on Post Type */}
        <div className="px-4 pb-4 space-y-4">
          {postType === 'news' ? (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">News Headline *</label>
                  <Input 
                    placeholder="Enter headline..." 
                    value={headline} 
                    onChange={e => setHeadline(e.target.value)} 
                    className="font-bold text-sm border-gray-200 dark:border-zinc-800 focus-visible:ring-[#0a7c85] rounded-xl"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    <button 
                      type="button" 
                      onClick={() => runAIAssistance('headline')}
                      disabled={isGeneratingAI}
                      className="text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 px-1.5 py-0.5 rounded border border-purple-100 flex items-center gap-0.5"
                    >
                      <Sparkles className="w-2.5 h-2.5" /> AI Headline
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">Category</label>
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)} 
                    className="w-full h-10 border border-gray-200 dark:border-zinc-800 bg-transparent rounded-xl px-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0a7c85] dark:text-zinc-300"
                  >
                    <option value="General News" className="dark:bg-[#121212]">General News</option>
                    <option value="Local News" className="dark:bg-[#121212]">Local News</option>
                    <option value="Business" className="dark:bg-[#121212]">Business</option>
                    <option value="Real Estate" className="dark:bg-[#121212]">Real Estate</option>
                    <option value="Technology" className="dark:bg-[#121212]">Technology</option>
                    <option value="Sports" className="dark:bg-[#121212]">Sports</option>
                    <option value="Politics" className="dark:bg-[#121212]">Politics</option>
                    <option value="Education" className="dark:bg-[#121212]">Education</option>
                    <option value="Travel" className="dark:bg-[#121212]">Travel</option>
                    <option value="Entertainment" className="dark:bg-[#121212]">Entertainment</option>
                    <option value="Lifestyle" className="dark:bg-[#121212]">Lifestyle</option>
                    <option value="Jobs" className="dark:bg-[#121212]">Jobs</option>
                    <option value="Opinion" className="dark:bg-[#121212]">Opinion</option>
                    <option value="Press Release" className="dark:bg-[#121212]">Press Release</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">Short Summary</label>
                  <button 
                    type="button"
                    onClick={() => runAIAssistance('summary')}
                    disabled={isGeneratingAI}
                    className="text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 px-1.5 py-0.5 rounded border border-purple-100 flex items-center gap-0.5"
                  >
                    <Sparkles className="w-2.5 h-2.5" /> Auto Summarize
                  </button>
                </div>
                <textarea 
                  placeholder="Summarize the core of the news article..." 
                  value={summary} 
                  onChange={e => setSummary(e.target.value)} 
                  className="w-full h-11 bg-transparent border border-gray-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-1 focus:ring-[#0a7c85] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">Full Article Content *</label>
                  <button 
                    type="button"
                    onClick={() => runAIAssistance('content')}
                    disabled={isGeneratingAI}
                    className="text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 px-1.5 py-0.5 rounded border border-purple-100 flex items-center gap-0.5"
                  >
                    <Sparkles className="w-2.5 h-2.5" /> Polish content
                  </button>
                </div>
                <textarea 
                  placeholder="Write full news article details..." 
                  value={content} 
                  onChange={e => setContent(e.target.value)} 
                  className="w-full min-h-[120px] bg-transparent border border-gray-200 dark:border-zinc-800 rounded-xl p-3 text-xs sm:text-sm focus:ring-1 focus:ring-[#0a7c85] focus:outline-none"
                />
              </div>

              {/* Collapsable SEO block */}
              <div className="border border-gray-150 dark:border-zinc-900 rounded-xl overflow-hidden">
                <button 
                  type="button" 
                  onClick={() => setShowSeoSettings(!showSeoSettings)}
                  className="w-full bg-gray-50 dark:bg-zinc-900/50 p-2.5 text-[10.5px] font-bold text-gray-600 dark:text-zinc-400 flex items-center justify-between"
                >
                  <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-purple-500" /> SEO Meta Options (AI Suggest)</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showSeoSettings ? 'rotate-180' : ''}`} />
                </button>
                
                {showSeoSettings && (
                  <div className="p-3 space-y-3 bg-white dark:bg-[#121212] border-t border-gray-100 dark:border-zinc-900">
                    <div className="flex justify-end">
                      <button 
                        type="button"
                        onClick={() => runAIAssistance('seo')}
                        disabled={isGeneratingAI}
                        className="text-[9px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100"
                      >
                        Generate Meta info
                      </button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide block">Meta Description</label>
                      <Input value={seoMetaDesc} onChange={e => setSeoMetaDesc(e.target.value)} placeholder="Search snippet text..." className="text-xs focus-visible:ring-[#0a7c85]" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide block">Keywords</label>
                        <Input value={seoKeywords} onChange={e => setSeoKeywords(e.target.value)} placeholder="e.g. news, update" className="text-xs focus-visible:ring-[#0a7c85]" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide block">Tags</label>
                        <Input value={seoTags} onChange={e => setSeoTags(e.target.value)} placeholder="e.g. india, local" className="text-xs focus-visible:ring-[#0a7c85]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <textarea
              placeholder={postType === 'win' ? "Share your recent win with the community! 🚀" : "What do you want to share?"}
              className="w-full min-h-[100px] bg-transparent border-none focus:ring-0 resize-none text-[17px] text-gray-900 dark:text-white placeholder:text-gray-400"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          )}
        </div>

        {/* Media Preview Grid */}
        {mediaList.length > 0 && (
          <div className="px-4 pb-4">
            <label className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-2">Attached Media ({mediaList.length})</label>
            <div className="grid grid-cols-3 gap-2">
              {mediaList.map((item, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-black border border-gray-200 dark:border-gray-800 group/thumb shadow-sm">
                  <button 
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setMediaList(prev => prev.filter((_, i) => i !== idx)); 
                    }} 
                    className="absolute top-1.5 right-1.5 z-10 bg-black/60 hover:bg-black/85 text-white rounded-full p-1 backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-90"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {item.type === 'image' ? (
                    <img src={item.url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                  ) : (
                    <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                  )}
                  <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-md rounded px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                    {idx + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Media / AI Image Button Section */}
        <div className="px-4 py-2 border-t border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <span className="text-sm font-medium text-gray-500">Upload Media</span>
          <div className="flex gap-2 items-center">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              multiple
            />
            {!videoOnly && (
              <>
                <Button 
                  type="button"
                  onClick={() => setAiModalOpen(true)} 
                  variant="ghost" 
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl h-9 px-2.5 font-bold text-xs flex items-center gap-1 border border-purple-200/60 dark:border-purple-800/50 bg-purple-50/30 dark:bg-purple-950/20 mr-1 shadow-sm transition-transform duration-200 hover:scale-[1.02]"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-purple-600/10" />
                  <span>AI Image</span>
                </Button>
              </>
            )}
            {!videoOnly && (
              <Button onClick={() => triggerFileInput('image/*')} variant="ghost" size="icon" className="text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded-full h-10 w-10">
                <ImageIcon className="w-6 h-6" />
              </Button>
            )}
            <Button onClick={() => triggerFileInput('video/*')} variant="ghost" size="icon" className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-full h-10 w-10">
              <Video className="w-6 h-6" />
            </Button>
            {!videoOnly && (
              <Button onClick={() => triggerFileInput('*/*')} variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full h-10 w-10">
                <Paperclip className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Target Tolees Section */}
        <div className="p-4 bg-gray-50 dark:bg-[#1a1a1a]">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">
              Post to these Tolees <span className="text-red-500">*</span>
            </h4>
            {joinedTolees.length > 0 && (
              <button 
                onClick={selectAll}
                className="text-xs font-bold text-[#0a7c85] hover:underline"
              >
                {selectedTolees.length === joinedTolees.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
          
          <div className="space-y-2 max-h-[130px] overflow-y-auto pr-2">
            {joinedTolees.map((tolee) => (
              <div 
                key={tolee.id}
                onClick={() => toggleTolee(tolee.id)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedTolees.includes(tolee.id) 
                    ? 'border-[#0a7c85] bg-[#0a7c85]/5 dark:bg-[#0a7c85]/10' 
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212] hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-gray-250 dark:bg-gray-800 flex items-center justify-center font-bold text-xs">
                    {tolee.name.charAt(0)}
                  </div>
                  <div>
                    <h5 className="font-semibold text-sm">{tolee.name}</h5>
                    {tolee.isPrivate && (
                      <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <ShieldCheck className="w-3 h-3" /> Private Group
                      </span>
                    )}
                  </div>
                </div>
                
                {selectedTolees.includes(tolee.id) ? (
                  <CheckCircle2 className="w-6 h-6 text-[#0a7c85]" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-700" />
                )}
              </div>
            ))}
          </div>
          
          {selectedTolees.length === 0 && (
            <p className="text-xs text-red-500 mt-2 font-medium">Please select at least one Tolee.</p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white dark:bg-[#121212] border-t border-gray-100 dark:border-gray-800 flex gap-2">
          {postType === 'news' && (
            <Button 
              variant="outline"
              className="flex-1 h-12 text-sm font-bold rounded-xl text-gray-700 hover:text-gray-900 border-gray-200 dark:border-zinc-800"
              disabled={!isPostReady || isUploading}
              onClick={async () => {
                const firstSelectedTolee = joinedTolees.find(t => t.id === selectedTolees[0]);
                const postData = {
                  content,
                  postType: 'news',
                  status: 'draft',
                  toleeName: selectedTolees.length === 1 ? firstSelectedTolee?.name : `${selectedTolees.length} Tolees`,
                  toleeSlug: selectedTolees.length === 1 ? firstSelectedTolee?.slug : 'multiple',
                  selectedToleeIds: selectedTolees,
                  headline,
                  summary,
                  category,
                  metaDescription: seoMetaDesc,
                  keywords: seoKeywords,
                  tags: seoTags,
                };
                startUpload(mediaList, postData, 'feed', onPost);
                setContent('');
                setHeadline('');
                setSummary('');
                setSeoMetaDesc('');
                setSeoKeywords('');
                setSeoTags('');
                setMediaList([]);
                setIsOpen(false);
              }}
            >
              Save Draft
            </Button>
          )}
          <Button 
            className="flex-grow h-12 text-sm font-extrabold rounded-xl bg-[#0a7c85] hover:bg-[#086971] text-white"
            disabled={!isPostReady || isUploading}
            onClick={handlePost}
          >
            {isUploading ? 'Uploading...' : postType === 'news' ? 'Publish News' : `Post to ${selectedTolees.length > 0 ? `${selectedTolees.length} Tolees` : 'Tolee'}`}
          </Button>
        </div>

        {/* AI Modals */}
        <AIImageGeneratorModal
          isOpen={aiModalOpen}
          setIsOpen={setAiModalOpen}
          onSelectImage={handleAIImageSelected}
        />
        <AIVideoGeneratorModal
          isOpen={videoModalOpen}
          setIsOpen={setVideoModalOpen}
          onSelectVideo={handleAIVideoSelected}
        />
      </DialogContent>
    </Dialog>
  );
}
