'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, BellRing, Check, ChevronDown } from 'lucide-react';
import { toggleSubscription, updateBellPreference, getSubscriptionStatus } from '@/actions/creator';

interface SubscribeButtonProps {
  creatorId: string;
  initialSubscribed?: boolean;
  initialBellPreference?: string | null;
  initialCount?: number;
  compact?: boolean; // For feed/reels compact display
  showCount?: boolean;
  className?: string;
  onSubscribeChange?: (subscribed: boolean) => void;
}

export function SubscribeButton({
  creatorId,
  initialSubscribed = false,
  initialBellPreference = null,
  initialCount = 0,
  compact = false,
  showCount = false,
  className = '',
  onSubscribeChange
}: SubscribeButtonProps) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [bellPref, setBellPref] = useState<string | null>(initialBellPreference);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [showBellMenu, setShowBellMenu] = useState(false);
  const bellMenuRef = useRef<HTMLDivElement>(null);

  // Load subscription status on mount if not provided
  useEffect(() => {
    if (!initialSubscribed && creatorId) {
      getSubscriptionStatus(creatorId).then(res => {
        if (res.success) {
          setSubscribed(res.subscribed);
          setBellPref(res.bellPreference);
        }
      });
    }
  }, [creatorId, initialSubscribed]);

  // Close bell menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellMenuRef.current && !bellMenuRef.current.contains(e.target as Node)) {
        setShowBellMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubscribeToggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await toggleSubscription(creatorId);
      if (res.success) {
        setSubscribed(res.subscribed!);
        setCount(prev => res.subscribed ? prev + 1 : Math.max(0, prev - 1));
        if (onSubscribeChange) {
          onSubscribeChange(res.subscribed!);
        }
        if (res.subscribed) {
          setBellPref('ALL');
        } else {
          setBellPref(null);
          setShowBellMenu(false);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBellChange = async (pref: 'ALL' | 'PERSONALIZED' | 'NONE') => {
    try {
      const res = await updateBellPreference(creatorId, pref);
      if (res.success) {
        setBellPref(pref);
      }
    } catch (err) {
      console.error(err);
    }
    setShowBellMenu(false);
  };

  const BellIcon = bellPref === 'ALL' ? BellRing : bellPref === 'PERSONALIZED' ? Bell : BellOff;

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <button
          onClick={handleSubscribeToggle}
          disabled={loading}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 active:scale-95 ${
            subscribed
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              : 'bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-500/20'
          }`}
        >
          {loading ? (
            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : subscribed ? (
            <><Check className="w-3 h-3" /> Subscribed</>
          ) : (
            'Subscribe'
          )}
        </button>

        {subscribed && (
          <div className="relative" ref={bellMenuRef}>
            <button
              onClick={() => setShowBellMenu(!showBellMenu)}
              className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <BellIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </button>
            {showBellMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                {[
                  { value: 'ALL', label: 'All notifications', icon: BellRing, desc: 'Get notified for every upload' },
                  { value: 'PERSONALIZED', label: 'Personalized', icon: Bell, desc: 'Occasional notifications' },
                  { value: 'NONE', label: 'None', icon: BellOff, desc: 'No notifications' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleBellChange(opt.value as any)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${
                      bellPref === opt.value ? 'bg-zinc-50 dark:bg-zinc-800' : ''
                    }`}
                  >
                    <opt.icon className={`w-4 h-4 ${bellPref === opt.value ? 'text-red-500' : 'text-zinc-400'}`} />
                    <div>
                      <div className={`text-[12px] font-semibold ${bellPref === opt.value ? 'text-red-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
                        {opt.label}
                      </div>
                      <div className="text-[10px] text-zinc-400">{opt.desc}</div>
                    </div>
                    {bellPref === opt.value && <Check className="w-3.5 h-3.5 text-red-500 ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {showCount && <span className="text-[11px] text-zinc-500 font-medium">{formatCount(count)}</span>}
      </div>
    );
  }

  // Full-size button (for profile page)
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handleSubscribeToggle}
        disabled={loading}
        className={`flex items-center justify-center gap-1.5 font-semibold text-[13px] py-2.5 px-5 rounded-full transition-all duration-200 active:scale-95 shadow-sm ${
          subscribed
            ? 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            : 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'
        }`}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : subscribed ? (
          <><Check className="w-4 h-4" /> Subscribed</>
        ) : (
          'Subscribe'
        )}
      </button>

      {subscribed && (
        <div className="relative" ref={bellMenuRef}>
          <button
            onClick={() => setShowBellMenu(!showBellMenu)}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors"
          >
            <BellIcon className="w-4.5 h-4.5 text-zinc-600 dark:text-zinc-400" />
          </button>
          {showBellMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Notifications</span>
              </div>
              {[
                { value: 'ALL', label: 'All', icon: BellRing, desc: 'Get notified for every new video' },
                { value: 'PERSONALIZED', label: 'Personalized', icon: Bell, desc: 'Only recommended uploads' },
                { value: 'NONE', label: 'None', icon: BellOff, desc: 'Turn off notifications' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleBellChange(opt.value as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${
                    bellPref === opt.value ? 'bg-red-50/50 dark:bg-red-950/10' : ''
                  }`}
                >
                  <opt.icon className={`w-5 h-5 ${bellPref === opt.value ? 'text-red-500' : 'text-zinc-400 dark:text-zinc-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-semibold ${bellPref === opt.value ? 'text-red-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
                      {opt.label}
                    </div>
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight">{opt.desc}</div>
                  </div>
                  {bellPref === opt.value && <Check className="w-4 h-4 text-red-500 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showCount && count > 0 && (
        <span className="text-[12px] text-zinc-500 dark:text-zinc-400 font-medium ml-1">
          {formatCount(count)} subscribers
        </span>
      )}
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}
