'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ArrowLeft, Save, Sparkles, AlertCircle, CheckCircle, ChevronDown, Plus, Trash2, 
  Settings, Eye, FileText, BarChart2, Globe, MapPin, Tags, Link as LinkIcon, 
  HelpCircle, Lightbulb, Heading, AlignLeft, Quote, List, Film, CheckSquare, MessageSquare, Info
} from 'lucide-react';
import { saveNewsDraft, publishNews } from '@/actions/news';
import { askAIWriter } from '@/actions/ai-helper';
import { getSidebarData } from '@/actions/user';

interface Block {
  id: string;
  type: 'paragraph' | 'h1' | 'h2' | 'blockquote' | 'bullet_list' | 'numbered_list' | 'callout' | 'faq' | 'youtube';
  value: any; // text or object based on type
}

export function NewsEditor({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const [postId, setPostId] = useState<string | undefined>(initialData?.postId || undefined);
  const [headline, setHeadline] = useState(initialData?.headline || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [summary, setSummary] = useState(initialData?.summary || '');
  const [metaDesc, setMetaDesc] = useState(initialData?.metaDescription || '');
  const [keywords, setKeywords] = useState(initialData?.keywords || '');
  const [tags, setTags] = useState(initialData?.tags || '');
  const [category, setCategory] = useState(initialData?.category || 'General');
  const [subcategory, setSubcategory] = useState(initialData?.subcategory || '');
  const [language, setLanguage] = useState(initialData?.language || 'English');
  const [state, setState] = useState(initialData?.state || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [coverImage, setCoverImage] = useState(initialData?.post?.mediaUrls || '');
  const [coverCaption, setCoverCaption] = useState(initialData?.coverCaption || '');
  const [imageCredit, setImageCredit] = useState(initialData?.imageCredit || '');
  const [sourceUrl, setSourceUrl] = useState(initialData?.sourceUrl || '');
  const [externalRef, setExternalRef] = useState(initialData?.externalRef || '');
  const [visibility, setVisibility] = useState(initialData?.post?.visibility || 'public');

  // Blocks Content State
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (initialData?.content) {
      try {
        return JSON.parse(initialData.content);
      } catch (e) {
        console.warn('Failed to parse content blocks:', e);
      }
    }
    return [
      { id: '1', type: 'paragraph', value: 'Start writing your news article here...' }
    ];
  });

  // Tolee list
  const [joinedTolees, setJoinedTolees] = useState<any[]>([]);
  const [selectedToleeIds, setSelectedToleeIds] = useState<string[]>(
    initialData?.post?.tolees?.map((t: any) => t.toleeId) || []
  );

  // States
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'write' | 'seo' | 'publish'>('write');

  // Load user's Tolees (groups)
  useEffect(() => {
    getSidebarData().then(res => {
      if (res.success) {
        const allTolees = [...(res.managedTolees || []), ...(res.joinedTolees || [])];
        setJoinedTolees(allTolees);
        if (selectedToleeIds.length === 0 && allTolees.length > 0) {
          setSelectedToleeIds([allTolees[0].id]);
        }
      }
    });
  }, []);

  // Real-time Slug Generation
  useEffect(() => {
    if (!initialData?.slug && headline) {
      const generated = headline.toLowerCase().trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated);
    }
  }, [headline]);

  // Auto-Save Draft every 10 seconds if dirty
  const isDirty = useRef(false);
  useEffect(() => {
    isDirty.current = true;
  }, [headline, slug, summary, metaDesc, keywords, tags, category, subcategory, language, state, city, coverImage, coverCaption, imageCredit, sourceUrl, externalRef, blocks, selectedToleeIds]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirty.current && headline.trim().length > 0) {
        triggerAutoSave();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [headline, slug, summary, metaDesc, keywords, tags, category, subcategory, language, state, city, coverImage, coverCaption, imageCredit, sourceUrl, externalRef, blocks, selectedToleeIds]);

  const triggerAutoSave = async () => {
    setSaveStatus('saving');
    const res = await saveNewsDraft({
      postId,
      headline,
      slug,
      summary,
      metaDescription: metaDesc,
      keywords,
      tags,
      category,
      subcategory,
      language,
      state,
      city,
      coverCaption,
      imageCredit,
      sourceUrl,
      externalRef,
      content: JSON.stringify(blocks),
      mediaUrls: coverImage || undefined,
      selectedToleeIds
    });

    if (res.success) {
      setPostId(res.postId);
      setSaveStatus('saved');
      isDirty.current = false;
    } else {
      setSaveStatus('error');
    }
  };

  // Publish News
  const [publishing, setPublishing] = useState(false);
  const [pubError, setPubError] = useState('');
  const handlePublish = async () => {
    setPubError('');
    if (!headline.trim()) {
      setPubError('Headline is required to publish.');
      return;
    }
    if (selectedToleeIds.length === 0) {
      setPubError('Select at least one Tolee (group) to publish to.');
      return;
    }

    setPublishing(true);
    // 1. Ensure latest draft is saved first
    await triggerAutoSave();

    // 2. Publish
    const res = await publishNews(postId!, {
      visibility,
      selectedToleeIds
    });

    setPublishing(false);
    if (res.success) {
      router.push(`/news/${res.slug}`);
    } else {
      setPubError(res.error || 'Failed to publish.');
    }
  };

  // Content Blocks Helpers
  const addBlock = (type: Block['type']) => {
    let value: any = '';
    if (type === 'bullet_list' || type === 'numbered_list') {
      value = ['First item'];
    } else if (type === 'faq') {
      value = { question: 'Question example?', answer: 'Answer details go here...' };
    } else if (type === 'youtube') {
      value = ''; // YouTube URL
    } else if (type === 'callout') {
      value = 'Callout alert warning/info text...';
    }
    const newBlock: Block = {
      id: Math.random().toString(),
      type,
      value
    };
    setBlocks(prev => [...prev, newBlock]);
  };

  const updateBlockValue = (id: string, value: any) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, value } : b));
  };

  const deleteBlock = (id: string) => {
    if (blocks.length > 1) {
      setBlocks(prev => prev.filter(b => b.id !== id));
    }
  };

  // AI Assistant trigger
  const runAICommand = async (type: string) => {
    setAiLoading(true);
    setAiResult('');
    let prompt = '';
    const docText = `Headline: ${headline}\nSummary: ${summary}\nContent:\n${blocks.map(b => typeof b.value === 'string' ? b.value : JSON.stringify(b.value)).join('\n')}`;

    if (type === 'headline') {
      prompt = `Generate 5 alternative premium and highly engaging headlines for this news article.`;
    } else if (type === 'improve') {
      prompt = `Rewrite and polish this news headline to make it more catchy, clear, and professional: "${headline}"`;
    } else if (type === 'faq') {
      prompt = `Generate a structured FAQ block (Frequently Asked Questions and answers) related to this article topic.`;
    } else if (type === 'summary') {
      prompt = `Provide a concise meta summary for this article (max 150 characters) optimized for Google and Gemini.`;
    } else if (type === 'keywords') {
      prompt = `Provide 8 comma-separated high-traffic keywords and hashtags for this content.`;
    } else {
      prompt = aiPrompt;
    }

    const res = await askAIWriter(prompt, docText);
    setAiLoading(false);
    if (res.success && res.text) {
      setAiResult(res.text);
    } else {
      setAiResult(res.error || 'AI generation failed.');
    }
  };

  // Real-Time SEO, AEO, and GEO Analyzer
  const analyzeMetrics = () => {
    const errors: string[] = [];
    const passes: string[] = [];
    let seo = 60;
    let aeo = 50;
    let geo = 50;

    // Headline check
    if (headline.length >= 40 && headline.length <= 70) {
      passes.push('Headline length is optimal (40-70 characters).');
      seo += 15;
    } else {
      errors.push('Headline is too short or too long. Aim for 40-70 characters.');
      seo -= 10;
    }

    // Slug check
    if (slug.includes('-')) {
      passes.push('URL Slug has structured hyphens.');
    } else {
      errors.push('Ensure URL Slug contains hyphens instead of spaces.');
    }

    // Cover Image check
    if (coverImage) {
      passes.push('Featured cover image added.');
      seo += 10;
    } else {
      errors.push('Add a cover image. Articles with cover images rank 40% higher.');
      seo -= 10;
    }

    // Word count check
    const wordCount = blocks.reduce((acc, b) => {
      if (typeof b.value === 'string') return acc + b.value.split(/\s+/).length;
      return acc;
    }, 0);

    if (wordCount > 500) {
      passes.push(`Authoritative word count (${wordCount} words).`);
      seo += 15;
      aeo += 15;
    } else {
      errors.push(`Currently at ${wordCount} words. Extend content past 500 words for ranking.`);
      seo -= 10;
    }

    // FAQ Block check (AEO)
    const hasFaq = blocks.some(b => b.type === 'faq');
    if (hasFaq) {
      passes.push('FAQ section present. Optimized for Gemini & Perplexity featured snippets.');
      aeo += 25;
      geo += 20;
    } else {
      errors.push('Add an FAQ block at the bottom to rank in AI answer snippets (AEO).');
      aeo -= 15;
    }

    // Callout box presence (GEO)
    const hasCallout = blocks.some(b => b.type === 'callout');
    if (hasCallout) {
      passes.push('Key callout box present. Optimizes summary generation for Perplexity.');
      geo += 20;
    } else {
      errors.push('Add a callout box to highlight key highlights/insights for LLM models (GEO).');
    }

    return {
      seoScore: Math.min(100, Math.max(10, seo)),
      aeoScore: Math.min(100, Math.max(10, aeo)),
      geoScore: Math.min(100, Math.max(10, geo)),
      errors,
      passes
    };
  };

  const metrics = analyzeMetrics();

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#0a0a0a] pb-20">
      {/* Editor Top Bar */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md border-b border-gray-150 dark:border-zinc-900 px-4 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-extrabold text-[16px] sm:text-[18px] text-gray-900 dark:text-white leading-tight">
                Tolee News Editor
              </h1>
              <Badge variant="outline" className="text-[10px] font-bold bg-[#e6f4f5] text-[#0a7c85] border-[#0a7c85]/20 dark:bg-[#0a7c85]/10 dark:text-[#0a7c85]/90 rounded-md py-0 px-1.5">Beta</Badge>
            </div>
            <p className="text-[10.5px] text-gray-400 mt-0.5">
              {saveStatus === 'saving' && 'Saving draft...'}
              {saveStatus === 'saved' && 'Draft saved in cloud'}
              {saveStatus === 'error' && 'Save error! Check network'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-1.5 rounded-xl text-gray-700 hover:text-gray-900" onClick={triggerAutoSave}>
            <Save className="w-4 h-4" /> Save
          </Button>
          
          <Button size="sm" className="bg-[#0a7c85] hover:bg-[#086971] text-white font-extrabold rounded-xl px-4 flex items-center gap-1.5 shadow-sm shadow-[#0a7c85]/10" onClick={() => setActiveTab('publish')}>
            <Globe className="w-4 h-4" /> Publish
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setAiPanelOpen(true)} className="bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-950/20 dark:text-purple-400 rounded-full h-9 w-9">
            <Sparkles className="w-4.5 h-4.5" />
          </Button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Editor Main Content Area */}
        <div className="lg:col-span-8 space-y-6">
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
            <div className="flex justify-between items-center bg-white dark:bg-[#121212] p-1 border border-gray-150 dark:border-zinc-900 rounded-xl shadow-xs mb-6 overflow-x-auto">
              <TabsList className="bg-transparent border-none flex w-full justify-start sm:justify-between">
                <TabsTrigger value="write" className="flex items-center gap-1.5 px-4 py-2 font-bold text-xs sm:text-sm rounded-lg data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-zinc-800"><FileText className="w-4 h-4" /> Write</TabsTrigger>
                <TabsTrigger value="seo" className="flex items-center gap-1.5 px-4 py-2 font-bold text-xs sm:text-sm rounded-lg data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-zinc-800"><BarChart2 className="w-4 h-4" /> SEO & Analytics</TabsTrigger>
                <TabsTrigger value="publish" className="flex items-center gap-1.5 px-4 py-2 font-bold text-xs sm:text-sm rounded-lg data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-zinc-800"><Globe className="w-4 h-4" /> Go Live</TabsTrigger>
              </TabsList>
            </div>

            {/* Write Content Tab */}
            <TabsContent value="write" className="space-y-6 outline-none">
              
              {/* Card 1: Basic Info & Metadata */}
              <Card className="border-gray-150 dark:border-zinc-900/60 shadow-xs rounded-2xl bg-white dark:bg-[#121212]">
                <CardHeader className="pb-3 border-b border-gray-100 dark:border-zinc-900/40">
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2 text-gray-700 dark:text-gray-300"><Info className="w-4 h-4 text-gray-400" /> Basic Metadata</CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-5">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block mb-1.5">Headline</label>
                    <Input 
                      placeholder="Enter a premium, striking news headline..." 
                      value={headline} 
                      onChange={(e) => setHeadline(e.target.value)} 
                      className="font-extrabold text-base sm:text-lg border-gray-200 dark:border-zinc-800 focus-visible:ring-[#0a7c85] rounded-xl py-5"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block mb-1.5">URL Slug</label>
                      <Input 
                        placeholder="auto-generated-slug" 
                        value={slug} 
                        onChange={(e) => setSlug(e.target.value)} 
                        className="font-mono text-xs border-gray-200 dark:border-zinc-800 focus-visible:ring-[#0a7c85] rounded-xl py-5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block mb-1.5">Category</label>
                      <select 
                        value={category} 
                        onChange={(e) => setCategory(e.target.value)} 
                        className="w-full h-10 border border-gray-200 dark:border-zinc-800 bg-transparent rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a7c85] dark:text-zinc-300"
                      >
                        <option value="General" className="dark:bg-[#121212]">General News</option>
                        <option value="Local News" className="dark:bg-[#121212]">Local News</option>
                        <option value="Business" className="dark:bg-[#121212]">Business</option>
                        <option value="Technology" className="dark:bg-[#121212]">Technology</option>
                        <option value="Real Estate" className="dark:bg-[#121212]">Real Estate</option>
                        <option value="Politics" className="dark:bg-[#121212]">Politics</option>
                        <option value="Sports" className="dark:bg-[#121212]">Sports</option>
                        <option value="Opinion" className="dark:bg-[#121212]">Opinion</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase block mb-1">Language</label>
                      <Input value={language} onChange={(e) => setLanguage(e.target.value)} className="text-xs rounded-xl focus-visible:ring-[#0a7c85]" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase block mb-1">State</label>
                      <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Delhi" className="text-xs rounded-xl focus-visible:ring-[#0a7c85]" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase block mb-1">City</label>
                      <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. New Delhi" className="text-xs rounded-xl focus-visible:ring-[#0a7c85]" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block mb-1.5">Featured Cover Image (Cloudinary/Firebase URL)</label>
                    <Input 
                      placeholder="Paste cover photo URL..." 
                      value={coverImage} 
                      onChange={(e) => setCoverImage(e.target.value)} 
                      className="text-xs rounded-xl focus-visible:ring-[#0a7c85] py-4"
                    />
                    {coverImage && (
                      <div className="mt-3 aspect-video rounded-xl overflow-hidden bg-black border border-gray-200 dark:border-zinc-800 shadow-xs relative group max-h-48">
                        <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setCoverImage('')} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 backdrop-blur-md hover:bg-black transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Interactive Block Content Editor */}
              <Card className="border-gray-150 dark:border-zinc-900/60 shadow-xs rounded-2xl bg-white dark:bg-[#121212]">
                <CardHeader className="pb-3 border-b border-gray-100 dark:border-zinc-900/40 flex items-center justify-between flex-row">
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2 text-gray-700 dark:text-gray-300"><FileText className="w-4 h-4 text-gray-400" /> Article Content Editor</CardTitle>
                  <span className="text-[10px] text-gray-400 font-mono tracking-wider">BLOCK MODEL</span>
                </CardHeader>
                <CardContent className="pt-6 space-y-5 min-h-[300px]">
                  
                  {blocks.map((block, idx) => (
                    <div key={block.id} className="relative group border border-dashed border-transparent hover:border-gray-150 dark:hover:border-zinc-850 p-2.5 rounded-xl transition-all duration-150">
                      
                      {/* Delete Block Tag */}
                      <button 
                        onClick={() => deleteBlock(block.id)} 
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 bg-red-50 text-red-500 dark:bg-red-950/20 dark:text-red-400 p-1 rounded-md transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Header block render */}
                      {block.type === 'h1' && (
                        <div className="flex gap-2.5 items-center">
                          <Heading className="w-4.5 h-4.5 text-[#0a7c85] flex-shrink-0" />
                          <Input 
                            value={block.value} 
                            onChange={(e) => updateBlockValue(block.id, e.target.value)} 
                            placeholder="Heading 1..." 
                            className="font-extrabold text-lg sm:text-xl bg-transparent border-none focus-visible:ring-0 p-0 text-gray-900 dark:text-white"
                          />
                        </div>
                      )}

                      {block.type === 'h2' && (
                        <div className="flex gap-2.5 items-center">
                          <Heading className="w-4.5 h-4.5 text-[#0a7c85]/80 flex-shrink-0" />
                          <Input 
                            value={block.value} 
                            onChange={(e) => updateBlockValue(block.id, e.target.value)} 
                            placeholder="Heading 2..." 
                            className="font-bold text-base bg-transparent border-none focus-visible:ring-0 p-0 text-gray-800 dark:text-zinc-200"
                          />
                        </div>
                      )}

                      {/* Paragraph block render */}
                      {block.type === 'paragraph' && (
                        <div className="flex gap-2.5 items-start">
                          <AlignLeft className="w-4.5 h-4.5 text-gray-400 mt-1 flex-shrink-0" />
                          <textarea 
                            value={block.value} 
                            onChange={(e) => updateBlockValue(block.id, e.target.value)} 
                            placeholder="Start writing text paragraph block..." 
                            className="w-full bg-transparent border-none focus:ring-0 resize-none text-[14px] leading-relaxed p-0 focus:outline-none placeholder:text-gray-400 text-gray-800 dark:text-zinc-300"
                            rows={3}
                          />
                        </div>
                      )}

                      {/* Blockquote block render */}
                      {block.type === 'blockquote' && (
                        <div className="flex gap-2.5 items-start border-l-4 border-[#0a7c85] pl-3">
                          <Quote className="w-4.5 h-4.5 text-[#0a7c85] mt-1 flex-shrink-0" />
                          <textarea 
                            value={block.value} 
                            onChange={(e) => updateBlockValue(block.id, e.target.value)} 
                            placeholder="Quote text block..." 
                            className="w-full bg-transparent border-none focus:ring-0 resize-none text-[14px] italic leading-relaxed p-0 focus:outline-none placeholder:text-gray-400 text-[#086971] dark:text-[#e6f4f5]/90"
                            rows={2}
                          />
                        </div>
                      )}

                      {/* Callout box block render */}
                      {block.type === 'callout' && (
                        <div className="bg-[#0a7c85]/5 dark:bg-[#0a7c85]/10 border border-[#0a7c85]/20 dark:border-[#0a7c85]/20 rounded-xl p-3 flex gap-2.5 items-start">
                          <Info className="w-5 h-5 text-[#0a7c85] mt-0.5 flex-shrink-0" />
                          <textarea 
                            value={block.value} 
                            onChange={(e) => updateBlockValue(block.id, e.target.value)} 
                            placeholder="Callout info text..." 
                            className="w-full bg-transparent border-none focus:ring-0 resize-none text-xs leading-relaxed p-0 focus:outline-none text-[#086971] dark:text-teal-300"
                            rows={2}
                          />
                        </div>
                      )}

                      {/* FAQ Block render */}
                      {block.type === 'faq' && (
                        <div className="bg-purple-50/40 dark:bg-purple-950/10 border border-purple-100/85 dark:border-purple-900/40 rounded-xl p-4 space-y-2.5">
                          <div className="flex items-center gap-1.5 text-purple-600 font-extrabold text-xs">
                            <HelpCircle className="w-4 h-4" /> FAQ SECTION
                          </div>
                          <Input 
                            value={block.value.question} 
                            onChange={(e) => updateBlockValue(block.id, { ...block.value, question: e.target.value })} 
                            placeholder="Frequently Asked Question?" 
                            className="text-xs sm:text-sm font-semibold rounded-xl border-purple-100/70 dark:border-purple-900 bg-white dark:bg-black focus-visible:ring-purple-500"
                          />
                          <textarea 
                            value={block.value.answer} 
                            onChange={(e) => updateBlockValue(block.id, { ...block.value, answer: e.target.value })} 
                            placeholder="Answer details..." 
                            className="w-full bg-white dark:bg-black border border-purple-100/70 dark:border-purple-900 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-700 dark:text-zinc-350"
                            rows={3}
                          />
                        </div>
                      )}

                      {/* YouTube block render */}
                      {block.type === 'youtube' && (
                        <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/50 rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center gap-1.5 text-red-500 font-bold text-xs">
                            <Film className="w-4 h-4" /> YOUTUBE EMBED
                          </div>
                          <Input 
                            value={block.value} 
                            onChange={(e) => updateBlockValue(block.id, e.target.value)} 
                            placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)" 
                            className="text-xs rounded-xl focus-visible:ring-red-500 py-4"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add Block Controls Toolbar */}
                  <div className="pt-5 border-t border-gray-100 dark:border-zinc-900/40 flex flex-wrap gap-2 justify-center">
                    <Button variant="outline" size="xs" onClick={() => addBlock('paragraph')} className="text-xs rounded-xl flex items-center gap-1 hover:bg-gray-55 dark:hover:bg-zinc-800"><AlignLeft className="w-3.5 h-3.5" /> Text</Button>
                    <Button variant="outline" size="xs" onClick={() => addBlock('h1')} className="text-xs rounded-xl flex items-center gap-1 hover:bg-gray-55 dark:hover:bg-zinc-800"><Heading className="w-3.5 h-3.5" /> H1</Button>
                    <Button variant="outline" size="xs" onClick={() => addBlock('h2')} className="text-xs rounded-xl flex items-center gap-1 hover:bg-gray-55 dark:hover:bg-zinc-800"><Heading className="w-3 h-3" /> H2</Button>
                    <Button variant="outline" size="xs" onClick={() => addBlock('blockquote')} className="text-xs rounded-xl flex items-center gap-1 hover:bg-gray-55 dark:hover:bg-zinc-800"><Quote className="w-3.5 h-3.5" /> Quote</Button>
                    <Button variant="outline" size="xs" onClick={() => addBlock('callout')} className="text-xs rounded-xl flex items-center gap-1 hover:bg-gray-55 dark:hover:bg-zinc-800"><Info className="w-3.5 h-3.5" /> Callout</Button>
                    <Button variant="outline" size="xs" onClick={() => addBlock('faq')} className="text-xs rounded-xl flex items-center gap-1 text-purple-600 border-purple-100 hover:bg-purple-50/30"><HelpCircle className="w-3.5 h-3.5" /> FAQ</Button>
                    <Button variant="outline" size="xs" onClick={() => addBlock('youtube')} className="text-xs rounded-xl flex items-center gap-1 text-red-500 border-red-100 hover:bg-red-50/30"><Film className="w-3.5 h-3.5" /> YouTube</Button>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>

            {/* SEO Analyzer Tab */}
            <TabsContent value="seo" className="space-y-6 outline-none">
              <Card className="border-gray-150 dark:border-zinc-900/60 shadow-xs rounded-2xl bg-white dark:bg-[#121212]">
                <CardHeader>
                  <CardTitle className="text-base font-extrabold flex items-center gap-2 text-gray-800 dark:text-gray-200"><BarChart2 className="w-5 h-5 text-[#0a7c85]" /> Tolee SEO/AEO/GEO Core Auditor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Scores Grid */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-2xl border border-green-100/70 dark:border-green-900/50">
                      <span className="text-2xl sm:text-3xl font-black text-green-600 dark:text-green-400">{metrics.seoScore}%</span>
                      <p className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mt-1.5">SEO Score</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-2xl border border-purple-100/70 dark:border-purple-900/50">
                      <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">{metrics.aeoScore}%</span>
                      <p className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mt-1.5">AEO Score</p>
                    </div>
                    <div className="bg-[#e6f4f5] dark:bg-[#0a7c85]/10 p-4 rounded-2xl border border-[#0a7c85]/20 dark:border-[#0a7c85]/20">
                      <span className="text-2xl sm:text-3xl font-black text-[#0a7c85] dark:text-teal-400">{metrics.geoScore}%</span>
                      <p className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mt-1.5">GEO Score</p>
                    </div>
                  </div>

                  {/* Checklist lists */}
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-2.5">Needs Improvement ({metrics.errors.length})</h4>
                      {metrics.errors.length === 0 ? (
                        <div className="text-xs text-gray-500 dark:text-zinc-400">Perfect! No errors detected. Ready for Google & Claude indexing.</div>
                      ) : (
                        <ul className="space-y-2">
                          {metrics.errors.map((err, i) => (
                            <li key={i} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-2 bg-red-50/50 dark:bg-red-950/10 p-3 rounded-xl border border-red-100/30">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" /> {err}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black text-green-500 uppercase tracking-widest block mb-2.5">Optimized Checks Passed ({metrics.passes.length})</h4>
                      <ul className="space-y-2">
                        {metrics.passes.map((pass, i) => (
                          <li key={i} className="text-xs text-green-600 dark:text-green-400 flex items-start gap-2 bg-green-50/50 dark:bg-green-950/10 p-3 rounded-xl border border-green-100/30">
                            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-500" /> {pass}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>

            {/* Publishing Tab */}
            <TabsContent value="publish" className="space-y-6 outline-none">
              <Card className="border-gray-150 dark:border-zinc-900/60 shadow-xs rounded-2xl bg-white dark:bg-[#121212]">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2 text-gray-700 dark:text-gray-300"><Globe className="w-4.5 h-4.5 text-[#0a7c85]" /> Select Target Audience & Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {pubError && (
                    <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-red-100/80">
                      <AlertCircle className="w-4 h-4" /> {pubError}
                    </div>
                  )}

                  {/* Tolee Select */}
                  <div>
                    <label className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider block mb-2.5">Select Target Tolees (Groups) where this publishes</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {joinedTolees.map(t => (
                        <div 
                          key={t.id} 
                          onClick={() => {
                            setSelectedToleeIds(prev => 
                              prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                            );
                          }}
                          className={`p-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all duration-200 select-none ${selectedToleeIds.includes(t.id) ? 'bg-[#e6f4f5] border-[#0a7c85]/40 text-[#0a7c85] dark:bg-[#0a7c85]/10 dark:text-teal-400' : 'bg-transparent border-gray-200 dark:border-zinc-800 hover:bg-gray-50/50 dark:hover:bg-zinc-900/30 dark:text-zinc-300'}`}
                        >
                          t/{t.slug}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block mb-1.5">Post Visibility</label>
                      <select 
                        value={visibility} 
                        onChange={(e) => setVisibility(e.target.value)} 
                        className="w-full h-10 border border-gray-200 dark:border-zinc-800 bg-transparent rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a7c85] dark:text-zinc-300"
                      >
                        <option value="public" className="dark:bg-[#121212]">Public (Open for Everyone)</option>
                        <option value="followers" className="dark:bg-[#121212]">Followers Only</option>
                        <option value="tolee_only" className="dark:bg-[#121212]">Selected Tolee members only</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block mb-1.5">External Ref Link</label>
                      <Input placeholder="https://..." value={externalRef} onChange={(e) => setExternalRef(e.target.value)} className="rounded-xl focus-visible:ring-[#0a7c85]" />
                    </div>
                  </div>

                  <div className="pt-5 border-t border-gray-100 dark:border-zinc-900/40 flex justify-end gap-2.5">
                    <Button variant="outline" size="sm" onClick={() => router.back()} disabled={publishing} className="rounded-xl">Cancel</Button>
                    <Button 
                      onClick={handlePublish} 
                      disabled={publishing || headline.trim().length === 0} 
                      className="bg-[#0a7c85] hover:bg-[#086971] text-white font-extrabold px-6 rounded-xl shadow-xs"
                    >
                      {publishing ? 'Publishing live...' : 'Confirm Publish Live'}
                    </Button>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Side Panel: SEO snippet preview and category select */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Box A: Google SERP Snippet Preview */}
          <Card className="border-gray-150 dark:border-zinc-900/60 shadow-xs rounded-2xl bg-white dark:bg-[#121212] overflow-hidden">
            <CardHeader className="pb-3 border-b border-gray-100 dark:border-zinc-900/40">
              <CardTitle className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Globe className="w-4 h-4 text-gray-400" /> Google Snippet Preview</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              <span className="text-[11px] text-green-700 dark:text-green-500 font-mono block truncate">https://tolee.news/{slug || 'headline-slug'}</span>
              <span className="text-[16px] font-extrabold text-blue-800 dark:text-blue-400 hover:underline block leading-tight cursor-pointer">
                {headline || 'Headline goes here...'}
              </span>
              <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-normal">
                {metaDesc || summary || 'Add a meta summary to see how search engines show your article snippet...'}
              </p>
            </CardContent>
          </Card>

          {/* Box B: LLM & AI Engine (Gemini / Claude / ChatGPT) Preview */}
          <Card className="border-gray-150 dark:border-zinc-900/60 shadow-xs rounded-2xl bg-white dark:bg-[#121212] overflow-hidden">
            <CardHeader className="pb-3 border-b border-gray-100 dark:border-zinc-900/40">
              <CardTitle className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-purple-500 animate-pulse" /> AI Answer Engine Preview</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              <div className="bg-purple-50/50 dark:bg-purple-950/15 border border-purple-100/60 dark:border-purple-900/30 p-3.5 rounded-2xl text-xs space-y-2">
                <span className="font-extrabold text-[10px] text-purple-700 dark:text-purple-400 uppercase tracking-wider block">Answer Prompt Source:</span>
                <p className="italic text-gray-500 leading-normal">"Summarize the main details of the news article about {headline || '...'}"</p>
                <div className="border-t border-purple-100/50 dark:border-purple-900/40 pt-2 text-gray-700 dark:text-zinc-300 space-y-1.5">
                  <span className="font-extrabold block text-[9px] text-zinc-400 tracking-wider">GEMINI LLM SYNTHESIS:</span>
                  <p className="leading-normal text-[11px]">
                    {summary ? `${summary} (Sources: t/${selectedToleeIds[0] || 'Tolee'})` : 'Please provide a short summary in metadata to synthesize a structured LLM response.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* AI Writer Panel Modal */}
      <Dialog open={aiPanelOpen} onOpenChange={setAiPanelOpen}>
        <DialogContent className="sm:max-w-[600px] p-5 rounded-3xl bg-white dark:bg-[#121212] border-gray-150 dark:border-zinc-900 shadow-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-1.5 text-purple-600"><Sparkles className="w-5 h-5 text-purple-500 animate-pulse" /> Tolee AI Writer Assistant</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            
            {/* Quick Prompts shortcuts */}
            <div className="flex flex-wrap gap-1.5">
              <Button size="xs" variant="outline" className="text-[10px] font-bold rounded-full" onClick={() => runAICommand('headline')}>Alternative Headlines</Button>
              <Button size="xs" variant="outline" className="text-[10px] font-bold rounded-full" onClick={() => runAICommand('improve')}>Improve Headline</Button>
              <Button size="xs" variant="outline" className="text-[10px] font-bold rounded-full" onClick={() => runAICommand('faq')}>Generate FAQs</Button>
              <Button size="xs" variant="outline" className="text-[10px] font-bold rounded-full" onClick={() => runAICommand('summary')}>Generate Meta Summary</Button>
              <Button size="xs" variant="outline" className="text-[10px] font-bold rounded-full" onClick={() => runAICommand('keywords')}>Generate Keywords</Button>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase block mb-1">Custom Prompt</label>
              <textarea 
                placeholder="Ask AI to expand content, translate into Hindi, generate call-to-actions..." 
                value={aiPrompt} 
                onChange={(e) => setAiPrompt(e.target.value)} 
                className="w-full h-20 border border-gray-200 dark:border-zinc-800 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 bg-transparent"
              />
            </div>

            <Button onClick={() => runAICommand('custom')} disabled={aiLoading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-xs py-4">
              {aiLoading ? 'AI is drafting content...' : 'Generate AI Content'}
            </Button>

            {aiResult && (
              <div className="bg-gray-50 dark:bg-black/30 border border-gray-150 dark:border-zinc-850 rounded-2xl p-4 space-y-2">
                <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wide block">AI RESPONSE:</span>
                <div className="max-h-52 overflow-y-auto pr-2 custom-scrollbar text-xs leading-relaxed text-gray-800 dark:text-zinc-350 whitespace-pre-wrap select-all">
                  {aiResult}
                </div>
                <div className="pt-2 text-[10px] text-gray-400">Click content above to select and copy.</div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
