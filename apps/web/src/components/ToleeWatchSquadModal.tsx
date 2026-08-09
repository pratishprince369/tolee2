'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, Mic, MicOff, MessageCircle, Send, Heart, Flame, 
  Sparkles, Radio, Share2, Volume2, ShieldCheck, Zap
} from 'lucide-react';

const toast = {
  success: (msg: string) => typeof window !== 'undefined' && console.log('✅ ' + msg),
  error: (msg: string) => typeof window !== 'undefined' && console.log('❌ ' + msg),
  info: (msg: string) => typeof window !== 'undefined' && console.log('ℹ️ ' + msg),
  loading: (msg: string) => typeof window !== 'undefined' && console.log('⏳ ' + msg),
  dismiss: () => {}
};

interface ToleeWatchSquadModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoTitle: string;
}

export function ToleeWatchSquadModal({
  isOpen,
  onClose,
  videoTitle
}: ToleeWatchSquadModalProps) {
  const [isMicOn, setIsMicOn] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: '1', user: 'Rahul Verma', text: 'Bro check out the 4K space details! 🔥', time: 'Just now' },
    { id: '2', user: 'Priya Sharma', text: 'Awesome HD quality on Tolee! 🚀', time: '1m ago' },
  ]);

  const squadMembers = [
    { name: 'You', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', isSpeaking: false, isHost: true },
    { name: 'Rahul V.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', isSpeaking: true, isHost: false },
    { name: 'Priya S.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80', isSpeaking: false, isHost: false },
    { name: 'Amit K.', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', isSpeaking: false, isHost: false },
  ];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), user: 'You', text: chatMessage.trim(), time: 'Just now' }
    ]);
    setChatMessage('');
    toast.success("💬 Message sent to Squad!");
  };

  const handleSendReaction = (emoji: string) => {
    toast.success(`Sent ${emoji} reaction to Squad!`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-zinc-950 text-white border-zinc-800 rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border-none flex items-center gap-1 shadow-md">
              <Radio className="w-3 h-3 animate-ping" /> Live Squad Watch
            </Badge>
            <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
              4 Active Friends
            </Badge>
          </div>
          <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" /> Tolee Watch Squad Room
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Live audio & chat stream room over <span className="text-emerald-400 font-bold">"{videoTitle.slice(0, 40)}..."</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Live Squad Participant Bubbles */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
            <span className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider block">
              Live Audio Participants
            </span>
            <div className="grid grid-cols-4 gap-2">
              {squadMembers.map((m, i) => (
                <div key={i} className="flex flex-col items-center gap-1 text-center group">
                  <div className="relative">
                    <Avatar className={`w-12 h-12 border-2 ${m.isSpeaking ? 'border-emerald-400 ring-4 ring-emerald-500/20 scale-105' : 'border-zinc-700'}`}>
                      <AvatarImage src={m.avatar} alt={m.name} />
                      <AvatarFallback>{m.name[0]}</AvatarFallback>
                    </Avatar>
                    {m.isSpeaking && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-zinc-950 flex items-center justify-center">
                        <Volume2 className="w-2.5 h-2.5 text-white animate-pulse" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-extrabold text-zinc-200 truncate max-w-full">{m.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Squad Chat Stream */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 space-y-2 h-36 overflow-y-auto">
            <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block">
              Squad Live Chat
            </span>
            {messages.map((msg) => (
              <div key={msg.id} className="text-xs space-x-1">
                <span className="font-extrabold text-teal-400">{msg.user}:</span>
                <span className="text-zinc-200">{msg.text}</span>
              </div>
            ))}
          </div>

          {/* Quick Emoji Reactions */}
          <div className="flex justify-between items-center bg-zinc-900/40 p-2 rounded-xl border border-zinc-800/80">
            {['🔥', '🚀', '❤️', '😂', '👏', '💎'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSendReaction(emoji)}
                className="text-lg hover:scale-125 active:scale-95 transition-transform p-1"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Controls Bar: Mic Toggle & Chat Input */}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Button
              type="button"
              variant={isMicOn ? 'default' : 'outline'}
              onClick={() => {
                setIsMicOn(!isMicOn);
                toast.info(isMicOn ? 'Mute Mic' : '🎤 Microphone Active in Squad!');
              }}
              className={`rounded-xl px-3 h-10 ${isMicOn ? 'bg-emerald-600 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}
            >
              {isMicOn ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4" />}
            </Button>

            <input
              type="text"
              placeholder="Chat with Squad..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-teal-500"
            />

            <Button
              type="submit"
              className="h-10 px-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
