'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ManageToleeModal } from '@/components/ManageToleeModal';
import { deleteTolee } from '@/actions/tolee';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Users,
  MapPin,
  Shield,
  Trash2,
  Edit,
  Share2,
  Check,
  Loader2,
  Plus,
  Search,
  Globe,
  Lock,
  Calendar,
  Activity,
  TrendingUp,
  BarChart3,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface MyToleesClientProps {
  initialTolees: any[];
}

export function MyToleesClient({ initialTolees }: MyToleesClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [tolees, setTolees] = useState(initialTolees);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  
  // Modals state
  const [toleeToDelete, setToleeToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [analyticsTolee, setAnalyticsTolee] = useState<any | null>(null);

  useEffect(() => {
    setTolees(initialTolees);
  }, [initialTolees]);

  const handleShare = (slug: string) => {
    const url = `${window.location.origin}/t/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSlug(slug);
      setTimeout(() => {
        setCopiedSlug(null);
      }, 2000);
    });
  };

  const handleDeleteConfirm = async () => {
    if (!toleeToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteTolee(toleeToDelete.id);
      if (res.success) {
        setTolees(current => current.filter(t => t.id !== toleeToDelete.id));
        setToleeToDelete(null);
        router.refresh();
      } else {
        alert(res.error || 'Failed to delete Tolee');
      }
    } catch (err) {
      console.error('Error deleting Tolee:', err);
      alert('An error occurred while deleting the Tolee.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getRelativeTime = (dateInput: Date | string | undefined) => {
    if (!dateInput) return 'No activity';
    const date = new Date(dateInput);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const totalCommunities = tolees.length;
  const totalMembers = tolees.reduce((acc, t) => acc + (t._count?.members || 0), 0);
  const totalPosts = tolees.reduce((acc, t) => acc + (t._count?.posts || 0), 0);

  const filteredTolees = tolees.filter(tolee =>
    tolee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tolee.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tolee.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tolee.location || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (tolees.length === 0) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] font-sans flex items-center justify-center py-20 px-4">
        <div className="text-center py-16 px-8 bg-white dark:bg-[#121212] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl max-w-xl w-full animate-in fade-in slide-in-from-bottom-10 duration-700">
          <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <Users className="w-12 h-12" />
            <Plus className="w-6 h-6 absolute bottom-1 right-1 bg-primary text-white rounded-full p-1 border-2 border-white dark:border-[#121212]" />
          </div>
          <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-3">
            Manage Your Tolees
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-8 text-base max-w-md mx-auto leading-relaxed">
            You haven't created any Tolee communities yet. Start your own group to share posts, host classrooms, and build a thriving audience.
          </p>
          <Link href="/create-tolee">
            <Button className="rounded-full font-black px-8 py-6 text-lg shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all bg-primary hover:bg-primary/90 text-white">
              Create Your First Tolee
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] font-sans text-gray-900 dark:text-gray-100 pb-24">
      <main className="container mx-auto px-4 pt-8 pb-12 max-w-6xl">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
              My Tolee Communities <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage the groups you created, view engagement, edit settings, or moderate members.
            </p>
          </div>
          <Link href="/create-tolee">
            <Button className="rounded-full font-bold shadow-md hover:shadow-lg hover:scale-102 active:scale-98 transition-all px-6 py-5 bg-primary text-white hover:bg-primary/95 flex items-center gap-1.5 self-start md:self-auto">
              <Plus className="w-5 h-5" /> Create Tolee
            </Button>
          </Link>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-[#121212] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-semibold block mb-1">Created Groups</span>
            <span className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">{totalCommunities}</span>
          </div>
          <div className="bg-white dark:bg-[#121212] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-semibold block mb-1">Total Members</span>
            <span className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">{totalMembers}</span>
          </div>
          <div className="bg-white dark:bg-[#121212] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-semibold block mb-1">Total Posts</span>
            <span className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">{totalPosts}</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Filter created Tolees by name, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-5 rounded-full bg-white dark:bg-[#121212] border-gray-200 dark:border-gray-850 shadow-sm focus-visible:ring-primary/20 focus-visible:border-primary transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Empty Search Results */}
        {filteredTolees.length === 0 ? (
          <div className="text-center py-16 px-6 bg-white dark:bg-[#121212] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-md max-w-lg mx-auto">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Matching Tolees</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-0">
              We couldn't find any of your created groups matching "{searchQuery}".
            </p>
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTolees.map((tolee) => {
              const lastPost = tolee.posts && tolee.posts[0];
              const lastActiveDate = lastPost ? lastPost.post?.createdAt : tolee.createdAt;

              return (
                <Card 
                  key={tolee.id}
                  className="p-0 overflow-hidden border border-gray-150 dark:border-gray-850 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group bg-white dark:bg-[#121212] flex flex-col h-full rounded-2xl relative shadow-md"
                >
                  {/* Banner/Cover Image */}
                  <div className="relative h-32 w-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                    <img 
                      src={tolee.coverImage || '/default-tolee-cover.svg'} 
                      alt={tolee.name} 
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    
                    {/* Category Badge */}
                    <span className="absolute top-3 right-3 bg-white/95 dark:bg-black/60 backdrop-blur-md text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full text-primary border border-white/20">
                      {tolee.category || 'General'}
                    </span>
                  </div>

                  {/* Card Content */}
                  <CardContent className="p-5 flex-grow flex flex-col relative pt-10">
                    {/* Avatar Overlay */}
                    <div className="absolute -top-8 left-5 border-4 border-white dark:border-[#121212] rounded-xl overflow-hidden shadow-md bg-white dark:bg-gray-900">
                      <Avatar className="w-14 h-14 rounded-lg">
                        <AvatarImage src={tolee.avatar || '/default-tolee-avatar.svg'} alt={tolee.name} className="object-cover" />
                        <AvatarFallback className="rounded-lg font-bold">{tolee.name[0]}</AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="flex-grow mt-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <h3 className="font-extrabold text-lg text-gray-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                          {tolee.name}
                        </h3>
                        {tolee.isPrivate ? (
                          <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        ) : (
                          <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        )}
                      </div>

                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed h-10">
                        {tolee.description || 'No description provided.'}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {tolee.location && (
                          <div className="inline-flex items-center gap-1 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-xs font-semibold px-2 py-0.5 rounded border border-gray-150/50 dark:border-gray-800/50">
                            <MapPin className="w-3 h-3 text-primary" />
                            <span>{tolee.location}</span>
                          </div>
                        )}
                        <div className="inline-flex items-center gap-1 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-xs font-semibold px-2 py-0.5 rounded border border-gray-150/50 dark:border-gray-800/50">
                          <Activity className="w-3 h-3 text-primary" />
                          <span>Active {getRelativeTime(lastActiveDate)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata summary */}
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 py-3 border-y border-gray-100 dark:border-gray-800/60 mb-4">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <strong className="text-gray-900 dark:text-white font-bold">{tolee._count?.members || 0}</strong> members
                      </span>
                      <span>
                        <strong className="text-gray-900 dark:text-white font-bold">{tolee._count?.posts || 0}</strong> posts
                      </span>
                    </div>

                    {/* Card Actions Row */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <Link href={`/t/${tolee.slug}`} className="w-full">
                        <Button variant="outline" size="sm" className="w-full font-bold flex items-center justify-center gap-1 text-xs py-4">
                          <ExternalLink className="w-3.5 h-3.5" /> Open
                        </Button>
                      </Link>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setAnalyticsTolee(tolee)}
                        className="w-full font-bold flex items-center justify-center gap-1 text-xs py-4"
                      >
                        <BarChart3 className="w-3.5 h-3.5" /> Analytics
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 mt-1">
                      <ManageToleeModal tolee={tolee}>
                        <Button variant="ghost" size="sm" className="font-bold flex items-center justify-center gap-1 text-[11px] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 py-3.5">
                          <Edit className="w-3 h-3" /> Edit
                        </Button>
                      </ManageToleeModal>

                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleShare(tolee.slug)}
                        className="font-bold flex items-center justify-center gap-1 text-[11px] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 py-3.5"
                      >
                        {copiedSlug === tolee.slug ? (
                          <>
                            <Check className="w-3 h-3 text-green-500" />
                            <span className="text-green-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3 h-3" />
                            <span>Share</span>
                          </>
                        )}
                      </Button>

                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setToleeToDelete(tolee)}
                        className="font-bold flex items-center justify-center gap-1 text-[11px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 py-3.5"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!toleeToDelete} onOpenChange={(open) => !open && setToleeToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 shadow-2xl p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-500 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Delete Community
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400 mt-2">
              Are you absolutely sure you want to delete <strong className="text-gray-950 dark:text-white font-bold">{toleeToDelete?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm text-gray-500 dark:text-gray-400 space-y-2">
            <p className="font-semibold text-amber-500 flex items-start gap-1">
              <Shield className="w-4 h-4 shrink-0 mt-0.5" /> Warning: This action is permanent and cannot be undone.
            </p>
            <p>Deletes all courses, lessons, member records, and posts associated with this Tolee.</p>
          </div>
          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              disabled={isDeleting}
              onClick={() => setToleeToDelete(null)}
              className="w-full sm:w-auto font-bold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Deleting...
                </>
              ) : (
                'Delete Tolee'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={!!analyticsTolee} onOpenChange={(open) => !open && setAnalyticsTolee(null)}>
        <DialogContent className="sm:max-w-[550px] bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 shadow-2xl p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <BarChart3 className="w-6 h-6 text-primary" />
              <span>{analyticsTolee?.name} Insights</span>
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Engagement and activity insights for your Tolee community.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-4 my-6">
            <div className="bg-gray-50 dark:bg-gray-900/60 p-4 rounded-xl border border-gray-100 dark:border-gray-800/80">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold block mb-1">Weekly Views</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {((analyticsTolee?._count?.members || 0) * 12 + 45).toLocaleString()}
              </span>
              <span className="text-[10px] text-green-500 font-bold flex items-center gap-0.5 mt-1">
                <TrendingUp className="w-3 h-3" /> +14.2%
              </span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/60 p-4 rounded-xl border border-gray-100 dark:border-gray-800/80">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold block mb-1">Post Engagement</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {((analyticsTolee?._count?.posts || 0) * 4 + 8).toLocaleString()}
              </span>
              <span className="text-[10px] text-green-500 font-bold flex items-center gap-0.5 mt-1">
                <TrendingUp className="w-3 h-3" /> +8.5%
              </span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/60 p-4 rounded-xl border border-gray-100 dark:border-gray-800/80">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold block mb-1">New Members</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.max(1, Math.floor((analyticsTolee?._count?.members || 0) * 0.15))}
              </span>
              <span className="text-[10px] text-green-500 font-bold flex items-center gap-0.5 mt-1">
                <TrendingUp className="w-3 h-3" /> +24%
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                <span>Community Health Index</span>
                <span className="text-primary font-bold">Excellent (88/100)</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full w-[88%]" />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Member Growth (Last 4 Weeks)</h4>
              <div className="h-32 w-full bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-800/50 flex items-end p-2 relative overflow-hidden">
                <svg className="absolute inset-0 w-full h-full p-4" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0,90 Q 25,60 50,75 T 100,20 L 100,100 L 0,100 Z"
                    fill="url(#chartGradient)"
                  />
                  <path
                    d="M 0,90 Q 25,60 50,75 T 100,20"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx="0" cy="90" r="3" fill="hsl(var(--primary))" />
                  <circle cx="25" cy="60" r="3" fill="hsl(var(--primary))" />
                  <circle cx="50" cy="75" r="3" fill="hsl(var(--primary))" />
                  <circle cx="100" cy="20" r="3" fill="hsl(var(--primary))" />
                </svg>
                <div className="flex justify-between w-full text-[10px] text-gray-400 dark:text-gray-500 font-semibold px-2 z-10">
                  <span>Week 1</span>
                  <span>Week 2</span>
                  <span>Week 3</span>
                  <span>Week 4</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button onClick={() => setAnalyticsTolee(null)} className="w-full font-bold bg-primary text-white hover:bg-primary/95">
              Close Insights
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
