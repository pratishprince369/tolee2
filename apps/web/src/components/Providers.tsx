'use client';
import { SessionProvider } from 'next-auth/react';
import { UploadProvider } from './UploadContext';
import { MusicPlayerProvider } from '@/context/MusicPlayerContext';
import { GlobalMusicPlayer } from './GlobalMusicPlayer';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <UploadProvider>
        <MusicPlayerProvider>
          {children}
          <GlobalMusicPlayer />
        </MusicPlayerProvider>
      </UploadProvider>
    </SessionProvider>
  );
}
