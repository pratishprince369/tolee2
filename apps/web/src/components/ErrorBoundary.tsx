'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in Meeting room:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white">Unable to load meeting</h1>
              <p className="text-zinc-400 text-sm">
                A client-side error occurred while rendering the meeting interface.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => window.location.reload()}
                className="flex-1 bg-[#0a7c85] hover:bg-[#0a7c85]/90 text-white font-bold rounded-xl"
              >
                Retry
              </Button>
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="flex-1 border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-bold rounded-xl"
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
