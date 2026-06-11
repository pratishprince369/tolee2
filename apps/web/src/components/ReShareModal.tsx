'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, Check, CheckSquare, Square, Repeat } from 'lucide-react';
import { getJoinedTolees, resharePostToTolees } from '@/actions/post';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ReShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  onSuccess: (postId: string) => void;
}

export function ReShareModal({ isOpen, onClose, postId, onSuccess }: ReShareModalProps) {
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [tolees, setTolees] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && postId) {
      setLoading(true);
      setSelectedIds([]);
      setSearchQuery('');
      getJoinedTolees().then(res => {
        if (res.success && res.tolees) {
          setTolees(res.tolees);
        }
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [isOpen, postId]);

  if (!isOpen) return null;

  // Filter based on search query
  const filteredTolees = tolees.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAllSelected = filteredTolees.length > 0 && filteredTolees.every(t => selectedIds.includes(t.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all filtered
      const filteredIds = filteredTolees.map(t => t.id);
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Select all filtered
      const newIds = [...selectedIds];
      filteredTolees.forEach(t => {
        if (!newIds.includes(t.id)) {
          newIds.push(t.id);
        }
      });
      setSelectedIds(newIds);
    }
  };

  const handleToggleGroup = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleShare = async () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one Tolee group.");
      return;
    }

    setSharing(true);
    try {
      const res = await resharePostToTolees(postId, selectedIds);
      if (res.success) {
        onSuccess(postId);
        onClose();
      } else {
        alert("Failed to share content: " + (res.error || "Unknown error"));
      }
    } catch (err: any) {
      console.error(err);
      alert("Something went wrong while resharing.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
      <div 
        className="w-full max-w-md bg-white dark:bg-[#121212] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-green-500/10 p-1.5 rounded-lg">
              <Repeat className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">ReShare Content</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Select All Panel */}
        <div className="p-4 bg-gray-50 dark:bg-[#0c0c0c] border-b border-gray-100 dark:border-gray-800 flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Tolee groups..." 
              className="w-full pl-9 bg-white dark:bg-[#181818] border-gray-200 dark:border-gray-800 rounded-xl h-10 text-sm focus:ring-primary focus:border-primary"
            />
          </div>
          
          {filteredTolees.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleSelectAll}
              className="h-10 rounded-xl px-3 flex items-center gap-1.5 border-gray-200 dark:border-gray-800 font-bold text-xs"
            >
              {isAllSelected ? (
                <>
                  <CheckSquare className="w-4 h-4 text-primary" /> Deselect All
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-gray-400" /> Select All
                </>
              )}
            </Button>
          )}
        </div>

        {/* Scrollable Groups List */}
        <div className="flex-1 overflow-y-auto p-3 min-h-[220px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fetching joined Tolees...</span>
            </div>
          ) : tolees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-3 text-gray-400">
                <Repeat className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">No Groups Joined Yet</p>
              <p className="text-xs text-gray-500 mt-1 max-w-[240px]">
                You need to join some Tolee groups before you can distribute content across them!
              </p>
            </div>
          ) : filteredTolees.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 font-medium">
              No Tolees match "{searchQuery}"
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTolees.map((tolee) => {
                const isSelected = selectedIds.includes(tolee.id);
                return (
                  <div
                    key={tolee.id}
                    onClick={() => handleToggleGroup(tolee.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-primary/5 dark:bg-primary/10 border border-primary/20' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/40 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <AvatarImage src={tolee.avatar || '/default-tolee-avatar.svg'} />
                        <AvatarFallback>{tolee.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {tolee.name}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">
                          t/{tolee.slug}
                        </p>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-primary border-primary text-white' 
                        : 'border-gray-300 dark:border-gray-700'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2.5 bg-gray-50 dark:bg-[#0c0c0c]">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={sharing}
            className="rounded-xl font-bold text-xs h-10 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleShare}
            disabled={sharing || selectedIds.length === 0}
            className="rounded-xl font-bold text-xs h-10 px-5 shadow-md flex items-center gap-1.5"
          >
            {sharing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Sharing...
              </>
            ) : (
              <>
                🚀 ReShare {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
