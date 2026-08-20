import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { getRadarPostByIdAction } from '@/actions/radar';
import { Button } from '@/components/ui/button';
import { 
  Radar, MapPin, ArrowLeft, ShieldAlert, Utensils, Megaphone, 
  Tag, EyeOff, ThumbsUp, Share2, Compass, ExternalLink, AlertTriangle, 
  Clock, CheckCircle, Radio
} from 'lucide-react';
import { RadarPostDetailClient } from './RadarPostDetailClient';

interface Props {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const res = await getRadarPostByIdAction(params.id);
  if (!res.success || !res.post) {
    return {
      title: 'Radar Alert Not Found | Tolee Radar',
      description: 'The requested local radar alert could not be found.'
    };
  }

  const post = res.post;
  const author = post.isAnonymous ? 'Gupt Khabar' : post.author;
  return {
    title: `${post.title} | Tolee Radar (${post.locationName})`,
    description: post.description || `${post.title} reported near ${post.locationName} by ${author}.`
  };
}

export default async function RadarPostPage({ params }: Props) {
  const res = await getRadarPostByIdAction(params.id);

  if (!res.success || !res.post) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-zinc-950 p-8 rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Radar Alert Unavailable
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            {res.error || 'This Radar update is no longer available or has expired.'}
          </p>
          <div className="pt-2">
            <Link href="/radar">
              <Button className="rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-6 h-10 shadow-md">
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Tolee Radar
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-black py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/radar"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 px-3.5 py-2 rounded-2xl shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Neighborhood Radar</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Verified Radar Update
            </span>
          </div>
        </div>

        {/* Client Interactive Detail Card with GPS Distance Calculation & Map view */}
        <RadarPostDetailClient post={res.post} />

      </div>
    </div>
  );
}
