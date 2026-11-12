import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Shield, CheckCircle2, AlertTriangle, ArrowLeft, Heart, Lock, BookOpen } from 'lucide-react';
import { BeforeLoginFooter } from '@/components/landing/BeforeLoginFooter';

export const metadata: Metadata = {
  title: 'Community Guidelines | Tolee',
  description: 'Learn about Tolee community standards, minimum age requirements (13+), child safety, and rules for creators and businesses.',
};

export default function CommunityGuidelinesPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-zinc-100 font-sans flex flex-col justify-between">
      <div className="max-w-4xl mx-auto px-4 py-12 flex-1 w-full">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400 hover:underline mb-8 font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to Tolee
        </Link>

        <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 sm:p-12 shadow-sm space-y-8">
          <div className="border-b border-slate-100 dark:border-zinc-800 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 mb-3 border border-teal-500/20">
              <Shield className="w-3.5 h-3.5" /> Safety & Standards
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Tolee Community Guidelines
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">
              Last updated: November 2026 • Policy Version v1.0
            </p>
          </div>

          {/* Core Principles */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-teal-600 dark:text-teal-400">
              <Heart className="w-5 h-5" /> 1. Minimum Age & Child Safety (13+ Mandatory)
            </h2>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
              <strong>13+ Age Requirement:</strong> Tolee strictly requires all users to be at least <strong>13 years old</strong> to create an account or use our services. Account creation by individuals under the age of 13 is strictly prohibited. For minors aged 13 to 17, parental or legal guardian permission is required.
            </div>
            <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
              We maintain zero tolerance for any exploitation, endangerment, or inappropriate content involving minors. Review our complete{' '}
              <Link href="/child-safety" className="text-teal-600 dark:text-teal-400 font-bold underline">
                Child Safety Policy
              </Link>{' '}
              for additional protections and reporting procedures.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2 text-teal-600 dark:text-teal-400">
              <CheckCircle2 className="w-5 h-5" /> 2. Respectful & Authentic Community
            </h2>
            <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
              Tolee connects local communities, creators, and businesses across India and globally. We ask every member to treat others with respect, kindness, and integrity:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-zinc-300 pl-2">
              <li><strong>No Harassment or Bullying:</strong> Do not attack, threaten, or intimidate any person or group.</li>
              <li><strong>No Hate Speech:</strong> Content promoting discrimination, hatred, or violence based on religion, caste, ethnicity, gender, sexual orientation, or disability is strictly prohibited.</li>
              <li><strong>No Misinformation or Scams:</strong> Fraudulent schemes, deceptive financial promotions, or coordinated disinformation will result in immediate permanent suspension.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2 text-teal-600 dark:text-teal-400">
              <Lock className="w-5 h-5" /> 3. Privacy, Consent & Intellectual Property
            </h2>
            <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
              Respect the personal privacy and intellectual work of others:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-zinc-300 pl-2">
              <li>Never publish someone else’s private contact details, photos, or confidential documents without explicit permission (Doxxing).</li>
              <li>Share original content or content you have the right to post. Credit creators and respect trademarks.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2 text-teal-600 dark:text-teal-400">
              <AlertTriangle className="w-5 h-5" /> 4. Enforcement & Reporting
            </h2>
            <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
              Violations of these guidelines may result in content removal, feature restrictions, or permanent account bans. You can report any violating post, reel, or comment using the three-dot menu on any post.
            </p>
          </section>

          {/* Legal Links Footer */}
          <div className="pt-6 border-t border-slate-100 dark:border-zinc-800 flex flex-wrap gap-4 text-xs font-semibold text-slate-500 dark:text-zinc-400">
            <span>Related Legal Policies:</span>
            <Link href="/terms" className="text-teal-600 dark:text-teal-400 hover:underline">
              Terms & Conditions
            </Link>
            <span>•</span>
            <Link href="/privacy" className="text-teal-600 dark:text-teal-400 hover:underline">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/child-safety" className="text-teal-600 dark:text-teal-400 hover:underline">
              Child Safety Standards
            </Link>
          </div>
        </div>
      </div>
      <BeforeLoginFooter />
    </div>
  );
}
