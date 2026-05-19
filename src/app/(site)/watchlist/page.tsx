"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Plus, 
  Trash2, 
  AlertCircle,
  TrendingUp as StockIcon,
  Star
} from 'lucide-react';
import { DEFAULT_SYMBOLS, DEFAULT_SEEDS } from '@/utils/symbols';
import { buildAllTags, DEFAULT_CUSTOM_TAGS, CUSTOM_TAG_IDS, type TagDef, type CustomTagRaw } from '@/utils/tags';

interface StockData {
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
}

interface BackendStock {
  symbol: string;
  name: string;
  isFavourite?: boolean;
  tags?: string[];
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

interface WatchlistObj {
  _id?: string;
  name: string;
  isDefault?: boolean;
}

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export default function WatchlistPage() {
  const router = useRouter();

  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [sortField, setSortField] = useState<keyof StockData>('marketCap');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [apiFailed, setApiFailed] = useState(false);
  const [showFavouritesOnly, setShowFavouritesOnly] = useState(false);

  // Watchlists State
  const [watchlists, setWatchlists] = useState<WatchlistObj[]>([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState<string>('default');
  const [newWatchlistName, setNewWatchlistName] = useState<string>('');
  const [creatingWatchlist, setCreatingWatchlist] = useState<boolean>(false);
  const [wlError, setWlError] = useState<string>('');

  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Tags State
  const [activeTagFilter, setActiveTagFilter] = useState<string>('all');
  const [customTagRaw, setCustomTagRaw] = useState<CustomTagRaw[]>(DEFAULT_CUSTOM_TAGS);
  const [tagPopoverSym, setTagPopoverSym] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<CustomTagRaw | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Derived: full tag list (static + custom)
  const allTags = buildAllTags(customTagRaw);
  const tagMap = Object.fromEntries(allTags.map(t => [t.id, t]));

  // Fetch watchlists list
  const fetchWatchlists = useCallback(async () => {
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

  // Fetch stocks from the Mongoose backend and merge with live Yahoo Finance quotes
  const fetchStocksFromAPI = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setApiFailed(false);

      // 1. Try to fetch stocks from Express backend API
      let backendStocks: BackendStock[] = [];
      try {
        const backendRes = await fetch(`${BACKEND_API_URL}/stocks?watchlist=${encodeURIComponent(selectedWatchlist)}`);
        if (!backendRes.ok) throw new Error();
        backendStocks = await backendRes.json();
      } catch (err) {
        console.warn("Express backend failed - falling back to default stocks list", err);
        setApiFailed(true);
        // Clear local storage on API failure as requested
        if (typeof window !== 'undefined') {
          localStorage.removeItem('vision_watchlist');
        }
        
        // Build mock stocks list from default symbols
        backendStocks = DEFAULT_SYMBOLS.map(symbol => ({
          symbol,
          name: symbol.split('.')[0] + ' Ltd.',
          isFavourite: false,
          tags: []
        }));
      }

      if (backendStocks.length === 0) {
        setStocks([]);
        setLoading(false);
        return;
      }

      const symbols = backendStocks.map(s => s.symbol);

      // 2. Fetch live metrics from Next.js Yahoo Finance API
      const liveRes = await fetch(`/api/watchlist?symbols=${encodeURIComponent(symbols.join(','))}`);
      if (!liveRes.ok) throw new Error('Live data fetch failed');
      const liveData = await liveRes.json();

      // 3. Merge Live Quote metrics with Backend details
      const mergedData = liveData.map((liveStock: LiveStock) => {
        const backendStock = backendStocks.find(
          (s: BackendStock) => s.symbol.toUpperCase() === liveStock.symbol.toUpperCase()
        );
        return {
          ...liveStock,
          name: backendStock ? backendStock.name : liveStock.name,
          isFavourite: backendStock ? !!backendStock.isFavourite : false,
          tags: backendStock ? (backendStock.tags || []) : []
        };
      });

      setStocks(mergedData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong while fetching watchlist');
    } finally {
      setLoading(false);
    }
  }, [selectedWatchlist]);

  // Fetch watchlists on mount
  useEffect(() => {
    fetchWatchlists();
  }, [fetchWatchlists]);

  // Fetch stocks on mount and schedule live updates every 60s
  useEffect(() => {
    Promise.resolve().then(() => {
      fetchStocksFromAPI();
    });
    const interval = setInterval(fetchStocksFromAPI, 60000);
    return () => clearInterval(interval);
  }, [fetchStocksFromAPI, selectedWatchlist]);

  // Load custom tags on mount
  useEffect(() => {
    fetch('/api/custom-tags')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length) setCustomTagRaw(data); })
      .catch(() => {});
  }, []);

  // Create watchlist
  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setWlError('');
    const cleanName = newWatchlistName.trim();
    if (!cleanName) return;

    try {
      setCreatingWatchlist(true);
      const res = await fetch(`${BACKEND_API_URL}/watchlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName })
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlists(prev => [...prev, data]);
        setSelectedWatchlist(data.name);
        setNewWatchlistName('');
        showToast(`Workspace "${data.name}" created successfully`, 'success');
      } else {
        const errData = await res.json();
        setWlError(errData.error || 'Failed to create watchlist');
        showToast(errData.error || 'Failed to create watchlist', 'error');
      }
    } catch {
      setWlError('Network error while creating watchlist');
    } finally {
      setCreatingWatchlist(false);
    }
  };

  // Delete watchlist
  const handleDeleteWatchlist = async (nameToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the watchlist "${nameToDelete}"? This will permanently delete all stocks inside it.`)) return;

    try {
      const res = await fetch(`${BACKEND_API_URL}/watchlists/${encodeURIComponent(nameToDelete)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setWatchlists(prev => prev.filter(w => w.name !== nameToDelete));
        if (selectedWatchlist === nameToDelete) {
          setSelectedWatchlist('default');
        }
        showToast(`Workspace "${nameToDelete}" deleted permanently`, 'info');
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to delete watchlist', 'error');
      }
    } catch {
      showToast('Network error while deleting watchlist', 'error');
    }
  };

  // Toggle Tag
  const handleToggleTag = async (sym: string, tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const stock = stocks.find(s => s.symbol === sym);
    if (!stock) return;
    const current = stock.tags ?? [];
    const next = current.includes(tagId) ? current.filter(t => t !== tagId) : [...current, tagId];
    
    // optimistic update
    setStocks(prev => prev.map(s => s.symbol === sym ? { ...s, tags: next } : s));
    
    if (!apiFailed) {
      try {
        await fetch(`${BACKEND_API_URL}/stocks/${encodeURIComponent(sym)}?watchlist=${encodeURIComponent(selectedWatchlist)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: next, watchlist: selectedWatchlist })
        });
      } catch {
        // revert on failure
        setStocks(prev => prev.map(s => s.symbol === sym ? { ...s, tags: current } : s));
      }
    }
  };

  // Edit custom tag
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
        showToast('Tag updated successfully', 'success');
      }
    } finally {
      setEditSaving(false);
      setEditingTag(null);
    }
  };

  const handleSort = (field: keyof StockData) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Add custom ticker dynamic action
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    const cleanSym = newSymbol.trim().toUpperCase();
    if (!cleanSym) return;

    // Check formatting, append .NS if not specified for Indian stocks by default
    const formattedSym = cleanSym.includes('.') ? cleanSym : `${cleanSym}.NS`;

    // Prevent duplicate entries
    if (stocks.some(s => s.symbol.toUpperCase() === formattedSym.toUpperCase())) {
      setAddError(`${cleanSym} is already in your watchlist.`);
      return;
    }

    try {
      setAddLoading(true);
      // 1. Validate symbol using Next.js live Yahoo Finance API
      const res = await fetch(`/api/watchlist?symbols=${formattedSym}`);
      if (!res.ok) throw new Error();
      const testData = await res.json();

      if (!testData || testData.length === 0) {
        setAddError(`Symbol ${cleanSym} not found. Please verify standard Yahoo Finance tickers.`);
        return;
      }

      const validatedStock = testData[0];

      // 2. Add to Mongoose backend API (if online)
      let dbStock = { symbol: validatedStock.symbol, name: validatedStock.name, isFavourite: false, tags: [], watchlist: selectedWatchlist };
      if (!apiFailed) {
        try {
          const backendPostRes = await fetch(`${BACKEND_API_URL}/stocks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              symbol: validatedStock.symbol,
              name: validatedStock.name,
              isFavourite: false,
              watchlist: selectedWatchlist
            })
          });
          if (backendPostRes.ok) {
            dbStock = await backendPostRes.json();
          } else {
            const errData = await backendPostRes.json();
            throw new Error(errData.error || 'Failed to add stock to backend database');
          }
        } catch (backendErr) {
          console.error('Backend save error:', backendErr);
          setAddError('Database save failed, operating locally');
        }
      }

      // Add to state list
      const nextStock: StockData = {
        ...validatedStock,
        name: dbStock.name,
        isFavourite: !!dbStock.isFavourite,
      tags: dbStock.tags || []
      };
      setStocks(prev => [nextStock, ...prev]);
      setNewSymbol('');
      showToast(`${cleanSym.toUpperCase()} added to active screener`, 'success');
    } catch {
      setAddError(`Failed to fetch validation stats for ${cleanSym}.`);
      showToast(`Ticker validation failed for ${cleanSym}`, 'error');
    } finally {
      setAddLoading(false);
    }
  };

  // Toggle Favourite Status
  const handleToggleFavourite = async (symbolToToggle: string, currentFavStatus: boolean) => {
    try {
      const nextFavStatus = !currentFavStatus;

      // 1. Optimistic UI update
      setStocks(prev => prev.map(s => {
        if (s.symbol.toUpperCase() === symbolToToggle.toUpperCase()) {
          return { ...s, isFavourite: nextFavStatus };
        }
        return s;
      }));

      // 2. Call backend if online
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
    } catch (err) {
      console.error('Toggle favorite error:', err);
      // Revert optimistic update on failure
      setStocks(prev => prev.map(s => {
        if (s.symbol.toUpperCase() === symbolToToggle.toUpperCase()) {
          return { ...s, isFavourite: currentFavStatus };
        }
        return s;
      }));
      showToast(err instanceof Error ? err.message : 'Failed to update favorite status', 'error');
    }
  };

  // Delete stock from active watchlist
  const handleDeleteStock = async (symToDelete: string) => {
    if (!confirm(`Are you sure you want to delete ${symToDelete.split('.')[0]} from the active watchlist?`)) return;

    try {
      // 1. Call backend if online
      if (!apiFailed) {
        const res = await fetch(`${BACKEND_API_URL}/stocks/${encodeURIComponent(symToDelete)}?watchlist=${encodeURIComponent(selectedWatchlist)}`, {
          method: 'DELETE'
        });
        if (!res.ok) {
          throw new Error('Failed to delete stock from database');
        }
      }

      // 2. Update local state
      setStocks(prev => prev.filter(s => s.symbol.toLowerCase() !== symToDelete.toLowerCase()));
      showToast(`${symToDelete.split('.')[0]} deleted from active workspace`, 'info');
    } catch (err) {
      console.error('Delete stock error:', err);
      showToast(err instanceof Error ? err.message : 'Failed to delete stock', 'error');
    }
  };

  // Reset active watchlist back to standard institutional defaults
  const handleResetWatchlist = async () => {
    if (!window.confirm(`Are you sure you want to restore the default institutional-grade stock watchlist for the current workspace?`)) return;

    try {
      setLoading(true);
      if (!apiFailed) {
        // Delete all current stocks in this specific watchlist
        await Promise.all(
          stocks.map(s =>
            fetch(`${BACKEND_API_URL}/stocks/${encodeURIComponent(s.symbol)}?watchlist=${encodeURIComponent(selectedWatchlist)}`, { method: 'DELETE' }).catch(() => {})
          )
        );

        // Add back the default institutional-grade seed list
        await Promise.all(
          DEFAULT_SEEDS.map(item =>
            fetch(`${BACKEND_API_URL}/stocks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ symbol: item.symbol, name: item.name, isFavourite: false, watchlist: selectedWatchlist })
            }).catch(() => {})
          )
        );
      }
      await fetchStocksFromAPI();
      showToast('Watchlist restored to institutional defaults', 'success');
    } catch (err) {
      console.error('Reset watchlist error:', err);
      showToast('Failed to restore default watchlist', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedStocks = stocks
    .filter(stock => {
      const matchesSearch = stock.symbol.toLowerCase().includes(search.toLowerCase()) || 
                           stock.name.toLowerCase().includes(search.toLowerCase());
      const matchesFav = showFavouritesOnly ? !!stock.isFavourite : true;
      const matchesTag = activeTagFilter === 'all' ? true : (stock.tags ?? []).includes(activeTagFilter);
      return matchesSearch && matchesFav && matchesTag;
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

  const renderHeader = (label: string, field: keyof StockData, numeric = true, sticky = false) => {
    const isActive = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)}
        className={`p-4 font-bold text-xs uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-blue-500 dark:hover:text-blue-400 transition-colors group ${
          numeric ? 'text-right' : 'text-left'
        } ${sticky ? 'sticky left-0 bg-slate-50 dark:bg-slate-800/80 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''}`}
      >
        <div className={`flex items-center gap-1 ${numeric ? 'justify-end' : 'justify-start'}`}>
          <span>{label}</span>
          {isActive ? (
            sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
          )}
        </div>
      </th>
    );
  };

  // CSV Export utility
  const handleExportCSV = () => {
    if (stocks.length === 0) return;
    const headers = ["Ticker", "Company Name", "Price (INR)", "Change (%)", "Market Cap (Cr)", "P/E", "ROE (%)", "Debt-to-Equity"];
    const rows = filteredAndSortedStocks.map(s => [
      s.symbol.replace('.NS', ''),
      s.name,
      s.price.toFixed(2),
      s.changePercent.toFixed(2),
      (s.marketCap / 10000000).toFixed(2),
      s.pe > 0 ? s.pe.toFixed(2) : 'N/A',
      s.profitGrowth.toFixed(2),
      (s.cmpBv).toFixed(2)
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vision_${selectedWatchlist}_screener.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans pb-20" onClick={() => setTagPopoverSym(null)}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 max-w-[1600px] mx-auto">
        
        {/* Page title and description */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StockIcon className="w-6 h-6 text-blue-500 animate-pulse" />
              <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Active Stock Research Cockpit</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Institutional Screener
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xl font-medium leading-relaxed">
              Build and curate your own portfolio workspace in real-time. Dynamic search, live ticker validators, persistent backend watchlist reloads, and tabular CSV exports.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <button 
              onClick={handleExportCSV}
              disabled={stocks.length === 0}
              className="flex-1 md:flex-initial px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-2xl text-xs font-bold transition-all shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]"
            >
              Export Screener to CSV
            </button>
            <button 
              onClick={handleResetWatchlist}
              className="flex-1 md:flex-initial px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-850 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all active:scale-[0.98]"
            >
              Reset Default Portfolio
            </button>
          </div>
        </div>

        {/* Watchlist Manager Panel */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 mb-8 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <label className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest mb-1.5 block">Select Portfolio Watchlist Workspace</label>
              <div className="flex flex-wrap gap-2">
                {watchlists.map(wl => {
                  const active = selectedWatchlist === wl.name;
                  return (
                    <div 
                      key={wl.name} 
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border select-none cursor-pointer ${
                        active
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-650 dark:text-blue-400 font-black shadow-sm'
                          : 'bg-transparent border-slate-200 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700'
                      }`}
                      onClick={() => { setSelectedWatchlist(wl.name); setActiveTagFilter('all'); }}
                    >
                      <span>{wl.name === 'default' ? '🏛️ Institutional Screener' : `📁 ${wl.name}`}</span>
                      {!wl.isDefault && wl.name !== 'default' && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteWatchlist(wl.name, e)}
                          className="p-0.5 rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors shrink-0 ml-1.5"
                          title={`Delete "${wl.name}" Watchlist`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Create Watchlist Form */}
            <form onSubmit={handleCreateWatchlist} className="w-full lg:w-auto shrink-0 flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  maxLength={32}
                  placeholder="New workspace name..."
                  value={newWatchlistName}
                  onChange={(e) => { setNewWatchlistName(e.target.value); setWlError(''); }}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs font-bold text-slate-850 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-655 focus:outline-none focus:border-blue-500"
                />
                {wlError && (
                  <span className="absolute left-1 top-full mt-1 text-[10px] text-red-500 font-bold">{wlError}</span>
                )}
              </div>
              <button
                type="submit"
                disabled={creatingWatchlist || !newWatchlistName.trim()}
                className="px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-[0.98] shrink-0"
              >
                {creatingWatchlist ? 'Creating...' : '+ Create Workspace'}
              </button>
            </form>
          </div>
        </div>

        {/* Dynamic add search dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick search filter */}
          <div className="lg:col-span-2 relative bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-center">
            <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">Quick Filter Watchlist</label>
            <div className="relative">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filter currently active symbols or company names..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-slate-850 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Inline stock validator symbol form */}
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
            <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">Add New Stock Ticker</label>
            <form onSubmit={handleAddStock} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="e.g. TCS, HDFCBANK, INFY"
                  value={newSymbol}
                  onChange={(e) => {
                    setNewSymbol(e.target.value);
                    setAddError('');
                  }}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-bold uppercase text-slate-850 dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                disabled={addLoading || !newSymbol.trim()}
                className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white rounded-2xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-1 min-w-[70px] active:scale-[0.95]"
              >
                {addLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Add</>}
              </button>
            </form>

            {addError && (
              <div className="mt-3 flex items-start gap-1.5 text-xs text-red-500 font-semibold leading-relaxed">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{addError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Watchlist Mode Tabs & Tag Filters Grid */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
          <div className="flex gap-2 p-1 bg-slate-200/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full md:w-auto max-w-md">
            <button
              type="button"
              onClick={() => { setShowFavouritesOnly(false); setActiveTagFilter('all'); }}
              className={`flex-1 md:flex-initial px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                !showFavouritesOnly && activeTagFilter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-blue-500 dark:text-blue-400 shadow-md border border-slate-200/20'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All Watchlist ({stocks.length})
            </button>
            <button
              type="button"
              onClick={() => { setShowFavouritesOnly(true); setActiveTagFilter('all'); }}
              className={`flex-1 md:flex-initial px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                showFavouritesOnly && activeTagFilter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-yellow-500 shadow-md border border-slate-200/20'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              ★ Starred Favorites ({stocks.filter(s => s.isFavourite).length})
            </button>
          </div>
        </div>

        {/* Real-time Sector & Strategy Tag Filter Strip */}
        <div className="mb-8 p-6 bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-3">Filter Institutional Sectors & Strategy Tags</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => { setActiveTagFilter('all'); setShowFavouritesOnly(false); }}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all ${
                activeTagFilter === 'all' && !showFavouritesOnly
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white border-slate-350 dark:border-slate-600 shadow-sm'
                  : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-850 hover:border-slate-400 dark:hover:border-slate-600'
              }`}
            >
              All Symbols ({stocks.length})
            </button>
            {allTags.map((tag: TagDef) => {
              const count = stocks.filter(s => (s.tags ?? []).includes(tag.id)).length;
              if (count === 0 && activeTagFilter !== tag.id) return null;
              const isCustom = CUSTOM_TAG_IDS.includes(tag.id as typeof CUSTOM_TAG_IDS[number]);
              const raw = isCustom ? customTagRaw.find(t => t.tagId === tag.id) : null;
              return (
                <div key={tag.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => { setActiveTagFilter(activeTagFilter === tag.id ? 'all' : tag.id); setShowFavouritesOnly(false); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all ${
                      activeTagFilter === tag.id ? 'opacity-100 shadow-md' : 'opacity-60 hover:opacity-90'
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
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 mr-1.5 inline-block" style={{ backgroundColor: tag.dot }} />
                    {tag.label} {count > 0 && `(${count})`}
                  </button>
                  {isCustom && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); const r = customTagRaw.find(t => t.tagId === tag.id)!; setEditingTag(r); setEditLabel(r.label); setEditColor(r.color); }}
                      className="text-slate-400 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-350 transition-colors text-xs"
                      title="Edit tag name & color"
                    >✎</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Edit Custom Tag Dialog Modal */}
        {editingTag && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setEditingTag(null)}>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white mb-1">Edit Custom Tag</h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4">Rename and recolor <span style={{ color: editColor }} className="font-extrabold">{editingTag.tagId}</span></p>
              <div className="flex flex-col gap-3">
                <input
                  autoFocus
                  type="text"
                  maxLength={24}
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  placeholder="Tag name…"
                  className="w-full px-4 py-2.5 bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none"
                />
                <div className="flex items-center gap-3">
                  <label className="text-[10px] text-slate-400 dark:text-slate-500 font-bold shrink-0">Color</label>
                  <input
                    type="color"
                    value={editColor}
                    onChange={e => setEditColor(e.target.value)}
                    className="w-10 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-slate-450 dark:text-slate-500">{editColor}</span>
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
                    className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-xl text-xs font-extrabold transition-all"
                  >
                    {editSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTag(null)}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {apiFailed && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-extrabold rounded-2xl flex items-center justify-between animate-pulse max-w-md">
            <span>⚠️ MongoDB Database API Offline</span>
            <span className="text-[10px] bg-red-500/25 px-2 py-0.5 rounded-full uppercase">Local Mode</span>
          </div>
        )}

        {/* Live table list */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          {loading && stocks.length === 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-400">Ticker Symbol</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-400">Company Name</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-400 text-right">Price (INR)</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-400 text-right">Change (%)</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-400 text-right">Mkt Cap (Cr)</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-400 text-right">P/E</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-400 text-right">EPS</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-400 text-right">CMP/BV</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-400 text-right">Div Yield</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-400 text-right">Promoter</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-400 text-right">Profit Gr.</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-400 text-right">Sales Gr.</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-400 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                  {[...Array(6)].map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-850 rounded-md w-16" /></td>
                      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-850 rounded-md w-48 mb-1" /><div className="h-3 bg-slate-100 dark:bg-slate-900 rounded-md w-32" /></td>
                      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-850 rounded-md w-12 ml-auto" /></td>
                      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-850 rounded-md w-10 ml-auto" /></td>
                      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-850 rounded-md w-20 ml-auto" /></td>
                      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-850 rounded-md w-8 ml-auto" /></td>
                      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-850 rounded-md w-8 ml-auto" /></td>
                      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-850 rounded-md w-10 ml-auto" /></td>
                      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-850 rounded-md w-8 ml-auto" /></td>
                      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-850 rounded-md w-12 ml-auto" /></td>
                      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-850 rounded-md w-12 ml-auto" /></td>
                      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-850 rounded-md w-12 ml-auto" /></td>
                      <td className="p-4 text-center"><div className="h-6 bg-slate-200 dark:bg-slate-850 rounded-md w-16 mx-auto" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : error && stocks.length === 0 ? (
            <div className="p-20 text-center text-red-500 font-semibold">{error}</div>
          ) : filteredAndSortedStocks.length === 0 ? (
            <div className="p-20 text-center text-slate-500 font-semibold">
              {showFavouritesOnly 
                ? "No starred favorite stocks found. Star your key tickers to filter them here!"
                : "No matching stocks found with active criteria. Star your key tickers or manage tag categories above."
              }
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                    {renderHeader("Ticker Symbol", "symbol", false, true)}
                    {renderHeader("Company Name & Tags", "name", false)}
                    {renderHeader("Price (INR)", "price")}
                    {renderHeader("Change (%)", "changePercent")}
                    {renderHeader("Mkt Cap (Cr)", "marketCap")}
                    {renderHeader("P/E Ratio", "pe")}
                    {renderHeader("EPS (12M)", "eps")}
                    {renderHeader("CMP/BV", "cmpBv")}
                    {renderHeader("Div Yield (%)", "divYield")}
                    {renderHeader("Promoter (%)", "promHold")}
                    {renderHeader("Profit Gr. (%)", "profitGrowth")}
                    {renderHeader("Sales Gr. (%)", "salesGrowth")}
                    <th className="p-4 text-center font-bold text-xs uppercase tracking-wider text-slate-500 select-none">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-sm font-sans">
                  {filteredAndSortedStocks.map((stock, idx) => {
                    const isPositive = stock.change >= 0;
                    return (
                      <tr 
                        key={idx} 
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group"
                      >
                        {/* Ticker link to detailed cockpit with favorite toggle and tag manager */}
                        <td className="p-4 font-bold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-850/60 z-10 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          <div className="flex items-center gap-2">
                            {/* Star Favourite button */}
                            <button
                              type="button"
                              onClick={() => handleToggleFavourite(stock.symbol, !!stock.isFavourite)}
                              className={`p-1 rounded-lg transition-all hover:scale-115 shrink-0 ${
                                stock.isFavourite
                                  ? 'text-yellow-450 hover:text-yellow-500'
                                  : 'text-slate-355 dark:text-slate-700 hover:text-slate-500'
                              }`}
                              title={stock.isFavourite ? "Remove from Favourites" : "Mark as Favourite"}
                            >
                              <Star className={`w-4 h-4 ${stock.isFavourite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                            </button>

                            {/* Tags Popover Trigger */}
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); setTagPopoverSym(tagPopoverSym === stock.symbol ? null : stock.symbol); }}
                                className={`p-1 rounded-lg border transition-all hover:scale-105 flex items-center justify-center ${
                                  (stock.tags ?? []).length > 0
                                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-550 dark:text-blue-400'
                                    : 'bg-white dark:bg-slate-850 border-slate-205 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10'
                                }`}
                                title="Manage Tags"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>

                              {/* Tag popover dropdown */}
                              {tagPopoverSym === stock.symbol && (
                                <div
                                  className="absolute left-0 top-8 z-50 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 animate-fade-in"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-2 px-1">Assign Tags</p>
                                  <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto scrollbar-thin">
                                    {allTags.map((tag: TagDef) => {
                                      const isActive = (stock.tags ?? []).includes(tag.id);
                                      return tag.custom ? (
                                        <button
                                          key={tag.id}
                                          type="button"
                                          onClick={e => handleToggleTag(stock.symbol, tag.id, e)}
                                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold transition-all text-left ${
                                            isActive ? 'border shadow-sm' : 'text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800'
                                          }`}
                                          style={isActive ? { backgroundColor: tag.dot + '20', color: tag.dot, borderColor: tag.dot + '50' } : {}}
                                        >
                                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isActive ? tag.dot : '#64748b' }} />
                                          {tag.label}
                                          {isActive && <span className="ml-auto text-xs text-blue-500">✓</span>}
                                        </button>
                                      ) : (
                                        <button
                                          key={tag.id}
                                          type="button"
                                          onClick={e => handleToggleTag(stock.symbol, tag.id, e)}
                                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold transition-all text-left ${
                                            isActive ? tag.color + ' border shadow-sm' : 'text-slate-655 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                          }`}
                                        >
                                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isActive ? tag.dot : '#64748b' }} />
                                          {tag.label}
                                          {isActive && <span className="ml-auto text-xs">✓</span>}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Ticker Link */}
                            <span 
                              onClick={() => router.push(`/watchlist/${encodeURIComponent(stock.symbol)}`)}
                              className="text-slate-950 dark:text-slate-100 hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer underline ml-1"
                            >
                              {stock.symbol.replace('.NS', '')}
                            </span>
                          </div>
                        </td>

                        {/* Company Name & Tag badging */}
                        <td className="p-4 font-medium text-slate-500 dark:text-slate-400">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-slate-700 dark:text-slate-350">{stock.name}</span>
                            {/* Assigned tag pills */}
                            {(stock.tags ?? []).length > 0 && (
                              <div className="flex flex-wrap gap-1 max-w-xs sm:max-w-sm">
                                {(stock.tags ?? []).map(tid => {
                                  const td = tagMap[tid];
                                  if (!td) return null;
                                  return td.custom ? (
                                    <span key={tid} className="px-2 py-0.5 rounded-full text-[9px] font-extrabold border shrink-0 transition-all hover:scale-102"
                                      style={{ backgroundColor: td.dot + '25', color: td.dot, borderColor: td.dot + '60' }}>
                                      {td.label}
                                    </span>
                                  ) : (
                                    <span key={tid} className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border shrink-0 transition-all hover:scale-102 ${td.color}`}>
                                      {td.label}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="p-4 text-right font-bold text-slate-900 dark:text-slate-100">₹{stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className={`p-4 text-right font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                          <span className="flex items-center justify-end gap-1">
                            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            <span>{isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                          </span>
                        </td>
                        <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-300">₹{(stock.marketCap / 10000000).toFixed(2)}Cr</td>
                        <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-300">{stock.pe > 0 ? stock.pe.toFixed(2) : '--'}</td>
                        <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-300">₹{stock.eps > 0 ? stock.eps.toFixed(2) : '--'}</td>
                        <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-300">{stock.cmpBv > 0 ? stock.cmpBv.toFixed(2) : '--'}</td>
                        <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-300">{stock.divYield > 0 ? `${stock.divYield.toFixed(2)}%` : '0.00%'}</td>
                        <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-300">{stock.promHold > 0 ? `${stock.promHold.toFixed(2)}%` : '--'}</td>
                        <td className={`p-4 text-right font-semibold ${stock.profitGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {stock.profitGrowth !== 0 ? `${stock.profitGrowth.toFixed(2)}%` : '--'}
                        </td>
                        <td className={`p-4 text-right font-semibold ${stock.salesGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {stock.salesGrowth !== 0 ? `${stock.salesGrowth.toFixed(2)}%` : '--'}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteStock(stock.symbol)}
                            className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-xl transition-all active:scale-[0.90]"
                            title={`Remove ${stock.symbol.replace('.NS', '')} from watchlist`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Dynamic Disclaimer Banner */}
        <div className="mt-8 flex items-start gap-3 p-4 bg-blue-500/5 dark:bg-blue-500/10 rounded-2xl border border-blue-500/20 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-blue-600 dark:text-blue-400">Stock Market Disclaimer:</span> Investment in securities market are subject to market risks, read all the related documents carefully before investing. Fundamental ratio analysis and technical indicators presented on this cockpit are fetched dynamically from active database corporate filings and standard market quote tickers in real-time. Past performance is not indicative of future investment returns.
          </div>
        </div>

      </div>
      
      {/* Floating dynamic glassmorphic toast notification */}
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
