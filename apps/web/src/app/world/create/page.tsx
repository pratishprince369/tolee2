'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Globe, 
  Sparkles, 
  MapPin, 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Image as ImageIcon,
  CheckCircle2,
  FileText,
  UtensilsCrossed,
  ShoppingBag,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSidebarData } from '@/actions/user';
import { createWorldProject, updateWorldProject, getPublicWorldProject } from '@/actions/world';

export default function WorldCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const initialType = searchParams.get('type') || 'WEBSITE';
  const { status } = useSession();

  // Project state
  const [type, setType] = React.useState<string>(initialType);
  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [bannerImage, setBannerImage] = React.useState('');
  const [locationText, setLocationText] = React.useState('');
  const [seoTitle, setSeoTitle] = React.useState('');
  const [seoDesc, setSeoDesc] = React.useState('');
  const [seoKeywords, setSeoKeywords] = React.useState('');
  
  // Group selection state
  const [myTolees, setMyTolees] = React.useState<any[]>([]);
  const [selectedTolees, setSelectedTolees] = React.useState<string[]>([]);

  // Editor content states (specific to types)
  const [websiteTemplate, setWebsiteTemplate] = React.useState('portfolio');
  const [websiteElements, setWebsiteElements] = React.useState<any[]>([
    { id: '1', type: 'text', title: 'Welcome to my space', body: 'Feel free to explore my services and links.' }
  ]);
  const [blogBody, setBlogBody] = React.useState('');
  const [blogCategory, setBlogCategory] = React.useState('General');
  const [blogTags, setBlogTags] = React.useState('');
  
  const [restaurantDishes, setRestaurantDishes] = React.useState<any[]>([
    { id: '1', name: 'Special Cheese Pizza', price: 299, desc: 'Fresh dough with double cheese', image: '', category: 'Pizzas' }
  ]);
  const [restaurantHours, setRestaurantHours] = React.useState('11:00 AM - 11:00 PM');
  
  const [storeProducts, setStoreProducts] = React.useState<any[]>([
    { id: '1', name: 'Premium Leather Wallet', price: 999, desc: 'Handcrafted genuine leather', image: '', category: 'Accessories' }
  ]);
  const [storePaymentGateway, setStorePaymentGateway] = React.useState('Razorpay');
  const [storeShipping, setStoreShipping] = React.useState('Free shipping in India');

  // AI Copilot state
  const [aiPrompt, setAiPrompt] = React.useState('');
  const [aiOutput, setAiOutput] = React.useState('');
  const [aiLoading, setAiLoading] = React.useState(false);

  // General loading/submitting states
  const [loading, setLoading] = React.useState(false);
  const [fetchingProject, setFetchingProject] = React.useState(false);
  const [imageUploading, setImageUploading] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      loadTolees();
      if (editId) {
        loadExistingProject();
      }
    }
  }, [status, editId]);

  // Sync Slug suggestion with Name
  React.useEffect(() => {
    if (!editId) {
      const clean = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(clean);
    }
  }, [name, editId]);

  const loadTolees = async () => {
    const res = await getSidebarData();
    if (res.success) {
      const all = [...(res.managedTolees || []), ...(res.joinedTolees || [])];
      // remove duplicates
      const unique = all.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      setMyTolees(unique);
    }
  };

  const loadExistingProject = async () => {
    if (!editId) return;
    setFetchingProject(true);
    // Find project by slug
    // Quick trick: fetch public page to read structure
    // Let's call the database to load details
    try {
      const res = await fetch(`/api/world/project?id=${editId}`);
      const data = await res.json();
      if (data.success && data.project) {
        const p = data.project;
        setType(p.type);
        setName(p.name);
        setSlug(p.slug);
        setDescription(p.description || '');
        setBannerImage(p.bannerImage || '');
        setLocationText(p.locationText || '');
        setSeoTitle(p.seoTitle || '');
        setSeoDesc(p.seoDesc || '');
        setSeoKeywords(p.seoKeywords || '');
        setSelectedTolees(p.tolees.map((t: any) => t.toleeId));

        // Load JSON Content
        const content = p.content;
        if (p.type === 'WEBSITE') {
          setWebsiteTemplate(content.template || 'portfolio');
          setWebsiteElements(content.elements || []);
        } else if (p.type === 'BLOG') {
          setBlogBody(content.body || '');
          setBlogCategory(content.category || 'General');
          setBlogTags(content.tags || '');
        } else if (p.type === 'RESTAURANT') {
          setRestaurantDishes(content.dishes || []);
          setRestaurantHours(content.hours || '11:00 AM - 11:00 PM');
        } else if (p.type === 'STORE') {
          setStoreProducts(content.products || []);
          setStorePaymentGateway(content.paymentGateway || 'Razorpay');
          setStoreShipping(content.shipping || 'Free shipping');
        }
      }
    } catch (e) {
      console.error(e);
    }
    setFetchingProject(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: string, index?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(target);
    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (data.success && data.url) {
        if (target === 'banner') {
          setBannerImage(data.url);
        } else if (target === 'dish' && index !== undefined) {
          const updated = [...restaurantDishes];
          updated[index].image = data.url;
          setRestaurantDishes(updated);
        } else if (target === 'product' && index !== undefined) {
          const updated = [...storeProducts];
          updated[index].image = data.url;
          setStoreProducts(updated);
        }
      } else {
        alert('Upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed. Please check file type & size constraints.');
    }
    setImageUploading(null);
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiOutput('');
    try {
      const res = await fetch('/api/ai-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, projectType: type })
      });
      const data = await res.json();
      if (data.success) {
        setAiOutput(data.text);
      } else {
        setAiOutput('AI Generation failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setAiOutput('AI Server error.');
    }
    setAiLoading(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return alert('Please enter a project name.');
    if (!slug.trim()) return alert('Please enter a custom slug URL.');
    if (selectedTolees.length === 0) return alert('Community Integration: You MUST select at least one Tolee/group to share your website with.');

    setLoading(true);

    // Prepare JSON payload based on type
    let content: any = {};
    if (type === 'WEBSITE') {
      content = { template: websiteTemplate, elements: websiteElements };
    } else if (type === 'BLOG') {
      content = { body: blogBody, category: blogCategory, tags: blogTags };
    } else if (type === 'RESTAURANT') {
      content = { dishes: restaurantDishes, hours: restaurantHours };
    } else if (type === 'STORE') {
      content = { products: storeProducts, paymentGateway: storePaymentGateway, shipping: storeShipping };
    }

    const payload = {
      type,
      name,
      slug,
      description,
      bannerImage,
      content,
      locationText,
      seoTitle,
      seoDesc,
      seoKeywords,
      selectedToleeIds: selectedTolees
    };

    const res = editId 
      ? await updateWorldProject(editId, payload)
      : await createWorldProject(payload);

    if (res.success) {
      router.push('/world');
    } else {
      alert('Error saving project: ' + res.error);
    }
    setLoading(false);
  };

  const toggleTolee = (id: string) => {
    if (selectedTolees.includes(id)) {
      setSelectedTolees(selectedTolees.filter(x => x !== id));
    } else {
      setSelectedTolees([...selectedTolees, id]);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] text-gray-900 dark:text-white pb-20 relative selection:bg-primary selection:text-white">
      {/* Background glow */}
      <div className="absolute top-0 right-1/4 w-[350px] h-[350px] bg-primary/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative z-10">
        
        {/* Navigation / Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-900" onClick={() => router.push('/world')}>
              <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white" />
            </Button>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                {editId ? 'Edit Project' : 'Create New Project'}
                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 uppercase text-[10px] font-bold px-2 py-0.5">
                  {type}
                </Badge>
              </h1>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Launch a brand new business portal or blog in Tolee World</p>
            </div>
          </div>
          <Button 
            onClick={handleSubmit} 
            className="bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center gap-2 font-bold px-6 shadow-lg shadow-primary/20 h-11"
            disabled={loading}
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editId ? 'Save Modifications' : 'Publish & Broadcast'}
          </Button>
        </div>

        {fetchingProject ? (
          <div className="text-center py-20">
            <RefreshCw className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-500 dark:text-zinc-400 font-bold">Retrieving project parameters...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left & Mid Panels: Project Details / Content Canvas */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Step 1: Basic setup */}
              <Card className="bg-white dark:bg-zinc-900/40 border-gray-200 dark:border-zinc-800 backdrop-blur-md rounded-2xl shadow-sm">
                <CardHeader className="p-6 pb-4 border-b border-gray-200 dark:border-zinc-800">
                  <CardTitle className="text-sm font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" /> 1. General Project Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="project-type" className="text-gray-500 dark:text-zinc-400 text-xs">Project Channel</Label>
                      <select
                        id="project-type"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        disabled={!!editId}
                        className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary disabled:opacity-50"
                      >
                        <option value="WEBSITE">Micro Website Builder</option>
                        <option value="BLOG">News Blog Creator</option>
                        <option value="RESTAURANT">Restaurant Builder</option>
                        <option value="STORE">E-Commerce Microsite</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="project-name" className="text-gray-500 dark:text-zinc-400 text-xs">Name / Title</Label>
                      <Input
                        id="project-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Riya Makeup Studio / Mumbai Daily News"
                        className="bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="project-slug" className="text-gray-500 dark:text-zinc-400 text-xs">Custom URL Slug (tolee.in/path-name)</Label>
                      <Input
                        id="project-slug"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                        placeholder="e.g. riya-makeup"
                        className="bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="project-location" className="text-gray-500 dark:text-zinc-400 text-xs flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> Target Location (City, Area)
                      </Label>
                      <Input
                        id="project-location"
                        value={locationText}
                        onChange={(e) => setLocationText(e.target.value)}
                        placeholder="e.g. Mulund, Mumbai"
                        className="bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project-desc" className="text-gray-500 dark:text-zinc-400 text-xs">Short Description / Sub-headline</Label>
                    <Input
                      id="project-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Premium bridal styling and nail art packages in Mulund west."
                      className="bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-500 dark:text-zinc-400 text-xs block">Banner Cover Image</Label>
                    <div className="flex gap-4 items-center">
                      {bannerImage ? (
                        <div className="w-20 h-12 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex-shrink-0">
                          <img src={bannerImage} alt="Banner Preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-20 h-12 rounded-lg border border-dashed border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="w-5 h-5 text-gray-400 dark:text-zinc-600" />
                        </div>
                      )}
                      <label className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-xs text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 px-4 py-2 rounded-xl cursor-pointer font-semibold transition-colors flex items-center gap-2 shadow-sm">
                        {imageUploading === 'banner' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                        Upload Cover Image
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} />
                      </label>
                      {bannerImage && (
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 px-2 text-xs" onClick={() => setBannerImage('')}>Remove</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 2: Editor Canvas for specific content type */}
              <Card className="bg-white dark:bg-zinc-900/40 border-gray-200 dark:border-zinc-800 backdrop-blur-md rounded-2xl shadow-sm">
                <CardHeader className="p-6 pb-4 border-b border-gray-200 dark:border-zinc-800 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-primary" /> 2. {type} Canvas & Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  
                  {/* Website Elements Editor */}
                  {type === 'WEBSITE' && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="web-template" className="text-gray-500 dark:text-zinc-400 text-xs">Choose Website Template Style</Label>
                        <select
                          id="web-template"
                          value={websiteTemplate}
                          onChange={(e) => setWebsiteTemplate(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary"
                        >
                          <option value="profile">Personal Profile Page (Canva-style Link-in-Bio)</option>
                          <option value="realestate">Real Estate Showcase (Property card focus)</option>
                          <option value="makeup">Beauty / Makeup Artist Portfolio</option>
                          <option value="marketing">Digital Marketing Agency Page</option>
                          <option value="portfolio">Professional Career Portfolio</option>
                          <option value="service">Local Services Booking landing page</option>
                        </select>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-gray-500 dark:text-zinc-400 text-xs font-semibold">Custom Text Content Blocks</Label>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 h-8"
                            onClick={() => setWebsiteElements([...websiteElements, { id: Date.now().toString(), type: 'text', title: 'New Header', body: 'New text body description...' }])}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Block
                          </Button>
                        </div>

                        {websiteElements.map((el, index) => (
                          <div key={el.id} className="bg-gray-50 dark:bg-zinc-950 p-4 border border-gray-200 dark:border-zinc-800 rounded-xl space-y-3 relative group shadow-sm">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setWebsiteElements(websiteElements.filter(x => x.id !== el.id))}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <div className="space-y-1 pr-8">
                              <Label className="text-[10px] text-zinc-500 font-bold uppercase">Block {index + 1} Title</Label>
                              <Input
                                value={el.title}
                                onChange={(e) => {
                                  const updated = [...websiteElements];
                                  updated[index].title = e.target.value;
                                  setWebsiteElements(updated);
                                }}
                                placeholder="Block Title"
                                className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-850 rounded-lg h-9 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-zinc-500 font-bold uppercase">Block Content Body</Label>
                              <textarea
                                value={el.body}
                                onChange={(e) => {
                                  const updated = [...websiteElements];
                                  updated[index].body = e.target.value;
                                  setWebsiteElements(updated);
                                }}
                                placeholder="Block body text..."
                                className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-850 rounded-lg p-2.5 text-xs text-gray-900 dark:text-white h-20 focus:outline-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* News Blog Creator Editor */}
                  {type === 'BLOG' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-500 dark:text-zinc-400 text-xs">Blog Category</Label>
                          <Input
                            value={blogCategory}
                            onChange={(e) => setBlogCategory(e.target.value)}
                            placeholder="e.g. Local News, Lifestyle, Politics"
                            className="bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-500 dark:text-zinc-400 text-xs">Search Keywords / Tags</Label>
                          <Input
                            value={blogTags}
                            onChange={(e) => setBlogTags(e.target.value)}
                            placeholder="e.g. news, viral, breaking"
                            className="bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-500 dark:text-zinc-400 text-xs font-semibold">Rich Text Body content (supports markdown/plain text)</Label>
                        <textarea
                          value={blogBody}
                          onChange={(e) => setBlogBody(e.target.value)}
                          placeholder="Type your full blog article content here..."
                          className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl p-3.5 text-sm text-gray-900 dark:text-white h-60 focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  )}

                  {/* Restaurant Builder Editor */}
                  {type === 'RESTAURANT' && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-gray-500 dark:text-zinc-400 text-xs">Opening & Closing Hours</Label>
                        <Input
                          value={restaurantHours}
                          onChange={(e) => setRestaurantHours(e.target.value)}
                          placeholder="e.g. 11:00 AM - 11:00 PM"
                          className="bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white"
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-gray-500 dark:text-zinc-400 text-xs font-semibold">Menu Dishes Card List</Label>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 h-8"
                            onClick={() => setRestaurantDishes([...restaurantDishes, { id: Date.now().toString(), name: 'New Item', price: 199, desc: '', image: '', category: 'Starters' }])}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Menu Item
                          </Button>
                        </div>

                        {restaurantDishes.map((dish, index) => (
                          <div key={dish.id} className="bg-gray-50 dark:bg-zinc-950 p-4 border border-gray-200 dark:border-zinc-800 rounded-xl space-y-3 relative group shadow-sm">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setRestaurantDishes(restaurantDishes.filter(x => x.id !== dish.id))}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[10px] text-zinc-500 uppercase">Item Name</Label>
                                <Input
                                  value={dish.name}
                                  onChange={(e) => {
                                    const updated = [...restaurantDishes];
                                    updated[index].name = e.target.value;
                                    setRestaurantDishes(updated);
                                  }}
                                  className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-850 rounded-lg text-gray-900 dark:text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-zinc-500 uppercase">Price (INR)</Label>
                                <Input
                                  type="number"
                                  value={dish.price}
                                  onChange={(e) => {
                                    const updated = [...restaurantDishes];
                                    updated[index].price = parseFloat(e.target.value) || 0;
                                    setRestaurantDishes(updated);
                                  }}
                                  className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-850 rounded-lg text-gray-900 dark:text-white"
                                />
                              </div>
                              <div className="space-y-1 col-span-2 md:col-span-1">
                                <Label className="text-[10px] text-zinc-500 uppercase">Menu Category</Label>
                                <Input
                                  value={dish.category}
                                  onChange={(e) => {
                                    const updated = [...restaurantDishes];
                                    updated[index].category = e.target.value;
                                    setRestaurantDishes(updated);
                                  }}
                                  className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-850 rounded-lg text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[10px] text-zinc-500 uppercase">Description / Ingredients</Label>
                              <Input
                                value={dish.desc}
                                onChange={(e) => {
                                  const updated = [...restaurantDishes];
                                  updated[index].desc = e.target.value;
                                  setRestaurantDishes(updated);
                                }}
                                className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-850 rounded-lg text-xs text-gray-900 dark:text-white"
                                placeholder="Spicy, thin crust..."
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[10px] text-zinc-500 uppercase block">Dish Thumbnail Photo</Label>
                              <div className="flex gap-3 items-center">
                                {dish.image ? (
                                  <img src={dish.image} alt={dish.name} className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-zinc-800" />
                                ) : (
                                  <div className="w-10 h-10 border border-dashed border-gray-200 dark:border-zinc-800 rounded-lg flex items-center justify-center bg-white dark:bg-zinc-900"><ImageIcon className="w-4 h-4 text-gray-400 dark:text-zinc-700" /></div>
                                )}
                                <label className="bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-850 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 text-[11px] font-bold text-gray-700 dark:text-zinc-300 cursor-pointer shadow-sm transition-colors">
                                  Upload Photo
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'dish', index)} />
                                </label>
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* E-Commerce Builder Editor */}
                  {type === 'STORE' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-500 dark:text-zinc-400 text-xs">Payment Gateway Target (Mock info)</Label>
                          <Input
                            value={storePaymentGateway}
                            onChange={(e) => setStorePaymentGateway(e.target.value)}
                            placeholder="e.g. Razorpay, Cash on Delivery"
                            className="bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-500 dark:text-zinc-400 text-xs">Shipping Policy details</Label>
                          <Input
                            value={storeShipping}
                            onChange={(e) => setStoreShipping(e.target.value)}
                            placeholder="e.g. Delivered in 2-3 business days"
                            className="bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-gray-500 dark:text-zinc-400 text-xs font-semibold">Store Product Catalogue</Label>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 h-8"
                            onClick={() => setStoreProducts([...storeProducts, { id: Date.now().toString(), name: 'New Product', price: 499, desc: '', image: '', category: 'All' }])}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Product Item
                          </Button>
                        </div>

                        {storeProducts.map((prod, index) => (
                          <div key={prod.id} className="bg-gray-50 dark:bg-zinc-950 p-4 border border-gray-200 dark:border-zinc-800 rounded-xl space-y-3 relative group shadow-sm">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setStoreProducts(storeProducts.filter(x => x.id !== prod.id))}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[10px] text-zinc-500 uppercase">Product Name</Label>
                                <Input
                                  value={prod.name}
                                  onChange={(e) => {
                                    const updated = [...storeProducts];
                                    updated[index].name = e.target.value;
                                    setStoreProducts(updated);
                                  }}
                                  className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-850 rounded-lg text-gray-900 dark:text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-zinc-500 uppercase">Price (INR)</Label>
                                <Input
                                  type="number"
                                  value={prod.price}
                                  onChange={(e) => {
                                    const updated = [...storeProducts];
                                    updated[index].price = parseFloat(e.target.value) || 0;
                                    setStoreProducts(updated);
                                  }}
                                  className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-850 rounded-lg text-gray-900 dark:text-white"
                                />
                              </div>
                              <div className="space-y-1 col-span-2 md:col-span-1">
                                <Label className="text-[10px] text-zinc-500 uppercase">Product Category</Label>
                                <Input
                                  value={prod.category}
                                  onChange={(e) => {
                                    const updated = [...storeProducts];
                                    updated[index].category = e.target.value;
                                    setStoreProducts(updated);
                                  }}
                                  className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-850 rounded-lg text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[10px] text-zinc-500 uppercase">Product Specs / Info</Label>
                              <Input
                                value={prod.desc}
                                onChange={(e) => {
                                  const updated = [...storeProducts];
                                  updated[index].desc = e.target.value;
                                  setStoreProducts(updated);
                                }}
                                className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-850 rounded-lg text-xs text-gray-900 dark:text-white"
                                placeholder="Size, materials details..."
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[10px] text-zinc-500 uppercase block">Product Photo</Label>
                              <div className="flex gap-3 items-center">
                                {prod.image ? (
                                  <img src={prod.image} alt={prod.name} className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-zinc-800" />
                                ) : (
                                  <div className="w-10 h-10 border border-dashed border-gray-200 dark:border-zinc-800 rounded-lg flex items-center justify-center bg-white dark:bg-zinc-900"><ImageIcon className="w-4 h-4 text-gray-400 dark:text-zinc-700" /></div>
                                )}
                                <label className="bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-850 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 text-[11px] font-bold text-gray-700 dark:text-zinc-300 cursor-pointer shadow-sm transition-colors">
                                  Upload Photo
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'product', index)} />
                                </label>
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>

              {/* Step 3: SEO Meta details */}
              <Card className="bg-white dark:bg-zinc-900/40 border-gray-200 dark:border-zinc-800 backdrop-blur-md rounded-2xl shadow-sm">
                <CardHeader className="p-6 pb-4 border-b border-gray-200 dark:border-zinc-800">
                  <CardTitle className="text-sm font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" /> 3. Search Engine Optimization (SEO)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="seo-title" className="text-gray-500 dark:text-zinc-400 text-xs">Meta Title</Label>
                      <Input
                        id="seo-title"
                        value={seoTitle}
                        onChange={(e) => setSeoTitle(e.target.value)}
                        placeholder="Best Makeup Artist in Mumbai"
                        className="bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="seo-keywords" className="text-gray-500 dark:text-zinc-400 text-xs">Meta Keywords</Label>
                      <Input
                        id="seo-keywords"
                        value={seoKeywords}
                        onChange={(e) => setSeoKeywords(e.target.value)}
                        placeholder="makeup, bridal makeup, artist, salon"
                        className="bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seo-desc" className="text-gray-500 dark:text-zinc-400 text-xs">Meta Description</Label>
                    <Input
                      id="seo-desc"
                      value={seoDesc}
                      onChange={(e) => setSeoDesc(e.target.value)}
                      placeholder="Visit Riya's portfolio site for bridal styling rates and reviews."
                      className="bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white"
                    />
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Right Panel: Mandatory Tolee Selection & AI helper */}
            <div className="space-y-6">
              
              {/* Tolee Community sharing panel */}
              <Card className="bg-white dark:bg-zinc-900/40 border-gray-200 dark:border-zinc-800 backdrop-blur-md border-primary/20 rounded-2xl shadow-sm">
                <CardHeader className="p-6 pb-4 border-b border-gray-200 dark:border-zinc-800">
                  <CardTitle className="text-sm font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-2">🌐 Community Selection</span>
                    <Badge className="bg-red-500 text-white font-extrabold text-[9px] px-2 py-0.5 animate-pulse rounded-md">Required</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4 leading-relaxed">
                    Tolee World is deeply integrated with local groups. You <strong className="text-gray-900 dark:text-white">MUST</strong> select at least one group. Upon publication, an interactive website card will distribute directly to their feed.
                  </p>

                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {myTolees.map((tolee) => {
                      const isSelected = selectedTolees.includes(tolee.id);
                      return (
                        <button
                          key={tolee.id}
                          onClick={() => toggleTolee(tolee.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                            isSelected 
                              ? 'bg-primary/5 border-primary text-primary dark:bg-primary/10' 
                              : 'bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          <span className="truncate">{tolee.name}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
                        </button>
                      );
                    })}

                    {myTolees.length === 0 && (
                      <p className="text-xs text-gray-400 dark:text-zinc-500 text-center py-4">You have not joined or created any Tolee groups yet. Go join a group first!</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* AI Copilot Side-Panel */}
              <Card className="bg-white dark:bg-zinc-900/40 border-gray-200 dark:border-zinc-800 backdrop-blur-md rounded-2xl relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 bg-primary/20 text-primary px-3 py-0.5 rounded-bl-xl text-[9px] font-extrabold tracking-widest uppercase">AI Manager</div>
                <CardHeader className="p-6 pb-4 border-b border-gray-200 dark:border-zinc-800">
                  <CardTitle className="text-sm font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" /> AI Assistant Co-pilot
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                    Stuck on copy? Tell the AI what you are building. It can outline website body text, draft blog posts, format restaurant dishes, or write optimize keywords.
                  </p>
                  
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. Write a premium welcome block description for Riya's Makeup Artist page based in Mumbai"
                    className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-gray-900 dark:text-white h-24 focus:outline-none focus:border-primary"
                  />

                  <Button 
                    className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-white rounded-xl text-xs font-bold flex items-center gap-2 border-none"
                    onClick={handleGenerateAI}
                    disabled={aiLoading}
                  >
                    {aiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Generate Copy
                  </Button>

                  {aiOutput && (
                    <div className="bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 p-4 rounded-xl space-y-2">
                      <Label className="text-[10px] text-zinc-500 uppercase font-extrabold">Generated Copy</Label>
                      <p className="text-xs text-gray-800 dark:text-zinc-300 whitespace-pre-wrap select-all border border-dashed border-gray-200 dark:border-zinc-800/80 p-2.5 rounded-lg cursor-pointer bg-white dark:bg-zinc-900/40" title="Click to select all">
                        {aiOutput}
                      </p>
                      <span className="text-[9px] text-gray-400 dark:text-zinc-500 block">Tip: Highlight and copy this directly into your canvas fields above.</span>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
