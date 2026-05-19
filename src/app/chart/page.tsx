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
  Trash2,
  Plus,
  Star,
  Sun,
  Moon,
} from 'lucide-react';
import { DEFAULT_SYMBOLS } from '@/utils/symbols';
import { buildAllTags, DEFAULT_CUSTOM_TAGS, CUSTOM_TAG_IDS, type TagDef, type CustomTagRaw } from '@/utils/tags';

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
  tags?: string[];
  _id?: string;
}

interface BackendStock {
  symbol: string;
  name: string;
  isFavourite?: boolean;
  tags?: string[];
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

const BACKEND_API_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
  ? 'https://calculatorbackend-ul8h.onrender.com/api'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api');

export default function TradingTerminalPage() {
  /* ── State ─────────────────────────────────────────────────── */
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [watchlistStocks,  setWatchlistStocks]  = useState<StockQuote[]>([]);

  // Floating toast notification system state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load theme after mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = savedTheme || (isSystemDark ? 'dark' : 'light');
    setTheme(currentTheme);
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };
  interface WatchlistObj {
    _id?: string;
    name: string;
    isDefault?: boolean;
  }

  const [selectedSymbol,   setSelectedSymbol]   = useState<string>(DEFAULT_SYMBOLS[0] || 'VOLTAMP.NS');
  const [searchQuery,      setSearchQuery]       = useState('');
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [chartRange,       setChartRange]        = useState('1Y');
  const [chartMode,        setChartMode]         = useState<'price' | 'pe'>('price');
  const [terminalSearch,   setTerminalSearch]    = useState('');
  const [terminalSearchError, setTerminalSearchError] = useState('');
  const [terminalSearching, setTerminalSearching] = useState(false);
  const [activeTagFilter,  setActiveTagFilter]   = useState<string>('all');
  const [tagPopoverSym,    setTagPopoverSym]     = useState<string | null>(null);
  const [apiFailed,        setApiFailed]         = useState(false);

  // Watchlists State
  const [watchlists,       setWatchlists]        = useState<WatchlistObj[]>([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState<string>('default');
  const [newWatchlistName, setNewWatchlistName]  = useState<string>('');
  const [wlError,          setWlError]           = useState<string>('');

  // Custom tags
  const [customTagRaw,     setCustomTagRaw]      = useState<CustomTagRaw[]>(DEFAULT_CUSTOM_TAGS);
  const [editingTag,       setEditingTag]        = useState<CustomTagRaw | null>(null);
  const [editLabel,        setEditLabel]         = useState('');
  const [editColor,        setEditColor]         = useState('');
  const [editSaving,       setEditSaving]        = useState(false);

  // Derived: full tag list (static + custom)
  const allTags = buildAllTags(customTagRaw);
  const tagMap  = Object.fromEntries(allTags.map(t => [t.id, t]));
  const [showAddModal,     setShowAddModal]      = useState(false);
  const [addSymbolInput,   setAddSymbolInput]    = useState('');
  const [addModalError,    setAddModalError]     = useState('');
  const [addModalLoading,  setAddModalLoading]   = useState(false);
  const [suggestions,      setSuggestions]       = useState<{symbol:string;name:string;exchange:string}[]>([]);
  const [suggestLoading,   setSuggestLoading]    = useState(false);
  const [showSuggestions,  setShowSuggestions]   = useState(false);
  const suggestTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Expanded dynamic technical & fundamental analysis panel state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deepData,         setDeepData]         = useState<any>(null);
  const [deepLoading,      setDeepLoading]      = useState(false);
  const [activeTab,        setActiveTab]        = useState<'technicals' | 'fundamentals' | 'profile' | 'proscons' | 'strategy'>('technicals');

  /* Derived */
  const selectedStock = watchlistStocks.find(s => s.symbol === selectedSymbol) || null;

  /* ── Load watchlists and stocks from Backend API ────────────────────────── */
  const fetchWatchlists = React.useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_API_URL}/watchlists`);
      if (res.ok) {
        const data = await res.json();
        setWatchlists(data);
      }
    } catch (err) {
      console.error('Failed to fetch watchlists:', err);
    }
  }, []);

  useEffect(() => {
    fetchWatchlists();
  }, [fetchWatchlists]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setWatchlistLoading(true);
        setApiFailed(false);

        // 1. Try to fetch stocks from Mongoose backend API with active watchlist context
        const backendRes = await fetch(`${BACKEND_API_URL}/stocks?watchlist=${encodeURIComponent(selectedWatchlist)}`);
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
              name: backendStock ? backendStock.name : liveStock.name,
              isFavourite: backendStock ? !!backendStock.isFavourite : false,
              tags: backendStock?.tags ?? [],
              _id: backendStock ? backendStock._id : undefined
            };
          });

          setWatchlistStocks(mergedData);
          if (mergedData.length > 0) {
            const def = mergedData.find((s: StockQuote) => s.symbol === selectedSymbol) || mergedData[0];
            setSelectedSymbol(def.symbol);
          }
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
                isFavourite: false,
                tags: [] as string[]
              }));
              setWatchlistStocks(fallbackData);
              const def = fallbackData.find((s: StockQuote) => s.symbol === selectedSymbol) || fallbackData[0];
              setSelectedSymbol(def.symbol);
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
  }, [selectedWatchlist]);

  /* ── Load custom tags ──────────────────────────────────────── */
  useEffect(() => {
    fetch('/api/custom-tags')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length) setCustomTagRaw(data); })
      .catch(() => {});
  }, []);

  const handleSaveCustomTag = async () => {
    if (!editingTag || !editLabel.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/custom-tags/${editingTag.tagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editLabel.trim(), color: editColor }),
      });
      if (res.ok) {
        const updated: CustomTagRaw = await res.json();
        setCustomTagRaw(prev => prev.map(t => t.tagId === updated.tagId ? updated : t));
      }
    } finally {
      setEditSaving(false);
      setEditingTag(null);
    }
  };

  /* ── Add Stock Modal ───────────────────────────────────────── */
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = addSymbolInput.trim().toUpperCase();
    if (!raw) return;
    const sym = raw.includes('.') ? raw : `${raw}.NS`;
    await submitAddStock(sym);
  };

  const submitAddStock = async (sym: string) => {
    if (watchlistStocks.some(s => s.symbol.toUpperCase() === sym.toUpperCase())) {
      setAddModalError(`${sym} is already in your watchlist.`);
      return;
    }
    try {
      setAddModalLoading(true);
      setAddModalError('');
      setShowSuggestions(false);
      const res = await fetch(`/api/watchlist?symbols=${encodeURIComponent(sym)}`);
      if (!res.ok) throw new Error('Ticker not found.');
      const data = await res.json();
      if (!data?.length) throw new Error('No quote returned.');
      const stock = data[0];

      let savedStock = { ...stock, isFavourite: false, tags: [] as string[] };
      if (!apiFailed) {
        try {
          const backendRes = await fetch(`${BACKEND_API_URL}/stocks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: stock.symbol, name: stock.name, isFavourite: false, watchlist: selectedWatchlist })
          });
          if (backendRes.ok) {
            const dbStock = await backendRes.json();
            savedStock = { ...stock, name: dbStock.name, isFavourite: !!dbStock.isFavourite, tags: dbStock.tags ?? [], _id: dbStock._id };
          }
        } catch { /* backend offline, continue locally */ }
      }

      setWatchlistStocks(prev => [savedStock, ...prev]);
      setSelectedSymbol(savedStock.symbol);
      setAddSymbolInput('');
      setSuggestions([]);
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
              isFavourite: false,
              watchlist: selectedWatchlist
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

  /* ── Toggle Tag ─────────────────────────────────────────────── */
  const handleToggleTag = async (sym: string, tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const stock = watchlistStocks.find(s => s.symbol === sym);
    if (!stock) return;
    const current = stock.tags ?? [];
    const next = current.includes(tagId) ? current.filter(t => t !== tagId) : [...current, tagId];
    // optimistic update
    setWatchlistStocks(prev => prev.map(s => s.symbol === sym ? { ...s, tags: next } : s));
    if (!apiFailed) {
      try {
        await fetch(`${BACKEND_API_URL}/stocks/${encodeURIComponent(sym)}?watchlist=${encodeURIComponent(selectedWatchlist)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: next, watchlist: selectedWatchlist })
        });
      } catch {
        // revert on failure
        setWatchlistStocks(prev => prev.map(s => s.symbol === sym ? { ...s, tags: current } : s));
      }
    }
  };

  /* ── Toggle Favourite ───────────────────────────────────────── */
  const handleToggleFavourite = async (symbolToToggle: string, currentFavStatus: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const nextFavStatus = !currentFavStatus;

      if (!apiFailed) {
        const res = await fetch(`${BACKEND_API_URL}/stocks/${encodeURIComponent(symbolToToggle)}?watchlist=${encodeURIComponent(selectedWatchlist)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isFavourite: nextFavStatus, watchlist: selectedWatchlist })
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
      showToast(err instanceof Error ? err.message : 'Failed to update favorite status', 'error');
    }
  };

  /* ── Delete Stock ──────────────────────────────────────────── */
  const handleDeleteStock = async (symbolToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${symbolToDelete.split('.')[0]} from the list?`)) return;

    try {
      if (!apiFailed) {
        const res = await fetch(`${BACKEND_API_URL}/stocks/${encodeURIComponent(symbolToDelete)}?watchlist=${encodeURIComponent(selectedWatchlist)}`, {
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
      showToast(`${symbolToDelete.split('.')[0]} deleted from active workspace`, 'info');
    } catch (err) {
      console.error('Delete stock error:', err);
      showToast(err instanceof Error ? err.message : 'Failed to delete stock', 'error');
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
    const matchesTag = activeTagFilter === 'all' ? true : (s.tags ?? []).includes(activeTagFilter);
    return matchesSearch && matchesTag;
  });

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="min-h-dvh lg:h-dvh lg:overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans" onClick={() => setTagPopoverSym(null)}>
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0 safe-top">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link href="/watchlist" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white touch-manipulation shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 bg-clip-text text-transparent font-extrabold text-lg sm:text-xl tracking-tight truncate">
              VISION TERMINAL
            </span>
            <span className="hidden md:inline-block px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 dark:text-blue-400 text-[10px] font-extrabold rounded-full tracking-wide shrink-0">
              PRO
            </span>
          </div>
        </div>

        {/* Symbol search */}
        <form onSubmit={handleSearch} className="relative w-full sm:w-auto sm:flex-1 sm:max-w-xs order-last sm:order-none basis-full sm:basis-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search ticker (e.g. INFY, TATAMOTORS)…"
            value={terminalSearch}
            onChange={e => setTerminalSearch(e.target.value)}
            disabled={terminalSearching}
            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-500/50 rounded-xl text-xs font-semibold placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-slate-100 focus:outline-none transition-all"
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

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Always visible theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center shrink-0"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>
          
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setShowAddModal(true); setAddModalError(''); setAddSymbolInput(''); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 dark:text-blue-400 text-[10px] font-extrabold rounded-full hover:bg-blue-500/20 transition-all"
            >
              <Plus className="w-3 h-3" /> Add Stock
            </button>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 text-[10px] font-extrabold rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
              Live Markets
            </span>
          </div>
        </div>
      </header>

      {/* ── Edit Custom Tag Modal ────────────────────────────── */}
      {editingTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditingTag(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-extrabold text-white mb-1">Edit Custom Tag</h2>
            <p className="text-[10px] text-slate-500 mb-4">Rename and recolor <span style={{ color: editColor }} className="font-extrabold">{editingTag.tagId}</span></p>
            <div className="flex flex-col gap-3">
              <input
                autoFocus
                type="text"
                maxLength={24}
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                placeholder="Tag name…"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 focus:border-blue-500/50 rounded-xl text-xs font-semibold text-slate-100 placeholder:text-slate-600 focus:outline-none"
              />
              <div className="flex items-center gap-3">
                <label className="text-[10px] text-slate-400 font-bold shrink-0">Color</label>
                <input
                  type="color"
                  value={editColor}
                  onChange={e => setEditColor(e.target.value)}
                  className="w-10 h-8 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-slate-400">{editColor}</span>
                <span className="ml-auto px-2.5 py-1 rounded-full text-[10px] font-extrabold border"
                  style={{ backgroundColor: editColor + '25', color: editColor, borderColor: editColor + '60' }}>
                  {editLabel || 'Preview'}
                </span>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  disabled={editSaving || !editLabel.trim()}
                  onClick={handleSaveCustomTag}
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/40 text-white rounded-xl text-xs font-extrabold transition-all"
                >
                  {editSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTag(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Stock Modal ────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-extrabold text-white mb-1">Add Stock to Watchlist</h2>
            <p className="text-[10px] text-slate-500 mb-4">Type a company name or ticker to search</p>
            <form onSubmit={handleAddStock} className="flex flex-col gap-3">
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Infosys, TATAMOTORS, HDFCBANK"
                  value={addSymbolInput}
                  onChange={e => {
                    const val = e.target.value;
                    setAddSymbolInput(val);
                    setAddModalError('');
                    if (suggestTimer.current) clearTimeout(suggestTimer.current);
                    if (val.trim().length < 1) { setSuggestions([]); setShowSuggestions(false); return; }
                    suggestTimer.current = setTimeout(async () => {
                      setSuggestLoading(true);
                      try {
                        const r = await fetch(`/api/search?q=${encodeURIComponent(val.trim())}`);
                        const data = await r.json();
                        setSuggestions(data);
                        setShowSuggestions(true);
                      } catch { setSuggestions([]); }
                      finally { setSuggestLoading(false); }
                    }, 300);
                  }}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 focus:border-blue-500/50 rounded-xl text-xs font-semibold text-slate-100 placeholder:text-slate-600 focus:outline-none transition-all pr-8"
                />
                {suggestLoading && (
                  <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-400 animate-spin" />
                )}

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-10 shadow-xl max-h-52 overflow-y-auto">
                    {suggestions.map(s => (
                      <li
                        key={s.symbol}
                        onMouseDown={e => { e.preventDefault(); setAddSymbolInput(s.symbol); setSuggestions([]); setShowSuggestions(false); submitAddStock(s.symbol); }}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-700 cursor-pointer transition-colors group"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-extrabold text-white block">{s.symbol}</span>
                          <span className="text-[10px] text-slate-400 truncate block">{s.name}</span>
                        </div>
                        <span className="text-[9px] text-slate-600 font-bold shrink-0 ml-2">{s.exchange}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

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
                  onClick={() => { setShowAddModal(false); setSuggestions([]); }}
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
        <section className="lg:col-span-9 flex flex-col min-h-[52dvh] lg:min-h-0 lg:overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">

          {/* Stock header strip */}
          {selectedStock ? (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-650 flex items-center justify-center font-black text-white text-sm shadow-md">
                  {selectedStock.symbol.split('.')[0].slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-extrabold text-base text-slate-900 dark:text-white">{selectedStock.name}</h1>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 animate-fade-in">
                      {selectedStock.symbol}
                      {/* Favourite Star Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleFavourite(selectedStock.symbol, !!selectedStock.isFavourite)}
                        className={`p-0.5 rounded transition-all hover:scale-105 ${
                          selectedStock.isFavourite
                            ? 'text-yellow-500'
                            : 'text-slate-400 hover:text-slate-600 dark:text-slate-655 dark:hover:text-slate-400'
                        }`}
                        title={selectedStock.isFavourite ? "Remove from Favourites" : "Mark as Favourite"}
                      >
                        <Star className={`w-3 h-3 ${selectedStock.isFavourite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                      </button>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-bold uppercase tracking-wide">NSE • INR</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-xl font-black text-slate-900 dark:text-white">₹{selectedStock.price.toLocaleString('en-IN')}</div>
                  <div className={`flex items-center gap-1 text-xs font-bold mt-0.5 justify-end ${selectedStock.change >= 0 ? 'text-emerald-550 dark:text-emerald-400' : 'text-red-550 dark:text-red-400'}`}>
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
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-950">
              <div className="h-10 w-48 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            </div>
          )}

          {/* ── Advanced Chart (flex-1 fills remaining height) ── */}
          <div className="flex-1 min-h-[320px] lg:min-h-0 relative w-full h-full bg-white dark:bg-slate-950">
            {selectedSymbol && (
              <AdvancedChart
                symbol={selectedSymbol}
                chartRange={chartRange}
                onRangeChange={setChartRange}
                chartMode={chartMode}
                onModeChange={setChartMode}
                theme={theme}
              />
            )}
          </div>

          {/* Detailed Intelligence Dashboard Strip */}
          {selectedStock && (
            <div className="flex flex-col bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shrink-0 select-none">
              
              {/* Tab selector bar */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-900 bg-slate-50 dark:bg-slate-950/80 px-4 py-1 shrink-0 overflow-x-auto scrollbar-none">
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
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-blue-500/20 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Micro quote details */}
                <div className="hidden sm:flex items-center gap-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">
                  <div>Mkt Cap: <span className="text-slate-700 dark:text-white">₹{(selectedStock.marketCap / 10000000).toFixed(0)}Cr</span></div>
                  <div>P/E: <span className="text-purple-650 dark:text-purple-400">{selectedStock.pe > 0 ? selectedStock.pe.toFixed(1) : '—'}</span></div>
                  <div>P/BV: <span className="text-slate-700 dark:text-white">{selectedStock.cmpBv > 0 ? `${selectedStock.cmpBv}x` : '—'}</span></div>
                </div>
              </div>

              {/* Tab contents panel (Fixed height with scroll safety) */}
              <div className="h-[120px] overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 scrollbar-none border-t border-slate-200/50 dark:border-slate-900">
                {deepLoading ? (
                  <div className="h-full flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Querying complete corporate intelligence...
                    </span>
                  </div>
                ) : (
                  <>
                    {/* TECHNICALS TAB */}
                    {activeTab === 'technicals' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 p-2.5 rounded-xl shadow-sm">
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest block">50-Day SMA</span>
                          <p className="font-extrabold text-slate-800 dark:text-slate-100 mt-1">
                            {deepData?.ratios?.fiftyDayAverage ? `₹${deepData.ratios.fiftyDayAverage.toFixed(1)}` : '—'}
                          </p>
                          {deepData?.ratios?.fiftyDayAverage && (
                            <span className={`text-[9px] font-extrabold block mt-0.5 ${
                              selectedStock.price >= deepData.ratios.fiftyDayAverage ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-555 dark:text-red-400'
                            }`}>
                              {((selectedStock.price - deepData.ratios.fiftyDayAverage) / deepData.ratios.fiftyDayAverage * 100).toFixed(1)}% vs Avg
                            </span>
                          )}
                        </div>

                        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 p-2.5 rounded-xl shadow-sm">
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest block">200-Day SMA</span>
                          <p className="font-extrabold text-slate-800 dark:text-slate-100 mt-1">
                            {deepData?.ratios?.twoHundredDayAverage ? `₹${deepData.ratios.twoHundredDayAverage.toFixed(1)}` : '—'}
                          </p>
                          {deepData?.ratios?.twoHundredDayAverage && (
                            <span className={`text-[9px] font-extrabold block mt-0.5 ${
                              selectedStock.price >= deepData.ratios.twoHundredDayAverage ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-555 dark:text-red-400'
                            }`}>
                              {((selectedStock.price - deepData.ratios.twoHundredDayAverage) / deepData.ratios.twoHundredDayAverage * 100).toFixed(1)}% vs Avg
                            </span>
                          )}
                        </div>

                        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 p-2.5 rounded-xl col-span-2 shadow-sm">
                          <div className="flex justify-between items-center text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest">
                            <span>52-Week High/Low</span>
                            <span className="text-slate-600 dark:text-slate-400 font-bold">
                              H: ₹{deepData?.ratios?.fiftyTwoWeekHigh?.toFixed(0)} | L: ₹{deepData?.ratios?.fiftyTwoWeekLow?.toFixed(0)}
                            </span>
                          </div>
                          
                          {/* Visual high to low progress bar */}
                          {deepData?.ratios?.fiftyTwoWeekHigh && deepData?.ratios?.fiftyTwoWeekLow && (
                            <div className="mt-2.5">
                              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
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
                              <div className="flex justify-between items-center text-[8px] text-slate-400 dark:text-slate-500 font-extrabold mt-1">
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
                        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 p-2 text-center rounded-xl shadow-sm">
                          <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest block">ROE</span>
                          <span className="font-extrabold text-slate-800 dark:text-white mt-0.5 block">
                            {deepData?.ratios?.roe ? `${deepData.ratios.roe.toFixed(1)}%` : '—'}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 p-2 text-center rounded-xl shadow-sm">
                          <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest block">ROA</span>
                          <span className="font-extrabold text-slate-800 dark:text-white mt-0.5 block">
                            {deepData?.ratios?.roa ? `${deepData.ratios.roa.toFixed(1)}%` : '—'}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 p-2 text-center rounded-xl shadow-sm">
                          <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest block">Debt/Eq</span>
                          <span className={`font-extrabold mt-0.5 block ${
                            (deepData?.ratios?.debtToEquity / 100) > 1.5 ? 'text-red-555 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {deepData?.ratios?.debtToEquity !== undefined ? (deepData.ratios.debtToEquity / 100).toFixed(2) : '—'}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 p-2 text-center rounded-xl shadow-sm">
                          <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest block">Profit Margin</span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                            {deepData?.ratios?.profitMargin ? `${deepData.ratios.profitMargin.toFixed(1)}%` : '—'}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 p-2 text-center rounded-xl shadow-sm">
                          <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest block">Profit Growth</span>
                          <span className={`font-extrabold mt-0.5 block ${
                            selectedStock.profitGrowth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-555 dark:text-red-400'
                          }`}>
                            {selectedStock.profitGrowth !== 0 ? `${selectedStock.profitGrowth}%` : '—'}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 p-2 text-center rounded-xl shadow-sm">
                          <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest block">Sales Growth</span>
                          <span className={`font-extrabold mt-0.5 block ${
                            selectedStock.salesGrowth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-555 dark:text-red-400'
                          }`}>
                            {selectedStock.salesGrowth !== 0 ? `${selectedStock.salesGrowth}%` : '—'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed">
                        <div className="space-y-1 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 p-2.5 rounded-xl shadow-sm">
                          <div className="text-slate-600 dark:text-slate-300">Sector: <span className="text-slate-900 dark:text-white font-extrabold">{deepData?.profile?.sector || '—'}</span></div>
                          <div className="text-slate-600 dark:text-slate-300">Industry: <span className="text-slate-900 dark:text-white font-extrabold">{deepData?.profile?.industry || '—'}</span></div>
                          {deepData?.profile?.employees > 0 && (
                            <div className="text-slate-600 dark:text-slate-300">Employees: <span className="text-slate-900 dark:text-white font-extrabold">{deepData.profile.employees.toLocaleString()}</span></div>
                          )}
                        </div>
                        <div className="md:col-span-2 text-[10px] text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-900/50 p-2.5 rounded-xl max-h-[90px] overflow-y-auto scrollbar-none font-medium shadow-sm">
                          <span className="font-extrabold text-slate-700 dark:text-slate-350 block mb-1">Company Summary:</span>
                          {deepData?.profile?.summary || 'No description available for this ticker.'}
                        </div>
                      </div>
                    )}

                    {/* PROS & CONS TAB */}
                    {activeTab === 'proscons' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] leading-relaxed">
                        <div className="bg-white/80 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-900/50 p-2.5 rounded-xl shadow-sm">
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold uppercase block mb-1">Strengths / Advantages</span>
                          <ul className="space-y-1 text-slate-500 dark:text-slate-400 font-medium list-disc list-inside">
                            {deepData?.pros?.length ? (
                              deepData.pros.slice(0, 3).map((p: string, idx: number) => (
                                <li key={idx} className="truncate">{p}</li>
                              ))
                            ) : (
                              <li>Solid market position with consistent operational metrics.</li>
                            )}
                          </ul>
                        </div>
                        <div className="bg-white/80 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-900/50 p-2.5 rounded-xl shadow-sm">
                          <span className="text-red-550 dark:text-red-400 font-extrabold uppercase block mb-1">Risks / Limitations</span>
                          <ul className="space-y-1 text-slate-500 dark:text-slate-400 font-medium list-disc list-inside">
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
                      let badgeColor = "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20";
                      let textColor = "text-amber-550 dark:text-amber-400";
                      let stance = " Sideways consolidation or premium valuation suggests waiting for a better price entry. Strong fundamentals hold, but short-term upside is capped.";

                      if (score >= 65) {
                        rating = "ACCUMULATE (BUY)";
                        badgeColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                        textColor = "text-emerald-650 dark:text-emerald-400";
                        stance = " Dynamic technical support combined with solid Return on Equity (ROE) makes this a high-conviction buy. Favorable long-term wealth compounding candidate.";
                      } else if (score < 45) {
                        rating = "REDUCE / SELL";
                        badgeColor = "bg-rose-500/10 text-rose-555 dark:text-rose-400 border-rose-500/20";
                        textColor = "text-rose-555 dark:text-rose-400";
                        stance = " Elevated multiples (high P/E), significant leverage, or pricing below key moving averages (200 SMA) warrants technical caution. Risk profile is high.";
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed">
                          <div className="flex flex-col justify-center items-center bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 p-3 rounded-xl text-center shrink-0 shadow-sm">
                            <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest block">Vision Stance</span>
                            <div className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border mt-2 ${badgeColor}`}>
                              {rating}
                            </div>
                            <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold mt-2">Score: {score}/100</span>
                          </div>

                          <div className="md:col-span-2 bg-white/50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-900/50 p-2.5 rounded-xl max-h-[90px] overflow-y-auto scrollbar-none font-medium text-[10px] text-slate-500 dark:text-slate-400 shadow-sm">
                            <span className="font-extrabold text-slate-755 dark:text-slate-300 block mb-1">Detailed Analyst Rationale:</span>
                            <span className={`font-extrabold ${textColor}`}>{rating}:</span>{stance}
                            
                            {/* Detailed dynamic bullet-points based on score parameters */}
                            <ul className="mt-2 space-y-1 list-disc list-inside text-slate-450 dark:text-slate-500 font-semibold">
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
        <section className="lg:col-span-3 bg-white dark:bg-slate-950 flex flex-col overflow-hidden max-h-[42dvh] lg:max-h-none lg:min-h-0 safe-bottom border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 shadow-lg">

          <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            {/* Watchlist switcher widget */}
            <div className="mb-4 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-150 dark:border-slate-800/80">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[9px] font-extrabold text-slate-455 dark:text-slate-500 uppercase tracking-widest">Active Workspace</label>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newWatchlistName.trim()) return;
                    setWlError('');
                    try {
                      const res = await fetch(`${BACKEND_API_URL}/watchlists`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: newWatchlistName.trim() })
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setWatchlists(prev => [...prev, data]);
                        setSelectedWatchlist(data.name);
                        setNewWatchlistName('');
                      } else {
                        const err = await res.json();
                        setWlError(err.error || 'Error');
                      }
                    } catch {
                      setWlError('Error');
                    }
                  }} 
                  className="flex gap-1 items-center"
                >
                  <input
                    type="text"
                    placeholder="+ New..."
                    value={newWatchlistName}
                    onChange={e => { setNewWatchlistName(e.target.value); setWlError(''); }}
                    className="w-16 px-1.5 py-0.5 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-[9px] font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-505 focus:outline-none animate-fade-in"
                  />
                </form>
              </div>

              {wlError && <p className="text-[8px] text-red-500 font-extrabold mb-1">{wlError}</p>}

              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto scrollbar-thin">
                {watchlists.map(wl => {
                  const active = selectedWatchlist === wl.name;
                  return (
                    <div
                      key={wl.name}
                      onClick={() => { setSelectedWatchlist(wl.name); setActiveTagFilter('all'); }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold border transition-all cursor-pointer select-none ${
                        active
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-655 dark:text-blue-400 font-black shadow-sm'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-500 hover:border-slate-300 dark:hover:border-slate-800'
                      }`}
                    >
                      <span className="truncate max-w-[80px]">{wl.name === 'default' ? '🏛️ Institutional' : wl.name}</span>
                      {!wl.isDefault && wl.name !== 'default' && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!window.confirm(`Delete watchlist "${wl.name}"?`)) return;
                            try {
                              const res = await fetch(`${BACKEND_API_URL}/watchlists/${encodeURIComponent(wl.name)}`, { method: 'DELETE' });
                              if (res.ok) {
                                setWatchlists(prev => prev.filter(w => w.name !== wl.name));
                                if (selectedWatchlist === wl.name) setSelectedWatchlist('default');
                              }
                            } catch {}
                          }}
                          className="text-slate-400 hover:text-red-500 transition-colors ml-0.5 shrink-0"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <h2 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-blue-550 dark:text-blue-500" /> WATCHLIST
              <button
                type="button"
                onClick={() => { setShowAddModal(true); setAddModalError(''); setAddSymbolInput(''); }}
                className="ml-auto flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-455 text-[9px] font-extrabold rounded-lg hover:bg-blue-500/20 transition-all"
              >
                <Plus className="w-2.5 h-2.5" /> ADD
              </button>
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Filter stocks…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-500/50 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-655 focus:outline-none transition-all"
              />
            </div>

            {/* Tag filter bar */}
            <div className="mt-3 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setActiveTagFilter('all')}
                className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border transition-all ${
                  activeTagFilter === 'all'
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white border-slate-300 dark:border-slate-600 shadow-sm'
                    : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-850 hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                All ({watchlistStocks.length})
              </button>
              {allTags.map((tag: TagDef) => {
                const count = watchlistStocks.filter(s => (s.tags ?? []).includes(tag.id)).length;
                if (count === 0 && activeTagFilter !== tag.id) return null;
                const isCustom = CUSTOM_TAG_IDS.includes(tag.id as typeof CUSTOM_TAG_IDS[number]);
                const raw = isCustom ? customTagRaw.find(t => t.tagId === tag.id) : null;
                return (
                  <div key={tag.id} className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveTagFilter(activeTagFilter === tag.id ? 'all' : tag.id)}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border transition-all ${
                        activeTagFilter === tag.id ? 'opacity-100' : 'opacity-60 hover:opacity-90'
                      } ${
                        !raw
                          ? (activeTagFilter === tag.id
                              ? tag.color
                              : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-850 hover:border-slate-400 dark:hover:border-slate-600')
                          : ''
                      }`}
                      style={raw ? {
                        backgroundColor: raw.color + '25',
                        color: raw.color,
                        borderColor: raw.color + '60',
                      } : {}}
                    >
                      {tag.label} {count > 0 && `(${count})`}
                    </button>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); const r = customTagRaw.find(t => t.tagId === tag.id)!; setEditingTag(r); setEditLabel(r.label); setEditColor(r.color); }}
                        className="text-slate-400 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300 transition-colors text-[9px] leading-none"
                        title="Edit tag name & color"
                      >✎</button>
                    )}
                  </div>
                );
              })}
            </div>

            {apiFailed && (
              <div className="mt-2.5 px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-[9px] font-extrabold rounded-lg flex items-center justify-between animate-pulse">
                <span>⚠️ Backend API Offline</span>
                <span className="text-[8px] bg-red-500/25 px-1 py-0.2 rounded uppercase">Local Mode</span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900/60">
            {watchlistLoading ? (
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-900/60 animate-pulse">
                {[...Array(6)].map((_, idx) => (
                  <div key={idx} className="px-4 py-3 flex items-center justify-between gap-3 border-l-4 border-transparent">
                    <div className="flex-1">
                      <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-16 mb-1.5" />
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-900 rounded-md w-24" />
                    </div>
                    <div className="text-right">
                      <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-12 ml-auto mb-1.5" />
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-900 rounded-md w-10 ml-auto" />
                    </div>
                  </div>
                ))}
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
                      active ? 'bg-slate-50 dark:bg-slate-900 border-blue-550 dark:border-blue-500 shadow-sm' : 'hover:bg-slate-100/50 dark:hover:bg-slate-900/50 border-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-black ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-100'}`}>
                          {stock.symbol.split('.')[0]}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-600 font-bold">{stock.symbol.split('.')[1]}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate max-w-[130px] mt-0.5" title={stock.name}>
                        {stock.name}
                      </p>
                      {/* Tag pills */}
                      {(stock.tags ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {(stock.tags ?? []).map(tid => {
                            const td = tagMap[tid];
                            if (!td) return null;
                            return td.custom ? (
                              <span key={tid} className="px-1.5 py-0 rounded-full text-[8px] font-extrabold border"
                                style={{ backgroundColor: td.dot + '25', color: td.dot, borderColor: td.dot + '60' }}>
                                {td.label}
                              </span>
                            ) : (
                              <span key={tid} className={`px-1.5 py-0 rounded-full text-[8px] font-extrabold border ${td.color}`}>
                                {td.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-black text-slate-900 dark:text-white">₹{stock.price.toFixed(0)}</div>
                        <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded mt-0.5 ${
                          positive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-500 dark:text-red-400'
                        }`}>
                          {positive ? '+' : ''}{stock.changePercent.toFixed(1)}%
                        </span>
                      </div>
                      
                      {/* Action buttons - visible on hover */}
                      <div className="flex items-center gap-1 opacity-40 group-hover/item:opacity-100 transition-opacity relative">
                        {/* Tag button */}
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setTagPopoverSym(tagPopoverSym === stock.symbol ? null : stock.symbol); }}
                          className="p-1 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-455 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:border-blue-200 dark:hover:border-blue-500/20 transition-all hover:scale-105"
                          title="Manage Tags"
                        >
                          <Plus className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteStock(stock.symbol, e)}
                          className="p-1 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-200 dark:hover:border-red-500/20 transition-all hover:scale-105"
                          title="Delete from Terminal"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>

                        {/* Tag popover */}
                        {tagPopoverSym === stock.symbol && (
                          <div
                            className="absolute right-0 top-7 z-50 w-52 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-700 rounded-xl shadow-2xl p-2"
                            onClick={e => e.stopPropagation()}
                          >
                            <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Assign Tags</p>
                            <div className="flex flex-col gap-0.5">
                              {allTags.map((tag: TagDef) => {
                                const isActive = (stock.tags ?? []).includes(tag.id);
                                return tag.custom ? (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={e => handleToggleTag(stock.symbol, tag.id, e)}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all text-left ${
                                      isActive ? 'border shadow-sm' : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                    style={isActive ? { backgroundColor: tag.dot + '20', color: tag.dot, borderColor: tag.dot + '50' } : {}}
                                  >
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isActive ? tag.dot : '#64748b' }} />
                                    {tag.label}
                                    {isActive && <span className="ml-auto text-[8px]">✓</span>}
                                  </button>
                                ) : (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={e => handleToggleTag(stock.symbol, tag.id, e)}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all text-left ${
                                      isActive ? tag.color + ' border shadow-sm' : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                  >
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isActive ? tag.dot : '#64748b' }} />
                                    {tag.label}
                                    {isActive && <span className="ml-auto text-[8px]">✓</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs font-semibold">No matching stocks.</div>
            )}
          </div>

          <div className="p-3 border-t border-slate-100 dark:border-slate-900 text-center text-[10px] text-slate-450 dark:text-slate-700 flex items-center gap-2 justify-center shrink-0">
            <Sparkles className="w-3 h-3 text-yellow-600 animate-pulse" />
            Click any stock to load its chart instantly
          </div>
        </section>
      </main>
      
      {/* Dynamic glassmorphic floating toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 bg-slate-900/90 dark:bg-white/95 text-white dark:text-slate-950 rounded-2xl shadow-2xl backdrop-blur-xl border border-white/10 dark:border-slate-200/80 animate-slide-up">
          {toast.type === 'success' && <div className="w-2 h-2 bg-emerald-400 dark:bg-emerald-500 rounded-full animate-ping" />}
          {toast.type === 'error' && <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />}
          {toast.type === 'info' && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
          <span className="text-xs font-bold uppercase tracking-wider leading-none">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
