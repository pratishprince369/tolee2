'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, TrendingUp, User, Users, Tag, ShoppingBag, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  getSearchSuggestions,
  getSearchHistory,
  clearSearchHistory,
  saveSearchQuery,
  logSearchClick
} from '@/actions/search';

export function SearchInput() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [placeholder, setPlaceholder] = useState('Search...');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setPlaceholder('Search...');
      } else {
        setPlaceholder('Search creators, Tolees, marketplace...');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load Search History on focus or mount
  const loadHistory = async () => {
    try {
      const hist = await getSearchHistory();
      setHistory(hist);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadHistory();
    
    // Close dropdown on outside click
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Debounced search suggestions fetch
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const suggs = await getSearchSuggestions(query);
        setSuggestions(suggs);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle Search Submission
  const handleSubmit = async (searchVal: string) => {
    const trimmed = searchVal.trim();
    if (!trimmed) return;

    setIsOpen(false);
    inputRef.current?.blur();
    
    // Save search query to history and redirect
    await saveSearchQuery(trimmed);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    loadHistory();
  };

  // Handle Click on Suggestion
  const handleSuggestionClick = async (item: any) => {
    const queryText = item.text || item.query;
    
    // Log search click for conversion analytics
    if (item.id && !item.id.startsWith('history-')) {
      await logSearchClick(queryText, item.id, item.type);
    }

    handleSubmit(queryText);
  };

  // Keyboard navigation helpers
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const itemsCount = suggestions.length + (query.length < 2 ? history.length : 0);
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setFocusedIndex(prev => (prev + 1 >= itemsCount ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev - 1 < 0 ? itemsCount - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0) {
        // Select focused item
        if (query.length < 2) {
          if (history[focusedIndex]) {
            handleSubmit(history[focusedIndex].query);
          }
        } else {
          if (suggestions[focusedIndex]) {
            handleSuggestionClick(suggestions[focusedIndex]);
          }
        }
      } else {
        handleSubmit(query);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleClearHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const res = await clearSearchHistory(id);
    if (res.success) {
      loadHistory();
    }
  };

  const handleClearAllHistory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await clearSearchHistory();
    if (res.success) {
      setHistory([]);
    }
  };

  // Helper to render suggestion/history icons
  const getIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User className="w-4 h-4 text-sky-500" />;
      case 'group':
        return <Users className="w-4 h-4 text-emerald-500" />;
      case 'marketplace':
        return <ShoppingBag className="w-4 h-4 text-amber-500" />;
      case 'query':
        return <TrendingUp className="w-4 h-4 text-violet-500" />;
      default:
        return <Tag className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      {/* Search Input Box */}
      <div className="relative group flex items-center">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 dark:text-gray-500 group-focus-within:text-[#0a7c85] transition-colors duration-200" />
        <Input
          ref={inputRef}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
            setFocusedIndex(-1);
          }}
          onFocus={() => {
            setIsOpen(true);
            loadHistory();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 bg-gray-50/80 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-900 rounded-full h-10 text-sm transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#0a7c85]/20 focus-visible:border-[#0a7c85] focus-visible:bg-white dark:focus-visible:bg-zinc-950 focus:shadow-sm"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
          </button>
        )}
      </div>

      {/* Floating Suggestions Overlay Dropdown */}
      {isOpen && (
        <div className="absolute top-12 left-0 w-full max-h-[460px] overflow-y-auto z-50 backdrop-blur-xl bg-white/90 dark:bg-zinc-950/90 border border-gray-200/80 dark:border-zinc-800/80 shadow-2xl rounded-2xl p-2.5 transition-all duration-200 animate-in fade-in slide-in-from-top-3">
          
          {/* SEARCH HISTORY VIEW (Shown when query is empty) */}
          {query.trim().length === 0 && (
            <div>
              {history.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between px-2.5 py-1.5 mb-1.5">
                    <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Recent Searches</span>
                    <button
                      onClick={handleClearAllHistory}
                      className="text-xs font-semibold text-[#0a7c85] hover:text-[#08666e] transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {history.map((item, idx) => (
                      <div
                        key={item.id}
                        onClick={() => handleSubmit(item.query)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 ${
                          focusedIndex === idx
                            ? 'bg-[#0a7c85]/5 text-[#0a7c85] dark:bg-[#0a7c85]/20 dark:text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-zinc-900/60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium truncate text-gray-700 dark:text-zinc-200">{item.query}</span>
                        </div>
                        <button
                          onClick={(e) => handleClearHistoryItem(e, item.id)}
                          className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-all duration-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="px-3 py-6 text-center">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto mb-2.5">
                    <Search className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Search for creators, tags, Tolees...</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Your recent searches will appear here.</p>
                </div>
              )}
            </div>
          )}

          {/* LOADING STATE */}
          {isLoading && query.trim().length >= 2 && (
            <div className="flex items-center justify-center py-8 gap-2.5">
              <div className="w-4.5 h-4.5 border-2 border-[#0a7c85] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">Searching live database...</span>
            </div>
          )}

          {/* DYNAMIC RESULTS/SUGGESTIONS LIST */}
          {!isLoading && query.trim().length >= 2 && (
            <div>
              {suggestions.length > 0 ? (
                <div>
                  <div className="px-2.5 py-1 mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Search Suggestions</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {suggestions.map((item, idx) => (
                      <div
                        key={item.id}
                        onClick={() => handleSuggestionClick(item)}
                        className={`flex items-center gap-3.5 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 ${
                          focusedIndex === idx
                            ? 'bg-[#0a7c85]/5 text-[#0a7c85] dark:bg-[#0a7c85]/20 dark:text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-zinc-900/60'
                        }`}
                      >
                        {item.avatar ? (
                          <Avatar className="w-7.5 h-7.5 flex-shrink-0 border border-gray-200/50 dark:border-zinc-800">
                            <AvatarImage src={item.avatar} alt={item.text} />
                            <AvatarFallback className="text-xs">{item.text?.[0]}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-7.5 h-7.5 bg-gray-100 dark:bg-zinc-900 rounded-full flex items-center justify-center flex-shrink-0">
                            {getIcon(item.type)}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-gray-800 dark:text-zinc-150 truncate leading-tight">
                            {item.text}
                          </span>
                          {item.subtitle && (
                            <span className="text-xs text-gray-400 dark:text-zinc-500 truncate leading-none mt-0.5">
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Fallback to search query itself */}
                    <div
                      onClick={() => handleSubmit(query)}
                      className="flex items-center justify-between px-3 py-2.5 mt-2 bg-[#0a7c85]/5 hover:bg-[#0a7c85]/10 text-[#0a7c85] dark:bg-[#0a7c85]/20 dark:text-white rounded-xl cursor-pointer transition-colors duration-200 font-semibold text-sm"
                    >
                      <span>Search for "{query}"</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => handleSubmit(query)}
                  className="flex items-center justify-between px-3 py-3 hover:bg-gray-100 dark:hover:bg-zinc-900/60 rounded-xl cursor-pointer transition-colors duration-200"
                >
                  <div className="flex items-center gap-3">
                    <Search className="w-4.5 h-4.5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-zinc-200">
                      Search for "{query}"
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#0a7c85]" />
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
