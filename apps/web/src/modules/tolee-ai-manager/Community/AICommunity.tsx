'use client';

import React, { useState } from 'react';
import { Users, Sparkles, Send, MessageSquare, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AICommunity() {
  const [topic, setTopic] = useState('');
  const [generatedPost, setGeneratedPost] = useState('');

  const handleGenerate = () => {
    if (!topic.trim()) return;
    setGeneratedPost(
      `📢 **Announcement for Community Members**\n\n👋 Dear Members,\n\nWe are organizing a ${topic}! Please confirm your attendance and join the discussion below.\n\n#ToleeCommunity #${topic.replace(/\s+/g, '')}`
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-600" />
            AI Community Manager
          </h2>
          <p className="text-xs text-slate-500">Auto-generate announcements, welcome new members, and moderate society Tolees</p>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter announcement topic (e.g. Society Maintenance Meeting, Diwali Celebration)..."
              className="rounded-full bg-slate-50 dark:bg-zinc-800 text-sm"
            />
            <Button onClick={handleGenerate} className="rounded-full bg-violet-600 hover:bg-violet-700 text-white shrink-0">
              <Sparkles className="w-4 h-4 mr-1" /> Generate Post
            </Button>
          </div>

          {generatedPost && (
            <div className="p-4 bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900/50 rounded-2xl space-y-3">
              <p className="text-xs font-bold text-violet-600 uppercase">AI Post Draft</p>
              <pre className="text-sm font-sans text-slate-800 dark:text-zinc-200 whitespace-pre-wrap">{generatedPost}</pre>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white rounded-full text-xs">
                <Send className="w-3.5 h-3.5 mr-1" /> Publish to My Tolee
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
