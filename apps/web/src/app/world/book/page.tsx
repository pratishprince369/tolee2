import React from 'react';
import { Metadata } from 'next';
import { ToleeBookClient } from '@/tools/tolee-book/components/ToleeBookClient';

export const metadata: Metadata = {
  title: 'Tolee Book & Smart Reader | Tolee World',
  description: 'Explore thousands of free e-books, classics, philosophy and science books with AI summaries, personalized bookmarks, and customizable reading modes.'
};

export default function ToleeBookPage() {
  return <ToleeBookClient />;
}
