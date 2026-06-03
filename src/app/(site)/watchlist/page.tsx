"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { getBackendApiUrl } from '@/lib/backend-config';
import { DEFAULT_SEEDS } from '@/utils/symbols';

export default function WatchlistPage() {
  const router = useRouter();

  useEffect(() => {
    async function redirectDynamic() {
      const BACKEND_API_URL = getBackendApiUrl();
      // Dynamically get the first stock symbol from the default seeds as the fallback
      let firstSymbol = DEFAULT_SEEDS[0]?.symbol || 'RELIANCE.NS';

      try {
        const res = await fetch(`${BACKEND_API_URL}/stocks?watchlist=default`);
        if (res.ok) {
          const stocks = await res.json();
          if (Array.isArray(stocks) && stocks.length > 0 && stocks[0].symbol) {
            firstSymbol = stocks[0].symbol;
          }
        }
      } catch (err) {
        console.warn('Failed to dynamically resolve watchlist start symbol, using fallback.', err);
      }

      router.replace(`/watchlist/${encodeURIComponent(firstSymbol)}`);
    }

    redirectDynamic();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-55 dark:bg-slate-950 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Loading Workspace Cockpit…</span>
      </div>
    </div>
  );
}
