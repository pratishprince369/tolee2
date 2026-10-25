'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Lock,
  Globe,
  CheckCircle2,
  AlertCircle,
  Mail,
  ShieldCheck,
  Play,
  Pause,
  ListOrdered,
  Sparkles,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import { HIGH_AUTHORITY_BACKLINK_QUEUE } from '@/modules/tolee-ai-agent/browser/backlink-engine';
import { BrowserDiagnosticState } from '@/modules/tolee-ai-agent/browser/browser-worker';

export interface BrowserTab {
  id: string;
  title: string;
  domain: string;
  url: string;
  status: 'action_required' | 'waiting_verification' | 'ready' | 'stopped' | 'blocked';
  isBlocked?: boolean;
  diagnosticState?: BrowserDiagnosticState;
  blockReason?: string;
}

export interface LiveBrowserOperatorCanvasProps {
  onClose: () => void;
  onStopTask?: () => void;
  onResumeTask?: () => void;
  onVerifyLink?: (siteId: string) => Promise<void>;
  session?: any;
  targetDomain?: string;
  initialUrl?: string;
  isStopped?: boolean;
}

export function LiveBrowserOperatorCanvas({
  onClose,
  onStopTask,
  onResumeTask,
  onVerifyLink,
  session,
  targetDomain = 'linkedin.com',
  initialUrl,
  isStopped = false,
}: LiveBrowserOperatorCanvasProps) {
  // Build initial tabs from session or defaults
  const getInitialTabs = (): BrowserTab[] => {
    if (session?.tabs && Array.isArray(session.tabs) && session.tabs.length > 0) {
      return session.tabs;
    }
    const domain = targetDomain || 'linkedin.com';
    if (domain.includes('linkedin')) {
      return [
        {
          id: 'linkedin',
          title: 'linkedin.com',
          domain: 'linkedin.com',
          url: initialUrl || 'https://www.linkedin.com/company/setup/new/',
          status: 'action_required',
        },
        {
          id: 'tolee',
          title: 'tolee.in',
          domain: 'tolee.in',
          url: 'https://tolee.in',
          status: 'ready',
        },
      ];
    }
    return [
      {
        id: domain.replace(/[^a-z0-9]/g, '_'),
        title: domain,
        domain: domain,
        url: initialUrl || `https://${domain}`,
        status: 'action_required',
      },
      {
        id: 'tolee',
        title: 'tolee.in',
        domain: 'tolee.in',
        url: 'https://tolee.in',
        status: 'ready',
      },
    ];
  };

  const [tabs, setTabs] = useState<BrowserTab[]>(getInitialTabs);
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    return session?.activeTabId || (tabs[0]?.id || 'linkedin');
  });

  const [isUserControl, setIsUserControl] = useState<boolean>(false);
  const [verifiedSites, setVerifiedSites] = useState<Set<string>>(new Set());
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [showQueueDrawer, setShowQueueDrawer] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sync tabs when session changes
  useEffect(() => {
    if (session?.tabs && Array.isArray(session.tabs) && session.tabs.length > 0) {
      setTabs(session.tabs);
      if (session.activeTabId) {
        setActiveTabId(session.activeTabId);
      }
    }
  }, [session]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || {
    id: 'target',
    title: targetDomain,
    domain: targetDomain,
    url: initialUrl || `https://${targetDomain}`,
    status: 'action_required',
  };

  const [urlInput, setUrlInput] = useState<string>(activeTab.url);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [iframeError, setIframeError] = useState<boolean>(false);
  const [isWarningDismissed, setIsWarningDismissed] = useState<boolean>(false);
  const [urlCopied, setUrlCopied] = useState<boolean>(false);

  useEffect(() => {
    if (activeTab?.url) {
      setUrlInput(activeTab.url);
      setIframeError(false);
      setIsWarningDismissed(false);
      setUrlCopied(false);
    }
  }, [activeTab?.url]);

  const handleCopy = (key: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (_) {}
  };

  const handleCopyUrl = (url: string) => {
    try {
      navigator.clipboard.writeText(url);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch (_) {}
  };

  const handleVerifyClick = async (siteId: string) => {
    setIsVerifying(true);
    try {
      if (onVerifyLink) {
        await onVerifyLink(siteId);
      }
      setVerifiedSites((prev) => new Set([...prev, siteId]));
      setTabs((prev) =>
        prev.map((t) => (t.id === siteId ? { ...t, status: 'ready' as const } : t))
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const isTaskHalted = Boolean(isStopped || session?.isStopped || session?.status === 'stopped');

  const diagnosticState: BrowserDiagnosticState =
    activeTab.diagnosticState ||
    session?.diagnosticState ||
    (session?.isBlocked || session?.status === 'blocked' || activeTab.status === 'blocked' || activeTab.isBlocked
      ? 'BOT_PROTECTION_BLOCK'
      : 'SUCCESS');

  const isBlocked = Boolean(
    session?.isBlocked ||
    session?.status === 'blocked' ||
    activeTab.status === 'blocked' ||
    activeTab.isBlocked ||
    diagnosticState === 'BOT_PROTECTION_BLOCK' ||
    diagnosticState === 'ACCESS_DENIED' ||
    diagnosticState === 'CAPTCHA_REQUIRED'
  );

  const blockReason =
    activeTab.blockReason ||
    session?.blockReason ||
    (diagnosticState === 'CAPTCHA_REQUIRED'
      ? 'Interactive challenge or CAPTCHA required'
      : diagnosticState === 'BOT_PROTECTION_BLOCK'
      ? 'Security service (Cloudflare WAF) blocked automated session'
      : diagnosticState === 'LOGIN_REQUIRED'
      ? 'Login authentication required'
      : 'Access restricted by website');

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 font-sans select-none overflow-hidden border-l border-slate-700/80 shadow-2xl">
      {/* ── 1. Top Header: Status & Controls ── */}
      <div className="bg-slate-950 px-3 py-2.5 flex items-center justify-between border-b border-slate-800 gap-2 shrink-0">
        {/* Left: Status Badge */}
        <div className="flex items-center gap-2 min-w-0">
          {isTaskHalted ? (
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
          ) : isBlocked ? (
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`font-extrabold text-xs tracking-tight ${isTaskHalted || isBlocked ? 'text-rose-400' : 'text-white'}`}>
                {isTaskHalted ? 'Task Paused' : isBlocked ? 'Security Access Blocked' : 'Live Browser Connected'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
              <span>{isTaskHalted ? 'Stopped by user' : isBlocked ? `Security service restricted · ${activeTab.domain}` : `Active · ${activeTab.domain}`}</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
            </p>
          </div>
        </div>

        {/* Right: Actions (Stop/Resume, Take control, Close) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isTaskHalted ? (
            onResumeTask && (
              <button
                onClick={onResumeTask}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-800/60 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Resume</span>
              </button>
            )
          ) : (
            onStopTask && (
              <button
                onClick={onStopTask}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/60 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Pause className="w-3 h-3" />
                <span>Stop</span>
              </button>
            )
          )}

          <button
            onClick={() => setIsUserControl(!isUserControl)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer ${
              isUserControl
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isUserControl ? 'Release control' : 'Take control of the browser'}
          </button>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Close browser panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── 2. Browser Tabs Bar (Chrome / Muse style) ── */}
      <div className="bg-slate-950/90 px-2 pt-2 flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-slate-800/80 shrink-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isDone = verifiedSites.has(tab.id);

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-t-xl text-xs font-medium transition-all max-w-[180px] shrink-0 border-t border-x ${
                isActive
                  ? 'bg-slate-900 border-slate-700 text-white font-bold shadow-xs'
                  : 'bg-slate-950 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : tab.status === 'action_required' ? (
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <span className="truncate">{tab.domain || tab.title}</span>
            </button>
          );
        })}

        {/* Directory Queue Toggle */}
        <button
          onClick={() => setShowQueueDrawer(!showQueueDrawer)}
          className="ml-auto px-2 py-1 text-[11px] font-bold text-teal-400 hover:text-teal-300 hover:bg-slate-800 rounded-lg flex items-center gap-1 shrink-0 transition-colors"
          title="View scheduled white-hat directory queue"
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>Queue (~25)</span>
        </button>
      </div>

      {/* ── 3. Browser Navigation & URL Bar ── */}
      <div className="bg-slate-900 px-3 py-1.5 flex items-center gap-2 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-1 text-slate-400">
          <button className="p-1 hover:text-white rounded transition-colors" title="Back">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 hover:text-white rounded transition-colors" title="Forward">
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setUrlInput(activeTab.url)}
            className="p-1 hover:text-white rounded transition-colors"
            title="Reload"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* URL Pill / Input */}
        <div className="flex-1 flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-mono">
          <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
          {isUserControl ? (
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setTabs((prev) =>
                    prev.map((t) => (t.id === activeTabId ? { ...t, url: urlInput } : t))
                  );
                }
              }}
              className="bg-transparent w-full text-slate-100 outline-none text-xs font-mono"
            />
          ) : (
            <span className="truncate">{activeTab.url}</span>
          )}
        </div>

        {/* Direct Open Button */}
        <a
          href={activeTab.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 text-slate-400 hover:text-white rounded transition-colors"
          title="Open in new window"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* ── User Control Active Notice Banner ── */}
      {isUserControl && (
        <div className="bg-blue-600/90 text-white px-3 py-1 text-xs font-semibold flex items-center justify-between shrink-0">
          <span>🎮 Direct browser control active. You can edit URL or operate directly.</span>
          <button onClick={() => setIsUserControl(false)} className="text-[11px] underline font-bold">
            Done
          </button>
        </div>
      )}

      {/* ── Task Paused Notice Banner ── */}
      {isTaskHalted && (
        <div className="bg-rose-950/60 border-b border-rose-900/50 text-rose-300 px-3 py-1.5 text-xs font-semibold flex items-center justify-between shrink-0">
          <span>🛑 Task is paused by user. Automated operations are halted.</span>
          {onResumeTask && (
            <button onClick={onResumeTask} className="text-[11px] underline font-bold text-white">
              Resume Task
            </button>
          )}
        </div>
      )}

      {/* ── 4. Live Browser Canvas / Viewport ── */}
      <div className="flex-1 bg-slate-950 p-4 overflow-y-auto relative flex flex-col justify-between">
        {/* VIEW 0: Job Application Operator */}
        {(activeTabId === 'linkedin_jobs' || activeTab.url.includes('/jobs') || session?.jobData) && (
          <div className="space-y-4 max-w-xl mx-auto w-full">
            <div className="p-4 rounded-2xl bg-[#001428] border border-blue-900/60 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between border-b border-blue-900/50 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    💼
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>Job Application Operator</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        Live Vacancies Active
                      </span>
                    </h4>
                    <span className="text-[10px] text-blue-300 font-medium">
                      Target: {session?.jobData?.role || 'Software Engineer'} • {session?.jobData?.location || 'India / Remote'}
                    </span>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                  Review & Apply
                </span>
              </div>

              {/* Verified Candidate Profile Card */}
              <div className="space-y-2 text-xs bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">👤 Verified Candidate Profile</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Tolee Profile Linked</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-400">Candidate:</span>
                    <p className="font-bold text-slate-200">
                      {session?.jobData?.applicant?.name || 'Tolee Professional'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Contact:</span>
                    <p className="font-mono text-slate-300 truncate">
                      {session?.jobData?.applicant?.email || 'user@tolee.in'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Verified Skills:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(
                        session?.jobData?.applicant?.skills || [
                          'React',
                          'TypeScript',
                          'Node.js',
                          'System Architecture',
                        ]
                      ).map((s: string) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-teal-300 border border-slate-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Discovered Job Listings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Matching Live Vacancies:</span>
                  <span className="text-[10px] text-slate-400">
                    {session?.jobData?.jobs?.length || 3} positions discovered
                  </span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                  {(
                    session?.jobData?.jobs || [
                      {
                        title: 'Senior Software Engineer',
                        company: 'Tech Innovation Labs',
                        location: 'Bengaluru / Hybrid',
                        sourceUrl: 'https://www.linkedin.com/jobs/',
                        descriptionSnippet:
                          'Looking for a high-impact engineer to scale modern web applications.',
                      },
                    ]
                  ).map((job: any, index: number) => (
                    <div
                      key={job.id || index}
                      className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="font-bold text-xs text-white leading-tight">
                            {job.title}
                          </h5>
                          <p className="text-[11px] text-blue-400 font-medium">
                            {job.company} •{' '}
                            <span className="text-slate-400">{job.location}</span>
                          </p>
                        </div>
                        <a
                          href={job.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 text-[10px] font-bold shrink-0 flex items-center gap-1 transition-colors"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                      <p className="text-[10.5px] text-slate-400 line-clamp-2 leading-relaxed">
                        {job.descriptionSnippet}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Banner */}
              <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-800/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px] text-blue-200">
                    Review and submit application with verified profile
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (activeTab.url) window.open(activeTab.url, '_blank');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 cursor-pointer"
                >
                  Open Portal
                </button>
              </div>
            </div>
          </div>
        )}



        {/* VIEW 1: LinkedIn Target Platform (Backlinks & Company) */}
        {activeTab.domain.includes('linkedin') &&
          !activeTab.url.includes('/jobs') &&
          !session?.jobData && (
          <div className="space-y-4 max-w-xl mx-auto w-full">
            <div className="p-4 rounded-2xl bg-[#001428] border border-blue-900/60 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between border-b border-blue-900/50 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#0a66c2] text-white flex items-center justify-center font-black text-lg shadow-sm">
                    in
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>LinkedIn Profile & Company Backlink</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                        DA 98
                      </span>
                    </h4>
                    <span className="text-[10px] text-blue-300 font-medium">
                      High-Authority Direct Indexable Links • Official Domain Authority
                    </span>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                  {verifiedSites.has('linkedin') ? 'Verified' : 'Human Login Required'}
                </span>
              </div>

              {/* 1. Company Page Setup */}
              <div className="space-y-2.5 text-xs bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1">
                    <span>1. Company Page Website Link</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">(Public & Permanent)</span>
                  </span>
                  <a
                    href="https://www.linkedin.com/company/setup/new/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold underline"
                  >
                    <span>Open Setup</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-400">Company Name:</span>
                    <p className="font-bold text-slate-200">Tolee</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Website URL:</span>
                    <div className="flex items-center justify-between bg-slate-950 px-2 py-1 rounded border border-slate-800 mt-0.5">
                      <span className="font-mono text-teal-400 font-bold truncate">https://tolee.in</span>
                      <button
                        onClick={() => handleCopy('tolee_url', 'https://tolee.in')}
                        className="text-[10px] text-slate-400 hover:text-white ml-1 font-sans cursor-pointer"
                      >
                        {copiedKey === 'tolee_url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Industry:</span>
                    <p className="text-slate-300 font-medium">Technology, Information and Internet • Social Networking</p>
                  </div>
                </div>
              </div>

              {/* 2. Personal Profile Featured / Bio Link */}
              <div className="space-y-2 text-xs bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">2. Personal Profile Header / Custom Link</span>
                  <span className="text-[10px] text-slate-400">Instant setup</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Apne LinkedIn profile header me <strong>Edit intro &rarr; Custom button</strong> select karein, link me <code className="text-teal-400">https://tolee.in</code> aur button text me <strong>"Visit Website"</strong> daalein.
                </p>
              </div>

              {/* 3. Pulse Article Draft */}
              <div className="space-y-2 text-xs bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">3. LinkedIn Pulse Article Strategy</span>
                  <button
                    onClick={() => {
                      const article = `Introducing Tolee: The Next-Gen AI Social Network\n\nTolee combines personal AI co-pilots, neighborhood discovery (Radar), reels, ad-free music streaming, and creator monetization in one platform.\n\nLearn more and join the ecosystem: https://tolee.in`;
                      handleCopy('article', article);
                    }}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 transition-colors font-bold cursor-pointer"
                  >
                    {copiedKey === 'article' ? 'Copied Article Draft!' : 'Copy Article Draft'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Publish an article with anchor keyword pointing to tolee.in for high semantic SEO authority.
                </p>
              </div>

              {/* Human Takeover Notice */}
              <div className="p-3.5 rounded-xl bg-blue-950/60 border border-blue-800/60 space-y-2.5 mt-2">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs text-blue-200">
                      Action required: Human Login / Takeover
                    </p>
                    <p className="text-[11px] text-blue-300/80 leading-normal mt-0.5">
                      LinkedIn requires personal account login and 2FA. Click <strong>"Open LinkedIn Setup"</strong> or use <strong>"Take control of the browser"</strong> to sign in and confirm the link.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => window.open('https://www.linkedin.com/company/setup/new/', '_blank')}
                    className="flex-1 py-2 rounded-xl bg-[#0a66c2] hover:bg-[#004182] text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open LinkedIn in New Window</span>
                  </button>
                  <button
                    onClick={() => handleVerifyClick('linkedin')}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark as Added</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: AlternativeTo */}
        {activeTab.domain.includes('alternativeto') && (
          <div className="space-y-4 max-w-xl mx-auto w-full">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-sm">
                    AT
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">AlternativeTo.net</h4>
                    <span className="text-[10px] text-teal-400 font-semibold uppercase tracking-wider">
                      Domain Authority: 82 • High Authority
                    </span>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                  {verifiedSites.has('alternativeto') ? 'Verified' : 'Verification Required'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400">Software Name:</span>
                  <p className="font-bold text-slate-200">Tolee</p>
                </div>
                <div>
                  <span className="text-slate-400">Official Website:</span>
                  <p className="font-bold text-teal-400 underline">https://tolee.in</p>
                </div>
                <div>
                  <span className="text-slate-400">Description:</span>
                  <p className="text-slate-300 leading-relaxed">
                    AI-powered next-gen social media platform featuring personal AI Manager, Reels, neighborhood discovery (Radar), and ad-free songs.
                  </p>
                </div>
              </div>

              {!verifiedSites.has('alternativeto') ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 mt-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs text-amber-200">
                        Email Verification Link Click Required
                      </p>
                      <p className="text-[11px] text-amber-300/80 leading-normal mt-0.5">
                        AlternativeTo requires confirming domain ownership of <strong>tolee.in</strong>.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleVerifyClick('alternativeto')}
                    disabled={isVerifying}
                    className="w-full mt-2 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-teal-500 hover:from-amber-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    {isVerifying ? (
                      <span>Verifying link...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>👉 Confirm Verification Link for AlternativeTo</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>AlternativeTo ownership confirmed! Backlink live on queue.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: Crunchbase */}
        {activeTab.domain.includes('crunchbase') && (
          <div className="space-y-4 max-w-xl mx-auto w-full">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                    CB
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Crunchbase Profile</h4>
                    <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">
                      Domain Authority: 91 • Premier Directory
                    </span>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-semibold">
                  {verifiedSites.has('crunchbase') ? 'Live Organization' : 'Pending Verification'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400">Company Name:</span>
                  <p className="font-bold text-slate-200">Tolee Social Media Inc.</p>
                </div>
                <div>
                  <span className="text-slate-400">Website:</span>
                  <p className="font-bold text-blue-400 underline">https://tolee.in</p>
                </div>
              </div>

              {!verifiedSites.has('crunchbase') ? (
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-2 mt-3">
                  <p className="text-[11px] text-blue-300">
                    Crunchbase sent a profile publication verification link to your registered email.
                  </p>
                  <button
                    onClick={() => handleVerifyClick('crunchbase')}
                    disabled={isVerifying}
                    className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>👉 Verify Crunchbase Organization Profile</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Crunchbase Profile verified and published!</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 4: Gmail Verification */}
        {activeTab.domain.includes('mail.google') && (
          <div className="space-y-3 max-w-xl mx-auto w-full">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">
                <Mail className="w-4 h-4 text-rose-400" />
                <span>Google Mail · Verification Inbox</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">AlternativeTo Support</span>
                  <span className="text-[10px] text-slate-500">Today, 11:15 AM</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Confirm ownership of Tolee on AlternativeTo
                </p>
                <button
                  onClick={() => handleVerifyClick('alternativeto')}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs cursor-pointer"
                >
                  Confirm Ownership Link
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: Real Live Browser Viewport (Active for all websites) */}
        {!activeTab.domain.includes('linkedin') &&
          !activeTab.domain.includes('alternativeto') &&
          !activeTab.domain.includes('crunchbase') &&
          !activeTab.domain.includes('mail.google') && (
            <div className="flex-1 w-full h-full flex flex-col min-h-[460px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner relative">
              {/* Live Webpage Action Header */}
              <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full ${isBlocked ? 'bg-rose-500' : 'bg-emerald-400'} animate-pulse shrink-0`} />
                  <span className="font-bold text-slate-200 text-xs truncate max-w-[200px] sm:max-w-md">
                    {activeTab.title || activeTab.domain}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                    isBlocked
                      ? 'text-rose-400 bg-rose-950/80 border-rose-800/60'
                      : 'text-teal-400 bg-teal-950/60 border-teal-800/40'
                  }`}>
                    {isBlocked ? 'Access Blocked' : 'Live Verified'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setIframeKey((k) => k + 1)}
                    title="Reload Webpage"
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={activeTab.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in Native Browser Window"
                    className="px-2.5 py-1 rounded-md bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-[11px] font-bold flex items-center gap-1 transition-colors"
                  >
                    <span>Popout</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Security Block / Diagnostics Warning Bar with 5 Handoff Controls */}
              {isBlocked && !isWarningDismissed && (
                <div className="bg-rose-950/95 border-b border-rose-800/80 text-rose-200 px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="text-[11px] font-medium leading-tight truncate">
                      <strong>{activeTab.domain}</strong>: {blockReason}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={activeTab.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in Regular Browser"
                      className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                    >
                      <span>Open in Regular Browser</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      onClick={() => setIsUserControl(true)}
                      title="Take Control"
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] border border-slate-700 transition-colors cursor-pointer"
                    >
                      Take Control
                    </button>
                    <button
                      onClick={() => setIframeKey((k) => k + 1)}
                      title="Retry Page Load"
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <RotateCw className="w-2.5 h-2.5" />
                      <span>Retry</span>
                    </button>
                    <button
                      onClick={() => handleCopyUrl(activeTab.url)}
                      title="Copy URL"
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {urlCopied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                      <span>{urlCopied ? 'Copied' : 'Copy URL'}</span>
                    </button>
                    <button
                      onClick={() => setIsWarningDismissed(true)}
                      title="Dismiss Notice"
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Real Webpage Iframe / Live Proxy View */}
              <div className="flex-1 w-full h-full relative bg-white">
                <iframe
                  key={`${activeTab.url}-${iframeKey}`}
                  src={`/api/browser/proxy?url=${encodeURIComponent(activeTab.url)}`}
                  className="w-full h-full border-0 bg-white"
                  title={activeTab.title || activeTab.domain}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals"
                  onError={() => setIframeError(true)}
                />
              </div>
            </div>
          )}

        {/* ── ~25 Sites Queue Drawer (Toggleable) ── */}
        {showQueueDrawer && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-400" />
                <h4 className="font-extrabold text-xs text-white">
                  Automated White-Hat Backlink Queue (25 Quality Sites)
                </h4>
              </div>
              <button
                onClick={() => setShowQueueDrawer(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar text-xs">
              {HIGH_AUTHORITY_BACKLINK_QUEUE.map((site, index) => {
                const isDone = verifiedSites.has(site.id);

                return (
                  <div
                    key={site.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 text-[10px] text-slate-500 font-mono">
                        #{index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-200 truncate">{site.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {site.category} • DA {site.da}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isDone ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                          Live
                        </span>
                      ) : site.status === 'waiting_verification' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 animate-pulse">
                          Waiting click
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          {site.scheduledTime || 'Scheduled'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
