import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Newspaper, PlusCircle, ArrowUpRight, Clock, Eye, MessageSquare, Heart } from 'lucide-react';
import { NewsCardMenu } from '@/components/NewsCardMenu';

export default async function NewsHubPage({ searchParams }: { searchParams: { cat?: string } }) {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user ? (session.user as any).id : null;
  const isSuperAdmin = session?.user?.email === process.env.SUPER_ADMIN_EMAIL;
  const currentCategory = searchParams.cat || 'All';

  // Load news posts - wrapped in try-catch for graceful handling when table doesn't exist yet
  let newsList: any[] = [];
  try {
    newsList = await prisma.newsPost.findMany({
      where: {
        post: {
          status: 'published',
          isArchived: false,
        },
        category: currentCategory !== 'All' ? currentCategory : undefined,
      },
      include: {
        post: {
          include: {
            author: {
              select: {
                name: true,
                username: true,
                image: true,
              }
            },
            likes: true,
            comments: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (e) {
    // NewsPost table may not exist yet in production
    newsList = [];
  }

  const categories = [
    'All', 'Local News', 'Business', 'Technology', 'Real Estate', 
    'Politics', 'Sports', 'Lifestyle', 'Opinion', 'Press Releases'
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-zinc-200 p-4 sm:p-6 lg:pl-72 pt-20">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* News Hub Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121212] p-6 rounded-3xl border border-gray-100 dark:border-zinc-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Newspaper className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">Tolee News Hub</h1>
              <p className="text-xs text-gray-400">Discover premium blogs, local updates, and stories written by the community</p>
            </div>
          </div>

          <Link href="/news/create">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm shadow-indigo-600/10">
              <PlusCircle className="w-4 h-4" /> Create Article
            </Button>
          </Link>
        </div>

        {/* Category Tabs list */}
        <div className="flex gap-2 overflow-x-auto pb-2 pr-2 custom-scrollbar">
          {categories.map(cat => (
            <Link key={cat} href={`/news?cat=${cat}`}>
              <Badge 
                className={`text-xs font-bold px-4 py-2 cursor-pointer rounded-xl select-none transition-all ${
                  currentCategory === cat 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white hover:bg-gray-50 dark:bg-[#121212] dark:hover:bg-zinc-900 text-gray-500 border border-gray-100 dark:border-zinc-900'
                }`}
              >
                {cat}
              </Badge>
            </Link>
          ))}
        </div>

        {/* News Grid */}
        {newsList.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#121212] border border-gray-100 dark:border-zinc-900 rounded-3xl space-y-3">
            <Newspaper className="w-12 h-12 text-zinc-300 mx-auto" />
            <h3 className="font-extrabold text-lg">No articles found</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">Be the first to publish a news story or local update in the t/{currentCategory} category!</p>
            <Link href="/news/create" className="inline-block mt-2">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">Create First Post</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {newsList.map(item => {
              const post = item.post;
              const dateStr = new Date(item.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <Card key={item.id} className="border-gray-100 dark:border-zinc-900/60 bg-white dark:bg-[#121212] rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                  <div>
                    {/* Thumbnail Cover image */}
                    {(() => {
                      const coverImg = post.mediaUrls ? post.mediaUrls.split(/,(?=https?:\/\/)/)[0] : null;
                      return coverImg ? (
                        <div className="aspect-video w-full overflow-hidden bg-black relative">
                          <img src={coverImg} alt={item.headline} className="w-full h-full object-cover hover:scale-102 transition-transform duration-300" />
                          <Badge className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-[10px] font-bold text-white uppercase px-2 py-0.5 rounded border-none">
                            {item.category}
                          </Badge>
                          <div className="absolute top-3 right-3 z-10">
                            <NewsCardMenu 
                              postId={post.id} 
                              slug={item.slug} 
                              canEdit={currentUserId === post.authorId || isSuperAdmin} 
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-video w-full bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center relative">
                          <Newspaper className="w-10 h-10 text-indigo-300 dark:text-indigo-900" />
                          <Badge className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-[10px] font-bold text-white uppercase px-2 py-0.5 rounded border-none">
                            {item.category}
                          </Badge>
                          <div className="absolute top-3 right-3 z-10">
                            <NewsCardMenu 
                              postId={post.id} 
                              slug={item.slug} 
                              canEdit={currentUserId === post.authorId || isSuperAdmin} 
                            />
                          </div>
                        </div>
                      );
                    })()}

                    <CardContent className="p-5 space-y-2">
                      <Link href={`/news/${item.slug}`}>
                        <h3 className="font-extrabold text-[17px] sm:text-[18px] text-gray-900 dark:text-white leading-snug hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors line-clamp-2">
                          {item.headline}
                        </h3>
                      </Link>
                      <p className="text-xs text-gray-400 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                        {item.summary || 'Click read full article below to check detailed report.'}
                      </p>
                    </CardContent>
                  </div>

                  <CardFooter className="p-5 pt-0 border-t border-gray-50 dark:border-zinc-900/50 flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={post.author?.image || '/default-user-avatar.svg'} />
                        <AvatarFallback>{post.author?.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-bold text-[11px] leading-tight">{post.author?.name}</span>
                        <span className="text-[10px] text-gray-400">{dateStr}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-400 dark:text-zinc-500 text-[11px] font-bold">
                      <span className="flex items-center gap-0.5"><Eye className="w-3.5 h-3.5" /> {item.viewsCount}</span>
                      <span className="flex items-center gap-0.5"><Heart className="w-3.5 h-3.5" /> {post.likes.length}</span>
                      <Link href={`/news/${item.slug}`}>
                        <Button size="xs" variant="ghost" className="rounded-lg text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                          Read <ArrowUpRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
