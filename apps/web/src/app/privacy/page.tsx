import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Tolee',
  description: 'Learn how Tolee protects and respects your personal privacy, data security, and community information.',
  alternates: {
    canonical: 'https://tolee.in/privacy',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-600 dark:text-gray-400 font-sans">
        <p>Last updated: May 13, 2026</p>
        
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">1. Information We Collect</h2>
          <p>We collect information you provide directly to us, such as when you create an account, join a Tolee, post content, or communicate with us. This may include your name, email address, username, profile picture, and any other information you choose to provide.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">2. How We Use Your Information</h2>
          <p>We use the information we collect to provide, maintain, and improve our services, to personalize your experience, and to communicate with you about your account and our services.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">3. Sharing of Information</h2>
          <p>We do not share your personal information with third parties except as described in this policy, such as with your consent or to comply with legal obligations.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">4. Security</h2>
          <p>We take reasonable measures to help protect your information from loss, theft, misuse, and unauthorized access.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">5. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at privacy@tolee.in.</p>
        </section>
      </div>
    </div>
  );
}
