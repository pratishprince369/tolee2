import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicWorldProject } from '@/actions/world';
import RestaurantClient from './RestaurantClient';
import { generateBreadcrumbSchema } from '@/lib/seo/schemaGenerator';

interface PageProps {
  params: Promise<{ slug: string }> | { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = params instanceof Promise ? await params : params;
  const project = await getPublicWorldProject(resolved.slug, 'RESTAURANT');
  if (!project) return { title: 'Restaurant Not Found | Tolee' };

  const title = project.seoTitle || `${project.name} | Tolee Restaurant & Menu`;
  const description = project.seoDesc || project.description || `View menu, dishes, and order from ${project.name} on Tolee World.`;
  const image = project.bannerImage || 'https://tolee.in/logo.png';

  return {
    title,
    description,
    keywords: project.seoKeywords ? project.seoKeywords.split(',') : undefined,
    alternates: {
      canonical: `https://tolee.in/restaurant/${resolved.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://tolee.in/restaurant/${resolved.slug}`,
      siteName: 'Tolee Dining',
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: project.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    robots: {
      index: project.status === 'published',
      follow: project.status === 'published',
      googleBot: {
        index: project.status === 'published',
        follow: project.status === 'published',
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function PublicRestaurantPage({ params }: PageProps) {
  const resolved = params instanceof Promise ? await params : params;
  const project = await getPublicWorldProject(resolved.slug, 'RESTAURANT');

  if (!project) {
    notFound();
  }

  const jsonLdRestaurant = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": project.name,
    "description": project.description || `Restaurant ${project.name} on Tolee`,
    "url": `https://tolee.in/restaurant/${project.slug}`,
    "image": project.bannerImage || "https://tolee.in/logo.png",
    ...(project.locationText ? {
      "address": {
        "@type": "PostalAddress",
        "addressLocality": project.locationText,
        "addressCountry": "IN"
      }
    } : {}),
    ...(project.latitude && project.longitude ? {
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": project.latitude,
        "longitude": project.longitude
      }
    } : {})
  };

  const jsonLdBreadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Tolee World', url: '/world' },
    { name: project.name, url: `/restaurant/${project.slug}` }
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdRestaurant) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
      />
      <RestaurantClient project={project} />
    </>
  );
}
