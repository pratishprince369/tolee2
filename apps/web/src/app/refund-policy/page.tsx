import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cancellation and Refund Policy | Tolee',
  description: 'Understand the cancellation, refund, and replacement terms for Tolee digital services, including the Tolee Unlimited Boost Membership.',
  alternates: {
    canonical: 'https://tolee.in/refund-policy',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RefundPolicy() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">
        Cancellation &amp; Refund Policy
      </h1>
      <p className="text-sm text-gray-500 dark:text-zinc-400 mb-8">
        Last updated: October 22, 2026
      </p>

      <div className="prose dark:prose-invert max-w-none space-y-8 text-gray-600 dark:text-gray-300 font-sans leading-relaxed text-sm sm:text-base">
        <section className="space-y-3">
          <p>
            Thank you for choosing <strong>Tolee</strong> (<Link href="/" className="text-[#0E9F9A] hover:underline">https://tolee.in</Link>). We strive to provide transparent, fair, and reliable digital services, including our <strong>Tolee Unlimited Boost Membership</strong>, ad campaign features, and community tools.
          </p>
          <p>
            Please read this policy carefully to understand your rights and our practices regarding cancellations and refunds.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-zinc-800 pb-2">
            1. Nature of Digital Services
          </h2>
          <p>
            Tolee delivers digital subscriptions, intangible SaaS features, and promotional entitlements (such as the 6-Month Unlimited Boost Membership at ₹500). Because digital entitlements are activated immediately upon confirmed payment, standard physical return policies do not apply.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-zinc-800 pb-2">
            2. Cancellation Policy
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Membership Subscriptions:</strong> Tolee memberships do not carry hidden recurring auto-debits without explicit consent. Your membership is active for the full paid period (180 days). You may choose not to renew at the end of the duration without any cancellation penalty.
            </li>
            <li>
              <strong>Immediate Cancellation Requests:</strong> If you purchased a Boost Membership by mistake and have not boosted any posts or launched any campaigns, you may submit a cancellation request within <strong>24 hours</strong> of the transaction.
            </li>
            <li>
              <strong>Post-Usage Cancellations:</strong> Once post boosts, ad distributions, or referral rewards have been actively consumed on your account, the membership fee becomes non-refundable.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-zinc-800 pb-2">
            3. Refund Method — Credit to Tolee Ads Wallet
          </h2>
          <p>
            All approved refunds, service adjustments, and compensation amounts are credited in digital form directly to your <strong>Tolee Ads Wallet</strong> balance.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Digital Wallet Credits:</strong> Once credited to your Ads Wallet, the digital balance never expires and can be seamlessly utilized in the future for:
              <ul className="list-circle list-inside ml-5 mt-1 space-y-1 text-gray-500 dark:text-zinc-400">
                <li>Creating targeted ad campaigns in Tolee Ads Manager</li>
                <li>Boosting posts, reels, and business listings</li>
                <li>Participating in special promotional events and platform offers</li>
              </ul>
            </li>
            <li>
              <strong>Duplicate Technical Deductions:</strong> If your bank or UPI was charged multiple times for the exact same order due to a network glitch, the extra duplicate transaction is reversed back to the original bank/card/UPI payment source via our gateway (Razorpay) within 5–7 business days.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-zinc-800 pb-2">
            4. Refund Eligibility &amp; Processing Timeline
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Review Window:</strong> All refund requests submitted to our support team are reviewed within <strong>24 to 48 business hours</strong>.
            </li>
            <li>
              <strong>Instant Digital Wallet Credit:</strong> Upon approval, the refunded amount is credited to your Tolee Ads Wallet immediately, allowing you to use it right away for future promotions.
            </li>
            <li>
              <strong>Duplicate Banking Reversals:</strong> For verified duplicate debits, the refund reflects in your bank/card statement within <strong>5 to 7 business days</strong> depending on your bank&apos;s processing cycle.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-zinc-800 pb-2">
            5. How to Request a Refund
          </h2>
          <p>
            To submit a cancellation or refund request, please contact our support desk with your transaction details:
          </p>
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 space-y-1.5 text-xs sm:text-sm">
            <p><strong>Email:</strong> <a href="mailto:support@tolee.in" className="text-[#0E9F9A] hover:underline">support@tolee.in</a></p>
            <p><strong>Support Page:</strong> <Link href="/contact" className="text-[#0E9F9A] hover:underline">https://tolee.in/contact</Link></p>
            <p><strong>Required Details:</strong> Registered Email, Order ID (e.g. BM_...), and Razorpay Payment ID.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
