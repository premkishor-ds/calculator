"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  ChevronRight,
  Layers,
  Sparkles,
  Star,
  Trash2,
  Plus,
} from 'lucide-react';
import { DEFAULT_SYMBOLS } from '@/utils/symbols';

/* Dynamically import the chart so it's client-only (no SSR) */
const AdvancedChart = dynamic(() => import('@/components/AdvancedChart'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Initialising Chart Engine…</span>
      </div>
    </div>
  ),
});

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  pe: number;
  eps: number;
  cmpBv: number;
  divYield: number;
  promHold: number;
  profitGrowth: number;
  salesGrowth: number;
  isFavourite?: boolean;
  _id?: string;
}

interface BackendStock {
  symbol: string;
  name: string;
  isFavourite?: boolean;
  _id?: string;
}

interface LiveStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  pe: number;
  eps: number;
  cmpBv: number;
  divYield: number;
  promHold: number;
  profitGrowth: number;
  salesGrowth: number;
}

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export default function TradingTerminalPage() {
  /* ── State ─────────────────────────────────────────────────── */
  const [watchlistStocks,  setWatchlistStocks]  = useState<StockQuote[]>([]);
  const [selectedSymbol,   setSelectedSymbol]   = useState<string>('CGPOWER.NS');
  const [searchQuery,      setSearchQuery]       = useState('');
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [chartRange,       setChartRange]        = useState('1Y');
  const [chartMode,        setChartMode]         = useState<'price' | 'pe'>('price');
  const [terminalSearch,   setTerminalSearch]    = useState('');
  const [terminalSearchError, setTerminalSearchError] = useState('');
  const [terminalSearching, setTerminalSearching] = useState(false);
  const [showFavouritesOnly, setShowFavouritesOnly] = useState(false);
  const [apiFailed,        setApiFailed]         = useState(false);
  const [showAddModal,     setShowAddModal]      = useState(false);
  const [addSymbolInput,   setAddSymbolInput]    = useState('');
  const [addModalError,    setAddModalError]     = useState('');
  const [addModalLoading,  setAddModalLoading]   = useState(false);

  // Expanded dynamic technical & fundamental analysis panel state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deepData,         setDeepData]         = useState<any>(null);
  const [deepLoading,      setDeepLoading]      = useState(false);
  const [activeTab,        setActiveTab]        = useState<'technicals' | 'fundamentals' | 'profile' | 'proscons' | 'strategy'>('technicals');

  /* Derived */
  const selectedStock = watchlistStocks.find(s => s.symbol === selectedSymbol) || null;

  /* ── Load watchlist from Backend API ────────────────────────── */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setWatchlistLoading(true);
        setApiFailed(false);

        // 1. Try to fetch stocks from Mongoose backend API
        const backendRes = await fetch(`${BACKEND_API_URL}/stocks`);
        if (!backendRes.ok) {
          throw new Error('Backend API returned non-200 status');
        }
        
        const backendStocks = (await backendRes.json()) as BackendStock[];
        const symbols = backendStocks.map((s: BackendStock) => s.symbol);

        if (symbols.length === 0) {
          if (active) {
            setWatchlistStocks([]);
            setWatchlistLoading(false);
          }
          return;
        }

        // 2. Fetch live metrics from Next.js Next API for these symbols
        const liveRes = await fetch(`/api/watchlist?symbols=${encodeURIComponent(symbols.join(','))}`);
        if (!liveRes.ok) {
          throw new Error('Live data fetch failed');
        }
        const liveData = await liveRes.json();

        if (active) {
          // 3. Merge Backend details (isFavourite, correct formatting) with Live data
          const mergedData = liveData.map((liveStock: LiveStock) => {
            const backendStock = backendStocks.find(
              (s: BackendStock) => s.symbol.toUpperCase() === liveStock.symbol.toUpperCase()
            );
            return {
              ...liveStock,
              name: backendStock ? backendStock.name : liveStock.name, // Keep stored name in correct format
              isFavourite: backendStock ? !!backendStock.isFavourite : false,
              _id: backendStock ? backendStock._id : undefined
            };
          });

          setWatchlistStocks(mergedData);
          const def = mergedData.find((s: StockQuote) => s.symbol === 'CGPOWER.NS');
          setSelectedSymbol(def ? 'CGPOWER.NS' : mergedData[0]?.symbol ?? 'CGPOWER.NS');
        }
      } catch (err) {
        console.error('Backend API error - Falling back to local default stocks list:', err);
        if (active) {
          setApiFailed(true);
          // If API fails, clear local storage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('vision_watchlist');
          }
          
          // Fall back to default stock list
          try {
            const fallbackSymbols = DEFAULT_SYMBOLS;
            const res = await fetch(`/api/watchlist?symbols=${encodeURIComponent(fallbackSymbols.join(','))}`);
            if (res.ok) {
              const data = await res.json();
              const fallbackData = data.map((s: LiveStock) => ({
                ...s,
                isFavourite: false
              }));
              setWatchlistStocks(fallbackData);
              const def = fallbackData.find((s: StockQuote) => s.symbol === 'CGPOWER.NS');
              setSelectedSymbol(def ? 'CGPOWER.NS' : fallbackData[0]?.symbol ?? 'CGPOWER.NS');
            }
          } catch (fallbackErr) {
            console.error('Fallback fetch error:', fallbackErr);
          }
        }
      } finally {
        if (active) setWatchlistLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  /* ── Add Stock Modal ───────────────────────────────────────── */
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = addSymbolInput.trim().toUpperCase();
    if (!raw) return;
    const sym = raw.includes('.') ? raw : `${raw}.NS`;

    if (watchlistStocks.some(s => s.symbol.toUpperCase() === sym)) {
      setAddModalError(`${sym} is already in your watchlist.`);
      return;
    }

    try {
      setAddModalLoading(true);
      setAddModalError('');
      const res = await fetch(`/api/watchlist?symbols=${encodeURIComponent(sym)}`);
      if (!res.ok) throw new Error('Ticker not found.');
      const data = await res.json();
      if (!data?.length) throw new Error('No quote returned.');
      const stock = data[0];

      let savedStock = { ...stock, isFavourite: false };
      if (!apiFailed) {
        try {
          const backendRes = await fetch(`${BACKEND_API_URL}/stocks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: stock.symbol, name: stock.name, isFavourite: false })
          });
          if (backendRes.ok) {
            const dbStock = await backendRes.json();
            savedStock = { ...stock, name: dbStock.name, isFavourite: !!dbStock.isFavourite, _id: dbStock._id };
          }
        } catch { /* backend offline, continue locally */ }
      }

      setWatchlistStocks(prev => [savedStock, ...prev]);
      setSelectedSymbol(savedStock.symbol);
      setAddSymbolInput('');
      setShowAddModal(false);
    } catch (err: unknown) {
      setAddModalError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setAddModalLoading(false);
    }
  };

  /* ── Terminal search ───────────────────────────────────────── */
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalSearch.trim()) return;
    const raw = terminalSearch.trim().toUpperCase();
    const sym = raw.includes('.') ? raw : `${raw}.NS`;
    if (sym === selectedSymbol) { setTerminalSearch(''); return; }
    try {
      setTerminalSearching(true);
      setTerminalSearchError('');
      
      // 1. Query Yahoo Finance via next api to verify ticker exists & get standard format
      const res  = await fetch(`/api/watchlist?symbols=${encodeURIComponent(sym)}`);
      if (!res.ok) throw new Error('Ticker not found.');
      const data = await res.json();
      if (!data?.length) throw new Error('No quote returned.');
      const stock = data[0];

      let savedStock = { ...stock, isFavourite: false };

      // 2. Add to Mongoose backend API (if online)
      if (!apiFailed) {
        try {
          const backendPostRes = await fetch(`${BACKEND_API_URL}/stocks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              symbol: stock.symbol,
              name: stock.name, // Stored in correct format
              isFavourite: false
            })
          });
          if (backendPostRes.ok) {
            const dbStock = await backendPostRes.json();
            savedStock = {
              ...stock,
              name: dbStock.name, // Use database name in correct format
              isFavourite: !!dbStock.isFavourite,
              _id: dbStock._id
            };
          } else {
            const errData = await backendPostRes.json();
            throw new Error(errData.error || 'Failed to add stock to backend database');
          }
        } catch (backendErr) {
          console.error('Backend save error:', backendErr);
          setTerminalSearchError('Database save failed, operating locally');
        }
      }

      setSelectedSymbol(savedStock.symbol);
      if (!watchlistStocks.some(s => s.symbol === savedStock.symbol)) {
        const next = [savedStock, ...watchlistStocks];
        setWatchlistStocks(next);
      }
      setTerminalSearch('');
    } catch (err: unknown) {
      setTerminalSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setTerminalSearching(false);
    }
  };

  /* ── Toggle Favourite ───────────────────────────────────────── */
  const handleToggleFavourite = async (symbolToToggle: string, currentFavStatus: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const nextFavStatus = !currentFavStatus;

      if (!apiFailed) {
        const res = await fetch(`${BACKEND_API_URL}/stocks/${encodeURIComponent(symbolToToggle)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isFavourite: nextFavStatus })
        });
        if (!res.ok) {
          throw new Error('Failed to toggle favourite status in database');
        }
      }

      // Update state
      setWatchlistStocks(prev => prev.map(s => {
        if (s.symbol.toUpperCase() === symbolToToggle.toUpperCase()) {
          return { ...s, isFavourite: nextFavStatus };
        }
        return s;
      }));
    } catch (err) {
      console.error('Toggle favorite error:', err);
      alert(err instanceof Error ? err.message : 'Failed to update favorite status');
    }
  };

  /* ── Delete Stock ──────────────────────────────────────────── */
  const handleDeleteStock = async (symbolToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${symbolToDelete.split('.')[0]} from the list?`)) return;

    try {
      if (!apiFailed) {
        const res = await fetch(`${BACKEND_API_URL}/stocks/${encodeURIComponent(symbolToDelete)}`, {
          method: 'DELETE'
        });
        if (!res.ok) {
          throw new Error('Failed to delete stock from database');
        }
      }

      const nextWatchlist = watchlistStocks.filter(s => s.symbol.toUpperCase() !== symbolToDelete.toUpperCase());
      setWatchlistStocks(nextWatchlist);

      if (selectedSymbol.toUpperCase() === symbolToDelete.toUpperCase()) {
        if (nextWatchlist.length > 0) {
          setSelectedSymbol(nextWatchlist[0].symbol);
        } else {
          setSelectedSymbol('');
        }
      }
    } catch (err) {
      console.error('Delete stock error:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete stock');
    }
  };

  /* ── Load Deep Data ────────────────────────────────────────── */
  useEffect(() => {
    if (!selectedSymbol) return;
    let active = true;
    (async () => {
      try {
        setDeepLoading(true);
        const res = await fetch(`/api/watchlist/${encodeURIComponent(selectedSymbol)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (active) {
          setDeepData(data);
        }
      } catch (err) {
        console.error("Deep fetch error:", err);
      } finally {
        if (active) setDeepLoading(false);
      }
    })();
    return () => { active = false; };
  }, [selectedSymbol]);

  const filteredWatchlist = watchlistStocks.filter(s => {
    const matchesSearch = s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFav = showFavouritesOnly ? !!s.isFavourite : true;
    return matchesSearch && matchesFav;
  });

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="min-h-dvh lg:h-dvh lg:overflow-hidden bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-slate-950 border-b border-slate-800 shadow-md shrink-0 safe-top">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link href="/watchlist" className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white touch-manipulation shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent font-extrabold text-lg sm:text-xl tracking-tight truncate">
              VISION TERMINAL
            </span>
            <span className="hidden md:inline-block px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-extrabold rounded-full tracking-wide shrink-0">
              PRO
            </span>
          </div>
        </div>

        {/* Symbol search */}
        <form onSubmit={handleSearch} className="relative w-full sm:w-auto sm:flex-1 sm:max-w-xs order-last sm:order-none basis-full sm:basis-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search ticker (e.g. INFY, TATAMOTORS)…"
            value={terminalSearch}
            onChange={e => setTerminalSearch(e.target.value)}
            disabled={terminalSearching}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 focus:border-blue-500/50 rounded-xl text-xs font-semibold placeholder:text-slate-600 text-slate-100 focus:outline-none transition-all"
          />
          {terminalSearching && (
            <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-500 animate-spin" />
          )}
          {terminalSearchError && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-red-500/10 border border-red-500/20 text-red-400 p-2 rounded-xl text-[10px] font-bold z-50 text-center">
              {terminalSearchError}
            </div>
          )}
        </form>

        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setShowAddModal(true); setAddModalError(''); setAddSymbolInput(''); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-extrabold rounded-full hover:bg-blue-500/20 transition-all"
          >
            <Plus className="w-3 h-3" /> Add Stock
          </button>
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-extrabold rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
            Live Markets
          </span>
        </div>
      </header>

      {/* ── Add Stock Modal ────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-extrabold text-white mb-1">Add Stock to Watchlist</h2>
            <p className="text-[10px] text-slate-500 mb-4">Enter a Yahoo Finance ticker. Indian stocks auto-append .NS</p>
            <form onSubmit={handleAddStock} className="flex flex-col gap-3">
              <input
                autoFocus
                type="text"
                placeholder="e.g. INFY, TATAMOTORS, HDFCBANK"
                value={addSymbolInput}
                onChange={e => { setAddSymbolInput(e.target.value); setAddModalError(''); }}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 focus:border-blue-500/50 rounded-xl text-xs font-bold uppercase text-slate-100 placeholder:text-slate-600 focus:outline-none transition-all"
              />
              {addModalError && (
                <p className="text-[10px] text-red-400 font-bold">{addModalError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addModalLoading || !addSymbolInput.trim()}
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/40 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5"
                >
                  {addModalLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><Plus className="w-3.5 h-3.5" /> Add & Select</>}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Main Grid ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 lg:overflow-hidden min-h-0">

        {/* LEFT: Advanced Chart + Stock Info */}
        <section className="lg:col-span-9 flex flex-col min-h-[52dvh] lg:min-h-0 lg:overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950">

          {/* Stock header strip */}
          {selectedStock ? (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-950 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-lg">
                  {selectedStock.symbol.split('.')[0].slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-extrabold text-base text-white">{selectedStock.name}</h1>
                    <span className="px-2 py-0.5 bg-slate-850 text-slate-400 text-[10px] font-bold rounded border border-slate-800 flex items-center gap-1.5">
                      {selectedStock.symbol}
                      {/* Favourite Star Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleFavourite(selectedStock.symbol, !!selectedStock.isFavourite)}
                        className={`p-0.5 rounded transition-all hover:scale-105 ${
                          selectedStock.isFavourite
                            ? 'text-yellow-400'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={selectedStock.isFavourite ? "Remove from Favourites" : "Mark as Favourite"}
                      >
                        <Star className={`w-3 h-3 ${selectedStock.isFavourite ? 'fill-yellow-400' : ''}`} />
                      </button>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">NSE • INR</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-xl font-black text-white">₹{selectedStock.price.toLocaleString('en-IN')}</div>
                  <div className={`flex items-center gap-1 text-xs font-bold mt-0.5 justify-end ${selectedStock.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {selectedStock.change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change.toFixed(2)}
                    <span>({selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%)</span>
                  </div>
                </div>
                <Link
                  href={`/watchlist/${encodeURIComponent(selectedStock.symbol)}`}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md group"
                >
                  Full Report <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="px-5 py-3 border-b border-slate-800 shrink-0">
              <div className="h-10 w-48 bg-slate-800 rounded-xl animate-pulse" />
            </div>
          )}

          {/* ── Advanced Chart (flex-1 fills remaining height) ── */}
          <div className="flex-1 min-h-[320px] lg:min-h-0 relative w-full h-full">
            {selectedSymbol && (
              <AdvancedChart
                symbol={selectedSymbol}
                chartRange={chartRange}
                onRangeChange={setChartRange}
                chartMode={chartMode}
                onModeChange={setChartMode}
              />
            )}
          </div>

          {/* Detailed Intelligence Dashboard Strip */}
          {selectedStock && (
            <div className="flex flex-col bg-slate-950 border-t border-slate-800 shrink-0 select-none">
              
              {/* Tab selector bar */}
              <div className="flex items-center justify-between border-b border-slate-900 bg-slate-950/80 px-4 py-1 shrink-0 overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-1.5 min-w-0">
                  {[
                    { id: 'technicals', label: '📈 Technicals' },
                    { id: 'fundamentals', label: '📊 Fundamentals' },
                    { id: 'profile', label: '🏢 Profile' },
                    { id: 'proscons', label: '✔️ Pros & Cons' },
                    { id: 'strategy', label: '🎯 Strategy' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as 'technicals' | 'fundamentals' | 'profile' | 'proscons' | 'strategy')}
                      className={`px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all shrink-0 ${
                        activeTab === tab.id
                          ? 'bg-slate-900 text-blue-400 border border-blue-500/20'
                          : 'text-slate-500 hover:text-slate-350'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Micro quote details */}
                <div className="hidden sm:flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0">
                  <div>Mkt Cap: <span className="text-white">₹{(selectedStock.marketCap / 10000000).toFixed(0)}Cr</span></div>
                  <div>P/E: <span className="text-purple-400">{selectedStock.pe > 0 ? selectedStock.pe.toFixed(1) : '—'}</span></div>
                  <div>P/BV: <span className="text-white">{selectedStock.cmpBv > 0 ? `${selectedStock.cmpBv}x` : '—'}</span></div>
                </div>
              </div>

              {/* Tab contents panel (Fixed height with scroll safety) */}
              <div className="h-[120px] overflow-y-auto p-4 bg-slate-950/40 text-slate-100 scrollbar-none">
                {deepLoading ? (
                  <div className="h-full flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                      Querying complete corporate intelligence...
                    </span>
                  </div>
                ) : (
                  <>
                    {/* TECHNICALS TAB */}
                    {activeTab === 'technicals' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div className="bg-slate-900/40 border border-slate-900 p-2.5 rounded-xl">
                          <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest block">50-Day SMA</span>
                          <p className="font-extrabold text-slate-100 mt-1">
                            {deepData?.ratios?.fiftyDayAverage ? `₹${deepData.ratios.fiftyDayAverage.toFixed(1)}` : '—'}
                          </p>
                          {deepData?.ratios?.fiftyDayAverage && (
                            <span className={`text-[9px] font-extrabold block mt-0.5 ${
                              selectedStock.price >= deepData.ratios.fiftyDayAverage ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {((selectedStock.price - deepData.ratios.fiftyDayAverage) / deepData.ratios.fiftyDayAverage * 100).toFixed(1)}% vs Avg
                            </span>
                          )}
                        </div>

                        <div className="bg-slate-900/40 border border-slate-900 p-2.5 rounded-xl">
                          <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest block">200-Day SMA</span>
                          <p className="font-extrabold text-slate-100 mt-1">
                            {deepData?.ratios?.twoHundredDayAverage ? `₹${deepData.ratios.twoHundredDayAverage.toFixed(1)}` : '—'}
                          </p>
                          {deepData?.ratios?.twoHundredDayAverage && (
                            <span className={`text-[9px] font-extrabold block mt-0.5 ${
                              selectedStock.price >= deepData.ratios.twoHundredDayAverage ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {((selectedStock.price - deepData.ratios.twoHundredDayAverage) / deepData.ratios.twoHundredDayAverage * 100).toFixed(1)}% vs Avg
                            </span>
                          )}
                        </div>

                        <div className="bg-slate-900/40 border border-slate-900 p-2.5 rounded-xl col-span-2">
                          <div className="flex justify-between items-center text-[9px] text-slate-500 font-extrabold uppercase tracking-widest">
                            <span>52-Week High/Low</span>
                            <span className="text-slate-400 font-bold">
                              H: ₹{deepData?.ratios?.fiftyTwoWeekHigh?.toFixed(0)} | L: ₹{deepData?.ratios?.fiftyTwoWeekLow?.toFixed(0)}
                            </span>
                          </div>
                          
                          {/* Visual high to low progress bar */}
                          {deepData?.ratios?.fiftyTwoWeekHigh && deepData?.ratios?.fiftyTwoWeekLow && (
                            <div className="mt-2.5">
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
                                <div 
                                  className="absolute bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full"
                                  style={{
                                    left: '0%',
                                    width: `${Math.min(100, Math.max(0, 
                                      ((selectedStock.price - deepData.ratios.fiftyTwoWeekLow) / 
                                      (deepData.ratios.fiftyTwoWeekHigh - deepData.ratios.fiftyTwoWeekLow)) * 100
                                    ))}%`
                                  }}
                                />
                              </div>
                              <div className="flex justify-between items-center text-[8px] text-slate-500 font-extrabold mt-1">
                                <span>Low ({((selectedStock.price - deepData.ratios.fiftyTwoWeekLow) / deepData.ratios.fiftyTwoWeekLow * 100).toFixed(0)}% Up)</span>
                                <span>High ({((deepData.ratios.fiftyTwoWeekHigh - selectedStock.price) / selectedStock.price * 100).toFixed(0)}% Down)</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* FUNDAMENTALS TAB */}
                    {activeTab === 'fundamentals' && (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-xs">
                        <div className="bg-slate-900/40 border border-slate-900 p-2 text-center rounded-xl">
                          <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block">ROE</span>
                          <span className="font-extrabold text-white mt-0.5 block">
                            {deepData?.ratios?.roe ? `${deepData.ratios.roe.toFixed(1)}%` : '—'}
                          </span>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-900 p-2 text-center rounded-xl">
                          <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block">ROA</span>
                          <span className="font-extrabold text-white mt-0.5 block">
                            {deepData?.ratios?.roa ? `${deepData.ratios.roa.toFixed(1)}%` : '—'}
                          </span>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-900 p-2 text-center rounded-xl">
                          <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block">Debt/Eq</span>
                          <span className={`font-extrabold mt-0.5 block ${
                            (deepData?.ratios?.debtToEquity / 100) > 1.5 ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            {deepData?.ratios?.debtToEquity !== undefined ? (deepData.ratios.debtToEquity / 100).toFixed(2) : '—'}
                          </span>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-900 p-2 text-center rounded-xl">
                          <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block">Profit Margin</span>
                          <span className="font-extrabold text-emerald-400 mt-0.5 block">
                            {deepData?.ratios?.profitMargin ? `${deepData.ratios.profitMargin.toFixed(1)}%` : '—'}
                          </span>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-900 p-2 text-center rounded-xl">
                          <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block">Profit Growth</span>
                          <span className={`font-extrabold mt-0.5 block ${
                            selectedStock.profitGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {selectedStock.profitGrowth !== 0 ? `${selectedStock.profitGrowth}%` : '—'}
                          </span>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-900 p-2 text-center rounded-xl">
                          <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block">Sales Growth</span>
                          <span className={`font-extrabold mt-0.5 block ${
                            selectedStock.salesGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {selectedStock.salesGrowth !== 0 ? `${selectedStock.salesGrowth}%` : '—'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed">
                        <div className="space-y-1 bg-slate-900/40 border border-slate-900 p-2.5 rounded-xl">
                          <div>Sector: <span className="text-white font-extrabold">{deepData?.profile?.sector || '—'}</span></div>
                          <div>Industry: <span className="text-white font-extrabold">{deepData?.profile?.industry || '—'}</span></div>
                          {deepData?.profile?.employees > 0 && (
                            <div>Employees: <span className="text-white font-extrabold">{deepData.profile.employees.toLocaleString()}</span></div>
                          )}
                        </div>
                        <div className="md:col-span-2 text-[10px] text-slate-400 bg-slate-900/20 border border-slate-900/50 p-2.5 rounded-xl max-h-[90px] overflow-y-auto scrollbar-none font-medium">
                          <span className="font-extrabold text-slate-350 block mb-1">Company Summary:</span>
                          {deepData?.profile?.summary || 'No description available for this ticker.'}
                        </div>
                      </div>
                    )}

                    {/* PROS & CONS TAB */}
                    {activeTab === 'proscons' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] leading-relaxed">
                        <div className="bg-slate-900/30 border border-slate-900/50 p-2.5 rounded-xl">
                          <span className="text-emerald-400 font-extrabold uppercase block mb-1">Strengths / Advantages</span>
                          <ul className="space-y-1 text-slate-400 font-medium list-disc list-inside">
                            {deepData?.pros?.length ? (
                              deepData.pros.slice(0, 3).map((p: string, idx: number) => (
                                <li key={idx} className="truncate">{p}</li>
                              ))
                            ) : (
                              <li>Solid market position with consistent operational metrics.</li>
                            )}
                          </ul>
                        </div>
                        <div className="bg-slate-900/30 border border-slate-900/50 p-2.5 rounded-xl">
                          <span className="text-red-400 font-extrabold uppercase block mb-1">Risks / Limitations</span>
                          <ul className="space-y-1 text-slate-400 font-medium list-disc list-inside">
                            {deepData?.cons?.length ? (
                              deepData.cons.slice(0, 3).map((c: string, idx: number) => (
                                <li key={idx} className="truncate">{c}</li>
                              ))
                            ) : (
                              <li>Exposed to equity market volatilities and economic variances.</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* STRATEGY TAB */}
                    {activeTab === 'strategy' && (() => {
                      const roe = deepData?.ratios?.roe || 0;
                      const debt = (deepData?.ratios?.debtToEquity || 0) / 100;
                      const pe = selectedStock.pe || 0;
                      const price = selectedStock.price || 0;
                      const sma200 = deepData?.ratios?.twoHundredDayAverage || 0;
                      const sma50 = deepData?.ratios?.fiftyDayAverage || 0;

                      // Decision engine math
                      let score = 50;
                      if (roe > 20) score += 15;
                      else if (roe > 12) score += 5;
                      else if (roe < 8 && roe > 0) score -= 10;

                      if (debt > 0 && debt < 0.5) score += 10;
                      else if (debt > 1.5) score -= 15;

                      if (pe > 0 && pe < 25) score += 10;
                      else if (pe > 75) score -= 15;

                      if (price > 0 && sma200 > 0) {
                        if (price > sma200) score += 15;
                        else score -= 15;
                      }
                      if (price > 0 && sma50 > 0) {
                        if (price > sma50) score += 5;
                      }

                      let rating = "HOLD (NEUTRAL)";
                      let badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                      let textColor = "text-amber-400";
                      let stance = " Sideways consolidation or premium valuation suggests waiting for a better price entry. Strong fundamentals hold, but short-term upside is capped.";

                      if (score >= 65) {
                        rating = "ACCUMULATE (BUY)";
                        badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                        textColor = "text-emerald-400";
                        stance = " Dynamic technical support combined with solid Return on Equity (ROE) makes this a high-conviction buy. Favorable long-term wealth compounding candidate.";
                      } else if (score < 45) {
                        rating = "REDUCE / SELL";
                        badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                        textColor = "text-rose-400";
                        stance = " Elevated multiples (high P/E), significant leverage, or pricing below key moving averages (200 SMA) warrants technical caution. Risk profile is high.";
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed">
                          <div className="flex flex-col justify-center items-center bg-slate-900/40 border border-slate-900 p-3 rounded-xl text-center shrink-0">
                            <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block">Vision Stance</span>
                            <div className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border mt-2 ${badgeColor}`}>
                              {rating}
                            </div>
                            <span className="text-[8px] text-slate-500 font-bold mt-2">Score: {score}/100</span>
                          </div>

                          <div className="md:col-span-2 bg-slate-900/20 border border-slate-900/50 p-2.5 rounded-xl max-h-[90px] overflow-y-auto scrollbar-none font-medium text-[10px] text-slate-400">
                            <span className="font-extrabold text-slate-300 block mb-1">Detailed Analyst Rationale:</span>
                            <span className={`font-extrabold ${textColor}`}>{rating}:</span>{stance}
                            
                            {/* Detailed dynamic bullet-points based on score parameters */}
                            <ul className="mt-2 space-y-1 list-disc list-inside text-slate-500 font-semibold">
                              {roe > 15 && <li>Robust Return on Equity ({roe.toFixed(1)}%) indicates excellent capital efficiency.</li>}
                              {debt > 0 && debt < 1.0 && <li>Healthy balance sheet with low gearing (D/E ratio at {debt.toFixed(2)}x).</li>}
                              {pe > 0 && pe < 35 && <li>Attractive valuation multiple (P/E at {pe.toFixed(1)}x) relative to growth indices.</li>}
                              {price > sma200 && sma200 > 0 && <li>Bullish technical structure supported by trades above 200 SMA.</li>}
                              {price < sma200 && sma200 > 0 && <li>Bearish trend alert — trading below 200 SMA indicating heavy overhead resistance.</li>}
                            </ul>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

            </div>
          )}
        </section>

        {/* RIGHT: Watchlist Sidebar */}
        <section className="lg:col-span-3 bg-slate-950 flex flex-col overflow-hidden max-h-[42dvh] lg:max-h-none lg:min-h-0 safe-bottom">

          <div className="p-4 border-b border-slate-800 shrink-0">
            <h2 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-blue-500" /> WATCHLIST
              <button
                type="button"
                onClick={() => { setShowAddModal(true); setAddModalError(''); setAddSymbolInput(''); }}
                className="ml-auto flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-extrabold rounded-lg hover:bg-blue-500/20 transition-all"
              >
                <Plus className="w-2.5 h-2.5" /> ADD
              </button>
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter stocks…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 focus:border-blue-500/50 rounded-xl text-xs font-bold text-slate-200 placeholder:text-slate-600 focus:outline-none transition-all"
              />
            </div>

            {/* Filter Tabs (All vs Favourites) */}
            <div className="flex gap-1 mt-3 p-0.5 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setShowFavouritesOnly(false)}
                className={`flex-1 py-1 text-[9px] font-extrabold uppercase tracking-wider rounded-lg transition-all ${
                  !showFavouritesOnly
                    ? 'bg-slate-800 text-blue-400 border border-blue-500/10'
                    : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                All ({watchlistStocks.length})
              </button>
              <button
                type="button"
                onClick={() => setShowFavouritesOnly(true)}
                className={`flex-1 py-1 text-[9px] font-extrabold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 ${
                  showFavouritesOnly
                    ? 'bg-slate-850 text-yellow-400 border border-yellow-500/10'
                    : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                ⭐ Favs ({watchlistStocks.filter(s => s.isFavourite).length})
              </button>
            </div>

            {apiFailed && (
              <div className="mt-2.5 px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-extrabold rounded-lg flex items-center justify-between animate-pulse">
                <span>⚠️ Backend API Offline</span>
                <span className="text-[8px] bg-red-500/25 px-1 py-0.2 rounded uppercase">Local Mode</span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-900/60">
            {watchlistLoading ? (
              <div className="p-8 text-center flex flex-col items-center gap-3">
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                <span className="text-xs text-slate-500 font-semibold">Loading quotes…</span>
              </div>
            ) : filteredWatchlist.length > 0 ? (
              filteredWatchlist.map(stock => {
                const active   = stock.symbol === selectedSymbol;
                const positive = stock.change >= 0;
                return (
                  <div
                    key={stock.symbol}
                    onClick={() => setSelectedSymbol(stock.symbol)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-all border-l-4 touch-manipulation cursor-pointer group/item ${
                      active ? 'bg-slate-900 border-blue-500' : 'hover:bg-slate-900/50 border-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-black ${active ? 'text-blue-400' : 'text-slate-100'}`}>
                          {stock.symbol.split('.')[0]}
                        </span>
                        <span className="text-[9px] text-slate-600 font-bold">{stock.symbol.split('.')[1]}</span>
                        {stock.isFavourite && (
                          <span className="text-yellow-400 text-[10px] font-extrabold">★</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate max-w-[130px] mt-0.5" title={stock.name}>
                        {stock.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-black text-white">₹{stock.price.toFixed(0)}</div>
                        <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded mt-0.5 ${
                          positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {positive ? '+' : ''}{stock.changePercent.toFixed(1)}%
                        </span>
                      </div>
                      
                      {/* Action buttons (Star & Delete) - visible on hover or if favourite */}
                      <div className="flex items-center gap-1 opacity-40 group-hover/item:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavourite(stock.symbol, !!stock.isFavourite, e)}
                          className={`p-1 rounded-lg border transition-all hover:scale-105 ${
                            stock.isFavourite
                              ? 'bg-yellow-500/10 border-yellow-500/35 text-yellow-400 hover:bg-yellow-500/20'
                              : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-350 hover:bg-slate-750'
                          }`}
                          title={stock.isFavourite ? "Remove from Favourites" : "Mark as Favourite"}
                        >
                          <Star className={`w-3 h-3 ${stock.isFavourite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                        </button>
                        
                        <button
                          type="button"
                          onClick={(e) => handleDeleteStock(stock.symbol, e)}
                          className="p-1 rounded-lg border bg-slate-800 border-slate-700 text-slate-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all hover:scale-105"
                          title="Delete from Terminal"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-600 text-xs font-semibold">No matching stocks.</div>
            )}
          </div>

          <div className="p-3 border-t border-slate-900 text-center text-[10px] text-slate-700 flex items-center gap-2 justify-center shrink-0">
            <Sparkles className="w-3 h-3 text-yellow-600" />
            Click any stock to load its chart instantly
          </div>
        </section>
      </main>
    </div>
  );
}
