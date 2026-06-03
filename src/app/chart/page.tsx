"use client";

import dynamic from 'next/dynamic';
import React from 'react';

/** Loading skeleton shown both on the server AND the client before the terminal JS bundle loads. */
const TerminalLoader = () => (
  <div className="min-h-dvh bg-slate-950 flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
        Initialising Terminal...
      </span>
    </div>
  </div>
);

/**
 * Dynamic import with ssr:false from a REAL separate module (terminal.tsx).
 * This is the only reliable way to prevent the trading terminal — which
 * depends on localStorage, WebSockets, window.matchMedia, and browser-only
 * APIs — from being rendered during SSR, eliminating hydration mismatches.
 *
 * Unlike dynamic(() => Promise.resolve(LocalFn), { ssr: false }) or a
 * useState(false) guard (both of which break under Turbopack HMR state
 * preservation), a genuine module-boundary import is opaque to the server
 * bundler and is guaranteed never to be SSR'd.
 */
const TradingTerminal = dynamic(() => import('./terminal'), {
  ssr: false,
  loading: () => <TerminalLoader />,
});

export default function TradingTerminalPage() {
  return (
    <React.Suspense fallback={<TerminalLoader />}>
      <TradingTerminal />
    </React.Suspense>
  );
}
