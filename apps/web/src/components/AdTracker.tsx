'use client';

import { useEffect, useRef } from 'react';
import { trackAdInteraction } from '@/actions/ads';

interface AdTrackerProps {
  adId: string;
  type: 'impression' | 'click' | 'lead';
  contentId?: string;
  toleeId?: string;
  placementType?: 'normal_feed' | 'group_pin_post' | 'group_cover_banner';
  children?: React.ReactNode;
  className?: string;
}

export function AdTracker({ adId, type, contentId, toleeId, placementType, children, className }: AdTrackerProps) {
  const tracked = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (type !== 'impression' || tracked.current || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !tracked.current) {
            tracked.current = true;
            
            // Track impression
            trackAdInteraction(adId, 'impression', undefined, { contentId, toleeId, placementType }).catch((err) =>
              console.error('Failed to track ad impression:', err)
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
  }, [adId, type, contentId, toleeId, placementType]);

  const handleClick = async (e: React.MouseEvent) => {
    // For clicks and leads, track on click event
    if (type !== 'impression') {
      try {
        await trackAdInteraction(adId, type, undefined, { contentId, toleeId, placementType });
      } catch (err) {
        console.error(`Failed to track ad ${type}:`, err);
      }
    }
  };

  if (type === 'impression') {
    return <div ref={containerRef} className="absolute w-1 h-1 pointer-events-none opacity-0" aria-hidden="true" />;
  }

  return (
    <div onClick={handleClick} className={className}>
      {children}
    </div>
  );
}
