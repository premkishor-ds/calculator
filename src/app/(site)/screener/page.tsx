"use client";

import React, { useState, useEffect } from 'react';
import { FilterSidebar, ActiveFilters } from '@/components/screener/FilterSidebar';
import { ResultsTable } from '@/components/screener/ResultsTable';
import { ResultsCards } from '@/components/screener/ResultsCards';
import { LayoutGrid, List } from 'lucide-react';

interface StockRow {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  pe: number;
  eps: number;
  cmpBv: number;
  divYield: number;
  promHold: number;
  profitGrowth: number;
  salesGrowth: number;
}

export default function ScreenerPage() {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/watchlist')
      .then(r => r.json())
      .then((data: StockRow[]) => setStocks(Array.isArray(data) ? data : []))
      .catch(() => setStocks([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans pb-20">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-[1800px] mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent tracking-tight">
              Advanced Screener
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
              Screen {stocks.length} stocks with real-time fundamentals, technicals, and ownership data.
            </p>
          </div>
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

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-80 shrink-0">
            <FilterSidebar activeFilters={activeFilters} onFiltersChange={setActiveFilters} />
          </div>

          {/* Results */}
          <div className="flex-1 bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm overflow-hidden">
            {viewMode === 'table'
              ? <ResultsTable activeFilters={activeFilters} />
              : <ResultsCards stocks={stocks} loading={loading} activeFilters={activeFilters} />
            }
          </div>
        </div>

      </div>
    </div>
  );
}
