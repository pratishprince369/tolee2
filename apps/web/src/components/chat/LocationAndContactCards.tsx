'use client';

import React from 'react';
import { MapPin, Navigation, ExternalLink, User, Phone, MessageSquare } from 'lucide-react';

interface LocationCardProps {
  locationData: {
    lat: number;
    lng: number;
    name?: string;
    address?: string;
  };
  isMe?: boolean;
}

export function LocationCard({ locationData, isMe }: LocationCardProps) {
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${locationData.lat},${locationData.lng}`;

  return (
    <div className={`rounded-2xl overflow-hidden border shadow-sm my-1 max-w-[280px] select-none ${
      isMe 
        ? 'bg-black/20 border-white/20 text-white' 
        : 'bg-zinc-50 dark:bg-zinc-800/90 border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100'
    }`}>
      {/* Map visual snapshot area */}
      <a 
        href={mapUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="relative block h-32 w-full bg-emerald-950/20 dark:bg-emerald-950/40 overflow-hidden group cursor-pointer"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600/30 to-teal-500/10 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform animate-bounce">
            <MapPin className="w-6 h-6 fill-white stroke-emerald-600" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-[10px] text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
          <Navigation className="w-3 h-3" />
          <span>Live GPS</span>
        </div>
      </a>

      {/* Info & Action */}
      <div className="p-3 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold leading-tight line-clamp-1">
              {locationData.name || 'Shared Location'}
            </p>
            <p className={`text-[11px] leading-snug line-clamp-1 ${isMe ? 'text-white/70' : 'text-zinc-500 dark:text-zinc-400'}`}>
              {locationData.address || `${locationData.lat.toFixed(5)}, ${locationData.lng.toFixed(5)}`}
            </p>
          </div>
        </div>

        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-1 py-1.5 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-colors ${
            isMe 
              ? 'bg-white/20 hover:bg-white/30 text-white' 
              : 'bg-primary hover:bg-primary/90 text-white shadow-xs'
          }`}
        >
          <span>View on Google Maps</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

interface ContactCardProps {
  contactData: {
    name: string;
    phone?: string;
    userId?: string;
    avatar?: string;
  };
  isMe?: boolean;
  onStartChatWithContact?: (userId?: string, phone?: string) => void;
}

export function ContactCard({ contactData, isMe, onStartChatWithContact }: ContactCardProps) {
  return (
    <div className={`p-3 rounded-2xl border shadow-sm my-1 max-w-[270px] min-w-[220px] select-none ${
      isMe 
        ? 'bg-black/20 border-white/20 text-white' 
        : 'bg-zinc-50 dark:bg-zinc-800/90 border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden shadow-xs shrink-0 ${
          isMe ? 'bg-white/30 text-white' : 'bg-primary/20 text-primary dark:text-teal-400'
        }`}>
          {contactData.avatar ? (
            <img src={contactData.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate">
            {contactData.name || 'Contact'}
          </p>
          <p className={`text-[11px] truncate font-mono ${isMe ? 'text-white/70' : 'text-zinc-500 dark:text-zinc-400'}`}>
            {contactData.phone || 'No phone provided'}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-black/10 dark:border-white/10 flex items-center gap-2">
        {contactData.phone && (
          <a
            href={`tel:${contactData.phone}`}
            className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold text-center flex items-center justify-center gap-1 transition-colors ${
              isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-zinc-200/70 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'
            }`}
          >
            <Phone className="w-3 h-3" />
            <span>Call</span>
          </a>
        )}

        <button
          type="button"
          onClick={() => onStartChatWithContact?.(contactData.userId, contactData.phone)}
          className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold text-center flex items-center justify-center gap-1 transition-colors ${
            isMe ? 'bg-white text-teal-800 hover:bg-white/90 shadow-xs' : 'bg-primary hover:bg-primary/90 text-white shadow-xs'
          }`}
        >
          <MessageSquare className="w-3 h-3" />
          <span>Message</span>
        </button>
      </div>
    </div>
  );
}
