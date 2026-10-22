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
            3. Refund Eligibility &amp; Conditions
          </h2>
          <p>A full or partial refund will be approved under the following conditions:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Duplicate or Erroneous Transactions:</strong> In the event of a technical issue or gateway network delay resulting in double charges for the same order, the extra charged amount will be refunded 100% automatically or upon notification.
            </li>
            <li>
              <strong>Payment Deducted but Plan Not Activated:</strong> If an amount was deducted from your bank/card/UPI account but the membership or wallet was not activated due to a technical failure, we will either manually activate your plan immediately or issue a 100% refund.
            </li>
            <li>
              <strong>Service Non-Delivery:</strong> If Tolee is unable to deliver the core paid features within 48 hours of payment verification, you are entitled to a full refund upon request.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-zinc-800 pb-2">
            4. Refund Processing Timeline
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              All refund requests are reviewed and processed by our billing team within <strong>24 to 48 business hours</strong>.
            </li>
            <li>
              Once approved, the refund is credited directly to the original payment source (Credit/Debit Card, UPI ID, or NetBanking bank account) through our payment gateway (Razorpay).
            </li>
            <li>
              Depending on your issuing bank, the refunded amount typically reflects in your statement within <strong>5 to 7 business days</strong>.
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
