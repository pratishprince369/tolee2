import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicWorldProject } from '@/actions/world';
import { generateBreadcrumbSchema } from '@/lib/seo/schemaGenerator';
import { Globe, MapPin, Sparkles, Send, Phone, MessageSquare, ExternalLink, ArrowLeft, Star, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PageProps {
  params: Promise<{ slug: string }> | { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = params instanceof Promise ? await params : params;
  const project = await getPublicWorldProject(resolved.slug, 'WEBSITE');
  if (!project) return { title: 'Page Not Found | Tolee' };

  const title = project.seoTitle || `${project.name} | Tolee Micro-Website`;
  const description = project.seoDesc || project.description || `Discover ${project.name} on Tolee World.`;
  const image = project.bannerImage || 'https://tolee.in/logo.png';

  return {
    title,
    description,
    keywords: project.seoKeywords ? project.seoKeywords.split(',') : undefined,
    alternates: {
      canonical: `https://tolee.in/micro-website/${resolved.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://tolee.in/micro-website/${resolved.slug}`,
      siteName: 'Tolee World',
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

export default async function PublicMicroWebsitePage({ params }: PageProps) {
  const resolved = params instanceof Promise ? await params : params;
  const project = await getPublicWorldProject(resolved.slug, 'WEBSITE');

  if (!project) {
    notFound();
  }

  const content = (project.content as any) || {};
  const template = content.template || 'portfolio';
  const elements = content.elements || [];

  // Tailored aesthetic colors based on template selection
  let themeGradient = 'from-blue-600 to-indigo-600';
  let badgeLabel = 'Micro Website';

  if (template === 'profile') {
    themeGradient = 'from-purple-600 via-pink-600 to-rose-600';
    badgeLabel = 'Digital Identity';
  } else if (template === 'makeup') {
    themeGradient = 'from-rose-500 via-amber-500 to-pink-500';
    badgeLabel = 'Artistry & Styling Portfolio';
  } else if (template === 'realestate') {
    themeGradient = 'from-emerald-500 to-teal-600';
    badgeLabel = 'Property Showcase';
  } else if (template === 'marketing') {
    themeGradient = 'from-blue-500 via-cyan-500 to-indigo-500';
    badgeLabel = 'Agency Portal';
  } else if (template === 'service') {
    themeGradient = 'from-orange-500 to-rose-600';
    badgeLabel = 'Local Services';
  }

  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": project.name,
    "description": project.description || `Micro-website ${project.name} on Tolee`,
    "url": `https://tolee.in/micro-website/${project.slug}`,
    "image": project.bannerImage || "https://tolee.in/logo.png",
    "isPartOf": {
      "@type": "WebSite",
      "name": "Tolee",
      "url": "https://tolee.in"
    }
  };

  const jsonLdBreadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Tolee World', url: '/world' },
    { name: project.name, url: `/micro-website/${project.slug}` }
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-16 relative selection:bg-primary selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
      />
      {/* Decorative Blur Backdrops */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <div className="max-w-4xl mx-auto px-4 pt-6 relative z-10">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between pb-8">
          <Link href="/world" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors bg-zinc-900/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-zinc-800/80">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to World
          </Link>
          <Badge className="bg-zinc-900 border-zinc-800 text-zinc-300 text-xs px-3 py-1 font-medium">
            {badgeLabel}
          </Badge>
        </div>

        {/* Hero Section */}
        <div className="space-y-6">
          
          {/* Main Title Banner */}
          <div className="space-y-3">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              {project.name}
            </h1>
            
            {project.description && (
              <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-2xl font-normal">
                {project.description}
              </p>
            )}

            {project.locationText && (
              <div className="flex items-center gap-2 text-xs text-zinc-400 pt-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>{project.locationText}</span>
              </div>
            )}
          </div>

          {/* Banner Photo if provided */}
          {project.bannerImage && (
            <div className="w-full h-56 md:h-80 rounded-3xl overflow-hidden border border-zinc-800/80 shadow-2xl">
              <img src={project.bannerImage} alt={project.name} className="w-full h-full object-cover" />
            </div>
          )}

        </div>

        {/* Content Dynamic Canvas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
          
          {/* Main Canvas Blocks */}
          <div className="md:col-span-2 space-y-6">
            
            {elements.length === 0 ? (
              <div className="p-8 border border-zinc-900 bg-zinc-900/20 rounded-2xl text-center space-y-3">
                <Sparkles className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-sm text-zinc-400">Welcome to {project.name}. Content blocks will appear here as the creator customizes this digital space.</p>
              </div>
            ) : (
              elements.map((el: any) => (
                <Card key={el.id} className="bg-zinc-900/40 border-zinc-850/80 backdrop-blur-md rounded-2xl p-6 transition-all hover:border-zinc-700">
                  <h3 className="text-lg font-bold text-white mb-2">{el.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">{el.content}</p>
                </Card>
              ))
            )}

          </div>

          {/* Right Action / Contact Sidebar */}
          <div className="space-y-6">
            
            {/* Contact Action Card */}
            <Card className="bg-zinc-900/50 border border-zinc-850 backdrop-blur-md rounded-2xl p-6 space-y-5">
              <h3 className="font-bold text-sm tracking-wide text-white uppercase text-[11px]">Connect Directly</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Reach out to the creator or business manager behind {project.name}.
              </p>
              
              <div className="space-y-2">
                <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl h-10 shadow-lg shadow-emerald-950/40">
                  <MessageSquare className="w-4 h-4 mr-2" /> Message on Tolee
                </Button>
                <Button variant="outline" className="w-full border-zinc-800 text-zinc-300 hover:text-white rounded-xl h-10 text-xs font-semibold">
                  <Phone className="w-4 h-4 mr-2" /> Quick Inquiry
                </Button>
              </div>
            </Card>

            {/* Share Card */}
            <Card className="bg-zinc-900/30 border border-zinc-850 backdrop-blur-md rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Share this space</p>
                  <span className="text-[10px] text-zinc-500">Spread to groups & social circles</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" className="border-zinc-850 hover:bg-zinc-900 text-zinc-300 text-xs rounded-xl h-9">
                  Copy Link
                </Button>
                <Button variant="outline" className="border-zinc-850 hover:bg-zinc-900 text-zinc-300 text-xs rounded-xl h-9">
                  Share to Feed
                </Button>
              </div>
            </Card>

          </div>

        </div>

      </div>
    </div>
  );
}
