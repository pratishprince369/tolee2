import React from 'react';
import type { Metadata } from 'next';
import { DownloadLandingPage } from './DownloadLandingPage';

export const metadata: Metadata = {
  title: "Download Tolee App | Connect, Create, Belong & Boost Your Business",
  description: "Get Free Boosting for 6 Months on Tolee! Download Tolee App now on Google Play Store to boost your products, grow your business, and connect with local communities.",
  keywords: ["Tolee App", "Download Tolee", "Google Play Store", "Free Boosting", "Local Community App", "Tolee India"],
  alternates: {
    canonical: "https://tolee.in/download",
  },
  openGraph: {
    title: "Download Tolee App – Get Free Boosting for 6 Months",
    description: "Boost your product, grow your business, get more reach, and build your local community on Tolee. Available on Google Play Store.",
    url: "https://tolee.in/download",
    siteName: "Tolee",
    images: [
      {
        url: "https://tolee.in/tolee-boost-poster.jpg",
        width: 1080,
        height: 1080,
        alt: "Download Tolee App on Google Play Store",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Download Tolee App – Get Free Boosting for 6 Months",
    description: "Boost your product, grow your business, get more reach, and build your local community on Tolee.",
    images: ["https://tolee.in/tolee-boost-poster.jpg"],
  },
};

export default function DownloadPage() {
  return <DownloadLandingPage />;
}
