import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicWorldProject } from '@/actions/world';
import { FileText, MapPin, Sparkles, User, Calendar, Tag, ArrowLeft, Bookmark, Heart, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function PublicBlogPage({ params }: PageProps) {
  const project = await getPublicWorldProject(params.slug, 'BLOG');

  if (!project) {
    notFound();
  }

  const content = (project.content as any) || {};
  const blogBody = content.body || '';
  const category = content.category || 'General';
  const tagsStr = content.tags || '';
  const tags = tagsStr.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);

  // Split content by paragraphs for premium reading typography
  const paragraphs = blogBody.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20 relative selection:bg-primary selection:text-white">
      {/* Decorative backdrop */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <div className="max-w-4xl mx-auto px-4 pt-6 relative z-10">
        
        {/* Back Link */}
        <Link href="/world" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors bg-zinc-900/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-zinc-800/80 mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Tolee World
        </Link>

        {/* Semantic article layout */}
        <article className="space-y-6">
          
          {/* Cover & Header metadata */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase text-[10px] tracking-wider font-extrabold px-2.5 py-0.5 rounded-md">
                {category}
              </Badge>
              {project.locationText && (
                <Badge variant="outline" className="text-zinc-400 border-zinc-800 text-[10px] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-400" /> {project.locationText}
                </Badge>
              )}
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-450 leading-tight">
              {project.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 pt-2 border-b border-zinc-900 pb-6">
              <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-zinc-500" /> Published by Creator</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-zinc-500" /> {new Date(project.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              {project.views > 0 && <span className="text-zinc-500">• {project.views} unique reads</span>}
            </div>
          </div>

          {/* Banner cover Image */}
          {project.bannerImage ? (
            <div className="w-full h-64 md:h-96 rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-950">
              <img src={project.bannerImage} alt={project.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full h-40 bg-zinc-900/40 border border-zinc-800 rounded-3xl flex items-center justify-center">
              <FileText className="w-12 h-12 text-zinc-800" />
            </div>
          )}

          {/* Article Contents Canvas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
            
            {/* Main Reading canvas */}
            <div className="lg:col-span-2 space-y-6">
              {paragraphs.length === 0 ? (
                <p className="text-zinc-500 text-sm italic">This blog article has no content body yet.</p>
              ) : (
                paragraphs.map((pText: string, idx: number) => {
                  // Render headers as H2 if start with # or ##
                  if (pText.startsWith('## ')) {
                    return <h2 key={idx} className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">{pText.replace('## ', '')}</h2>;
                  }
                  if (pText.startsWith('# ')) {
                    return <h2 key={idx} className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">{pText.replace('# ', '')}</h2>;
                  }
                  return (
                    <p key={idx} className="text-zinc-350 text-[15px] md:text-[16px] leading-relaxed font-serif tracking-normal">
                      {pText}
                    </p>
                  );
                })
              )}

              {/* Tags footer */}
              {tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-8 border-t border-zinc-900">
                  <span className="text-xs text-zinc-500 font-bold uppercase mr-1">Tags:</span>
                  {tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="bg-zinc-900 text-zinc-400 hover:text-white border-none rounded-lg text-xs py-1 px-2.5">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Sticky Interaction Sidebar */}
            <div className="space-y-6">
              
              {/* Engagement Panel */}
              <Card className="bg-zinc-900/30 border border-zinc-850 backdrop-blur-md rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400">Interact</h3>
                <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-850">
                  <button className="flex items-center gap-2 text-zinc-400 hover:text-rose-500 transition-colors text-xs font-semibold">
                    <Heart className="w-4 h-4" /> Recommend
                  </button>
                  <button className="flex items-center gap-2 text-zinc-400 hover:text-primary transition-colors text-xs font-semibold">
                    <Bookmark className="w-4 h-4" /> Save Article
                  </button>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-zinc-500 leading-relaxed mb-3">Targeting local readers in your neighbourhood group networks.</p>
                  <Button variant="outline" className="w-full border-zinc-800 text-zinc-300 hover:text-white rounded-xl h-10 text-xs font-bold" onClick="navigator.clipboard.writeText(window.location.href); alert('Article link copied to clipboard!');">
                    Share Link
                  </Button>
                </div>
              </Card>

              {/* Newsletter / Subscription widget */}
              <Card className="bg-zinc-900/30 border border-zinc-850 backdrop-blur-md rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400">Newsletter</h3>
                <div>
                  <p className="text-xs font-bold text-white mb-1">Follow this Blog</p>
                  <span className="text-[10px] text-zinc-500 leading-relaxed block">Get immediate alerts inside notifications when creator publishes next article.</span>
                </div>
                <form action="#" onSubmit="alert('Subscribed to creator updates!'); return false;" className="space-y-2 pt-1">
                  <input 
                    type="email" 
                    placeholder="Enter email / username" 
                    required 
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary"
                  />
                  <Button type="button" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl h-9">
                    Subscribe
                  </Button>
                </form>
              </Card>

            </div>

          </div>

        </article>

      </div>
    </div>
  );
}
