"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { FilterSidebar, ActiveFilters } from '@/components/screener/FilterSidebar';
import { ResultsTable } from '@/components/screener/ResultsTable';
import { ResultsCards } from '@/components/screener/ResultsCards';
import { LayoutGrid, List, RefreshCw } from 'lucide-react';
import { StockRow } from '@/components/screener/screener-utils';
import {
  fetchScreenerMeta,
  fetchScreenerStocks,
  triggerScreenerSync,
} from '@/lib/screener-api';

type Exchange = 'nse' | 'bse' | 'all';

export default function ScreenerPage() {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exchange, setExchange] = useState<Exchange>('all');
  const [asOfDate, setAsOfDate] = useState<string | null>(null);
  const [universeSize, setUniverseSize] = useState(0);
  const [totalInDb, setTotalInDb] = useState(0);
  const [nseCount, setNseCount] = useState(0);
  const [bseCount, setBseCount] = useState(0);

  const loadScreener = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const meta = await fetchScreenerMeta();
      setAsOfDate(meta.asOfDate ?? null);
      setUniverseSize(meta.universeSize ?? meta.savedCount ?? 0);
      setNseCount(meta.nseCount ?? 0);
      setBseCount(meta.bseCount ?? 0);
      setSyncing(Boolean(meta.syncing));

      const saved = meta.savedCount ?? 0;
      if (!meta.asOfDate || saved < 100) {
        setStocks([]);
        setTotalInDb(0);
        if (meta.syncing) {
          setError('Daily market sync in progress. This may take a few minutesâ€¦');
        } else if (meta.status === 'failed' && meta.errorMessage) {
          setError(meta.errorMessage);
        } else if (meta.errorMessage) {
          setError(meta.errorMessage);
        } else {
          setError(
            'No snapshot in database yet. Click â€œSync nowâ€ (runs on the server; first sync can take 10â€“20 min) or wait for the daily cron job.'
          );
        }
        return;
      }

      const data = await fetchScreenerStocks(activeFilters, exchange);
      setTotalInDb(data.total ?? 0);
      setStocks(Array.isArray(data.stocks) ? data.stocks : []);
    } catch {
      setStocks([]);
      setError('Could not load screener from MongoDB. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [activeFilters, exchange]);

  useEffect(() => {
    loadScreener();
  }, [loadScreener]);

  const handleSyncNow = async () => {
    setSyncing(true);
    setError(null);
    try {
      await triggerScreenerSync(true);
      await loadScreener();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const exchangeLabel =
    exchange === 'nse'
      ? `NSE (${nseCount.toLocaleString()})`
      : exchange === 'bse'
        ? `BSE (${bseCount.toLocaleString()})`
        : `NSE + BSE (${(nseCount + bseCount).toLocaleString()})`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans pb-20">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-[1800px] mx-auto">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent tracking-tight">
              Advanced Screener
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
              {loading
                ? 'Loading from MongoDBâ€¦'
                : `Showing ${stocks.length.toLocaleString()} of ${totalInDb.toLocaleString()} stocks (${exchangeLabel})`}
              {asOfDate && !loading && (
                <span className="text-slate-400"> â€” snapshot {asOfDate}</span>
              )}
              {universeSize > 0 && !loading && (
                <span className="text-slate-400"> â€” universe {universeSize.toLocaleString()}</span>
              )}
            </p>
            {error && <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">{error}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value as Exchange)}
              className="text-sm font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
              aria-label="Exchange"
              disabled={loading || syncing}
            >
              <option value="all">All â€” NSE + BSE</option>
              <option value="nse">NSE only</option>
              <option value="bse">BSE only</option>
            </select>
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncingâ€¦' : 'Sync now'}
            </button>
            <button
              type="button"
              onClick={loadScreener}
              disabled={loading || syncing}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg ${viewMode === 'table' ? 'bg-slate-100 dark:bg-slate-800 text-blue-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg ${viewMode === 'cards' ? 'bg-slate-100 dark:bg-slate-800 text-blue-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-80 shrink-0">
            <FilterSidebar activeFilters={activeFilters} onFiltersChange={setActiveFilters} />
          </div>

          <div className="flex-1 bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm overflow-hidden">
            {viewMode === 'table' ? (
              <ResultsTable
                stocks={stocks}
                totalUnfiltered={totalInDb}
                loading={loading}
                activeFilters={activeFilters}
              />
            ) : (
              <ResultsCards stocks={stocks} loading={loading} activeFilters={activeFilters} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

