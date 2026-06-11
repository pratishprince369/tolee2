import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicWorldProject } from '@/actions/world';
import { Globe, MapPin, Sparkles, Send, Phone, MessageSquare, ExternalLink, ArrowLeft, Star, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function PublicMicroWebsitePage({ params }: PageProps) {
  const project = await getPublicWorldProject(params.slug, 'WEBSITE');

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

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-16 relative selection:bg-primary selection:text-white">
      {/* Decorative Blur Backdrops */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-20 right-1/4 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none z-0"></div>

      {/* Floating Home Link */}
      <div className="max-w-4xl mx-auto px-4 pt-6 relative z-10">
        <Link href="/world" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors bg-zinc-900/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-zinc-800/80 mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Tolee World
        </Link>

        {/* Hero Section Card */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md mb-8">
          {project.bannerImage ? (
            <div className="w-full h-56 md:h-72 relative">
              <img src={project.bannerImage} alt={project.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent"></div>
            </div>
          ) : (
            <div className={`w-full h-44 bg-gradient-to-r ${themeGradient} opacity-90 flex items-center justify-center relative`}>
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent"></div>
              <Globe className="w-16 h-16 text-white/40 animate-pulse" />
            </div>
          )}

          <div className="p-6 md:p-8 relative -mt-10 bg-zinc-900/60 backdrop-blur-md rounded-t-3xl border-t border-zinc-800/50">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border border-zinc-700/50 text-[10px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">
                    {badgeLabel}
                  </Badge>
                  {project.locationText && (
                    <Badge variant="outline" className="text-zinc-400 border-zinc-800 text-[10px] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-red-400" /> {project.locationText}
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
                  {project.name}
                </h1>
                {project.description && (
                  <p className="text-zinc-400 mt-2 text-sm max-w-2xl leading-relaxed">
                    {project.description}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button size="sm" className="bg-primary hover:bg-primary/95 text-white rounded-xl flex items-center gap-2 font-bold px-4 h-10 shadow-lg shadow-primary/10">
                  <Phone className="w-4 h-4" /> Call Creator
                </Button>
                <Button size="sm" variant="outline" className="border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:text-white rounded-xl h-10 px-4">
                  <MessageSquare className="w-4 h-4" /> Message
                </Button>
              </div>
            </div>

            {/* Micro Website URL details */}
            <div className="mt-6 pt-6 border-t border-zinc-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-400 font-mono">
              <span>Public Link: tolee.in/micro-website/{project.slug}</span>
              <span className="text-[10px] text-zinc-500 uppercase font-sans font-bold flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-850 w-fit">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Verified Creator Website
              </span>
            </div>
          </div>
        </div>

        {/* Website Elements / Canvas Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Main Content Blocks Column */}
          <div className="md:col-span-2 space-y-6">
            {elements.length === 0 ? (
              <Card className="bg-zinc-900/30 border-zinc-800 backdrop-blur-md rounded-2xl p-8 text-center text-zinc-500">
                <Globe className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">This website has no sections added yet.</p>
              </Card>
            ) : (
              elements.map((el: any) => (
                <Card key={el.id} className="bg-zinc-900/30 border-zinc-850 backdrop-blur-md rounded-2xl hover:border-zinc-800 transition-all overflow-hidden">
                  <CardContent className="p-6 md:p-8">
                    {el.title && (
                      <h3 className="text-lg md:text-xl font-bold text-white mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" /> {el.title}
                      </h3>
                    )}
                    {el.body && (
                      <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line">
                        {el.body}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Sidebar / Interaction widgets column */}
          <div className="space-y-6">
            
            {/* Lead Generation Widget */}
            <Card className="bg-zinc-900/40 border-zinc-850 backdrop-blur-md rounded-2xl overflow-hidden">
              <div className={`h-1.5 bg-gradient-to-r ${themeGradient}`}></div>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-primary" /> Get in Touch
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">Leave your contact details and the creator will respond shortly.</p>
                
                <form action="#" onSubmit="alert('Thank you! Your details have been securely logged.'); return false;" className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Your Name" 
                    required 
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary"
                  />
                  <input 
                    type="tel" 
                    placeholder="Your Mobile Number" 
                    required 
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary"
                  />
                  <textarea 
                    placeholder="Your requirements..." 
                    rows={3} 
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary"
                  ></textarea>
                  <Button type="button" className="w-full bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-xl h-10 flex items-center justify-center gap-2">
                    Submit Request <Send className="w-3.5 h-3.5" />
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Social Share / Trust Card */}
            <Card className="bg-zinc-900/40 border-zinc-850 backdrop-blur-md rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400">Creator Hub</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-750 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Share this space</p>
                  <span className="text-[10px] text-zinc-500">Spread to groups & social circles</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" className="border-zinc-850 hover:bg-zinc-900 text-zinc-300 text-xs rounded-xl h-9" onClick="navigator.clipboard.writeText(window.location.href); alert('Link copied to clipboard!');">
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
