'use client';

import { useEffect, useRef } from 'react';
import { recordView } from '@/actions/post';

export function ViewTracker({ contentId, contentType }: { contentId: string, contentType: 'post' | 'reel' }) {
  const tracked = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tracked.current || !containerRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !tracked.current) {
            tracked.current = true;
            
            // Get or create device fingerprint
            let fp = localStorage.getItem('device_fingerprint');
            if (!fp) {
              fp = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
              localStorage.setItem('device_fingerprint', fp);
            }
            
            recordView(contentId, contentType, fp).catch((err) =>
              console.error('Failed to record view:', err)
            );
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 } // trigger when 20% of the element is visible
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [contentId, contentType]);

  return <div ref={containerRef} className="absolute w-1 h-1 pointer-events-none opacity-0" aria-hidden="true" />;
}
