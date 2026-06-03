'use client';

import { AlertCircle, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to your enterprise telemetry console
    console.error('Next.js Root Error Boundary caught uncaught exception:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-6 transition-colors duration-300 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-2xl text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 rounded-2xl flex items-center justify-center mb-6 text-rose-500 animate-pulse border border-rose-100 dark:border-rose-900/50">
          <AlertCircle className="w-8 h-8" />
        </div>
        
        <h1 className="text-2xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-350 bg-clip-text text-transparent">
          System Recovery
        </h1>
        
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
          An unexpected error occurred while compiling your wealth intelligence data. Our engineers have been notified.
        </p>

        {error.message && (
          <div className="w-full text-left bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-4 mb-8 max-h-[140px] overflow-y-auto scrollbar-thin">
            <p className="text-xs font-mono text-rose-500 dark:text-rose-400 break-all leading-normal">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex justify-center items-center gap-2.5 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold text-sm transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0"
          >
            <RefreshCcw className="w-4 h-4" />
            Try Again
          </button>
          
          <Link
            href="/"
            className="flex-1 inline-flex justify-center items-center px-6 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-200 rounded-2xl font-semibold text-sm transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
