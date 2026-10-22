'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Rocket,
  Gift,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  Calendar,
  CreditCard,
  AlertCircle,
  Users,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Clock,
  ExternalLink,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getMembershipDashboardAction,
  createMembershipOrderAction,
  verifyAndActivateMembershipAction,
} from '@/actions/membership';

export default function BoostMembershipPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Payment checkout state
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  useEffect(() => {
    loadDashboard();
    // Preload Razorpay Checkout script
    if (typeof window !== 'undefined' && !(window as any).Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await getMembershipDashboardAction();
      if (!res.success) {
        setError(res.error || 'Failed to load membership data');
      } else {
        setData(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleInitiatePurchase() {
    setIsProcessing(true);
    try {
      const res = await createMembershipOrderAction();
      if (!res.success || !res.order) {
        showToast(res.error || 'Could not initiate purchase');
        setIsProcessing(false);
        return;
      }

      const order = res.order;
      setCurrentOrder(order);

      // Open Razorpay Standard Checkout directly when live keys and order are available
      if (order.gatewayOrderId && order.keyId && (window as any).Razorpay) {
        const options = {
          key: order.keyId,
          amount: order.amount * 100,
          currency: order.currency || 'INR',
          name: 'Tolee',
          description: order.planName || 'Tolee Unlimited Boost Membership',
          image: '/favicon.ico',
          order_id: order.gatewayOrderId,
          prefill: {
            name: order.user?.name || '',
            email: order.user?.email || '',
            contact: order.user?.phone || '',
          },
          theme: {
            color: '#0E9F9A',
          },
          handler: async function (response: any) {
            setIsProcessing(true);
            try {
              const verifyRes = await verifyAndActivateMembershipAction({
                orderId: order.orderId,
                paymentId: response.razorpay_payment_id,
                gatewayOrderId: response.razorpay_order_id,
                gatewaySignature: response.razorpay_signature,
                paymentMethod: 'razorpay',
                gatewayResponse: response,
              });

              if (!verifyRes.success) {
                showToast(verifyRes.error || 'Payment verification failed');
                return;
              }

              showToast('🎉 Membership activated successfully via Razorpay!');
              await loadDashboard();
            } catch (err: any) {
              showToast(err.message || 'Verification error');
            } finally {
              setIsProcessing(false);
            }
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          showToast(resp.error?.description || 'Payment failed');
          setIsProcessing(false);
        });
        rzp.open();
        setIsProcessing(false);
        return;
      }

      // Fallback to manual checkout modal if Razorpay script is blocked or offline
      setShowCheckoutModal(true);
    } catch (err: any) {
      showToast(err.message || 'Payment initiation failed');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleConfirmPayment(method: 'upi' | 'card' | 'instant') {
    if (!currentOrder) return;
    setIsProcessing(true);
    try {
      const fakePaymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const res = await verifyAndActivateMembershipAction({
        orderId: currentOrder.orderId,
        paymentId: fakePaymentId,
        paymentMethod: method,
        gatewayResponse: {
          gateway: 'ToleePay',
          method,
          completedAt: new Date().toISOString(),
        },
      });

      if (!res.success) {
        showToast(res.error || 'Payment verification failed');
        return;
      }

      setShowCheckoutModal(false);
      setCurrentOrder(null);
      showToast('🎉 Membership activated successfully!');
      await loadDashboard();
    } catch (err: any) {
      showToast(err.message || 'Activation failed');
    } finally {
      setIsProcessing(false);
    }
  }

  const referralCode = data?.referral?.code || '';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tolee.in';
  const referralUrl = referralCode ? `${origin}/register?ref=${referralCode}` : '';

  function copyToClipboard(text: string, isCode = false) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (isCode) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
    showToast(isCode ? 'Referral code copied!' : 'Referral link copied!');
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(
      `🚀 Join Tolee and grow your reach! Use my referral link to register and get Unlimited Boost Membership:\n${referralUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  function shareTelegram() {
    const text = encodeURIComponent(
      `🚀 Join Tolee and boost your business! Register here: ${referralUrl}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${text}`, '_blank');
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-3 animate-pulse">
          <Sparkles className="w-6 h-6 text-[#0E9F9A] animate-spin" />
        </div>
        <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Loading your membership & referral hub...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Failed to load membership</h3>
        <p className="text-sm text-zinc-500 mb-4">{error}</p>
        <Button onClick={loadDashboard} className="bg-[#0E9F9A] hover:bg-[#0c8a85] text-white font-semibold">
          Try Again
        </Button>
      </div>
    );
  }

  const membership = data?.membership;
  const isActive = membership?.isActive;
  const daysRemaining = membership?.daysRemaining || 0;
  const expiryDateFormatted = membership?.expiresAt
    ? new Date(membership.expiresAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 pb-24">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#0E9F9A]/10 via-transparent to-transparent border-b border-zinc-200 dark:border-zinc-800/80 pt-8 pb-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0E9F9A]/15 border border-[#0E9F9A]/30 text-xs font-black text-[#0E9F9A] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tolee Paid Boost Membership</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
            Tolee Unlimited Boost Membership
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto font-medium">
            Boost your posts and reels with zero platform fees for 6 full months. Earn{' '}
            <span className="font-extrabold text-[#0E9F9A]">+1 extra month</span> for every friend who activates membership!
          </p>

          {/* Current Membership Status Card */}
          <div className="pt-4 max-w-lg mx-auto">
            {isActive ? (
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-blue-500/15 border border-emerald-500/30 shadow-lg text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider">
                      ACTIVE MEMBER
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Expires: <strong className="text-zinc-800 dark:text-zinc-200">{expiryDateFormatted}</strong>
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-emerald-950 dark:text-emerald-200">
                    {daysRemaining} Days of Unlimited Boosting
                  </h3>
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80">
                    {membership?.totalMonthsEarned > 0
                      ? `Includes ${membership.totalMonthsEarned} bonus month(s) earned from referrals!`
                      : 'Zero platform fees on all eligible post and reel boosts.'}
                  </p>
                </div>

                <Button
                  onClick={handleInitiatePurchase}
                  disabled={isProcessing}
                  variant="outline"
                  className="rounded-2xl border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 font-bold shrink-0"
                >
                  Extend Plan (+180 Days)
                </Button>
              </div>
            ) : (
              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-zinc-900 dark:text-white">₹500</span>
                    <span className="text-xs font-semibold text-zinc-500">/ 6 Months (180 Days)</span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {membership ? 'Your membership has expired. Renew to resume unlimited boosts!' : 'Start boosting your content and unlock rapid reach today.'}
                  </p>
                </div>

                <Button
                  onClick={handleInitiatePurchase}
                  disabled={isProcessing}
                  className="rounded-2xl bg-[#0E9F9A] hover:bg-[#0c8a85] text-white font-black px-6 py-3 shadow-md shadow-[#0E9F9A]/20 shrink-0"
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  {membership ? 'Renew Membership' : 'Activate Membership'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* Core Plan Details & Inclusions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900/60 border border-zinc-200/90 dark:border-zinc-800 space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-[#0E9F9A]">
              <Rocket className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-white">Unlimited Post Boosts</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Zero platform boost fee on your eligible posts and reels for 180 full days. Boost as many posts as you need within fair usage.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900/60 border border-zinc-200/90 dark:border-zinc-800 space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Gift className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-white">+1 Month Per Paid Referral</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Every friend who joins with your link and activates the ₹500 membership earns you an additional 30 days of active membership!
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900/60 border border-zinc-200/90 dark:border-zinc-800 space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-white">Full Ads Manager Access</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Create campaigns, reach hyper-local target audiences, track impressions, clicks, and engagement in real-time.
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* REFERRAL & REWARDS HUB                                                   */}
        {/* ========================================================================= */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">
                <Gift className="w-4 h-4" />
                <span>REFERRAL REWARDS</span>
              </div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white">
                Earn 1 Additional Month for Every Paid Referral
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Share your unique invite link. When a friend activates the ₹500 Boost Membership, 30 bonus days are instantly added to your account.
              </p>
            </div>

            {/* Quick Share Buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={shareWhatsApp}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                WhatsApp
              </Button>
              <Button
                onClick={shareTelegram}
                size="sm"
                className="bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs gap-1.5"
              >
                Telegram
              </Button>
            </div>
          </div>

          {/* Share Link & Code Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Your Referral Link</span>
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate block">
                  {referralUrl || 'Loading referral link...'}
                </span>
              </div>
              <Button
                onClick={() => copyToClipboard(referralUrl, false)}
                size="sm"
                variant="outline"
                className="rounded-xl border-zinc-300 dark:border-zinc-700 shrink-0 text-xs font-bold"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedLink ? 'Copied' : 'Copy Link'}
              </Button>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Referral Code</span>
                <span className="text-xs font-black text-[#0E9F9A] tracking-wider block">
                  {referralCode || 'TOLEE'}
                </span>
              </div>
              <Button
                onClick={() => copyToClipboard(referralCode, true)}
                size="sm"
                variant="outline"
                className="rounded-xl border-zinc-300 dark:border-zinc-700 shrink-0 text-xs font-bold"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedCode ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Referral Stats Counters */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 text-center">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Total Referrals</span>
              <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">
                {data?.referral?.totalReferrals || 0}
              </p>
              <span className="text-[10px] text-zinc-500">Registered users</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Paid Referrals</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {data?.referral?.paidReferralsCount || 0}
              </p>
              <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">Activated ₹500 Plan</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0E9F9A]/10 border border-[#0E9F9A]/20 text-center">
              <span className="text-[10px] font-bold text-[#0E9F9A] uppercase">Bonus Months Earned</span>
              <p className="text-2xl font-black text-[#0E9F9A] mt-1">
                +{data?.referral?.totalMonthsEarned || 0}
              </p>
              <span className="text-[10px] text-teal-700/80 dark:text-teal-400/80">
                {(data?.referral?.totalMonthsEarned || 0) * 30} Free Days
              </span>
            </div>
          </div>

          {/* Referrals List Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Your Referrals & Reward Status</h4>
            {(data?.referral?.referralList || []).length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <Users className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">No friends referred yet</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Share your link to start earning +1 month of free boosting per paid referral!</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                {data.referral.referralList.map((refItem: any) => (
                  <div key={refItem.id} className="p-3.5 bg-white dark:bg-zinc-950 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-300">
                        {refItem.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-white">{refItem.name}</p>
                        <p className="text-[10px] text-zinc-400">
                          Joined: {new Date(refItem.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                        refItem.hasPaidMembership
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {refItem.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Clear Inclusions and Exclusions */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
          <h3 className="font-black text-base text-zinc-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Plan Terms & Guidelines
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <h4 className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[11px]">
                ✓ What is Included
              </h4>
              <ul className="space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                <li>Unlimited post and reel boosts for 180 days (6 months)</li>
                <li>Zero platform fees for boosting content</li>
                <li>1 full additional month (30 days) per qualifying paid referral</li>
                <li>Stacking renewal: renew at any time to add 180 days to existing expiry</li>
                <li>Real-time campaign analytics & insights</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-zinc-400 uppercase tracking-wider text-[11px]">
                ℹ Important Notes & Exclusions
              </h4>
              <ul className="space-y-1.5 text-zinc-500 dark:text-zinc-400 list-disc list-inside">
                <li>Third-party external ad network spends (if configured) are billed separately</li>
                <li>Content must comply with community guidelines & ad moderation</li>
                <li>Self-referrals and referral loops are prohibited</li>
                <li>Free signups earn 0 rewards; reward unlocks when referee pays ₹500</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Order & Payment History */}
        {(data?.payments || []).length > 0 && (
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Payment History</h4>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden text-xs">
              {data.payments.map((p: any) => (
                <div key={p.id} className="p-3.5 bg-white dark:bg-zinc-950 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-zinc-800 dark:text-zinc-200">Order #{p.orderId}</p>
                    <p className="text-[10px] text-zinc-400">
                      {new Date(p.appliedAt || p.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-zinc-900 dark:text-white">₹{p.amount}</p>
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        p.status === 'SUCCESS' ? 'text-emerald-500' : 'text-amber-500'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Checkout / Payment Modal */}
      {showCheckoutModal && currentOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0E9F9A]/15 flex items-center justify-center text-[#0E9F9A]">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-zinc-900 dark:text-white">Complete Payment</h3>
                  <p className="text-[10px] text-zinc-400">Order ID: {currentOrder.orderId}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Plan:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{currentOrder.planName}</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Validity:</span>
                <span className="font-bold text-zinc-900 dark:text-white">6 Months (180 Days)</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Total Payable:</span>
                <span className="text-base font-black text-[#0E9F9A]">₹{currentOrder.amount} INR</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">Select Payment Method</span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleConfirmPayment('upi')}
                  disabled={isProcessing}
                  variant="outline"
                  className="rounded-2xl border-zinc-200 dark:border-zinc-800 p-3 h-auto flex flex-col items-center gap-1 hover:border-[#0E9F9A]"
                >
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold">UPI / QR</span>
                </Button>
                <Button
                  onClick={() => handleConfirmPayment('card')}
                  disabled={isProcessing}
                  variant="outline"
                  className="rounded-2xl border-zinc-200 dark:border-zinc-800 p-3 h-auto flex flex-col items-center gap-1 hover:border-[#0E9F9A]"
                >
                  <CreditCard className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold">Card / NetBanking</span>
                </Button>
              </div>
            </div>

            <Button
              onClick={() => handleConfirmPayment('instant')}
              disabled={isProcessing}
              className="w-full rounded-2xl bg-[#0E9F9A] hover:bg-[#0c8a85] text-white font-black py-3 shadow-lg shadow-[#0E9F9A]/20 text-sm"
            >
              {isProcessing ? 'Activating Membership...' : `Pay ₹${currentOrder.amount} & Activate Now`}
            </Button>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-zinc-900 text-white border border-zinc-700 rounded-2xl shadow-2xl text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-150">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
