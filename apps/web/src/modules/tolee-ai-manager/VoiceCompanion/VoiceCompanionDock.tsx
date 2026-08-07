'use client';

import React, { useState } from 'react';
import { Mic, Radio, Sparkles, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceCompanionModal } from './VoiceCompanionModal';

interface VoiceCompanionDockProps {
  onSelectTab: (tab: string) => void;
}

export function VoiceCompanionDock({ onSelectTab }: VoiceCompanionDockProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className="rounded-full h-8 px-3 text-xs font-bold bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500 shadow-md shadow-violet-600/20 flex items-center gap-1.5 animate-pulse"
      >
        <Radio className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Voice Companion</span>
        <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
          AI Voice
        </span>
      </Button>

      <VoiceCompanionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectTab={onSelectTab}
      />
    </>
  );
}
