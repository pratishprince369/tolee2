'use client';

import React, { useState } from 'react';
import { 
  Sparkles, Bot, ArrowRight, CheckCircle2, Loader2, AlertCircle, 
  Share2, Copy, Image as ImageIcon, FileText, Code2, Calendar, 
  Layers, ExternalLink, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { runOpenWorkAgentAction } from '@/actions/ai-manager';
import { createPost } from '@/actions/post';

interface PlanStep {
  id: string;
  stepNumber: number;
  title: string;
  skillId: string;
  args: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  log?: string;
  interactiveAction?: {
    type: string;
    label: string;
    payload: any;
  };
}

interface OpenWorkResult {
  taskId: string;
  summary: string;
  steps: PlanStep[];
  finalOutput: string;
  interactiveAction?: {
    type: string;
    label: string;
    payload: any;
  };
  mediaUrl?: string;
}

const PRESET_PROMPTS = [
  {
    icon: '🎨',
    title: 'Design Banner & Write Post',
    prompt: 'Create a stunning marketing banner for AI Automation Agency with high-converting social media caption'
  },
  {
    icon: '📰',
    title: 'Research & Write Tech News',
    prompt: 'Research latest AI and Quantum Computing breakthroughs in India and generate a detailed report'
  },
  {
    icon: '🚀',
    title: 'Product Launch Campaign',
    prompt: 'Plan a product launch campaign for our new mobile app with poster design and promotional hashtags'
  },
  {
    icon: '💻',
    title: 'Build UI Component Code',
    prompt: 'Write a responsive modern animated Hero section component in React and Tailwind CSS'
  }
];

export function OpenWorkAgentWorkspace() {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('stripe_modern');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<OpenWorkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRunTask = async (taskPrompt?: string) => {
    const activePrompt = taskPrompt || prompt;
    if (!activePrompt.trim() || isExecuting) return;

    setIsExecuting(true);
    setError(null);
    setPublishSuccess(false);

    try {
      const res = await runOpenWorkAgentAction(activePrompt);
      if (res.success && res.data) {
        setResult(res.data as OpenWorkResult);
      } else {
        setError(res.error || 'Failed to complete autonomous workflow.');
      }
    } catch (err: any) {
      setError(err.message || 'Workflow execution error.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handlePublishPost = async () => {
    if (!result || isPublishing) return;
    setIsPublishing(true);

    try {
      const caption = result.finalOutput || result.summary;
      const mediaUrl = result.mediaUrl;

      const res = await createPost({
        content: caption,
        postType: 'post',
        media: mediaUrl ? { type: 'image', url: mediaUrl } : null
      });

      if (res.success) {
        setPublishSuccess(true);
      } else {
        alert('Failed to publish: ' + ((res as any).error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Publishing error: ' + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md px-3 py-1 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 mr-1" /> OpenWork Autonomous Engine
              </Badge>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-white/80 font-medium">Multi-Agent Planner Ready</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              Tolee OpenWork Workspace
            </h1>
            <p className="text-sm sm:text-base text-white/90 max-w-2xl leading-relaxed">
              Decompose complex goals into sequential sub-tasks. Design 8K banners, research verified web data, write multilingual copy, and auto-publish in 1-Click.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-black/20 text-white border-white/20 px-3 py-1.5 text-xs">
              Fooocus V2 Visuals
            </Badge>
            <Badge variant="outline" className="bg-black/20 text-white border-white/20 px-3 py-1.5 text-xs">
              7 News APIs
            </Badge>
            <Badge variant="outline" className="bg-black/20 text-white border-white/20 px-3 py-1.5 text-xs">
              Llama 3.1 & GPT-4o
            </Badge>
          </div>
        </div>
      </div>

      {/* Preset Action Templates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PRESET_PROMPTS.map((p, idx) => (
          <Card 
            key={idx} 
            onClick={() => { setPrompt(p.prompt); handleRunTask(p.prompt); }}
            className="cursor-pointer hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-md transition-all duration-200 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 rounded-2xl"
          >
            <CardContent className="p-4 space-y-2">
              <div className="text-2xl">{p.icon}</div>
              <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-100">{p.title}</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">{p.prompt}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Interactive Command Center */}
      <Card className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <Bot className="w-4 h-4 text-violet-600" />
                What would you like Tolee OpenWork to accomplish today?
              </label>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-violet-600 dark:text-violet-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Awesome Design-MD Enabled</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Launch a promotional campaign for our bakery shop with creative banner design, Hindi & English captions, and ready-to-publish feed post..."
                rows={2}
                className="flex-1 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                disabled={isExecuting}
              />
              <Button
                onClick={() => handleRunTask()}
                disabled={!prompt.trim() || isExecuting}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold px-8 rounded-2xl h-auto py-4 shadow-lg shadow-violet-500/20 transition-all flex items-center justify-center gap-2 sm:self-stretch"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Run Task</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>

            {/* Design-MD Aesthetic Selector Pills */}
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 mr-1">
                Visual Style:
              </span>
              {[
                { id: 'apple_minimal', label: '🍎 Apple Minimal' },
                { id: 'stripe_modern', label: '💳 Stripe SaaS' },
                { id: 'linear_dark', label: '⚡ Linear Dark' },
                { id: 'festive_royal', label: '✨ Festive Luxury' },
                { id: 'nike_energy', label: '🔥 Nike Commercial' },
                { id: 'editorial_press', label: '📰 Editorial Press' }
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setSelectedStyle(style.id)}
                  className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all border ${
                    selectedStyle === style.id
                      ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-500/30'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-2xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Execution Results Canvas */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Left Column: Multi-Step Execution Plan & Logs (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-violet-600" />
                    Autonomous Plan Steps
                  </span>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {result.steps.length} Steps
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  {result.summary}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-3">
                {result.steps.map((step) => (
                  <div 
                    key={step.id} 
                    className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-150 dark:border-zinc-800/80 space-y-1.5 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center text-[10px] font-black">
                          {step.stepNumber}
                        </span>
                        {step.title}
                      </span>
                      {step.status === 'completed' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      )}
                      {step.status === 'running' && (
                        <Loader2 className="w-4 h-4 text-violet-500 animate-spin flex-shrink-0" />
                      )}
                      {step.status === 'failed' && (
                        <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      )}
                    </div>
                    {step.log && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pl-7 leading-relaxed font-mono">
                        {step.log}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Output Showcase & Action Controls (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
              <CardHeader className="p-5 pb-3 bg-zinc-50/50 dark:bg-zinc-950/50 border-b border-zinc-100 dark:border-zinc-800/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                    Generated Output Canvas
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(result.finalOutput)}
                      className="text-xs rounded-xl h-8 px-3"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      {copied ? 'Copied!' : 'Copy Text'}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* 1. Visual Creative Preview (If generated) */}
                {result.mediaUrl && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
                      Generated Creative Banner
                    </span>
                    <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 aspect-video relative group">
                      <img 
                        src={result.mediaUrl} 
                        alt="OpenWork Creative" 
                        className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
                      />
                      <a 
                        href={result.mediaUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-xl backdrop-blur-md text-xs flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Full HD
                      </a>
                    </div>
                  </div>
                )}

                {/* 2. Written Content / Solution */}
                {result.finalOutput && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
                      Content & Strategy Copy
                    </span>
                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800/80 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                      {result.finalOutput}
                    </div>
                  </div>
                )}

                {/* 3. 1-Click Action Controls */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-zinc-500">
                    Task ID: <span className="font-mono text-[10px]">{result.taskId}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {publishSuccess ? (
                      <Badge className="bg-emerald-500 text-white px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Live on Tolee Feed
                      </Badge>
                    ) : (
                      <Button
                        onClick={handlePublishPost}
                        disabled={isPublishing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-5 shadow-sm text-xs flex items-center gap-2"
                      >
                        {isPublishing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Publishing...</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5" />
                            <span>1-Click Publish to Tolee Feed</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
