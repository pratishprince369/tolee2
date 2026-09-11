'use client';

import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Video, Users, Check, X, HelpCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface EventData {
  id: string;
  title: string;
  date: string;
  time?: string;
  description?: string;
  location?: string;
  meetingUrl?: string;
  responses?: {
    going?: string[]; // userIds
    maybe?: string[];
    cantGo?: string[];
  };
  creatorId?: string;
  creatorName?: string;
}

interface EventCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateEvent: (event: {
    title: string;
    date: string;
    time: string;
    description?: string;
    location?: string;
  }) => void;
}

export function EventCreationModal({ isOpen, onClose, onCreateEvent }: EventCreationModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) {
      alert("Please provide event title and date.");
      return;
    }

    onCreateEvent({
      title: title.trim(),
      date,
      time: time || '10:00 AM',
      description: description.trim() || undefined,
      location: location.trim() || undefined
    });

    setTitle('');
    setDate('');
    setTime('');
    setDescription('');
    setLocation('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-base text-zinc-900 dark:text-white">Create Event</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-3.5 flex-1">
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Event Title *
            </label>
            <Input
              placeholder="e.g. Society General Meeting / Birthday Party"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="bg-zinc-50 dark:bg-zinc-900 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Date *
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="bg-zinc-50 dark:bg-zinc-900 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Time
              </label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-900 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Location or Meeting Link
            </label>
            <Input
              placeholder="e.g. Clubhouse or https://meet.google.com/..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-900 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Description (Optional)
            </label>
            <textarea
              placeholder="Add agenda or details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold px-6 shadow-md"
            >
              Create & Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EventCardProps {
  eventData: EventData;
  currentUserId?: string;
  isMe?: boolean;
  onRSVP?: (response: 'going' | 'maybe' | 'cantGo') => void;
}

export function EventCard({ eventData, currentUserId, isMe, onRSVP }: EventCardProps) {
  const goingCount = eventData.responses?.going?.length || 0;
  const maybeCount = eventData.responses?.maybe?.length || 0;
  const cantGoCount = eventData.responses?.cantGo?.length || 0;

  const userStatus: 'going' | 'maybe' | 'cantGo' | null = currentUserId ? (
    eventData.responses?.going?.includes(currentUserId) ? 'going' :
    eventData.responses?.maybe?.includes(currentUserId) ? 'maybe' :
    eventData.responses?.cantGo?.includes(currentUserId) ? 'cantGo' : null
  ) : null;

  // Format date parts
  let monthStr = 'EVENT';
  let dayStr = '📅';
  try {
    const d = new Date(eventData.date);
    if (!isNaN(d.getTime())) {
      monthStr = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      dayStr = String(d.getDate());
    }
  } catch (_) {}

  const isLink = eventData.location && (
    eventData.location.startsWith('http://') || 
    eventData.location.startsWith('https://') ||
    eventData.location.includes('meet.google.com') ||
    eventData.location.includes('zoom.us')
  );

  return (
    <div className={`p-3.5 rounded-2xl border shadow-sm my-1.5 w-full max-w-[340px] select-none ${
      isMe 
        ? 'bg-black/20 border-white/20 text-white' 
        : 'bg-zinc-50 dark:bg-zinc-800/90 border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100'
    }`}>
      {/* Event Header with Date Badge */}
      <div className="flex items-start gap-3 mb-3">
        {/* Calendar Badge */}
        <div className={`w-12 h-13 rounded-2xl flex flex-col items-center justify-center shrink-0 border overflow-hidden shadow-xs ${
          isMe ? 'bg-white/20 border-white/30 text-white' : 'bg-white dark:bg-zinc-900 border-violet-500/30 text-zinc-900 dark:text-white'
        }`}>
          <div className="w-full bg-violet-600 text-white text-[9px] font-black uppercase text-center py-0.5">
            {monthStr}
          </div>
          <span className="text-base font-black leading-none mt-1">
            {dayStr}
          </span>
        </div>

        {/* Title & Timing */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-snug line-clamp-2">
            {eventData.title}
          </p>
          <div className={`flex items-center gap-1.5 text-xs font-semibold mt-1 ${
            isMe ? 'text-white/80' : 'text-violet-600 dark:text-violet-400'
          }`}>
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{eventData.time || 'All Day'}</span>
          </div>
        </div>
      </div>

      {/* Description if present */}
      {eventData.description && (
        <p className={`text-xs mb-3 line-clamp-3 leading-relaxed ${
          isMe ? 'text-white/80' : 'text-zinc-600 dark:text-zinc-300'
        }`}>
          {eventData.description}
        </p>
      )}

      {/* Location / Meeting Link */}
      {eventData.location && (
        <div className={`mb-3 p-2 rounded-xl flex items-center justify-between gap-2 text-xs ${
          isMe ? 'bg-white/10' : 'bg-zinc-100 dark:bg-zinc-900'
        }`}>
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {isLink ? (
              <Video className="w-3.5 h-3.5 text-violet-500 shrink-0" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            )}
            <span className="truncate text-[11px] font-medium">
              {eventData.location}
            </span>
          </div>

          {isLink && (
            <a
              href={eventData.location.startsWith('http') ? eventData.location : `https://${eventData.location}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-1 rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                isMe ? 'bg-white/20 text-white' : 'bg-primary text-white'
              }`}
            >
              <span>Join</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* RSVP Response Buttons */}
      <div className="pt-2 border-t border-black/10 dark:border-white/10">
        <div className="flex items-center justify-between text-[10px] font-bold mb-2 opacity-80">
          <span>{goingCount} Going</span>
          <span>{maybeCount} Maybe</span>
          <span>{cantGoCount} Can't Go</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onRSVP?.('going')}
            className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 ${
              userStatus === 'going'
                ? isMe
                  ? 'bg-white text-teal-900 shadow-md font-black'
                  : 'bg-emerald-600 text-white shadow-md font-black'
                : isMe
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <Check className="w-3 h-3" />
            <span>Going</span>
          </button>

          <button
            type="button"
            onClick={() => onRSVP?.('maybe')}
            className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 ${
              userStatus === 'maybe'
                ? isMe
                  ? 'bg-white text-teal-900 shadow-md font-black'
                  : 'bg-amber-600 text-white shadow-md font-black'
                : isMe
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <HelpCircle className="w-3 h-3" />
            <span>Maybe</span>
          </button>

          <button
            type="button"
            onClick={() => onRSVP?.('cantGo')}
            className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 ${
              userStatus === 'cantGo'
                ? isMe
                  ? 'bg-white text-teal-900 shadow-md font-black'
                  : 'bg-rose-600 text-white shadow-md font-black'
                : isMe
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <X className="w-3 h-3" />
            <span>Can't Go</span>
          </button>
        </div>
      </div>
    </div>
  );
}
