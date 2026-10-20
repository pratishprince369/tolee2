'use client';

import React, { useState } from 'react';
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
  ChevronDown,
  ListOrdered,
  Sparkles,
} from 'lucide-react';
import { BacklinkSite, HIGH_AUTHORITY_BACKLINK_QUEUE } from '@/modules/tolee-ai-agent/browser/backlink-engine';

interface BrowserTab {
  id: string;
  title: string;
  domain: string;
  url: string;
  status: 'action_required' | 'waiting_verification' | 'ready';
}

interface LiveBrowserOperatorCanvasProps {
  onClose: () => void;
  onStopTask?: () => void;
  onVerifyLink?: (siteId: string) => Promise<void>;
  targetDomain?: string;
  initialUrl?: string;
}

export function LiveBrowserOperatorCanvas({
  onClose,
  onStopTask,
  onVerifyLink,
  targetDomain = 'alternativeto.net',
  initialUrl = 'https://mail.google.com',
}: LiveBrowserOperatorCanvasProps) {
  const [tabs, setTabs] = useState<BrowserTab[]>([
    {
      id: 'crunchbase',
      title: 'crunchbase.com',
      domain: 'crunchbase.com',
      url: 'https://www.crunchbase.com/organization/tolee',
      status: 'waiting_verification',
    },
    {
      id: 'alternativeto',
      title: 'alternativeto.net',
      domain: 'alternativeto.net',
      url: 'https://alternativeto.net/software/tolee/',
      status: 'action_required',
    },
    {
      id: 'gmail',
      title: 'mail.google.com',
      domain: 'mail.google.com',
      url: 'https://mail.google.com/mail/u/0/#inbox',
      status: 'ready',
    },
  ]);

  const [activeTabId, setActiveTabId] = useState<string>('alternativeto');
  const [isUserControl, setIsUserControl] = useState<boolean>(false);
  const [verifiedSites, setVerifiedSites] = useState<Set<string>>(new Set());
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [showQueueDrawer, setShowQueueDrawer] = useState<boolean>(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[1];

  const handleVerifyClick = async (siteId: string) => {
    setIsVerifying(true);
    try {
      if (onVerifyLink) {
        await onVerifyLink(siteId);
      }
      setVerifiedSites((prev) => new Set([...prev, siteId]));
      // Update tab status
      setTabs((prev) =>
        prev.map((t) =>
          t.id === siteId ? { ...t, status: 'ready' as const } : t
        )
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 font-sans select-none overflow-hidden border-l border-slate-700/80 shadow-2xl">
      {/* ── 1. Top Header: Action Required & Controls (Exact Muse Layout) ── */}
      <div className="bg-slate-950 px-3 py-2.5 flex items-center justify-between border-b border-slate-800 gap-2 shrink-0">
        {/* Left: Action Required Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xs text-white tracking-tight">
                Action required
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
              <span>Waiting for you · {activeTab.domain}</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
            </p>
          </div>
        </div>

        {/* Right: Actions (Stop, Take control, Close) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onStopTask && (
            <button
              onClick={onStopTask}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/60 transition-colors cursor-pointer"
            >
              Stop
            </button>
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
              <span className="truncate">{tab.domain}</span>
            </button>
          );
        })}

        {/* View ~25 Queue Sites Toggle */}
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
          <button className="p-1 hover:text-white rounded transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 hover:text-white rounded transition-colors">
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 hover:text-white rounded transition-colors">
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* URL Pill */}
        <div className="flex-1 flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-mono">
          <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="truncate">{activeTab.url}</span>
        </div>
      </div>

      {/* ── User Control Active Notice Banner ── */}
      {isUserControl && (
        <div className="bg-blue-600/90 text-white px-3 py-1 text-xs font-semibold flex items-center justify-between shrink-0">
          <span>🎮 Direct browser control active. Click the verification link to proceed.</span>
          <button
            onClick={() => setIsUserControl(false)}
            className="text-[11px] underline font-bold"
          >
            Done
          </button>
        </div>
      )}

      {/* ── 4. Live Browser Canvas / Viewport ── */}
      <div className="flex-1 bg-slate-950 p-4 overflow-y-auto relative flex flex-col justify-between">
        {/* TAB: AlternativeTo */}
        {activeTabId === 'alternativeto' && (
          <div className="space-y-4 max-w-xl mx-auto w-full">
            {/* AlternativeTo Header Mock */}
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

              {/* Tolee Listing Details Pre-filled */}
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
                  <span className="text-slate-400">Category & Alternatives:</span>
                  <p className="text-slate-300">Social Networking • Alternative to Instagram, X (Twitter), TikTok</p>
                </div>
                <div>
                  <span className="text-slate-400">Description:</span>
                  <p className="text-slate-300 leading-relaxed">
                    AI-powered next-gen social media platform featuring personal AI Manager, Reels, neighborhood discovery (Radar), ad-free songs streaming, and creator monetization.
                  </p>
                </div>
              </div>

              {/* Human-in-the-Loop Action Card */}
              {!verifiedSites.has('alternativeto') ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 mt-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs text-amber-200">
                        Email Verification Link Click Required
                      </p>
                      <p className="text-[11px] text-amber-300/80 leading-normal mt-0.5">
                        AlternativeTo requires a human confirmation click on their email link to verify domain ownership of <strong>tolee.in</strong>.
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

        {/* TAB: Crunchbase */}
        {activeTabId === 'crunchbase' && (
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
                <div>
                  <span className="text-slate-400">Headquarters & Sector:</span>
                  <p className="text-slate-300">India • Social Media, Artificial Intelligence, Creator Economy</p>
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

        {/* TAB: Gmail Verification Simulation */}
        {activeTabId === 'gmail' && (
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
                <p className="text-[11px] text-slate-300 leading-relaxed pt-1">
                  Hi Team Tolee, please confirm that you manage the domain <strong>tolee.in</strong> to complete the software listing.
                </p>
                <button
                  onClick={() => handleVerifyClick('alternativeto')}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs"
                >
                  Confirm Ownership Link
                </button>
              </div>
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
