'use client';

import React from 'react';
import { X, RefreshCw, AlertCircle, Check } from 'lucide-react';

interface UploadProgressOverlayProps {
  progress: number; // 0 to 100
  status: 'preparing' | 'uploading' | 'completed' | 'failed';
  errorMessage?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function UploadProgressOverlay({
  progress,
  status,
  errorMessage,
  onCancel,
  onRetry,
  size = 'md'
}: UploadProgressOverlayProps) {
  const radius = size === 'sm' ? 18 : size === 'lg' ? 36 : 26;
  const strokeWidth = size === 'sm' ? 3 : size === 'lg' ? 5 : 4;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(Math.max(progress, 0), 100) / 100) * circumference;

  const dimension = radius * 2;

  if (status === 'failed') {
    return (
      <div className="absolute inset-0 bg-black/65 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center p-3 text-white z-20 animate-in fade-in duration-150">
        <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 mb-2">
          <AlertCircle className="w-5 h-5" />
        </div>
        <p className="text-[12px] font-semibold text-center text-red-200 mb-2.5 max-w-[200px] truncate">
          {errorMessage || 'Upload failed'}
        </p>
        <div className="flex items-center gap-2">
          {onRetry && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold shadow-md active:scale-95 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}
          {onCancel && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs transition-colors"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs rounded-xl flex items-center justify-center text-white z-20 animate-in fade-in duration-150">
        <div className="w-12 h-12 rounded-full bg-teal-500 flex items-center justify-center shadow-lg text-white scale-100 transition-transform">
          <Check className="w-6 h-6 stroke-[3]" />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black/55 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center text-white z-20 animate-in fade-in duration-150 select-none">
      <div className="relative flex items-center justify-center">
        {/* SVG Circular Progress */}
        <svg height={dimension} width={dimension} className="transform -rotate-90">
          <circle
            stroke="rgba(255, 255, 255, 0.25)"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke="#14b8a6"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            className="transition-all duration-200"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        {/* Cancel Button in center or Progress Text */}
        {onCancel ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            className="absolute inset-0 m-auto w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90"
            title="Cancel upload"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        ) : (
          <span className="absolute text-[10px] font-extrabold tracking-tight">
            {Math.round(progress)}%
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-[11px] font-bold tracking-wide text-white/95">
          {status === 'preparing' ? 'Preparing...' : `${Math.round(progress)}%`}
        </span>
      </div>
    </div>
  );
}
