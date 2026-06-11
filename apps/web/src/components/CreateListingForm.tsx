'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, MapPin, X, ArrowLeft, Image as ImageIcon, CheckCircle2, Search, ShieldCheck } from 'lucide-react';
import { createListing, updateListing } from '@/actions/marketplace';
import { getSidebarData } from '@/actions/user';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const CATEGORIES = [
  'Property', 'Vehicles', 'Electronics', 'Fashion', 'Furniture', 
  'Services', 'Jobs', 'Education', 'Business Opportunities', 'Others'
];

interface ListingImage {
  id: string;
  url: string;
  file?: File;
}

interface CreateListingFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export function CreateListingForm({ initialData, isEdit = false }: CreateListingFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Standard Fields
  const [category, setCategory] = useState(initialData?.category || 'Property');
  const [title, setTitle] = useState(initialData?.title || '');
  const [price, setPrice] = useState(initialData?.price ? String(initialData.price) : '');
  const [condition, setCondition] = useState(initialData?.condition || 'new');
  const [description, setDescription] = useState(initialData?.description || '');
  const [locationText, setLocationText] = useState(initialData?.locationText || '');
  const [contactPhone, setContactPhone] = useState(initialData?.contactPhone || '');
  const [contactWhatsApp, setContactWhatsApp] = useState(initialData?.contactWhatsApp || '');
  const [contactEmail, setContactEmail] = useState(initialData?.contactEmail || '');

  // Images state using structured objects
  const [imagesList, setImagesList] = useState<ListingImage[]>(
    initialData?.images
      ? initialData.images.split(',').map((url: string) => ({ id: url, url }))
      : []
  );

  // Dynamic Attributes
  const [attributes, setAttributes] = useState<Record<string, any>>(
    initialData?.attributes || {}
  );

  // Tolee list states
  const [joinedTolees, setJoinedTolees] = useState<any[]>([]);
  const [selectedTolees, setSelectedTolees] = useState<string[]>(
    initialData?.tolees
      ? initialData.tolees.map((t: any) => t.toleeId || t.tolee?.id)
      : []
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isToleeModalOpen, setIsToleeModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<'active' | 'draft'>('active');

  // Fetch Tolees on mount
  useEffect(() => {
    getSidebarData().then(res => {
      if (res.success) {
        const allTolees = [...(res.managedTolees || []), ...(res.joinedTolees || [])];
        setJoinedTolees(allTolees);
      }
    });
  }, []);

  const handleAttributeChange = (key: string, value: any) => {
    setAttributes(prev => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newImages = files.map(file => ({
        id: Math.random().toString(),
        url: URL.createObjectURL(file),
        file
      }));
      setImagesList(prev => [...prev, ...newImages].slice(0, 10));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImagesList(prev => prev.filter((_, idx) => idx !== index));
  };

  // Intercept form submit to open Modal
  const handleOpenToleeModal = (e: React.FormEvent, status: 'active' | 'draft') => {
    e.preventDefault();
    if (!title || !price || !locationText || !description) {
      alert("Please fill all the required fields.");
      return;
    }
    setTargetStatus(status);
    setIsToleeModalOpen(true);
  };

  const handlePublish = async () => {
    if (selectedTolees.length === 0) {
      alert("Please select at least one Tolee before publishing your listing.");
      return;
    }

    setIsSubmitting(true);
    setIsToleeModalOpen(false);
    let finalImageUrls: string[] = [];

    // Upload new images, reuse existing
    for (const img of imagesList) {
      if (img.file) {
        const uploadData = new FormData();
        uploadData.append('file', img.file);
        try {
          const res = await fetch('/api/upload', { method: 'POST', body: uploadData });
          const uploadJson = await res.json();
          if (uploadJson.success) {
            finalImageUrls.push(uploadJson.url);
          }
        } catch (err) {
          console.error("Upload failed", err);
        }
      } else {
        finalImageUrls.push(img.url);
      }
    }

    const listingData = {
      title,
      price: parseFloat(price) || 0,
      locationText,
      category,
      condition: ['Services', 'Jobs'].includes(category) ? undefined : condition,
      description,
      images: finalImageUrls.join(','),
      contactPhone,
      contactWhatsApp,
      contactEmail,
      attributes,
      status: targetStatus,
      selectedToleeIds: selectedTolees
    };

    let result;
    if (isEdit && initialData?.id) {
      result = await updateListing(initialData.id, listingData);
    } else {
      result = await createListing(listingData);
    }

    if (result.success) {
      router.push('/marketplace');
      router.refresh();
    } else {
      alert(result.error || "Failed to save listing.");
      setIsSubmitting(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedTolees.length === joinedTolees.length) {
      setSelectedTolees([]);
    } else {
      setSelectedTolees(joinedTolees.map(t => t.id));
    }
  };

  const toggleTolee = (id: string) => {
    setSelectedTolees(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const filteredTolees = joinedTolees.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#121212] pt-20 flex flex-col md:flex-row">
      {/* Left Panel: Form */}
      <div className="w-full md:w-[450px] lg:w-[500px] bg-white dark:bg-[#1a1a1a] h-[calc(100vh-80px)] overflow-y-auto border-r border-gray-200 dark:border-gray-800 shadow-xl z-10 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3 sticky top-0 bg-white dark:bg-[#1a1a1a] z-20">
          <Button variant="ghost" size="icon" onClick={() => router.push('/marketplace')} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold">{isEdit ? 'Edit Listing' : 'Create New Listing'}</h2>
        </div>

        <form className="p-6 flex-1 space-y-6" onSubmit={(e) => handleOpenToleeModal(e, 'active')}>
          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category *</label>
            <select 
              className="w-full h-12 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 font-medium outline-none"
              value={category}
              onChange={e => {
                setCategory(e.target.value);
                setAttributes({}); // Reset attributes on category change
              }}
            >
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Photos (Up to 10)</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {imagesList.map((img, idx) => (
                <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 group bg-black">
                  <img src={img.url} alt="Preview" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                  <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-black/60 backdrop-blur text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {idx === 0 && (
                    <div className="absolute bottom-0 inset-x-0 bg-blue-600/90 text-white text-[9px] font-bold py-1 text-center backdrop-blur-md">COVER</div>
                  )}
                </div>
              ))}
              
              {imagesList.length < 10 && (
                <div 
                  className="aspect-square border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-[10px] font-semibold text-gray-500">Add Photo</span>
                </div>
              )}
            </div>
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple />
          </div>

          {/* Core Fields */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Title *</label>
              <Input placeholder="e.g., iPhone 15 Pro Max 256GB" value={title} onChange={e => setTitle(e.target.value)} required className="h-12 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 rounded-xl mt-1" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Price (₹) *</label>
              <Input placeholder="0" type="number" value={price} onChange={e => setPrice(e.target.value)} required className="h-12 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 rounded-xl mt-1" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Location *</label>
              <Input placeholder="e.g., Bandra West, Mumbai" value={locationText} onChange={e => setLocationText(e.target.value)} required className="h-12 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 rounded-xl mt-1" />
            </div>
            
            {/* Condition (Hide for Jobs/Services) */}
            {!['Jobs', 'Services'].includes(category) && (
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Condition</label>
                <select 
                  className="w-full h-12 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 font-medium outline-none mt-1"
                  value={condition}
                  onChange={e => setCondition(e.target.value)}
                >
                  <option value="new">New</option>
                  <option value="like_new">Like New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="used">Used</option>
                </select>
              </div>
            )}
          </div>

          {/* DYNAMIC FIELDS BASED ON CATEGORY */}
          <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-zinc-800 pb-2">Details</h3>
            
            {category === 'Property' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Property Type</label>
                  <select 
                    value={attributes.propertyType || ''}
                    className="w-full h-10 bg-white dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-lg px-2 text-sm mt-1" 
                    onChange={e => handleAttributeChange('propertyType', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option>Apartment</option><option>Villa</option><option>Plot</option><option>Office</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Listing Type</label>
                  <select 
                    value={attributes.listingType || ''}
                    className="w-full h-10 bg-white dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-lg px-2 text-sm mt-1" 
                    onChange={e => handleAttributeChange('listingType', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option>For Sale</option><option>For Rent</option><option>For Lease</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Bedrooms</label>
                  <Input type="number" placeholder="e.g. 2" value={attributes.bedrooms || ''} className="h-10 text-sm mt-1" onChange={e => handleAttributeChange('bedrooms', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Bathrooms</label>
                  <Input type="number" placeholder="e.g. 2" value={attributes.bathrooms || ''} className="h-10 text-sm mt-1" onChange={e => handleAttributeChange('bathrooms', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Carpet Area (sq ft)</label>
                  <Input type="number" placeholder="e.g. 850" value={attributes.carpetArea || ''} className="h-10 text-sm mt-1" onChange={e => handleAttributeChange('carpetArea', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Furnishing</label>
                  <select 
                    value={attributes.furnishing || ''}
                    className="w-full h-10 bg-white dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-lg px-2 text-sm mt-1" 
                    onChange={e => handleAttributeChange('furnishing', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option>Unfurnished</option><option>Semi-Furnished</option><option>Fully Furnished</option>
                  </select>
                </div>
              </div>
            )}

            {category === 'Vehicles' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Make</label>
                  <Input placeholder="e.g. Honda" value={attributes.make || ''} className="h-10 text-sm mt-1" onChange={e => handleAttributeChange('make', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Model</label>
                  <Input placeholder="e.g. City" value={attributes.model || ''} className="h-10 text-sm mt-1" onChange={e => handleAttributeChange('model', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Year</label>
                  <Input type="number" placeholder="e.g. 2020" value={attributes.year || ''} className="h-10 text-sm mt-1" onChange={e => handleAttributeChange('year', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Fuel Type</label>
                  <select 
                    value={attributes.fuelType || ''}
                    className="w-full h-10 bg-white dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-lg px-2 text-sm mt-1" 
                    onChange={e => handleAttributeChange('fuelType', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option>Petrol</option><option>Diesel</option><option>EV</option><option>CNG</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Transmission</label>
                  <select 
                    value={attributes.transmission || ''}
                    className="w-full h-10 bg-white dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-lg px-2 text-sm mt-1" 
                    onChange={e => handleAttributeChange('transmission', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option>Manual</option><option>Automatic</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">KMs Driven</label>
                  <Input type="number" placeholder="e.g. 45000" value={attributes.mileage || ''} className="h-10 text-sm mt-1" onChange={e => handleAttributeChange('mileage', e.target.value)} />
                </div>
              </div>
            )}

            {category === 'Jobs' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500">Company Name</label>
                  <Input placeholder="Company Name" value={attributes.company || ''} className="h-10 text-sm mt-1" onChange={e => handleAttributeChange('company', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Job Type</label>
                  <select 
                    value={attributes.jobType || ''}
                    className="w-full h-10 bg-white dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-lg px-2 text-sm mt-1" 
                    onChange={e => handleAttributeChange('jobType', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option>Full-Time</option><option>Part-Time</option><option>Contract</option><option>Internship</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Experience Reqd.</label>
                  <Input placeholder="e.g. 2-4 Years" value={attributes.experience || ''} className="h-10 text-sm mt-1" onChange={e => handleAttributeChange('experience', e.target.value)} />
                </div>
              </div>
            )}

            {/* Fallback for others */}
            {!['Property', 'Vehicles', 'Jobs'].includes(category) && (
              <p className="text-xs text-gray-500">No extra details required for this category. Please provide full information in the description.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description *</label>
            <textarea 
              placeholder="Provide full details, specifications, features, and reasons for selling..." 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              required 
              className="w-full min-h-[140px] bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 text-sm outline-none resize-y"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Contact Phone (Optional)</label>
              <Input placeholder="Phone number" type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="h-12 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 rounded-xl mt-1" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Contact WhatsApp (Optional)</label>
              <Input placeholder="WhatsApp link or phone number" type="tel" value={contactWhatsApp} onChange={e => setContactWhatsApp(e.target.value)} className="h-12 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 rounded-xl mt-1" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Contact Email (Optional)</label>
              <Input placeholder="Email address" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="h-12 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 rounded-xl mt-1" />
            </div>
          </div>
        </form>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] sticky bottom-0 z-20 flex gap-3">
          <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl font-bold" disabled={isSubmitting} onClick={(e) => handleOpenToleeModal(e, 'draft')}>
            Save Draft
          </Button>
          <Button type="submit" className="flex-1 h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting} onClick={(e) => handleOpenToleeModal(e, 'active')}>
            {isSubmitting ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* Right Panel: Live Preview */}
      <div className="hidden md:flex flex-1 items-center justify-center p-8 bg-gray-100 dark:bg-[#121212] overflow-y-auto">
        <div className="w-full max-w-[400px]">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 text-center uppercase tracking-wider">Live Preview</h3>
          
          <Card className="overflow-hidden border-gray-200 dark:border-gray-800 shadow-2xl rounded-3xl bg-white dark:bg-zinc-900 transition-all duration-300">
            <div className="aspect-[4/3] bg-gray-200 dark:bg-black relative overflow-hidden flex items-center justify-center">
              {imagesList.length > 0 ? (
                <img src={imagesList[0].url} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <div className="text-gray-400 flex flex-col items-center">
                  <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                  <span className="text-sm font-medium">No Image</span>
                </div>
              )}
              {price && (
                <div className="absolute top-4 left-4 bg-white dark:bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-full text-base font-extrabold shadow-lg">
                  ₹{Number(price).toLocaleString('en-IN')}
                </div>
              )}
            </div>
            <CardContent className="p-5">
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white line-clamp-2 mb-2 leading-tight">
                {title || 'Listing Title'}
              </h2>
              <p className="text-sm text-gray-500 flex items-center mb-4">
                <MapPin className="w-4 h-4 mr-1.5" /> {locationText || 'Location not set'}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2.5 py-1 bg-gray-100 dark:bg-zinc-800 rounded-lg text-[11px] font-bold text-gray-600 dark:text-gray-300 tracking-wide uppercase">
                  {category}
                </span>
                {!['Jobs', 'Services'].includes(category) && (
                  <span className="px-2.5 py-1 bg-gray-100 dark:bg-zinc-800 rounded-lg text-[11px] font-bold text-gray-600 dark:text-gray-300 tracking-wide uppercase">
                    {condition.replace('_', ' ')}
                  </span>
                )}
                
                {/* Dynamic Badges in Preview */}
                {Object.entries(attributes).map(([key, value]) => {
                  if (!value) return null;
                  return (
                    <span key={key} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded-lg text-[11px] font-bold tracking-wide uppercase">
                      {value}
                    </span>
                  );
                })}
              </div>

              {description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
                  {description}
                </p>
              )}
              
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <Button className="w-full rounded-xl h-11 font-bold" variant="secondary" disabled>
                  Message Seller
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tolee Selection Modal */}
      <Dialog open={isToleeModalOpen} onOpenChange={setIsToleeModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 bg-white dark:bg-[#1a1a1a] overflow-hidden rounded-2xl border-gray-200 dark:border-gray-800">
          <DialogHeader className="p-4 border-b border-gray-100 dark:border-gray-800">
            <DialogTitle className="text-xl font-bold">Publish to Tolees</DialogTitle>
          </DialogHeader>

          {/* Top Section */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search Groups..." 
                className="pl-9 h-10 rounded-xl"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {joinedTolees.length > 0 && (
              <div className="flex justify-between items-center bg-gray-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-gray-100 dark:border-zinc-800">
                <span className="text-xs font-semibold text-gray-500">Select multiple groups to share this listing</span>
                <button 
                  onClick={handleSelectAll}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  {selectedTolees.length === joinedTolees.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            )}
          </div>

          {/* Middle Section: Scrollable Tolee List */}
          <div className="max-h-[300px] overflow-y-auto p-4 space-y-2">
            {filteredTolees.length > 0 ? (
              filteredTolees.map(tolee => {
                const isChecked = selectedTolees.includes(tolee.id);
                return (
                  <div 
                    key={tolee.id}
                    onClick={() => toggleTolee(tolee.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isChecked
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' 
                        : 'border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs">
                        {tolee.name.charAt(0)}
                      </div>
                      <div>
                        <h5 className="font-semibold text-sm">{tolee.name}</h5>
                        {tolee.isPrivate && (
                          <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <ShieldCheck className="w-3.5 h-3.5" /> Private Group
                          </span>
                        )}
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => {}} // Controlled by wrapper div onClick
                      className="h-4.5 w-4.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                No Tolees found. Make sure you join some Tolees/Groups first!
              </div>
            )}
          </div>

          {/* Bottom Section */}
          <DialogFooter className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-2 sm:gap-0 bg-gray-50 dark:bg-zinc-900">
            <Button variant="outline" className="rounded-xl flex-1" onClick={() => setIsToleeModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex-1"
              onClick={handlePublish}
              disabled={isSubmitting}
            >
              Publish to Selected Tolees
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
