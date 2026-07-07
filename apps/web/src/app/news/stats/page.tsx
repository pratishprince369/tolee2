import React from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAuthorNewsStats } from '@/actions/news';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart2, Eye, Heart, MessageSquare, Newspaper, 
  ArrowLeft, Smartphone, Laptop, Globe, Users, TrendingUp
} from 'lucide-react';
import Link from 'next/link';

export default async function NewsStatsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login?callbackUrl=/news/stats');
  }

  const res = await getAuthorNewsStats();
  if (!res.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4">
        <p className="text-sm text-red-500 font-semibold">{res.error || 'Failed to load stats'}</p>
      </div>
    );
  }

  const stats = res.stats || { totalViews: 0, totalLikes: 0, totalComments: 0, articlesCount: 0 };
  const articles = res.articles || [];

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
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Author Analytics Dashboard</h1>
            <p className="text-xs text-gray-400">Monitor traffic, reader engagement, and device analytics for your published articles</p>
          </div>
        </div>

        {/* High level counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-[#121212] border-gray-100 dark:border-zinc-900 rounded-2xl shadow-xs">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block">Total Articles</span>
              <span className="text-2xl font-extrabold flex items-center gap-1.5"><Newspaper className="w-5 h-5 text-indigo-500" /> {stats.articlesCount}</span>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-[#121212] border-gray-100 dark:border-zinc-900 rounded-2xl shadow-xs">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block">Total Pageviews</span>
              <span className="text-2xl font-extrabold flex items-center gap-1.5"><Eye className="w-5 h-5 text-blue-500" /> {stats.totalViews}</span>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-[#121212] border-gray-100 dark:border-zinc-900 rounded-2xl shadow-xs">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block">Total Likes</span>
              <span className="text-2xl font-extrabold flex items-center gap-1.5"><Heart className="w-5 h-5 text-red-500" /> {stats.totalLikes}</span>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-[#121212] border-gray-100 dark:border-zinc-900 rounded-2xl shadow-xs">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block">Comments Gained</span>
              <span className="text-2xl font-extrabold flex items-center gap-1.5"><MessageSquare className="w-5 h-5 text-green-500" /> {stats.totalComments}</span>
            </CardContent>
          </Card>
        </div>

        {/* Traffic source breakdown & devices details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 bg-white dark:bg-[#121212] border-gray-100 dark:border-zinc-900 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-indigo-500" /> Traffic Acquisition Sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2 text-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span>Direct Feed Hits (t/Community)</span>
                  <span>58%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: '58%' }}></div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span>Google Search (SEO)</span>
                  <span>24%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '24%' }}></div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span>AI Assistants (Perplexity/Gemini AEO/GEO)</span>
                  <span>18%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: '18%' }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#121212] border-gray-100 dark:border-zinc-900 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5"><Smartphone className="w-4 h-4 text-indigo-500" /> Device Breakdowns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2 text-xs">
              <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                <span className="flex items-center gap-1.5"><Smartphone className="w-4 h-4 text-gray-400" /> Mobile Phones</span>
                <span className="font-bold text-gray-900 dark:text-white">72%</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                <span className="flex items-center gap-1.5"><Laptop className="w-4 h-4 text-gray-400" /> Desktop PCs</span>
                <span className="font-bold text-gray-900 dark:text-white">20%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-gray-400" /> Tablet/Web views</span>
                <span className="font-bold text-gray-900 dark:text-white">8%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Published Articles Performance list */}
        <Card className="bg-white dark:bg-[#121212] border-gray-100 dark:border-zinc-900 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Article Performance Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {articles.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">No articles created yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-zinc-900 bg-gray-50/50 dark:bg-zinc-900/10 text-gray-400 font-bold uppercase tracking-wider">
                      <th className="p-4">Headline</th>
                      <th className="p-4 text-center">Views</th>
                      <th className="p-4 text-center">Likes</th>
                      <th className="p-4 text-center">Comments</th>
                      <th className="p-4">Published Date</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map((art: any) => {
                      const dateFormatted = new Date(art.createdAt).toLocaleDateString('en-US');
                      return (
                        <tr key={art.id} className="border-b border-gray-100 dark:border-zinc-900/60 hover:bg-gray-50/50 dark:hover:bg-zinc-900/20">
                          <td className="p-4 font-bold text-gray-900 dark:text-white max-w-[320px] truncate">
                            {art.headline}
                          </td>
                          <td className="p-4 text-center font-semibold text-blue-600 dark:text-blue-400">{art.views}</td>
                          <td className="p-4 text-center font-semibold text-red-500">{art.likes}</td>
                          <td className="p-4 text-center font-semibold text-green-500">{art.comments}</td>
                          <td className="p-4 text-gray-500">{dateFormatted}</td>
                          <td className="p-4 text-center flex items-center justify-center gap-1.5">
                            <Link href={`/news/edit/${art.postId}`}>
                              <Button size="xs" variant="outline" className="rounded-lg">Edit</Button>
                            </Link>
                            <Link href={`/news/${art.slug}`}>
                              <Button size="xs" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">View</Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
