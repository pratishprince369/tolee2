'use client';

import { useState, useEffect } from 'react';

interface NetworkConfig {
  preloadCount: number;
  bufferAhead: number;
  isLowPower: boolean;
  effectiveType: string;
}

export function useNetworkConfig(): NetworkConfig {
  const [config, setConfig] = useState<NetworkConfig>({
    preloadCount: 10,
    bufferAhead: 3,
    isLowPower: false,
    effectiveType: '4g',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateConfig = async () => {
      let isLowPower = false;
      let effectiveType = '4g';

      // 1. Detect low battery / low power mode (if API supported)
      if ('getBattery' in navigator) {
        try {
          const battery: any = await (navigator as any).getBattery();
          // If battery is low (< 20%) and not charging, consider it low power
          if (battery.level < 0.2 && !battery.charging) {
            isLowPower = true;
          }
        } catch (e) {
          console.warn('[NetworkConfig] getBattery failed:', e);
        }
      }

      // 2. Detect connection speed
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        effectiveType = connection.effectiveType || '4g';
        if (connection.saveData) {
          isLowPower = true; // Save data acts similar to low power mode
        }
      }

      // Determine preloading counts based on conditions
      let preloadCount = 10;
      let bufferAhead = 3;

      if (isLowPower) {
        preloadCount = 3;
        bufferAhead = 0; // Buffer only current video
      } else {
        switch (effectiveType) {
          case 'slow-2g':
          case '2g':
          case '3g':
            preloadCount = 5;
            bufferAhead = 1;
            break;
          case '4g':
          default:
            // Could be fast Wi-Fi/5G - check downlink or assume typical 4G
            if (connection && connection.downlink && connection.downlink > 15) {
              preloadCount = 20;
              bufferAhead = 5;
            } else {
              preloadCount = 10;
              bufferAhead = 3;
            }
            break;
        }
      }

      setConfig({
        preloadCount,
        bufferAhead,
        isLowPower,
        effectiveType,
      });
    };

    updateConfig();

    // Listen to network changes if supported
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', updateConfig);
    }

    return () => {
      if (connection) {
        connection.removeEventListener('change', updateConfig);
      }
    };
  }, []);

  return config;
}
