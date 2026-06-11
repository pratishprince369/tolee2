'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Globe, 
  Plus, 
  FileText, 
  UtensilsCrossed, 
  ShoppingBag, 
  Cpu, 
  ArrowUpRight, 
  Trash2, 
  ExternalLink,
  Eye,
  Check,
  X,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Store,
  Layers,
  Megaphone,
  MoreVertical
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  getWorldProjects, 
  deleteWorldProject, 
  updateOrderStatus, 
  getRestaurantOrders,
  getUserCreatorStats
} from '@/actions/world';
import { Lock } from 'lucide-react';


const UNLOCK_REQUIREMENTS: Record<string, { followers: number; likes?: number; description: string; motivation: string }> = {
  WEBSITE: { 
    followers: 500, 
    description: 'Reach 500 followers on Tolee',
    motivation: 'Grow your micro website to establish your business card, portfolio, or service pages natively inside Tolee!'
  },
  BLOG: { 
    followers: 800, 
    likes: 2000, 
    description: 'Reach 800 followers AND any one reel should reach 2,000 likes',
    motivation: 'Become a recognized local editor. Publish community newsletters, local reviews, and SEO-rich media blogs!'
  },
  RESTAURANT: { 
    followers: 1500, 
    description: 'Reach 1,500 followers on Tolee',
    motivation: 'Launch a fully featured online menu, slide galleries, and order engines directly inside your community feed!'
  },
  STORE: { 
    followers: 2000, 
    description: 'Reach 2,000 followers on Tolee',
    motivation: 'Open your automated E-Commerce storefront with customized product categories, location-based orders, and secure checkouts!'
  },
  SHOOT: { 
    followers: 5000, 
    description: 'Reach 5,000 followers on Tolee',
    motivation: 'Unlock the ultimate localized broadcast engine. Shoot promotion updates, coupons, and community newsletters to specific pincodes and target groups!'
  },
};

export default function WorldDashboardPage() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const [projects, setProjects] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [orders, setOrders] = React.useState<any[]>([]);
  const [selectedProjectForOrders, setSelectedProjectForOrders] = React.useState<string | null>(null);
  const [creatorStats, setCreatorStats] = React.useState<{ followersCount: number; maxReelLikes: number } | null>(null);
  const [selectedLockedTool, setSelectedLockedTool] = React.useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);

  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      loadProjects();
      loadCreatorStats();
    }
  }, [status]);

  const loadCreatorStats = async () => {
    const res = await getUserCreatorStats();
    if (res.success && res.stats) {
      setCreatorStats(res.stats);
    } else {
      setCreatorStats({ followersCount: 0, maxReelLikes: 0 });
    }
  };

  const checkToolLocked = (type: string) => {
    if (!creatorStats) return true;
    const req = UNLOCK_REQUIREMENTS[type];
    if (!req) return false;

    const followerPass = creatorStats.followersCount >= req.followers;
    const likesPass = req.likes ? creatorStats.maxReelLikes >= req.likes : true;

    return !(followerPass && likesPass);
  };

  const loadProjects = async () => {
    setLoading(true);
    const res = await getWorldProjects();
    if (res.success && res.projects) {
      setProjects(res.projects);
      
      // Select the first restaurant/store if exists to load orders
      const orderable = res.projects.find(p => p.type === 'RESTAURANT' || p.type === 'STORE');
      if (orderable) {
        setSelectedProjectForOrders(orderable.id);
        loadOrders(orderable.id);
      }
    }
    setLoading(false);
  };

  const loadOrders = async (projectId: string) => {
    const res = await getRestaurantOrders(projectId);
    if (res.success && res.orders) {
      setOrders(res.orders);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this project? This will permanently remove its public page and feed posts.')) {
      const res = await deleteWorldProject(id);
      if (res.success) {
        setProjects(projects.filter(p => p.id !== id));
      } else {
        alert('Failed to delete project: ' + res.error);
      }
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    const res = await updateOrderStatus(orderId, newStatus);
    if (res.success) {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } else {
      alert('Failed to update status: ' + res.error);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-white text-gray-900 p-6 lg:p-12 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-t-pink-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-400 text-sm font-medium animate-pulse">Loading Tolee World...</p>
      </div>
    );
  }

  // Calculate statistics
  const totalViews = projects.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalProjects = projects.length;
  const storeRestaurantProjects = projects.filter(p => p.type === 'RESTAURANT' || p.type === 'STORE');

  const toolCards = [
    {
      title: 'Micro Website',
      description: 'Create elegant digital business cards, portfolios, real estate profiles, or service pages.',
      icon: Globe,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      type: 'WEBSITE',
      route: '',
      badge: 'No-Code',
      badgeColor: 'bg-gray-100 text-gray-600',
      launchColor: 'text-pink-500 hover:text-pink-600',
    },
    {
      title: 'News Blog Creator',
      description: 'Write local reviews, publish community newsletters, and build SEO-rich media blogs.',
      icon: FileText,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      type: 'BLOG',
      route: '',
      badge: 'SEO-Rich',
      badgeColor: 'bg-gray-100 text-gray-600',
      launchColor: 'text-pink-500 hover:text-pink-600',
    },
    {
      title: 'Restaurant Builder',
      description: 'Configure customizable menus, offer codes, gallery sliders, and take online customer orders.',
      icon: UtensilsCrossed,
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      type: 'RESTAURANT',
      route: '',
      badge: 'Order Engine',
      badgeColor: 'bg-gray-100 text-gray-600',
      launchColor: 'text-pink-500 hover:text-pink-600',
    },
    {
      title: 'E-Commerce Store',
      description: 'Establish digital stores with product categories, checkouts, location targeting, and payments.',
      icon: ShoppingBag,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      type: 'STORE',
      route: '',
      badge: 'E-Comm',
      badgeColor: 'bg-gray-100 text-gray-600',
      launchColor: 'text-pink-500 hover:text-pink-600',
    },
    {
      title: 'Tolee Shoot',
      description: 'Broadcast community campaigns, promotion messages, posts, or product offers to selected groups, areas, or pincodes.',
      icon: Megaphone,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      type: 'SHOOT',
      route: '/world/shoot',
      badge: 'Broadcast',
      badgeColor: 'bg-gray-100 text-gray-600',
      launchColor: 'text-amber-500 hover:text-amber-600',
    }
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900 pb-24 selection:bg-pink-100 selection:text-pink-700">

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 lg:pt-8">

        {/* ═══════════════════════════════════════════
            HERO SECTION — matches screenshot exactly
            Left: circular logo badge
            Right: badge + title + subtitle + CTA + 3-dot
        ════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-10 pb-8 border-b border-gray-100">
          
          {/* Circular Logo — gradient ring */}
          <div className="relative flex-shrink-0">
            <div className="w-[100px] h-[100px] rounded-full p-[3px]"
              style={{ background: 'conic-gradient(from 0deg, #f97316, #ec4899, #8b5cf6, #06b6d4, #10b981, #f97316)' }}>
              <div className="w-full h-full rounded-full bg-gray-900 dark:bg-gray-900 flex flex-col items-center justify-center">
                <Globe className="w-7 h-7 text-white mb-1" />
                <span className="text-white text-[9px] font-black tracking-wider leading-tight text-center">TOLEE<br/>WORLD</span>
              </div>
            </div>
          </div>

          {/* Hero Text Area */}
          <div className="flex-1 min-w-0">
            {/* Creator Ecosystem badge */}
            <div className="flex items-center gap-1.5 mb-2">
              <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-500 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
                <Sparkles className="w-3 h-3 text-pink-500" />
                CREATOR ECOSYSTEM
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
              Tolee World
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed max-w-lg">
              Supercharge your community presence. Design microsites, launch restaurants, host e-commerce
              storefronts, generate AI assets, and distribute them natively inside Tolee feeds.
            </p>
          </div>

          {/* Right: CTA + 3-dot */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href="/world/create">
              <button
                className="inline-flex items-center gap-2 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #ec4899, #f97316)' }}
              >
                <Plus className="w-4 h-4" />
                Launch New Project
              </button>
            </Link>
            <button className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════
            DASHBOARD STATS CARDS
        ═══════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {/* Total Projects */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Layers className="w-4 h-4 text-purple-500" />
              </div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Projects</span>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{totalProjects}</p>
            <p className="text-xs text-gray-400 mt-1">My active microsites &amp; storefronts</p>
          </div>

          {/* Total Traffic */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Eye className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Traffic</span>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{totalViews}</p>
            <p className="text-xs text-gray-400 mt-1">Total unique visits</p>
          </div>

          {/* Order Channels */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                <Store className="w-4 h-4 text-rose-500" />
              </div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Order Channels</span>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{storeRestaurantProjects.length}</p>
            <p className="text-xs text-gray-400 mt-1">E-Commerce &amp; restaurants active</p>
          </div>

          {/* Ecosystem Share */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ecosystem Share</span>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">100%</p>
            <p className="text-xs text-gray-400 mt-1">Native Tolee-first visibility</p>
          </div>
        </div>

        {/* ═══════════════════════════════════
            CREATOR STUDIO TOOLS
        ═══════════════════════════════════ */}
        <div className="mb-10">
          <h2 className="text-sm font-bold text-gray-700 mb-5 flex items-center gap-2 uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-pink-500" />
            Creator Studio Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {toolCards.map((tool) => {
              const Icon = tool.icon;
              const isLocked = checkToolLocked(tool.type);
              const requirements = UNLOCK_REQUIREMENTS[tool.type];

              return (
                <div
                  key={tool.title}
                  className={`bg-white border border-gray-100 rounded-2xl p-5 flex flex-col justify-between hover:border-gray-200 hover:shadow-md transition-all duration-200 group cursor-pointer relative ${
                    isLocked ? 'opacity-85 border-amber-100 hover:border-amber-200 bg-amber-50/5' : ''
                  }`}
                  onClick={() => {
                    if (isLocked) {
                      setSelectedLockedTool(tool);
                      setDialogOpen(true);
                      setCopiedLink(false);
                    } else {
                      if (tool.route) {
                        router.push(tool.route);
                      } else {
                        router.push(`/world/create?type=${tool.type}`);
                      }
                    }
                  }}
                >
                  <div>
                    {/* Icon badge + type/lock badge row */}
                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-10 h-10 rounded-xl ${tool.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${tool.iconColor}`} />
                      </div>
                      
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-100 shadow-xs">
                          <Lock className="w-2.5 h-2.5" /> Locked
                        </span>
                      ) : (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${tool.badgeColor}`}>
                          {tool.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-gray-900 text-sm mb-2 group-hover:text-pink-600 transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed mb-4">{tool.description}</p>

                    {/* Progress bars inside card if locked */}
                    {isLocked && requirements && (
                      <div className="space-y-2.5 pt-2 border-t border-gray-100">
                        {/* Followers Progress */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-gray-500 font-medium">
                            <span>Followers</span>
                            <span>
                              {creatorStats ? creatorStats.followersCount : 0} / {requirements.followers}
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                            <div 
                              className="bg-pink-500 h-full transition-all duration-500"
                              style={{ 
                                width: `${Math.min(100, ((creatorStats ? creatorStats.followersCount : 0) / requirements.followers) * 100)}%` 
                              }}
                            />
                          </div>
                        </div>

                        {/* Likes Progress if required */}
                        {requirements.likes && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-gray-500 font-medium">
                              <span>Max Reel Likes</span>
                              <span>
                                {creatorStats ? creatorStats.maxReelLikes : 0} / {requirements.likes}
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                              <div 
                                className="bg-orange-500 h-full transition-all duration-500"
                                style={{ 
                                  width: `${Math.min(100, ((creatorStats ? creatorStats.maxReelLikes : 0) / requirements.likes) * 100)}%` 
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Launch Tool CTA */}
                  <div className="mt-5 pt-4 border-t border-gray-50">
                    <span className={`text-xs font-bold transition-colors inline-flex items-center gap-1 ${
                      isLocked ? 'text-amber-600 group-hover:text-amber-700' : tool.launchColor
                    }`}>
                      {isLocked ? 'Unlock Requirements' : 'Launch Tool'} <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════
            PLUGIN MARKETPLACE PROMO BANNER
        ═══════════════════════════════════ */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">Future Ready</span>
              <span className="text-[11px] font-bold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">Modular SDK</span>
            </div>
            <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-500" /> Modular Plugin Marketplace
            </h2>
            <p className="text-gray-400 text-xs max-w-xl leading-relaxed">
              Tolee World is built on an extensible, plugin-ready workspace system. Easily connect upcoming components like AI Video Generators, Booking Calendars, localized lead CRM utilities, and native tokenized subscription billing.
            </p>
          </div>
          <button
            onClick={() => alert("Ecosystem Roadmap: Developer SDK and plug-in documentation is coming soon!")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 px-4 py-2.5 rounded-xl transition-all flex-shrink-0"
          >
            Explore Roadmap <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* ═══════════════════════════════════
            DASHBOARD TABS — Projects & Orders
        ═══════════════════════════════════ */}
        <Tabs defaultValue="projects" className="w-full">
          <TabsList className="bg-gray-100 border border-gray-200 p-1 rounded-xl mb-7 flex justify-start w-fit">
            <TabsTrigger
              value="projects"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 text-sm"
            >
              My Projects ({projects.length})
            </TabsTrigger>
            {storeRestaurantProjects.length > 0 && (
              <TabsTrigger
                value="orders"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 text-sm"
              >
                Restaurant &amp; Store Orders
              </TabsTrigger>
            )}
          </TabsList>

          {/* Projects tab */}
          <TabsContent value="projects">
            {projects.length === 0 ? (
              <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-2xl">
                <Globe className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-900 mb-1">No Projects Yet</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mb-5">
                  Create your first micro website, blog, or restaurant builder and start publishing.
                </p>
                <Link href="/world/create">
                  <button
                    className="inline-flex items-center gap-2 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-sm hover:opacity-90 transition-all"
                    style={{ background: 'linear-gradient(135deg, #ec4899, #f97316)' }}
                  >
                    <Plus className="w-4 h-4" /> Create Project
                  </button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {projects.map((project) => {
                  let pathPrefix = '';
                  if (project.type === 'WEBSITE') pathPrefix = 'micro-website';
                  else if (project.type === 'BLOG') pathPrefix = 'blog';
                  else if (project.type === 'RESTAURANT') pathPrefix = 'restaurant';
                  else if (project.type === 'STORE') pathPrefix = 'store';

                  const publicUrl = `/${pathPrefix}/${project.slug}`;

                  return (
                    <div key={project.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 hover:shadow-md transition-all group">
                      {/* Banner */}
                      <div className="w-full h-36 overflow-hidden relative bg-gray-50">
                        {project.bannerImage ? (
                          <img src={project.bannerImage} alt={project.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Globe className="w-8 h-8 text-gray-200" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider text-gray-700 border border-gray-100 shadow-sm">
                          {project.type}
                        </div>
                      </div>

                      <div className="p-5">
                        <h3 className="font-bold text-gray-900 text-base mb-1 truncate group-hover:text-pink-600 transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-xs text-gray-400 line-clamp-2 mb-3 min-h-[32px]">
                          {project.description || 'No description provided.'}
                        </p>

                        {/* URL pill */}
                        <div className="bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl text-xs text-gray-500 mb-3 flex items-center justify-between font-mono">
                          <span className="truncate">tolee.in{publicUrl}</span>
                          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:text-pink-600 ml-2 flex-shrink-0">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {project.views} views</span>
                          <span>Tolees: {project.tolees?.length || 0}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 border-t border-gray-50 pt-3">
                          <button
                            onClick={() => router.push(`/world/create?id=${project.id}&type=${project.type}`)}
                            className="flex-1 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl py-2 transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(project.id)}
                            className="w-9 h-9 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 border border-gray-100 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Orders tab */}
          <TabsContent value="orders">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Restaurant selector */}
              <div className="lg:col-span-1 space-y-2">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-3">Select Store / Restaurant</h3>
                {storeRestaurantProjects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProjectForOrders(p.id);
                      loadOrders(p.id);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                      selectedProjectForOrders === p.id
                        ? 'bg-pink-50 border-pink-200 text-pink-700'
                        : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{p.name}</span>
                      <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-bold ml-2 flex-shrink-0">{p.type}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Orders list */}
              <div className="lg:col-span-3">
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-50">
                    <h3 className="font-bold text-gray-900">Incoming Customer Orders</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Accept and manage orders placed from the public microsites.</p>
                  </div>
                  <div className="p-5">
                    {orders.length === 0 ? (
                      <div className="text-center py-10">
                        <Clock className="w-9 h-9 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">No orders received yet for this project.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {orders.map((order) => (
                          <div key={order.id} className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-sm">{order.customerName}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  order.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                  order.status === 'accepted' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                  order.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                  'bg-red-50 text-red-600 border border-red-100'
                                }`}>
                                  {order.status.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 font-mono">Contact: {order.customerContact}</p>
                              <p className="text-xs text-gray-700 mt-2 bg-white p-2.5 rounded-xl border border-gray-100 max-w-xl whitespace-pre-line">{order.orderDetails}</p>
                              <p className="text-xs text-gray-400 mt-1">Placed: {new Date(order.createdAt).toLocaleString()}</p>
                            </div>
                            
                            <div className="flex flex-col items-end gap-3 flex-shrink-0">
                              <span className="text-lg font-extrabold text-pink-600">₹{order.totalPrice}</span>
                              {order.status === 'pending' && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, 'accepted')}
                                    className="inline-flex items-center gap-1 text-white text-xs font-bold bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-all"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Accept
                                  </button>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                                    className="inline-flex items-center gap-1 text-red-500 text-xs font-bold hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-all"
                                  >
                                    <X className="w-3.5 h-3.5" /> Decline
                                  </button>
                                </div>
                              )}
                              {order.status === 'accepted' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                                  className="inline-flex items-center gap-1 text-white text-xs font-bold bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg transition-all"
                                >
                                  <Check className="w-3.5 h-3.5" /> Complete
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </TabsContent>

        </Tabs>

      </div>

      {/* 🔒 Feature Unlock Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#0b0c10] border border-zinc-800 text-white rounded-3xl p-6 shadow-2xl overflow-hidden font-sans">
          {selectedLockedTool && (
            <div className="flex flex-col items-center text-center space-y-6">
              
              {/* Pulsing Lock Icon Header */}
              <div className="relative mt-2">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full blur-md opacity-75 animate-pulse" />
                <div className="relative w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                  <Lock className="w-7 h-7 text-amber-400 animate-bounce" style={{ animationDuration: '3s' }} />
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-2 w-full">
                <DialogTitle className="text-xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
                  {selectedLockedTool.title} Locked
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                  Unlock this professional tool to level up your reach and monetize your creator presence on Tolee.
                </DialogDescription>
              </div>

              {/* Requirements & Progress System */}
              <div className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-4">
                
                {/* Followers Requirement */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-300">Followers Count</span>
                    <span className="text-pink-400">
                      {creatorStats?.followersCount || 0} <span className="text-zinc-500">/ {UNLOCK_REQUIREMENTS[selectedLockedTool.type].followers}</span>
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-pink-500 to-purple-600 h-full rounded-full transition-all duration-700 ease-out"
                      style={{ 
                        width: `${Math.min(100, ((creatorStats?.followersCount || 0) / UNLOCK_REQUIREMENTS[selectedLockedTool.type].followers) * 100)}%` 
                      }}
                    />
                  </div>
                </div>

                {/* Reel Likes Requirement */}
                {UNLOCK_REQUIREMENTS[selectedLockedTool.type].likes && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-zinc-300">Highest Reel Likes</span>
                      <span className="text-orange-400">
                        {creatorStats?.maxReelLikes || 0} <span className="text-zinc-500">/ {UNLOCK_REQUIREMENTS[selectedLockedTool.type].likes}</span>
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-orange-500 to-yellow-500 h-full rounded-full transition-all duration-700 ease-out"
                        style={{ 
                          width: `${Math.min(100, ((creatorStats?.maxReelLikes || 0) / (UNLOCK_REQUIREMENTS[selectedLockedTool.type].likes || 1)) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Motivation Text */}
              <div className="w-full text-center py-1">
                <span className="inline-flex items-center gap-1.5 bg-zinc-900 text-amber-400/90 text-[11px] font-medium px-3.5 py-2 rounded-xl border border-zinc-800/60 leading-normal max-w-sm">
                  💡 {UNLOCK_REQUIREMENTS[selectedLockedTool.type].motivation}
                </span>
              </div>

              {/* Grow Faster Action CTAs */}
              <div className="w-full pt-2 space-y-2 border-t border-zinc-900">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-left mb-2.5">
                  ⚡ Grow Faster &amp; Unlock
                </h4>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      router.push('/reels');
                      setDialogOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-bold py-2.5 px-4 rounded-xl transition-all active:scale-95"
                  >
                    <Megaphone className="w-3.5 h-3.5 text-pink-500" />
                    Go to Reels
                  </button>
                  
                  <button
                    onClick={() => {
                      router.push('/feed');
                      setDialogOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-bold py-2.5 px-4 rounded-xl transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 text-orange-500" />
                    Post to Feed
                  </button>
                </div>

                <button
                  onClick={() => {
                    const inviteLink = session?.user 
                      ? `https://tolee.in/signup?ref=${(session.user as any).id}` 
                      : 'https://tolee.in/signup';
                    navigator.clipboard.writeText(inviteLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-95 text-white hover:opacity-90 animate-none"
                  style={{ background: 'linear-gradient(135deg, #ec4899, #f97316)' }}
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      Link Copied!
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-white" />
                      Invite Friends (Grow Followers)
                    </>
                  )}
                </button>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
