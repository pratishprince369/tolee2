"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateTolee } from '@/actions/tolee';

export function ManageToleeModal({ tolee, children }: { tolee: any, children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: tolee.name || '',
    description: tolee.description || '',
    rules: tolee.rules || '',
    isPrivate: tolee.isPrivate || false,
    avatar: tolee.avatar || '',
    coverImage: tolee.coverImage || '',
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
      setFormData(prev => ({ ...prev, avatar: URL.createObjectURL(e.target.files![0]) }));
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverFile(e.target.files[0]);
      setFormData(prev => ({ ...prev, coverImage: URL.createObjectURL(e.target.files![0]) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      let finalAvatarUrl = formData.avatar;
      let finalCoverUrl = formData.coverImage;

      if (avatarFile) {
        const uploadData = new FormData();
        uploadData.append('file', avatarFile);
        const res = await fetch('/api/upload', { method: 'POST', body: uploadData });
        const data = await res.json();
        if (data.success) {
          finalAvatarUrl = data.url;
        } else {
          setIsLoading(false);
          alert("Avatar upload failed.");
          return;
        }
      }

      if (coverFile) {
        const uploadData = new FormData();
        uploadData.append('file', coverFile);
        const res = await fetch('/api/upload', { method: 'POST', body: uploadData });
        const data = await res.json();
        if (data.success) {
          finalCoverUrl = data.url;
        } else {
          setIsLoading(false);
          alert("Cover image upload failed.");
          return;
        }
      }

      const payload = {
        ...formData,
        avatar: finalAvatarUrl,
        coverImage: finalCoverUrl
      };

      if (payload.avatar.startsWith('blob:') || payload.coverImage.startsWith('blob:')) {
        alert("Internal Error: Temporary image URL detected.");
        setIsLoading(false);
        return;
      }

      const res = await updateTolee(tolee.id, payload);
      
      if (res.success) {
        setOpen(false);
        router.refresh(); 
      } else {
        alert(res.error || "Failed to update Tolee");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Tolee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tolee Name</label>
            <Input name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="What is this Tolee about?"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Rules</label>
            <textarea 
              name="rules" 
              value={formData.rules} 
              onChange={handleChange} 
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="1. Be kind&#10;2. No spam"
            />
          </div>
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="isPrivate" 
              name="isPrivate" 
              checked={formData.isPrivate} 
              onChange={handleChange} 
              className="w-4 h-4 rounded border-gray-300"
            />
            <label htmlFor="isPrivate" className="text-sm font-medium">Private Tolee (Only members can view/post)</label>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tolee Icon / Avatar</label>
            <div className="flex items-center gap-4">
              <img 
                src={formData.avatar || '/default-tolee-avatar.svg'} 
                alt="Avatar" 
                className="w-12 h-12 rounded-xl object-cover border border-gray-200" 
              />
              <Input type="file" accept="image/*" onChange={handleAvatarChange} className="cursor-pointer" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Banner Image</label>
            <div className="flex flex-col gap-2">
              <img 
                src={formData.coverImage || '/default-tolee-cover.svg'} 
                alt="Banner" 
                className="w-full h-24 rounded-lg object-cover border border-gray-200" 
              />
              <Input type="file" accept="image/*" onChange={handleCoverChange} className="cursor-pointer" />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" className="mr-2" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
