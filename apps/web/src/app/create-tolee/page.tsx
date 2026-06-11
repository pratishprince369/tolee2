'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { X, Globe, Lock, ImageIcon, Monitor, Smartphone, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { createTolee } from '@/actions/tolee';
import { useRef } from 'react';

export default function CreateToleePage() {
  const router = useRouter();
  const { data: session } = useSession();
  
  const [name, setName] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private' | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [rules, setRules] = useState('');
  const [questions, setQuestions] = useState('');
  const [postApproval, setPostApproval] = useState(true);
  
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  const [isCreating, setIsCreating] = useState(false);

  const categories = ['Buy and Sell', 'Business', 'Education', 'Jobs', 'Real Estate', 'Community', 'Gaming', 'Tech'];

  const isFormValid = name.trim().length > 0 && privacy !== null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'avatar') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'cover') {
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
      } else {
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleCreate = async () => {
    if (!isFormValid || isCreating) return;
    setIsCreating(true);

    let finalCover = '';
    let finalAvatar = '';

    // Upload Cover
    if (coverFile) {
      const fd = new FormData();
      fd.append('file', coverFile);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) finalCover = data.url;
      } catch (err) {}
    }

    // Upload Avatar
    if (avatarFile) {
      const fd = new FormData();
      fd.append('file', avatarFile);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) finalAvatar = data.url;
      } catch (err) {}
    }

    const result = await createTolee({
      name,
      isPrivate: privacy === 'private',
      description,
      category,
      location,
      rules,
      membershipQuestions: questions,
      pendingPostApproval: postApproval,
      coverImage: finalCover || undefined,
      avatar: finalAvatar || undefined
    });

    if (result.success && result.tolee) {
      window.location.href = `/t/${result.tolee.slug}?created=true`;
    } else {
      alert(`Failed to create Tolee: ${result.error || 'Unknown error'}`);
      console.error(result.error);
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f0f2f5] dark:bg-black overflow-hidden font-sans">
      {/* LEFT SIDEBAR (Configuration) */}
      <div className="w-full md:w-[360px] bg-white dark:bg-[#121212] flex flex-col h-full border-r border-gray-200 dark:border-gray-800 shadow-sm z-10">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
          <Link href="/discover">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition">
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
          </Link>
          <Link href="/discover" className="text-sm text-gray-500 hover:underline">Tolees</Link>
          <span className="text-sm text-gray-500">&gt; Create Tolee</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Create Tolee</h1>

          <div className="flex items-center gap-3 mb-6">
            <Avatar className="w-12 h-12">
              <AvatarImage src={session?.user?.image || "https://i.pravatar.cc/150?u=me"} />
              <AvatarFallback>{session?.user?.name?.[0] || "A"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-[15px] text-gray-900 dark:text-white">{session?.user?.name || "Admin User"}</p>
              <p className="text-xs text-gray-500 font-medium">Admin</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Input
                placeholder="Tolee name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-14 rounded-lg bg-transparent border-gray-300 dark:border-gray-700 focus-visible:ring-primary focus-visible:border-primary text-base px-4"
              />
            </div>

            {/* Privacy Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`w-full h-14 rounded-lg border ${isDropdownOpen ? 'border-primary ring-1 ring-primary' : 'border-gray-300 dark:border-gray-700'} bg-transparent flex items-center justify-between px-4 transition-all`}
              >
                <div className="flex items-center gap-2">
                  {!privacy ? (
                    <span className="text-gray-500">Choose privacy</span>
                  ) : privacy === 'public' ? (
                    <><Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" /><span className="text-gray-900 dark:text-white">Public</span></>
                  ) : (
                    <><Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" /><span className="text-gray-900 dark:text-white">Private</span></>
                  )}
                </div>
                <svg className={`w-5 h-5 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>

              {isDropdownOpen && (
                <div className="absolute top-16 left-0 w-full bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-20 py-2">
                  <div 
                    className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex gap-3"
                    onClick={() => { setPrivacy('public'); setIsDropdownOpen(false); }}
                  >
                    <div className="mt-1 flex-shrink-0">
                      <Globe className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Public</h4>
                      <p className="text-xs text-gray-500">Anyone can see who's in the tolee and what they post.</p>
                    </div>
                    {privacy === 'public' && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />}
                  </div>
                  
                  <div 
                    className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex gap-3"
                    onClick={() => { setPrivacy('private'); setIsDropdownOpen(false); }}
                  >
                    <div className="mt-1 flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <Lock className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Private</h4>
                      <p className="text-xs text-gray-500">Only members can see who's in the tolee and what they post.</p>
                    </div>
                    {privacy === 'private' && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />}
                  </div>
                </div>
              )}
            </div>

            {/* Location (Optional) */}
            <div>
              <Input
                placeholder="Location (Optional) e.g. Kalyan, Mumbai"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-14 rounded-lg bg-transparent border-gray-300 dark:border-gray-700 focus-visible:ring-primary focus-visible:border-primary text-base px-4"
              />
            </div>

            {/* Advanced Settings Toggle */}
            <div className="pt-2">
              <button 
                type="button"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
              >
                {isAdvancedOpen ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
                <svg className={`w-4 h-4 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>
            </div>

            {/* Advanced Settings Content */}
            {isAdvancedOpen && (
              <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                
                {/* Images Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tolee Graphics</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition text-center min-h-[100px] relative overflow-hidden"
                      onClick={() => coverInputRef.current?.click()}
                    >
                      {coverPreview ? (
                        <img src={coverPreview} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500 font-medium">Cover Photo</span>
                        </>
                      )}
                    </div>
                    <div 
                      className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition text-center min-h-[100px] relative overflow-hidden"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500 font-medium">Profile Picture</span>
                        </>
                      )}
                    </div>
                  </div>
                  <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'cover')} />
                  <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea
                    placeholder="What is this Tolee about?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full min-h-[80px] p-3 rounded-lg bg-transparent border border-gray-300 dark:border-gray-700 focus:ring-1 focus:ring-primary focus:border-primary text-sm resize-y"
                  />
                </div>

                {/* Category Dropdown */}
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <button
                    type="button"
                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                    className="w-full h-12 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent flex items-center justify-between px-4 text-sm"
                  >
                    <span className={category ? "text-gray-900 dark:text-white" : "text-gray-500"}>
                      {category || 'Select category'}
                    </span>
                    <svg className={`w-4 h-4 text-gray-500 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </button>

                  {isCategoryOpen && (
                    <div className="absolute top-[70px] left-0 w-full bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-20 py-1 max-h-48 overflow-y-auto">
                      {categories.map((cat) => (
                        <div 
                          key={cat}
                          className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-sm flex justify-between items-center"
                          onClick={() => { setCategory(cat); setIsCategoryOpen(false); }}
                        >
                          <span>{cat}</span>
                          {category === cat && <CheckCircle2 className="w-4 h-4 text-primary" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>



                {/* Membership Questions */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Membership Questions</label>
                  <p className="text-xs text-gray-500 mb-2">Ask questions to people requesting to join.</p>
                  <textarea
                    placeholder="e.g. What is your budget? (One per line)"
                    value={questions}
                    onChange={(e) => setQuestions(e.target.value)}
                    className="w-full min-h-[80px] p-3 rounded-lg bg-transparent border border-gray-300 dark:border-gray-700 focus:ring-1 focus:ring-primary focus:border-primary text-sm resize-y"
                  />
                </div>

                {/* Rules */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Tolee Rules</label>
                  <p className="text-xs text-gray-500 mb-2">Set rules for behavior.</p>
                  <textarea
                    placeholder="e.g. No spam, be respectful. (One per line)"
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                    className="w-full min-h-[80px] p-3 rounded-lg bg-transparent border border-gray-300 dark:border-gray-700 focus:ring-1 focus:ring-primary focus:border-primary text-sm resize-y"
                  />
                </div>

                {/* Post Approval */}
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Require Post Approval</label>
                    <p className="text-xs text-gray-500">Admins must approve posts.</p>
                  </div>
                  <div 
                    className={`w-11 h-6 rounded-full cursor-pointer relative transition-colors ${postApproval ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                    onClick={() => setPostApproval(!postApproval)}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${postApproval ? 'left-6' : 'left-1'}`} />
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212]">
          <Button 
            className="w-full h-11 text-base font-bold rounded-lg"
            disabled={!isFormValid || isCreating}
            onClick={handleCreate}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </div>

      {/* RIGHT SIDEBAR (Preview) */}
      <div className="flex-1 hidden md:flex flex-col p-6 overflow-y-auto">
        <div className="bg-white dark:bg-[#121212] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 flex-1 max-w-4xl mx-auto w-full flex flex-col overflow-hidden">
          
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-[#121212] z-10">
            <span className="font-bold text-[15px] text-gray-900 dark:text-white">Desktop Preview</span>
            <div className="flex items-center gap-2">
              <button className="p-2 bg-gray-100 dark:bg-gray-800 text-primary rounded-md"><Monitor className="w-5 h-5" /></button>
              <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"><Smartphone className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white dark:bg-[#121212]">
            {/* Banner */}
            <div className="relative w-full h-[350px] bg-gray-200 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 rounded-b-xl flex items-center justify-center">
              <img src={coverPreview || "/default-tolee-cover.svg"} alt="Cover" className={`w-full h-full object-cover rounded-b-xl ${coverPreview ? '' : 'opacity-80'}`} />
              {!coverPreview && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 font-medium bg-black/10">
                  <ImageIcon className="w-12 h-12 mb-2 opacity-50 text-white" />
                  <span className="text-white">Cover photo preview</span>
                </div>
              )}
            </div>

            {/* Title & Privacy */}
            <div className="px-8 pt-6 pb-4 relative">
              <div className="absolute -top-16 left-8 w-24 h-24 rounded-2xl border-4 border-white dark:border-[#121212] bg-white dark:bg-[#121212] overflow-hidden shadow-sm z-10">
                <img src={avatarPreview || "/default-tolee-avatar.svg"} alt="DP" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 mt-8">
                {name.trim() || 'Tolee name'}
              </h1>
              <div className="flex items-center text-sm font-medium text-gray-500 gap-1.5">
                {privacy === 'public' ? <Globe className="w-4 h-4" /> : privacy === 'private' ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                <span>{privacy === 'public' ? 'Public tolee' : privacy === 'private' ? 'Private tolee' : 'Tolee privacy'}</span>
                <span>•</span>
                <span>1 member</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-8 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-6">
                {['About', 'Posts', 'Members', 'Events'].map((tab, i) => (
                  <button key={tab} className={`pb-3 text-[15px] font-semibold ${i === 0 ? 'text-primary border-b-4 border-primary' : 'text-gray-500'}`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Feed Layout Preview */}
            <div className="p-8 bg-[#f0f2f5] dark:bg-black min-h-[400px]">
              <div className="flex gap-4">
                <div className="w-full max-w-[600px] space-y-4">
                  {/* Create Post Card */}
                  <Card className="border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-[#121212]">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>{session?.user?.name?.[0] || "A"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 h-10 rounded-full bg-gray-100 dark:bg-gray-800 px-4 flex items-center text-gray-500 text-[15px]">
                          What's on your mind?
                        </div>
                      </div>
                      <div className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
                        <div className="flex items-center gap-2 text-gray-500 font-medium text-[15px]">
                          <ImageIcon className="w-5 h-5 text-green-500" /> Photo/video
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 font-medium text-[15px]">
                          <div className="w-5 h-5 rounded bg-blue-500" /> Tag people
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 font-medium text-[15px]">
                          <div className="w-5 h-5 rounded-full border-2 border-yellow-500" /> Feeling/activity
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* About Card Preview */}
                <div className="hidden lg:block w-[360px]">
                  <Card className="border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-[#121212]">
                    <CardContent className="p-4">
                      <h3 className="font-bold text-[17px] mb-4">About</h3>
                      <div className="flex gap-3 mb-4">
                        <div className="mt-0.5">
                          {privacy === 'public' ? <Globe className="w-5 h-5 text-gray-500" /> : <Lock className="w-5 h-5 text-gray-500" />}
                        </div>
                        <div>
                          <p className="font-bold text-[15px]">{privacy === 'public' ? 'Public' : 'Private'}</p>
                          <p className="text-sm text-gray-500 leading-tight mt-1">
                            {privacy === 'public' 
                              ? "Anyone can see who's in the tolee and what they post." 
                              : "Only members can see who's in the tolee and what they post."}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
