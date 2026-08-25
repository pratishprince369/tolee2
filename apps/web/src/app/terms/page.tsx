import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions | Tolee',
  description: 'Review the terms and conditions for accessing and using the Tolee social platform, community features, and digital tools.',
  alternates: {
    canonical: 'https://tolee.in/terms',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsAndConditions() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-8">Terms and Conditions</h1>
      <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-600 dark:text-gray-400 font-sans">
        <p>Last updated: May 13, 2026</p>
        
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">1. Acceptance of Terms</h2>
          <p>By accessing or using Tolee, you agree to be bound by these Terms and Conditions and all applicable laws and regulations.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">2. User Content</h2>
          <p>You are responsible for the content you post on Tolee. You must not post content that is illegal, offensive, or violates the rights of others.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">3. Account Security</h2>
          <p>You are responsible for maintaining the confidentiality of your account and password and for restricting access to your account.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">4. Limitation of Liability</h2>
          <p>Tolee and its creators shall not be liable for any damages arising out of your use or inability to use the platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">5. Changes to Terms</h2>
          <p>We reserve the right to modify these terms at any time. Your continued use of the platform constitutes acceptance of the new terms.</p>
        </section>
      </div>
    </div>
  );
}
