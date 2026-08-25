import ContactClient from './ContactClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us | Tolee Support & Feedback',
  description: 'Have queries, feedback, or complaints? Reach out directly to the Tolee leadership and support team.',
  alternates: {
    canonical: 'https://tolee.in/contact',
  },
  openGraph: {
    title: 'Contact Us | Tolee Support & Feedback',
    description: 'Have queries, feedback, or complaints? Reach out directly to the Tolee team.',
    url: 'https://tolee.in/contact',
    siteName: 'Tolee',
    images: [{ url: 'https://tolee.in/logo.png', width: 1200, height: 630, alt: 'Contact Tolee' }],
    type: 'website',
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
