import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getNewsBySlug } from '@/actions/news';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, Clock, User, Share2, Bookmark, ArrowLeft, Globe, 
  MessageCircle, Sparkles, HelpCircle, Film, Info, Quote, ChevronRight
} from 'lucide-react';
import { FollowButton } from '@/components/FollowButton';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PostCarousel } from '@/components/PostCarousel';
import { NewsEngagement } from '@/components/NewsEngagement';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const news = await getNewsBySlug(params.slug);
  if (!news || !news.post) {
    return { title: 'News Not Found | Tolee' };
  }

  const post = news.post;
  const isPrivateAuthor = post.author?.isPrivate;
  const isPrivateGroup = post.tolees?.some((t: any) => t.tolee?.isPrivate || t.tolee?.privacy === 'private');

  if (isPrivateAuthor || isPrivateGroup) {
    return {
      title: 'Private Article | Tolee News',
      description: 'This news article is private.',
      robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
          index: false,
          follow: false,
          noimageindex: true,
        }
      }
    };
  }

  const headline = post.caption || news.headline || 'Tolee News Article';
  const description = news.summary || news.metaDescription || headline;
  const mediaUrl = post.mediaUrls ? post.mediaUrls.split(',')[0] : 'https://www.tolee.in/tolee-news-default.png';

  return {
    title: `${headline} | Tolee News`,
    description,
    keywords: news.keywords ? news.keywords.split(',') : undefined,
    openGraph: {
      title: headline,
      description,
      url: `https://www.tolee.in/news/${params.slug}`,
      siteName: 'Tolee News',
      type: 'article',
      images: [{ url: mediaUrl }],
      publishedTime: new Date(news.createdAt).toISOString(),
      authors: [post.author?.name || 'Tolee Creator'],
    },
    twitter: {
      card: 'summary_large_image',
      title: headline,
      description,
      images: [mediaUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      }
    }
  };
}

export default async function NewsReaderPage({ params }: { params: { slug: string } }) {
  const news = await getNewsBySlug(params.slug);
  const session = await getServerSession(authOptions);

  if (!news) {
    notFound();
  }

  const post = news.post;
  const currentUserId = session?.user ? (session.user as any).id : null;
  const isSuperAdmin = session?.user?.email === process.env.SUPER_ADMIN_EMAIL;
  const canEdit = currentUserId === post.authorId || isSuperAdmin;
  const authorName = post.author?.name || 'Anonymous Creator';
  const authorUsername = post.author?.username || 'anonymous';
  const authorAvatar = post.author?.image || '/default-user-avatar.svg';
  const dateFormatted = new Date(news.createdAt).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Parse structured Notion blocks
  let contentBlocks: any[] = [];
  try {
    contentBlocks = JSON.parse(news.content);
  } catch (e) {
    // fallback if content is plain string
    contentBlocks = [{ type: 'paragraph', value: news.content }];
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-zinc-200 pb-20">
      
      {/* Reader Header Nav */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md border-b border-gray-100 dark:border-zinc-900 px-4 py-3 flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="sm" className="flex items-center gap-1 text-gray-500 hover:text-black">
            <ArrowLeft className="w-4 h-4" /> Home Feed
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase px-2.5 py-0.5 rounded-full">
            {news.category}
          </Badge>
        </div>
      </div>

      <article className="max-w-[760px] mx-auto px-4 pt-6 space-y-6">
        
        {/* Headline & Breadcrumb */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
            <span>Tolee News</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-indigo-600 dark:text-indigo-400">{news.category}</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
            {news.headline}
          </h1>

          {news.summary && (
            <p className="text-[16px] sm:text-[17px] text-gray-500 dark:text-zinc-400 leading-relaxed font-medium italic">
              {news.summary}
            </p>
          )}
        </div>

        {/* Author details card */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-gray-100 dark:border-zinc-900">
          <div className="flex items-center gap-3">
            <Link href={`/u/${authorUsername}`}>
              <Avatar className="w-11 h-11 border border-zinc-100 dark:border-zinc-800 shadow-sm cursor-pointer">
                <AvatarImage src={authorAvatar} alt={authorName} />
                <AvatarFallback>{authorName[0]}</AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <Link href={`/u/${authorUsername}`} className="font-bold text-[14.5px] text-gray-900 dark:text-white hover:underline cursor-pointer">
                  {authorName}
                </Link>
                <span className="text-xs text-gray-400">@{authorUsername}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {dateFormatted}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {news.readingTime} Min Read</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FollowButton targetUserId={post.authorId} initialIsFollowing={false} />
            <Button size="sm" variant="outline" className="rounded-full flex items-center gap-1 text-xs">
              <Share2 className="w-3.5 h-3.5" /> Share
            </Button>
            {canEdit && (
              <Link href={`/news/edit/${post.id}`}>
                <Button size="sm" variant="outline" className="rounded-full flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 hover:bg-teal-50/50 border-teal-200">
                  Edit News
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Hero Cover Image & Gallery or YouTube Autoplay Video Player */}
        {news.slug.startsWith('yt-') || (news.sourceUrl && news.sourceUrl.includes('youtube.com')) ? (
          <div className="space-y-2">
            <div className="w-full aspect-video rounded-3xl overflow-hidden bg-black border border-gray-150 dark:border-zinc-900 shadow-md relative">
              <iframe
                src={`https://www.youtube.com/embed/${news.sourceUrl?.split('v=')[1]?.split('&')[0] || post.mediaUrls?.split('vi/')[1]?.split('/')[0]}?autoplay=1&mute=1&enablejsapi=1&playsinline=1`}
                title={news.headline}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-none"
              />
            </div>
            {news.sourceUrl && (
              <div className="px-2 flex justify-between text-[11px] text-gray-400 dark:text-zinc-500 italic">
                <span>Watch full video on YouTube</span>
                <a href={news.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                  Source: {news.sourceUrl}
                </a>
              </div>
            )}
          </div>
        ) : post.mediaUrls && (
          <div className="space-y-2">
            <div className="w-full rounded-3xl overflow-hidden bg-black border border-gray-150 dark:border-zinc-900 shadow-sm">
              <PostCarousel 
                mediaUrls={post.mediaUrls} 
                mediaTypes={post.mediaTypes} 
                postId={post.id} 
              />
            </div>
            {(news.coverCaption || news.imageCredit) && (
              <div className="px-2 flex justify-between text-[11px] text-gray-400 dark:text-zinc-500 italic">
                <span>{news.coverCaption}</span>
                <span>{news.imageCredit && `Credit: ${news.imageCredit}`}</span>
              </div>
            )}
          </div>
        )}

        {/* Collapsible AI Summary Box */}
        {news.metaDescription && (
          <Card className="bg-indigo-50/40 dark:bg-indigo-950/15 border-indigo-100/60 dark:border-indigo-950/30 rounded-2xl">
            <CardContent className="p-4 flex gap-3 items-start">
              <Sparkles className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0 animate-pulse" />
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">AI Generated Executive Summary</span>
                <p className="text-xs leading-relaxed text-indigo-900 dark:text-indigo-300">
                  {news.metaDescription}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Structured Notion Block Content renderer */}
        <div className="space-y-6 pt-2">
          {contentBlocks.map((block: any, idx: number) => {
            if (block.type === 'h1') {
              return (
                <h2 key={idx} className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white pt-4">
                  {block.value}
                </h2>
              );
            }
            if (block.type === 'h2') {
              return (
                <h3 key={idx} className="text-xl sm:text-2xl font-bold text-gray-950 dark:text-white pt-2">
                  {block.value}
                </h3>
              );
            }
            if (block.type === 'blockquote') {
              return (
                <blockquote key={idx} className="border-l-4 border-indigo-500 pl-4 py-1 italic text-gray-700 dark:text-zinc-300 bg-gray-50/50 dark:bg-zinc-950/10 rounded-r-xl pr-3 text-[15px] leading-relaxed">
                  {block.value}
                </blockquote>
              );
            }
            if (block.type === 'callout') {
              return (
                <div key={idx} className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-4 flex gap-3 items-start">
                  <Info className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm leading-relaxed text-indigo-900/90 dark:text-indigo-300">
                    {block.value}
                  </p>
                </div>
              );
            }
            if (block.type === 'faq') {
              return (
                <div key={idx} className="bg-purple-50/30 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/40 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-purple-600 font-extrabold text-xs">
                    <HelpCircle className="w-4 h-4" /> FAQ SECTION
                  </div>
                  <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Q: {block.value.question}</h4>
                  <p className="text-xs leading-relaxed text-gray-600 dark:text-zinc-400 pl-4 border-l border-purple-200">
                    A: {block.value.answer}
                  </p>
                </div>
              );
            }
            if (block.type === 'youtube') {
              // Parse YouTube ID
              let embedId = '';
              const match = block.value.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
              if (match) embedId = match[1];

              return embedId ? (
                <div key={idx} className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-gray-150 shadow-sm">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${embedId}`} 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  />
                </div>
              ) : null;
            }
            // default paragraph text render
            return (
              <p key={idx} className="text-[15.5px] sm:text-[16px] leading-relaxed text-gray-800 dark:text-zinc-300 whitespace-pre-line">
                {block.value}
              </p>
            );
          })}
        </div>

        {/* References & Links footer */}
        {(news.sourceUrl || news.externalRef) && (
          <div className="pt-6 border-t border-gray-150 dark:border-zinc-900 space-y-2">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Official References & Sources</span>
            {news.sourceUrl && (
              <a href={news.sourceUrl} target="_blank" className="text-xs text-indigo-600 hover:underline flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Source Link: {news.sourceUrl}
              </a>
            )}
            {news.externalRef && (
              <span className="text-xs text-gray-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Additional Context: {news.externalRef}
              </span>
            )}
          </div>
        )}

        {/* Related Tolees Banner */}
        {post.tolees && post.tolees.length > 0 && (
          <div className="bg-gray-50 dark:bg-zinc-900/30 border border-gray-100 dark:border-zinc-900 p-4 rounded-3xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-sm shadow-indigo-600/20">
                t/
              </div>
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase block">Published In Community Tolee</span>
                <Link href={`/t/${post.tolees[0].tolee?.slug}`} className="font-extrabold text-sm hover:underline text-indigo-600 dark:text-indigo-400">
                  {post.tolees[0].tolee?.name}
                </Link>
              </div>
            </div>
            <Link href={`/t/${post.tolees[0].tolee?.slug}`}>
              <Button size="xs" variant="outline" className="rounded-xl text-xs font-bold">Visit Community</Button>
            </Link>
          </div>
        )}

        {/* Engagement Bar & Quick Comment Box */}
        <div className="mt-8 pt-4 border-t border-gray-100 dark:border-zinc-900">
          <NewsEngagement
            postId={post.id}
            initialLikes={post.likes?.length || 0}
            initialComments={post.comments?.length || 0}
            initialReposts={post.reposts?.length || 0}
            initialViews={news.viewsCount || 0}
            initialLikedByMe={currentUserId ? post.likes?.some((l: any) => l.userId === currentUserId) : false}
            initialSavedByMe={currentUserId ? post.savedBy?.some((s: any) => s.userId === currentUserId) : false}
            initialRepostedByMe={currentUserId ? post.reposts?.some((r: any) => r.userId === currentUserId) : false}
            shareCount={post.shareCount || 0}
            slug={news.slug}
            headline={news.headline}
          />
        </div>

      </article>
    </div>
  );
}
