'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Folder, Image as ImageIcon, Video, CheckCircle2, ChevronDown, RotateCcw, AlertTriangle, ArrowUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Album {
  name: string;
  count: number;
  coverUri: string;
}

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  duration: number; // in milliseconds
}

export function MediaPickerModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [pickMode, setPickMode] = useState<'photos' | 'videos' | 'all'>('all');
  const [multiple, setMultiple] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<string>('Recents');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedUris, setSelectedUris] = useState<string[]>([]);
  
  const [activeFilter, setActiveFilter] = useState<'all' | 'photos' | 'videos'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);

  const isAndroid = typeof window !== 'undefined' && !!(window as any).AndroidBridge;

  // Listen for the global window triggers from Android WebView
  useEffect(() => {
    if (typeof window === 'undefined') return;

    (window as any).showInstagramMediaPicker = (mode: 'photos' | 'videos' | 'all', isMultiple: boolean) => {
      setPickMode(mode);
      setActiveFilter(mode === 'videos' ? 'videos' : mode === 'photos' ? 'photos' : 'all');
      setMultiple(isMultiple);
      setSelectedUris([]);
      setSelectedAlbum('Recents');
      setIsOpen(true);
      checkPermissions();
    };

    return () => {
      delete (window as any).showInstagramMediaPicker;
    };
  }, []);

  const checkPermissions = () => {
    if (isAndroid) {
      const granted = (window as any).AndroidBridge.hasMediaPermissions();
      setHasPermission(granted);
      if (granted) {
        loadAlbums();
      }
    }
  };

  const handleRequestPermission = () => {
    if (isAndroid) {
      (window as any).AndroidBridge.requestMediaPermissions();
    }
  };

  // Register permissions result callback
  useEffect(() => {
    if (typeof window === 'undefined') return;

    (window as any).onNativePermissionsResult = (granted: boolean) => {
      setHasPermission(granted);
      if (granted) {
        loadAlbums();
      }
    };

    return () => {
      delete (window as any).onNativePermissionsResult;
    };
  }, []);

  const loadAlbums = () => {
    if (!isAndroid) return;
    try {
      // Mapping filter mode
      const folderJson = (window as any).AndroidBridge.getMediaFolders(pickMode);
      const fetchedAlbums: Album[] = JSON.parse(folderJson);
      setAlbums(fetchedAlbums);
      
      // Load files for initial "Recents"
      loadFilesInAlbum('Recents');
    } catch (e) {
      console.error('Failed to load albums', e);
    }
  };

  const loadFilesInAlbum = (albumName: string) => {
    if (!isAndroid) return;
    try {
      const filesJson = (window as any).AndroidBridge.getFilesInFolder(albumName, pickMode);
      const fetchedFiles: MediaItem[] = JSON.parse(filesJson);
      setMediaItems(fetchedFiles);
    } catch (e) {
      console.error('Failed to load files in album', e);
    }
  };

  const handleAlbumSelect = (albumName: string) => {
    setSelectedAlbum(albumName);
    loadFilesInAlbum(albumName);
    setShowAlbumDropdown(false);
  };

  const toggleMediaSelection = (uri: string) => {
    if (multiple) {
      setSelectedUris((prev) =>
        prev.includes(uri) ? prev.filter((item) => item !== uri) : [...prev, uri]
      );
    } else {
      handleDone([uri]);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (isAndroid && (window as any).AndroidBridge.onFileChooserCancelled) {
      (window as any).AndroidBridge.onFileChooserCancelled();
    }
  };

  const handleDone = (urisToSubmit = selectedUris) => {
    setIsOpen(false);
    if (isAndroid && (window as any).AndroidBridge.onMediaSelected) {
      (window as any).AndroidBridge.onMediaSelected(JSON.stringify(urisToSubmit));
    }
  };

  const formatDuration = (ms: number) => {
    if (!ms || isNaN(ms)) return '0:00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Filter & Search & Sort logic
  const filteredAlbums = useMemo(() => {
    return albums.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [albums, searchQuery]);

  const processedMediaItems = useMemo(() => {
    let items = [...mediaItems];

    // Filter by type if 'all' selection
    if (activeFilter === 'photos') {
      items = items.filter((i) => i.type === 'image');
    } else if (activeFilter === 'videos') {
      items = items.filter((i) => i.type === 'video');
    }

    // Sort order (DATE_ADDED is DESC by default, so 'latest' is original)
    if (sortOrder === 'oldest') {
      items.reverse();
    }

    return items;
  }, [mediaItems, activeFilter, sortOrder]);

  const handleOpenSettings = () => {
    if (isAndroid) {
      (window as any).AndroidBridge.openAppSettings();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-zinc-950 text-white font-sans select-none animate-in fade-in duration-200">
      
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md sticky top-0 z-20">
        <button onClick={handleCancel} className="text-zinc-400 hover:text-white p-1 rounded-full transition-colors active:scale-95">
          <X className="w-6 h-6" />
        </button>
        
        {/* Album Selector Dropdown Trigger */}
        <div className="relative">
          <button 
            onClick={() => setShowAlbumDropdown(!showAlbumDropdown)}
            className="flex items-center gap-1.5 font-bold text-base px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-all active:scale-95 border border-zinc-700/50"
          >
            <span>{selectedAlbum}</span>
            <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${showAlbumDropdown ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {multiple ? (
          <button 
            onClick={() => handleDone()}
            disabled={selectedUris.length === 0}
            className="px-4 py-1.5 rounded-full bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-sm font-extrabold transition-all active:scale-95"
          >
            Done ({selectedUris.length})
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* ── Album Selection Dropdown Panel ── */}
      {showAlbumDropdown && (
        <div className="absolute inset-x-0 top-[53px] bottom-0 z-30 bg-zinc-950/95 backdrop-blur-md flex flex-col p-4 animate-in slide-in-from-top duration-200">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-all"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredAlbums.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <Folder className="w-12 h-12 mb-2 stroke-[1.5]" />
                <span className="text-sm">No albums found</span>
              </div>
            ) : (
              filteredAlbums.map((album) => (
                <div 
                  key={album.name}
                  onClick={() => handleAlbumSelect(album.name)}
                  className="flex items-center gap-4 p-2 rounded-xl bg-zinc-900/40 hover:bg-zinc-900 border border-transparent hover:border-zinc-800/80 cursor-pointer transition-all"
                >
                  <img 
                    src={album.coverUri} 
                    alt={album.name} 
                    className="w-14 h-14 rounded-lg object-cover bg-zinc-800"
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-zinc-100">{album.name}</h4>
                    <span className="text-xs text-zinc-500">{album.count} items</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Main Content Area ── */}
      {hasPermission === false ? (
        // Permission Denied View
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-5">
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-full">
            <AlertTriangle className="w-12 h-12 text-teal-500 stroke-[1.5]" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-zinc-100">Storage Permission Required</h3>
            <p className="text-sm text-zinc-400 max-w-[280px]">
              Tolee needs permission to access your storage so you can upload your photos and videos.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-[200px]">
            <Button onClick={handleRequestPermission} className="bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl py-5">
              Grant Permission
            </Button>
            <Button onClick={handleOpenSettings} variant="ghost" className="text-zinc-400 hover:text-white font-semibold py-5">
              Open App Settings
            </Button>
          </div>
        </div>
      ) : hasPermission === null ? (
        // Loading Permission View
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        // Media Grid View
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Quick Filter Access & Sort Headers */}
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/40 border-b border-zinc-900">
            {/* Quick Access Buttons */}
            <div className="flex items-center gap-2">
              {pickMode === 'all' && (
                <button 
                  onClick={() => setActiveFilter('all')}
                  className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${activeFilter === 'all' ? 'bg-teal-600/15 text-teal-500 border border-teal-500/25' : 'bg-zinc-900 text-zinc-400 border border-transparent'}`}
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Recents</span>
                </button>
              )}
              {pickMode !== 'videos' && (
                <button 
                  onClick={() => setActiveFilter('photos')}
                  className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${activeFilter === 'photos' ? 'bg-teal-600/15 text-teal-500 border border-teal-500/25' : 'bg-zinc-900 text-zinc-400 border border-transparent'}`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Photos</span>
                </button>
              )}
              {pickMode !== 'photos' && (
                <button 
                  onClick={() => setActiveFilter('videos')}
                  className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${activeFilter === 'videos' ? 'bg-teal-600/15 text-teal-500 border border-teal-500/25' : 'bg-zinc-900 text-zinc-400 border border-transparent'}`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Videos</span>
                </button>
              )}
            </div>

            {/* Sort Toggle */}
            <button 
              onClick={() => setSortOrder(prev => prev === 'latest' ? 'oldest' : 'latest')}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white bg-zinc-900/60 px-2.5 py-1 rounded-lg border border-zinc-800"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortOrder === 'latest' ? 'Latest' : 'Oldest'}</span>
            </button>
          </div>

          {/* Grid list */}
          <div className="flex-1 overflow-y-auto p-1">
            {processedMediaItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
                <ImageIcon className="w-12 h-12 mb-2 stroke-[1.5]" />
                <span className="text-sm">No media files found</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {processedMediaItems.map((item) => {
                  const isSelected = selectedUris.includes(item.uri);
                  return (
                    <div 
                      key={item.uri}
                      onClick={() => toggleMediaSelection(item.uri)}
                      className="relative aspect-square bg-zinc-900 cursor-pointer overflow-hidden group border border-transparent active:scale-95 transition-all"
                    >
                      {/* Image cover */}
                      <img 
                        src={item.uri} 
                        alt="Gallery asset" 
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      {/* Video specific overlays (duration label) */}
                      {item.type === 'video' && (
                        <div className="absolute bottom-1 right-1 bg-black/75 rounded px-1.5 py-0.5 text-[10px] font-extrabold text-white flex items-center gap-1">
                          <Video className="w-2.5 h-2.5 fill-white/10" />
                          <span>{formatDuration(item.duration)}</span>
                        </div>
                      )}

                      {/* Selected State Overlay */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-teal-900/25 border-2 border-teal-500 flex items-start justify-end p-1.5 animate-in zoom-in-95 duration-100">
                          <CheckCircle2 className="w-5 h-5 text-teal-500 fill-zinc-950" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
