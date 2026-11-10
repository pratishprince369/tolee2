'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  ExternalLink, 
  Layers, 
  ShoppingBag, 
  Sparkles, 
  Clock, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MicroWebsiteBuilderPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'info' | 'products' | 'gallery' | 'preview'>('info');
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [businessName, setBusinessName] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [fullDesc, setFullDesc] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0D9488');

  // Business hours
  const [hours, setHours] = useState<any>({
    monday: '09:30 AM - 08:00 PM',
    saturday: '10:00 AM - 09:00 PM',
    sunday: '11:00 AM - 06:00 PM'
  });

  // Products state
  const [products, setProducts] = useState<any[]>([]);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    imageUrl: '',
    category: ''
  });

  // Gallery state
  const [gallery, setGallery] = useState<any[]>([]);
  const [newGalleryItem, setNewGalleryItem] = useState({
    title: '',
    mediaUrl: ''
  });

  useEffect(() => {
    fetchListing();
  }, [params.id]);

  const fetchListing = async () => {
    try {
      const res = await fetch(`/api/expo/listings/${params.id}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load listing');
      }

      const l = data.listing;
      setListing(l);
      setBusinessName(l.brandName || '');
      setShortDesc(l.shortDescription || '');
      setFullDesc(l.fullDescription || '');
      setContactNumber(l.contactNumber || '');
      setWhatsappNumber(l.whatsappNumber || '');
      setEmail(l.email || '');
      setWebsiteUrl(l.websiteUrl || '');
      setAddress(l.address || '');
      setCity(l.city || '');
      setState(l.state || '');
      setLogoUrl(l.logoUrl || '');
      setCoverUrl(l.coverUrl || '');
      setPrimaryColor(l.primaryColor || '#0D9488');

      if (l.microsite) {
        setHours(l.microsite.businessHours || {});
        setProducts(l.microsite.products || []);
        setGallery(l.microsite.gallery || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInfo = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/expo/listings/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: businessName,
          shortDescription: shortDesc,
          fullDescription: fullDesc,
          contactNumber,
          whatsappNumber,
          email,
          websiteUrl,
          address,
          city,
          state,
          logoUrl,
          coverUrl,
          primaryColor,
          businessHours: hours
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update info');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name.trim() || !newProduct.price) return;

    try {
      const res = await fetch(`/api/expo/listings/${params.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      const data = await res.json();
      if (data.success) {
        setProducts([...products, data.product]);
        setNewProduct({ name: '', description: '', price: '', originalPrice: '', imageUrl: '', category: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const res = await fetch(`/api/expo/listings/${params.id}/products?productId=${productId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setProducts(products.filter(p => p.id !== productId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGalleryItem.mediaUrl) return;

    try {
      const res = await fetch(`/api/expo/listings/${params.id}/gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGalleryItem)
      });
      const data = await res.json();
      if (data.success) {
        setGallery([...gallery, data.item]);
        setNewGalleryItem({ title: '', mediaUrl: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGallery = async (itemId: string) => {
    try {
      const res = await fetch(`/api/expo/listings/${params.id}/gallery?itemId=${itemId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setGallery(gallery.filter(g => g.id !== itemId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-black p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-black py-8 px-4 sm:px-6 lg:px-8 text-slate-800 dark:text-zinc-100">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div>
            <Link
              href="/expo/my-listings"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-600 transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to My Listings</span>
            </Link>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Micro-Website Builder: {businessName || listing?.brandName}
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              URL: <span className="font-mono text-teal-600">/expo/{listing?.slug}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/expo/${listing?.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 text-xs font-bold transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Live Stall</span>
            </Link>

            <Button
              onClick={handleSaveInfo}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
            </Button>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Micro-Website changes saved successfully!</span>
          </div>
        )}

        {/* TABS */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2 overflow-x-auto">
          {[
            { id: 'info', label: '1. Business Info &amp; Hours', icon: Layers },
            { id: 'products', label: `2. Products Catalog (${products.length})`, icon: ShoppingBag },
            { id: 'gallery', label: `3. Gallery Images (${gallery.length})`, icon: ImageIcon },
            { id: 'preview', label: '4. Live Preview', icon: Eye }
          ].map((tab: any) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive 
                    ? 'bg-teal-600 text-white shadow-sm' 
                    : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span dangerouslySetInnerHTML={{ __html: tab.label }} />
              </button>
            );
          })}
        </div>

        {/* TAB 1: BUSINESS INFO & HOURS */}
        {activeTab === 'info' && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 space-y-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Business Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">Brand Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">WhatsApp Number</label>
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">Phone</label>
                <input
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">Website URL</label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">Short Tagline</label>
              <input
                type="text"
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">Full About Description</label>
              <textarea
                rows={4}
                value={fullDesc}
                onChange={(e) => setFullDesc(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">Logo / Avatar URL</label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">Cover Banner URL</label>
                <input
                  type="url"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-500" />
                <span>Operating Hours</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Mon - Fri</label>
                  <input
                    type="text"
                    value={hours.monday || ''}
                    onChange={(e) => setHours({ ...hours, monday: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Saturday</label>
                  <input
                    type="text"
                    value={hours.saturday || ''}
                    onChange={(e) => setHours({ ...hours, saturday: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Sunday</label>
                  <input
                    type="text"
                    value={hours.sunday || ''}
                    onChange={(e) => setHours({ ...hours, sunday: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS CATALOG */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Add Product Box */}
            <form onSubmit={handleAddProduct} className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 space-y-4 shadow-sm">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-500" />
                <span>Add Product to Micro-Website</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="e.g. Handloom Kurta"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    placeholder="1299"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">Original Price (₹)</label>
                  <input
                    type="number"
                    value={newProduct.originalPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, originalPrice: e.target.value })}
                    placeholder="1999"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">Product Image URL</label>
                <input
                  type="url"
                  value={newProduct.imageUrl}
                  onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <Button type="submit" className="rounded-xl px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold">
                + Add Product
              </Button>
            </form>

            {/* Existing Products List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((prod) => (
                <div key={prod.id} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    {prod.imageUrl && (
                      <div className="h-32 w-full rounded-xl overflow-hidden mb-3 bg-slate-100">
                        <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{prod.name}</h4>
                    <p className="text-xs text-slate-500 font-black mt-1">₹{prod.price?.toLocaleString('en-IN')}</p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
                    <button
                      onClick={() => handleDeleteProduct(prod.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: GALLERY */}
        {activeTab === 'gallery' && (
          <div className="space-y-6">
            <form onSubmit={handleAddGalleryItem} className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 space-y-4 shadow-sm">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-500" />
                <span>Add Photo to Gallery</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">Image URL *</label>
                  <input
                    type="url"
                    required
                    value={newGalleryItem.mediaUrl}
                    onChange={(e) => setNewGalleryItem({ ...newGalleryItem, mediaUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1">Title / Caption</label>
                  <input
                    type="text"
                    value={newGalleryItem.title}
                    onChange={(e) => setNewGalleryItem({ ...newGalleryItem, title: e.target.value })}
                    placeholder="e.g. Handloom Weaving Setup"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
              </div>

              <Button type="submit" className="rounded-xl px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold">
                + Add Image
              </Button>
            </form>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {gallery.map((g) => (
                <div key={g.id} className="relative rounded-2xl overflow-hidden bg-slate-100 group border border-slate-200 dark:border-zinc-800">
                  <img src={g.mediaUrl} alt={g.title || 'Gallery'} className="w-full h-32 object-cover" />
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => handleDeleteGallery(g.id)}
                      className="p-1.5 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
                      title="Delete Image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {g.title && (
                    <div className="p-2 text-[10px] font-bold text-slate-700 dark:text-zinc-300 truncate bg-white dark:bg-zinc-900">
                      {g.title}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PREVIEW */}
        {activeTab === 'preview' && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 space-y-4 shadow-sm text-center">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Live Micro-Website Preview</h3>
            <p className="text-xs text-slate-500">
              Open your public micro-website in a new tab to see how visitors interact with your stall and enquiry form.
            </p>
            <div className="pt-2">
              <Link
                href={`/expo/${listing?.slug}`}
                target="_blank"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open /expo/{listing?.slug}</span>
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
