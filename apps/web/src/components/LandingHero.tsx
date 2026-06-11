'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Users, Zap, Shield, Globe } from 'lucide-react';
import Link from 'next/link';

export function LandingHero() {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-black py-24 sm:py-32">
      {/* Background Gradient Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container relative mx-auto px-6 lg:px-8 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex justify-center">
            <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-600 dark:text-gray-400 ring-1 ring-gray-900/10 dark:ring-white/10 hover:ring-gray-900/20 transition-all cursor-default">
              Every post belongs to a Tolee.{' '}
              <Link href="/auth/signup" className="font-semibold text-primary">
                <span className="absolute inset-0" aria-hidden="true" />
                Join the revolution <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
          
          <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-7xl mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            Social networking, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              reimagined through Tolees.
            </span>
          </h1>
          
          <p className="mt-6 text-xl leading-8 text-gray-600 dark:text-gray-400 mb-10 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-100">
            Tolee is where groups come alive. Join existing Tolees based on your interests, or create your own community and start sharing moments that matter.
          </p>
          
          <div className="mt-10 flex items-center justify-center gap-x-6 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
            <Link href="/auth/signup">
              <Button size="lg" className="rounded-full px-8 py-6 text-lg font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
                Get Started for Free
              </Button>
            </Link>
            <Link href="/discover" className="text-sm font-semibold leading-6 text-gray-900 dark:text-white flex items-center gap-2 hover:gap-3 transition-all">
              Discover Tolees <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mx-auto mt-24 max-w-5xl sm:mt-32 lg:mt-40">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3">
            <div className="relative pl-16 group">
              <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6" aria-hidden="true" />
                </div>
                Vibrant Communities
              </dt>
              <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-400 text-left">
                Join niche groups that match your passion. From tech to spirituality, find your people.
              </dd>
            </div>
            <div className="relative pl-16 group">
              <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white shadow-lg group-hover:scale-110 transition-transform">
                  <Zap className="h-6 w-6" aria-hidden="true" />
                </div>
                Real-time Interaction
              </dt>
              <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-400 text-left">
                Share posts, reels, and stories directly within your Tolee. Stay updated with instant notifications.
              </dd>
            </div>
            <div className="relative pl-16 group">
              <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500 text-white shadow-lg group-hover:scale-110 transition-transform">
                  <Shield className="h-6 w-6" aria-hidden="true" />
                </div>
                Safe & Verified
              </dt>
              <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-400 text-left">
                AI-powered moderation ensures every Tolee remains a safe space for positive interaction.
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
