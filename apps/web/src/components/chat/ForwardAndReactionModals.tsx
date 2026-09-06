'use client';

import React, { useState } from 'react';
import { Search, Send, Check, X, Users, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  chats: Array<{
    id: string;
    name: string;
    avatar?: string;
    isGroup?: boolean;
    username?: string;
  }>;
  onForward: (targetChatIds: string[]) => void;
}

export function ForwardModal({ isOpen, onClose, chats, onForward }: ForwardModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);

  const filteredChats = chats.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.username && c.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleSelectChat = (chatId: string) => {
    setSelectedChatIds(prev => 
      prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
    );
  };

  const handleSendForward = () => {
    if (selectedChatIds.length === 0) return;
    onForward(selectedChatIds);
    setSelectedChatIds([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl">
        <DialogHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <DialogTitle className="text-base font-extrabold flex items-center justify-between">
            <span>Forward message to...</span>
            {selectedChatIds.length > 0 && (
              <span className="text-xs font-bold text-primary dark:text-teal-400 bg-primary/10 px-2.5 py-1 rounded-full">
                {selectedChatIds.length} selected
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recent chats or groups..."
              className="pl-9 h-9 text-xs rounded-2xl bg-white dark:bg-zinc-800 border-zinc-200/80 dark:border-zinc-700"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto max-h-[360px] p-2 divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              No conversations found
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isSelected = selectedChatIds.includes(chat.id);
              return (
                <div
                  key={chat.id}
                  onClick={() => toggleSelectChat(chat.id)}
                  className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-primary/10 dark:bg-primary/20' 
                      : 'hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-10 h-10 border border-zinc-200/50 shrink-0">
                      <AvatarImage src={chat.avatar} />
                      <AvatarFallback className="text-xs font-bold bg-zinc-200 dark:bg-zinc-700">
                        {chat.name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                        {chat.name}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate flex items-center gap-1">
                        {chat.isGroup ? <Users className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                        <span>{chat.isGroup ? 'Group' : chat.username ? `@${chat.username}` : 'Direct Message'}</span>
                      </p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-primary border-primary text-white scale-105'
                      : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2 bg-zinc-50 dark:bg-zinc-900/50">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-9 px-4 text-xs font-bold rounded-xl"
          >
            Cancel
          </Button>

          <Button
            onClick={handleSendForward}
            disabled={selectedChatIds.length === 0}
            className="h-9 px-4 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-white flex items-center gap-1.5 shadow-md"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Forward ({selectedChatIds.length})</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ReactionsBarProps {
  onReact: (emoji: string) => void;
  onClose: () => void;
}

export const QUICK_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '🎉'];

export function ReactionsBar({ onReact, onClose }: ReactionsBarProps) {
  return (
    <div 
      className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-full shadow-2xl animate-in zoom-in-95 duration-100 z-50 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => {
            onReact(emoji);
            onClose();
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-lg hover:scale-125 active:scale-95 transition-transform hover:bg-zinc-100 dark:hover:bg-zinc-800"
          title={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

interface ReactionsBadgesProps {
  reactions?: Array<{ emoji: string; userId: string; userName: string }>;
  currentUserId?: string;
  onReactToggle: (emoji: string) => void;
}

export function ReactionsBadges({ reactions, currentUserId, onReactToggle }: ReactionsBadgesProps) {
  if (!reactions || !Array.isArray(reactions) || reactions.length === 0) return null;

  // Group by emoji
  const grouped: Record<string, { count: number; userNames: string[]; hasMe: boolean }> = {};

  reactions.forEach(r => {
    if (!grouped[r.emoji]) {
      grouped[r.emoji] = { count: 0, userNames: [], hasMe: false };
    }
    grouped[r.emoji].count += 1;
    if (r.userName) grouped[r.emoji].userNames.push(r.userName);
    if (currentUserId && r.userId === currentUserId) {
      grouped[r.emoji].hasMe = true;
    }
  });

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1 -mb-1 select-none">
      {Object.entries(grouped).map(([emoji, data]) => (
        <button
          key={emoji}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReactToggle(emoji);
          }}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold shadow-xs transition-all active:scale-95 border ${
            data.hasMe
              ? 'bg-primary/15 border-primary/40 text-primary dark:text-teal-300'
              : 'bg-white/90 dark:bg-zinc-800/90 border-zinc-200/70 dark:border-zinc-700/70 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100'
          }`}
          title={`${data.userNames.slice(0, 5).join(', ')}${data.userNames.length > 5 ? ' and more' : ''}`}
        >
          <span>{emoji}</span>
          <span>{data.count}</span>
        </button>
      ))}
    </div>
  );
}
