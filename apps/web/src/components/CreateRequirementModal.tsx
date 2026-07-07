import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Image as ImageIcon, CheckCircle2, ShieldCheck, Globe, X, MapPin, Search } from 'lucide-react';

import { getSidebarData } from '@/actions/user';
import { useSession } from 'next-auth/react';
import { uploadFile } from '@/lib/upload';
import { useUpload } from './UploadContext';

export function CreateRequirementModal({ 
  children, 
  onPost, 
  toleeId 
}: { 
  children: React.ReactNode, 
  onPost?: (post: any, postData?: any) => void, 
  toleeId?: string 
}) {
  const { data: session } = useSession();
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [subLocation, setSubLocation] = useState('');
  const [selectedTolees, setSelectedTolees] = useState<string[]>(toleeId ? [toleeId] : []);
  const [media, setMedia] = useState<{type: 'image', url: string} | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { startUpload, task } = useUpload();
  const isUploading = task.state === 'uploading' || task.state === 'processing';
  const [isOpen, setIsOpen] = useState(false);
  const [joinedTolees, setJoinedTolees] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch joined Tolees from API
  useEffect(() => {
    if (isOpen) {
      getSidebarData().then(res => {
        if (res.success) {
          const allTolees = [...(res.managedTolees || []), ...(res.joinedTolees || [])];
          setJoinedTolees(allTolees);
        }
      });
    }
  }, [isOpen]);

  const toggleTolee = (id: string) => {
    setSelectedTolees(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const filteredIds = filteredTolees.map(t => t.id);
    const allSelectedInFiltered = filteredIds.every(id => selectedTolees.includes(id));

    if (allSelectedInFiltered) {
      setSelectedTolees(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedTolees(prev => {
        const unique = new Set([...prev, ...filteredIds]);
        return Array.from(unique);
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setMedia({ type: 'image', url });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePost = async () => {
    if (onPost && isPostReady && !isUploading) {
      const firstSelectedTolee = joinedTolees.find(t => t.id === selectedTolees[0]);
      
      const mediaList = selectedFile 
        ? [{ type: 'image' as const, url: media?.url || '', file: selectedFile }] 
        : [];

      const postData = {
        content,
        postType: 'requirement',
        selectedToleeIds: selectedTolees,
        toleeName: selectedTolees.length === 1 ? firstSelectedTolee?.name : `${selectedTolees.length} Tolees`,
        toleeSlug: selectedTolees.length === 1 ? firstSelectedTolee?.slug : 'multiple',
        location: location || null,
        subLocation: subLocation || null,
        isAnonymous: isAnonymous
      };

      startUpload(
        mediaList,
        postData,
        'feed',
        (createdPost: any, pData: any) => {
          try {
            console.log("Requirement post uploaded successfully:", createdPost, pData);
            const firstToleeRelation = createdPost.tolees?.[0]?.tolee;
            if (onPost) {
              onPost(createdPost, {
                toleeName: firstToleeRelation?.name || pData.toleeName,
                toleeSlug: firstToleeRelation?.slug || pData.toleeSlug
              });
            }
          } catch (callbackErr) {
            console.error("Error in onPost callback inside CreateRequirementModal:", callbackErr);
          }
        }
      );

      // Reset form and close modal immediately
      setContent('');
      setLocation('');
      setSubLocation('');
      setMedia(null);
      setSelectedFile(null);
      setSelectedTolees(toleeId ? [toleeId] : []);
      setIsAnonymous(false);
      setIsOpen(false);
    }
  };

  const filteredTolees = joinedTolees.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isPostReady = content.trim().length > 0 && selectedTolees.length > 0 && location.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] p-0 bg-white dark:bg-[#121212] overflow-y-auto max-h-[78vh] sm:max-h-[82vh] rounded-2xl border-gray-200 dark:border-gray-800">

        {/* Header */}
        <DialogHeader className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-500">
            <span>📌</span> Post Local Requirement
          </DialogTitle>
        </DialogHeader>

        {/* User Info */}
        <div className="p-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-800/40">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={isAnonymous ? '/default-user-avatar.svg' : (session?.user?.image || '/default-user-avatar.svg')} />
              <AvatarFallback>{isAnonymous ? 'A' : (session?.user?.name?.[0] || 'ME')}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">
                {isAnonymous ? 'Anonymous' : (session?.user?.name || 'Anonymous User')}
              </h3>
              <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <Globe className="w-3 h-3" /> Visible to {selectedTolees.length} selected Tolees
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-zinc-800">
            <input
              type="checkbox"
              id="anonymous-toggle"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 rounded text-rose-500 border-gray-300 dark:border-zinc-700 focus:ring-rose-500 cursor-pointer"
            />
            <label htmlFor="anonymous-toggle" className="text-xs font-bold text-gray-600 dark:text-zinc-300 cursor-pointer select-none">
              Post Anonymously
            </label>
          </div>
        </div>

        {/* Location selectors */}
        <div className="px-4 grid grid-cols-2 gap-3 mb-3">
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500">
              <MapPin className="w-4 h-4 text-rose-500" />
            </span>
            <Input
              type="text"
              placeholder="Location (e.g. Mumbai) *"
              className="pl-9 h-10 bg-gray-50/50 dark:bg-zinc-900/50 border-gray-200 dark:border-zinc-800 focus:border-rose-500 dark:focus:border-rose-500 focus:ring-rose-500 rounded-xl"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500">
              <MapPin className="w-4 h-4 text-blue-500" />
            </span>
            <Input
              type="text"
              placeholder="Sub-location (e.g. Bandra)"
              className="pl-9 h-10 bg-gray-50/50 dark:bg-zinc-900/50 border-gray-200 dark:border-zinc-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500 rounded-xl"
              value={subLocation}
              onChange={(e) => setSubLocation(e.target.value)}
            />
          </div>
        </div>

        {/* Text Area */}
        <div className="px-4 pb-2">
          <textarea
            placeholder='Describe your requirement. e.g., "Need 2BHK flat in Ghatkopar." or "Looking for bridal makeup artist in Mumbai."'
            className="w-full min-h-[120px] bg-transparent border-none focus:ring-0 resize-none text-[16px] text-gray-900 dark:text-white placeholder:text-gray-400"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          ></textarea>
        </div>

        {/* Media Preview */}
        {media && (
          <div className="px-4 pb-4 relative">
            <button onClick={() => { setMedia(null); setSelectedFile(null); }} className="absolute top-2 right-6 z-10 bg-black/50 hover:bg-black/80 text-white rounded-full p-1 backdrop-blur-md">
              <X className="w-4 h-4" />
            </button>
            <img src={media.url} alt="Attached" className="w-full h-48 object-cover rounded-xl border border-gray-200 dark:border-gray-800" />
          </div>
        )}

        {/* Attachments */}
        <div className="px-4 py-2 border-t border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <span className="text-sm font-medium text-gray-500">Attach optional image</span>
          <div className="flex gap-2 items-center">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*"
              className="hidden" 
            />
            <Button onClick={triggerFileInput} variant="ghost" size="icon" className="text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded-full h-10 w-10">
              <ImageIcon className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Select Tolees Section with Search */}
        <div className="p-4 bg-gray-50 dark:bg-[#1a1a1a]">
          <div className="flex flex-col gap-2.5 mb-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                Post to these Tolees <span className="text-red-500">*</span>
              </h4>
              {filteredTolees.length > 0 && (
                <button 
                  onClick={selectAll}
                  className="text-xs font-bold text-rose-500 hover:underline"
                >
                  {filteredTolees.every(t => selectedTolees.includes(t.id)) ? 'Deselect Page' : 'Select Page'}
                </button>
              )}
            </div>

            {/* Search Box */}
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500">
                <Search className="w-4 h-4" />
              </span>
              <Input
                type="text"
                placeholder="Search groups/Tolees..."
                className="pl-9 h-9 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 rounded-xl text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2">
            {filteredTolees.map((tolee) => (
              <div 
                key={tolee.id}
                onClick={() => toggleTolee(tolee.id)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedTolees.includes(tolee.id) 
                    ? 'border-rose-500 bg-rose-500/5 dark:bg-rose-500/10' 
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212] hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-gray-200 dark:bg-gray-800 flex items-center justify-center font-bold text-xs">
                    {tolee.name.charAt(0)}
                  </div>
                  <div>
                    <h5 className="font-semibold text-sm">{tolee.name}</h5>
                    {tolee.isPrivate && (
                      <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <ShieldCheck className="w-3 h-3" /> Private Group
                      </span>
                    )}
                  </div>
                </div>
                
                {selectedTolees.includes(tolee.id) ? (
                  <CheckCircle2 className="w-6 h-6 text-rose-500" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-700" />
                )}
              </div>
            ))}
            {filteredTolees.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">No matching Tolees found.</p>
            )}
          </div>
          
          {selectedTolees.length === 0 && (
            <p className="text-xs text-red-500 mt-2 font-medium">Please select at least one Tolee.</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-[#121212] border-t border-gray-100 dark:border-gray-800">
          <Button 
            className="w-full h-12 text-base font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
            disabled={!isPostReady || isUploading}
            onClick={handlePost}
          >
            {isUploading ? 'Posting...' : `Post Requirement to ${selectedTolees.length > 0 ? `${selectedTolees.length} Tolees` : 'Tolee'}`}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
