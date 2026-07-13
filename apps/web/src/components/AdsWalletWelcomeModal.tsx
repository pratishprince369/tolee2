'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Sparkles, Wallet, Megaphone, Check, X, ArrowRight } from 'lucide-react';
import { checkAndInitializeWallet } from '@/actions/ads';

export function AdsWalletWelcomeModal() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [balance, setBalance] = useState(2500);

  useEffect(() => {
    // 1. Capture referral code from URL if present
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      if (ref) {
        localStorage.setItem('tolee_referred_by', ref);
      }
    }
  }, []);

  useEffect(() => {
    // 2. If user is logged in, attempt lazy initialization
    if (session?.user) {
      const userId = (session.user as any).id;
      if (!userId) return;

      const welcomeShownKey = `tolee_ads_welcome_shown_${userId}`;
      const hasShown = localStorage.getItem(welcomeShownKey);

      if (!hasShown) {
        const referredBy = localStorage.getItem('tolee_referred_by') || localStorage.getItem('tolee_referral_code') || undefined;
        
        checkAndInitializeWallet(referredBy).then((res) => {
          if (res.success) {
            setBalance(res.balance || 2500);
            // Trigger popup if it is a new initialization or not yet shown
            setIsOpen(true);
            // Clear referral once applied
            localStorage.removeItem('tolee_referred_by');
            localStorage.removeItem('tolee_referral_code');
            try {
              document.cookie = 'tolee_referral_code=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            } catch (cookieErr) {
              // Ignore cookie clearing errors
            }
          }
        });
      }
    }
  }, [session]);

  const handleClose = () => {
    if (session?.user) {
      const userId = (session.user as any).id;
      localStorage.setItem(`tolee_ads_welcome_shown_${userId}`, 'true');
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Full-screen overlay with inline styles to guarantee z-index and touch */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          padding: '12px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        }}
      >
        {/* ─── POPUP CARD — anchored to bottom like a sheet ─── */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '78vh',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'linear-gradient(to bottom, rgba(15,23,42,0.97), rgba(2,6,23,0.99))',
            color: '#ffffff',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            touchAction: 'pan-y',
          }}
        >
          {/* Pinned close button inside the card */}
          <button
            onClick={handleClose}
            aria-label="Close popup"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              zIndex: 10,
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#94a3b8',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
          {/* Decorative glows */}
          <div style={{ position: 'absolute', top: '-96px', left: '-96px', width: '192px', height: '192px', borderRadius: '50%', background: 'rgba(59,130,246,0.15)', filter: 'blur(48px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-96px', right: '-96px', width: '192px', height: '192px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', filter: 'blur(48px)', pointerEvents: 'none' }} />

          {/* ─── SCROLLABLE CONTENT ─── */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 20px',
              WebkitOverflowScrolling: 'touch',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {/* Header Icon */}
            <div style={{ margin: '0 auto', width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6, #10b981)', padding: '2px', boxShadow: '0 8px 24px rgba(59,130,246,0.15)' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '14px', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles style={{ width: '28px', height: '28px', color: '#34d399' }} />
              </div>
            </div>

            {/* Title */}
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <h2 style={{
                fontSize: '22px',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(90deg, #60a5fa, #818cf8, #34d399)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1.2,
              }}>
                Congratulations!
              </h2>
              <p style={{ marginTop: '10px', fontSize: '15px', fontWeight: 500, color: '#e2e8f0' }}>
                ₹{balance.toLocaleString('en-IN')} Promotional Credits Added!
              </p>
              <p style={{ marginTop: '4px', fontSize: '12px', color: '#94a3b8' }}>
                A brand new Tolee Ads Wallet has been credited to your account.
              </p>
            </div>

            {/* Features List */}
            <div style={{ marginTop: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', padding: '14px' }}>
              {[
                { label: 'Boost Posts & Listings', desc: 'Add a boost button to get 5x more engagements on posts and listings.', color: '#60a5fa', bg: 'rgba(59,130,246,0.15)' },
                { label: 'Promote Reels', desc: 'Get your short videos directly in front of active Tolee reel viewers.', color: '#818cf8', bg: 'rgba(99,102,241,0.15)' },
                { label: 'Meta-Style Ads Manager', desc: 'Target custom locations, interests, pincodes, and specific Tolee groups.', color: '#34d399', bg: 'rgba(16,185,129,0.15)' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: i > 0 ? '12px' : 0 }}>
                  <div style={{ marginTop: '3px', width: '20px', height: '20px', borderRadius: '50%', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check style={{ width: '12px', height: '12px', color: item.color }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>{item.label}</p>
                    <p style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4, marginTop: '2px' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <div style={{ marginTop: '16px', borderRadius: '12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', padding: '10px', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', fontWeight: 500, color: '#fbbf24', lineHeight: 1.4 }}>
                ⚠️ Promotional Wallet Credit: Non-withdrawable, used strictly for launching promotional campaigns inside Tolee.in.
              </p>
            </div>
          </div>

          {/* ─── STICKY ACTION BUTTONS — always visible at bottom ─── */}
          <div style={{
            padding: '16px 20px',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(2,6,23,0.95)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            flexShrink: 0,
            position: 'relative',
            zIndex: 2,
          }}>
            <button
              onClick={handleClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                borderRadius: '14px',
                background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                border: 'none',
                padding: '13px 20px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(59,130,246,0.2)',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Start Growing My Audience
              <ArrowRight style={{ width: '16px', height: '16px' }} />
            </button>
            
            <button
              onClick={() => { handleClose(); window.location.href = '/ads-manager'; }}
              style={{
                width: '100%',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '10px 20px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#cbd5e1',
                cursor: 'pointer',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              View Ads Manager & Wallet balance
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
