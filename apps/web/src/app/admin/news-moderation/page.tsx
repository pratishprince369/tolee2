import React from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getFlaggedNewsArticles, moderateNewsArticle } from '@/actions/moderator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ShieldAlert, CheckCircle, Trash2, UserX, AlertTriangle, 
  ArrowLeft, FileText, Calendar, Mail
} from 'lucide-react';
import Link from 'next/link';

export default async function NewsModerationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') {
    redirect('/login?callbackUrl=/admin/news-moderation');
  }

  const res = await getFlaggedNewsArticles();
  if (!res.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4">
        <p className="text-sm text-red-500 font-semibold">{res.error || 'Failed to load moderation dashboard'}</p>
      </div>
    );
  }

  const articles = res.articles || [];

  // Actions handler wrappers
  const handleApprove = async (postId: string) => {
    'use server';
    await moderateNewsArticle(postId, 'approve');
  };

  const handleReject = async (postId: string) => {
    'use server';
    await moderateNewsArticle(postId, 'reject');
  };

  const handleBan = async (postId: string) => {
    'use server';
    await moderateNewsArticle(postId, 'ban_author', 'Flagged for violating Tolee spam guidelines.');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-zinc-200 p-4 sm:p-6 lg:px-8 pt-20">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/news">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-red-500" />
              Tolee News Moderation Console
            </h1>
            <p className="text-xs text-gray-400">Review articles flagged by AI NIM checks or reported as spam/hate speech by users</p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-white dark:bg-[#121212] border-red-100 dark:border-red-950/20 rounded-2xl shadow-xs">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block">Flagged items pending review</span>
              <span className="text-2xl font-extrabold text-red-500">{articles.length} Articles</span>
            </CardContent>
          </Card>
        </div>

        {/* Flagged Articles queue */}
        <Card className="bg-white dark:bg-[#121212] border-gray-100 dark:border-zinc-900 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Flagged Content Queue</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {articles.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-400 space-y-2">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
                <h4 className="font-bold text-sm text-gray-950 dark:text-white">Clean moderation queue!</h4>
                <p className="text-gray-400 text-xs">No news posts are flagged or waiting for administrative manual review.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-zinc-900/60">
                {articles.map((item: any) => {
                  const dateStr = new Date(item.createdAt).toLocaleDateString('en-US');
                  const post = item.post;

                  return (
                    <div key={item.id} className="p-5 flex flex-col md:flex-row justify-between gap-6 hover:bg-gray-50/40 dark:hover:bg-zinc-900/10">
                      
                      {/* Left: Article info & flags */}
                      <div className="space-y-3 flex-grow">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                            {post.status}
                          </Badge>
                          <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Flagged on {dateStr}</span>
                        </div>

                        <div className="space-y-1">
                          <h3 className="font-extrabold text-[16px] text-gray-900 dark:text-white leading-snug">{item.headline}</h3>
                          <p className="text-xs text-gray-500 leading-relaxed max-w-2xl">{item.summary}</p>
                        </div>

                        {post.aiReport && (
                          <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/40 rounded-xl p-3 flex gap-2 items-start text-xs max-w-2xl">
                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div className="space-y-0.5">
                              <span className="font-bold text-[10px] text-red-700 dark:text-red-400 uppercase tracking-wide block">AI Scanner Flags Detail:</span>
                              <p className="text-red-900/90 dark:text-red-300 leading-normal font-semibold">{post.aiReport}</p>
                            </div>
                          </div>
                        )}

                        {/* Author metadata */}
                        <div className="flex items-center gap-3 pt-1 text-xs">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={post.author?.image || '/default-user-avatar.svg'} />
                            <AvatarFallback>{post.author?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-bold">{post.author?.name} (@{post.author?.username})</span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Mail className="w-3 h-3" /> {post.author?.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Moderation controls */}
                      <div className="flex md:flex-col justify-end gap-2 shrink-0 self-center">
                        <form action={handleApprove.bind(null, item.postId)}>
                          <Button type="submit" size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs">
                            <CheckCircle className="w-4 h-4" /> Approve & Post
                          </Button>
                        </form>

                        <form action={handleReject.bind(null, item.postId)}>
                          <Button type="submit" size="sm" variant="outline" className="w-full text-red-500 hover:bg-red-50 border-red-100 hover:border-red-200 dark:border-red-900 dark:hover:bg-red-950/20 rounded-xl flex items-center gap-1.5 shadow-xs">
                            <Trash2 className="w-4 h-4" /> Reject/Delete
                          </Button>
                        </form>

                        <form action={handleBan.bind(null, item.postId)}>
                          <Button type="submit" size="sm" variant="ghost" className="w-full text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-900 rounded-xl flex items-center gap-1.5">
                            <UserX className="w-4 h-4" /> Ban Spammer Author
                          </Button>
                        </form>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
