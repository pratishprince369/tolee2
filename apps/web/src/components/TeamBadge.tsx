'use client';

import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { TEAM_BADGES } from '@/lib/sports/types';

// Pure inline SVG flags for zero-network instant rendering
function IndiaFlag() {
  return (
    <svg viewBox="0 0 900 600" className="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="200" fill="#FF9933" />
      <rect y="200" width="900" height="200" fill="#FFFFFF" />
      <rect y="400" width="900" height="200" fill="#138808" />
      <circle cx="450" cy="300" r="75" fill="none" stroke="#000080" strokeWidth="10" />
      <circle cx="450" cy="300" r="14" fill="#000080" />
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={i}
          x1="450"
          y1="300"
          x2={450 + 75 * Math.cos((i * 15 * Math.PI) / 180)}
          y2={300 + 75 * Math.sin((i * 15 * Math.PI) / 180)}
          stroke="#000080"
          strokeWidth="5"
        />
      ))}
    </svg>
  );
}

function AustraliaFlag() {
  return (
    <svg viewBox="0 0 1200 600" className="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="600" fill="#00008B" />
      {/* Union Jack Canton */}
      <g>
        <clipPath id="aus-canton">
          <rect width="600" height="300" />
        </clipPath>
        <g clipPath="url(#aus-canton)">
          <path d="M0,0 L600,300 M600,0 L0,300" stroke="#FFF" strokeWidth="60" />
          <path d="M0,0 L600,300 M600,0 L0,300" stroke="#CC0000" strokeWidth="40" />
          <path d="M300,0 V300 M0,150 H600" stroke="#FFF" strokeWidth="100" />
          <path d="M300,0 V300 M0,150 H600" stroke="#CC0000" strokeWidth="60" />
        </g>
      </g>
      {/* Commonwealth Star */}
      <polygon points="300,380 320,430 370,410 340,450 380,480 330,480 340,530 300,490 260,530 270,480 220,480 260,450 230,410 280,430" fill="#FFF" />
      {/* Southern Cross */}
      <polygon points="900,100 906,125 930,125 910,140 918,165 900,150 882,165 890,140 870,125 894,125" fill="#FFF" />
      <polygon points="1020,240 1026,265 1050,265 1030,280 1038,305 1020,290 1002,305 1010,280 990,265 1014,265" fill="#FFF" />
      <polygon points="900,440 906,465 930,465 910,480 918,505 900,490 882,505 890,480 870,465 894,465" fill="#FFF" />
      <polygon points="780,270 786,295 810,295 790,310 798,335 780,320 762,335 770,310 750,295 774,295" fill="#FFF" />
      <polygon points="960,330 964,345 980,345 966,355 972,370 960,360 948,370 954,355 940,345 956,345" fill="#FFF" />
    </svg>
  );
}

function BangladeshFlag() {
  return (
    <svg viewBox="0 0 1000 600" className="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
      <rect width="1000" height="600" fill="#006A4E" />
      <circle cx="450" cy="300" r="200" fill="#F42A41" />
    </svg>
  );
}

function SpainFlag() {
  return (
    <svg viewBox="0 0 750 500" className="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
      <rect width="750" height="125" fill="#AA151B" />
      <rect y="125" width="750" height="250" fill="#F1BF00" />
      <rect y="375" width="750" height="125" fill="#AA151B" />
    </svg>
  );
}

function ItalyFlag() {
  return (
    <svg viewBox="0 0 900 600" className="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="600" fill="#009246" />
      <rect x="300" width="300" height="600" fill="#FFFFFF" />
      <rect x="600" width="300" height="600" fill="#CE2B37" />
    </svg>
  );
}

function UKFlag() {
  return (
    <svg viewBox="0 0 1200 600" className="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="600" fill="#00247D" />
      <path d="M0,0 L1200,600 M1200,0 L0,600" stroke="#FFF" strokeWidth="120" />
      <path d="M0,0 L1200,600 M1200,0 L0,600" stroke="#CF142B" strokeWidth="80" />
      <path d="M600,0 V600 M0,300 H1200" stroke="#FFF" strokeWidth="200" />
      <path d="M600,0 V600 M0,300 H1200" stroke="#CF142B" strokeWidth="120" />
    </svg>
  );
}

// Backup reliable CDN URLs for non-country teams
const CDN_BACKUPS: Record<string, string> = {
  'Lakers': 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png',
  'Los Angeles Lakers': 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png',
  'Celtics': 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png',
  'Boston Celtics': 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png',
  'Arsenal': 'https://a.espncdn.com/i/teamlogos/soccer/500/359.png',
  'Manchester City': 'https://a.espncdn.com/i/teamlogos/soccer/500/382.png',
  'Real Madrid': 'https://a.espncdn.com/i/teamlogos/soccer/500/86.png',
  'Bayern Munich': 'https://a.espncdn.com/i/teamlogos/soccer/500/132.png',
  'Chiefs': 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png',
  'Bills': 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png',
  'Chennai Super Kings': 'https://scores.iplt20.com/ipl/teamlogos/CSK.png',
  'Mumbai Indians': 'https://scores.iplt20.com/ipl/teamlogos/MI.png',
  'Jaipur Pink Panthers': 'https://www.prokabaddi.com/static-assets/images/teams/3.png',
  'Puneri Paltan': 'https://www.prokabaddi.com/static-assets/images/teams/7.png',
};

// Team Brand Colors for beautiful Monogram badges
const BRAND_COLORS: Record<string, { bg: string; text: string }> = {
  'Lakers': { bg: 'from-[#552583] to-[#FDB927]', text: '#FFF' },
  'Celtics': { bg: 'from-[#007A33] to-[#005222]', text: '#FFF' },
  'Arsenal': { bg: 'from-[#EF0107] to-[#9C0004]', text: '#FFF' },
  'Manchester City': { bg: 'from-[#6CABDD] to-[#1C2C5B]', text: '#FFF' },
  'Real Madrid': { bg: 'from-[#00529F] to-[#EEEEE]', text: '#FFF' },
  'Bayern Munich': { bg: 'from-[#DC052D] to-[#0066B2]', text: '#FFF' },
  'Chennai Super Kings': { bg: 'from-[#FFFF00] to-[#F9CD05]', text: '#000' },
  'Mumbai Indians': { bg: 'from-[#004BA0] to-[#D1AB3E]', text: '#FFF' },
  'Jaipur Pink Panthers': { bg: 'from-[#E4007C] to-[#002B49]', text: '#FFF' },
  'Puneri Paltan': { bg: 'from-[#F36F21] to-[#602B11]', text: '#FFF' },
};

export interface TeamBadgeProps {
  name: string;
  logo?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function TeamBadge({ name, logo, className = 'w-full h-full object-contain p-0.5' }: TeamBadgeProps) {
  const [useBackup, setUseBackup] = useState(false);
  const [errorAll, setErrorAll] = useState(false);

  const cleanName = (name || '').trim();
  const lower = cleanName.toLowerCase();

  // 1. Check Country Flags first - Direct vector rendering, 100% offline & zero network dependency
  if (lower === 'india' || lower === 'ind') {
    return <IndiaFlag />;
  }
  if (lower === 'australia' || lower === 'aus') {
    return <AustraliaFlag />;
  }
  if (lower === 'bangladesh' || lower === 'ban') {
    return <BangladeshFlag />;
  }
  if (lower === 'spain' || lower === 'alcaraz' || lower === 'carlos alcaraz') {
    return <SpainFlag />;
  }
  if (lower === 'italy' || lower === 'sinner' || lower === 'jannik sinner') {
    return <ItalyFlag />;
  }
  if (lower === 'england' || lower === 'united kingdom' || lower === 'uk') {
    return <UKFlag />;
  }

  // 2. Poster / local asset check (e.g. VCPL)
  if (cleanName.includes('Vindhya') || cleanName.includes('Royal Stars')) {
    return (
      <img
        src="/sports/vcpl-season-2.jpg"
        alt={`${name} team logo`}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    );
  }

  // 3. Resolve Image source
  let currentSrc: string | null = null;
  if (!errorAll) {
    if (useBackup) {
      currentSrc = CDN_BACKUPS[cleanName] || null;
    } else {
      currentSrc = logo || TEAM_BADGES[cleanName] || CDN_BACKUPS[cleanName] || null;
    }
  }

  // 4. Fallback monogram badge if all images fail or no logo is known
  if (!currentSrc || errorAll) {
    const brand = BRAND_COLORS[cleanName] || { bg: 'from-zinc-700 to-zinc-900', text: '#E4E4E7' };
    const initials = cleanName
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';

    return (
      <div 
        className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${brand.bg} select-none font-black text-[11px] shadow-inner`}
        style={{ color: brand.text }}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={`${name} team logo`}
      className={className}
      onError={() => {
        if (!useBackup && CDN_BACKUPS[cleanName]) {
          setUseBackup(true);
        } else {
          setErrorAll(true);
        }
      }}
      loading="lazy"
    />
  );
}
