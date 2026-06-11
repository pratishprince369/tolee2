'use client';
import { SessionProvider } from 'next-auth/react';
import { UploadProvider } from './UploadContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <UploadProvider>
        {children}
      </UploadProvider>
    </SessionProvider>
  );
}
