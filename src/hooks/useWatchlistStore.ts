"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { getBackendApiUrl } from '@/lib/backend-config';
import { DEFAULT_SEEDS, type SeedStock } from '@/utils/symbols';

/* ── Types ──────────────────────────────────────────────── */
export interface StockQuote {
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

export interface BackendStock {
  symbol: string;
  name: string;
  isFavourite?: boolean;
  tags?: string[];
  _id?: string;
}

export interface LiveStock {
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

export interface WatchlistItem {
  name: string;
  isDefault: boolean;
  _id?: string;
}

export interface SearchSuggestion {
  symbol: string;
  name: string;
  exchange: string;
}

export type WatchlistSortOption =
  | 'default'
  | 'nameAsc'
  | 'nameDesc'
  | 'priceDesc'
  | 'priceAsc'
  | 'changePctDesc'
  | 'changePctAsc'
  | 'changeAbsDesc'
  | 'changeAbsAsc';

export type ToastType = 'success' | 'error' | 'info';
export interface Toast { message: string; type: ToastType; }

/* ── Helper ─────────────────────────────────────────────── */
function getApiUrl() { return getBackendApiUrl(); }

const getHeaders = (withJson = true) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return {
    ...(withJson ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

/* ── Hook ───────────────────────────────────────────────── */
export function useWatchlistStore() {
  /* — Core state — */
  const [watchlists, setWatchlists] = useState<WatchlistItem[]>([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState<string>('default');
  const [watchlistStocks, setWatchlistStocks] = useState<StockQuote[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [apiFailed, setApiFailed] = useState(false);

  /* — Search / filter — */
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTagFilter, setActiveTagFilter] = useState<string>('all');
  const [watchlistSort, setWatchlistSort] = useState<WatchlistSortOption>('default');

  /* — Toast — */
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  /* — Watchlist CRUD — */
  const fetchWatchlists = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/watchlists`, {
        headers: getHeaders(false)
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlists(data);
      }
    } catch {
      console.error('Failed to fetch watchlists');
    }
  }, []);

  const createWatchlist = useCallback(async (name: string): Promise<{ ok: boolean; error?: string }> => {
    const clean = name.trim();
    if (!clean) return { ok: false, error: 'Watchlist name is required' };
    try {
      const res = await fetch(`${getApiUrl()}/watchlists`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ name: clean })
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlists(prev => [...prev, data]);
        setSelectedWatchlist(data.name);
        showToast(`Watchlist "${data.name}" created`, 'success');
        return { ok: true };
      }
      const err = await res.json().catch(() => null);
      return { ok: false, error: err?.error || 'Failed to create watchlist' };
    } catch {
      return { ok: false, error: 'Network error' };
    }
  }, [showToast]);

  const renameWatchlist = useCallback(async (oldName: string, newName: string): Promise<{ ok: boolean; error?: string }> => {
    const clean = newName.trim();
    if (!clean) return { ok: false, error: 'Watchlist name is required' };
    try {
      const res = await fetch(`${getApiUrl()}/watchlists/${encodeURIComponent(oldName)}`, {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify({ name: clean })
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlists(prev => prev.map(w => w.name === oldName ? { ...w, name: data.name } : w));
        if (selectedWatchlist === oldName) setSelectedWatchlist(data.name);
        showToast(`Watchlist renamed to "${data.name}"`, 'success');
        return { ok: true };
      }
      const err = await res.json().catch(() => null);
      return { ok: false, error: err?.error || 'Failed to rename watchlist' };
    } catch {
      return { ok: false, error: 'Network error' };
    }
  }, [selectedWatchlist, showToast]);

  const deleteWatchlist = useCallback(async (name: string): Promise<boolean> => {
    try {
      const res = await fetch(`${getApiUrl()}/watchlists/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: getHeaders(false)
      });
      if (res.ok) {
        setWatchlists(prev => prev.filter(w => w.name !== name));
        if (selectedWatchlist === name) setSelectedWatchlist('default');
        showToast(`Watchlist "${name}" deleted`, 'info');
        return true;
      }
    } catch {}
    return false;
  }, [selectedWatchlist, showToast]);

  /* — Stock loading — */
  const loadStocks = useCallback(async (wlName: string) => {
    let active = true;
    try {
      setWatchlistLoading(true);
      setApiFailed(false);

      const backendRes = await fetch(`${getApiUrl()}/stocks?watchlist=${encodeURIComponent(wlName)}`, {
        headers: getHeaders(false)
      });
      if (!backendRes.ok) throw new Error();
      const backendStocks = (await backendRes.json()) as BackendStock[];
      const symbols = backendStocks.map(s => s.symbol);

      if (symbols.length === 0) {
        if (active) { setWatchlistStocks([]); setWatchlistLoading(false); }
        return;
      }

      // Fetch live data for first 30 symbols (for immediate display)
      const firstBatch = symbols.slice(0, 30);
      const liveRes = await fetch(`/api/watchlist?symbols=${encodeURIComponent(firstBatch.join(','))}`);

      if (active) {
        let liveData: LiveStock[] = [];
        if (liveRes.ok) liveData = await liveRes.json();

        const merged: StockQuote[] = backendStocks.map(bs => {
          const live = liveData.find(l => l.symbol.toUpperCase() === bs.symbol.toUpperCase());
          return {
            symbol: bs.symbol,
            name: bs.name,
            price: live?.price ?? 0,
            change: live?.change ?? 0,
            changePercent: live?.changePercent ?? 0,
            marketCap: live?.marketCap ?? 0,
            volume: live?.volume ?? 0,
            pe: live?.pe ?? 0,
            eps: live?.eps ?? 0,
            cmpBv: live?.cmpBv ?? 0,
            divYield: live?.divYield ?? 0,
            promHold: live?.promHold ?? 0,
            profitGrowth: live?.profitGrowth ?? 0,
            salesGrowth: live?.salesGrowth ?? 0,
            isFavourite: !!bs.isFavourite,
            tags: bs.tags ?? [],
            _id: bs._id
          };
        });
        setWatchlistStocks(merged);
      }
    } catch {
      setApiFailed(true);
      // Fallback to seed stocks
      const seedStocks: StockQuote[] = DEFAULT_SEEDS.map(s => ({
        symbol: s.symbol, name: s.name,
        price: 0, change: 0, changePercent: 0, marketCap: 0, volume: 0,
        pe: 0, eps: 0, cmpBv: 0, divYield: 0, promHold: 0, profitGrowth: 0, salesGrowth: 0,
        isFavourite: false, tags: []
      }));
      setWatchlistStocks(seedStocks);
    } finally {
      if (active) setWatchlistLoading(false);
    }
    return () => { active = false; };
  }, []);

  /* — Add stock — */
  const addStock = useCallback(async (sym: string): Promise<{ ok: boolean; error?: string }> => {
    // Duplicate check
    if (watchlistStocks.some(s => s.symbol.toUpperCase() === sym.toUpperCase())) {
      return { ok: false, error: 'Stock already exists in this watchlist' };
    }
    try {
      // Fetch live data
      const res = await fetch(`/api/watchlist?symbols=${encodeURIComponent(sym)}`);
      if (!res.ok) return { ok: false, error: 'Ticker not found' };
      const data = await res.json();
      if (!data?.length) return { ok: false, error: 'No quote returned for this ticker' };
      const stock = data[0];

      let savedStock: StockQuote = { ...stock, isFavourite: false, tags: [] as string[] };

      if (!apiFailed) {
        try {
          const backendRes = await fetch(`${getApiUrl()}/stocks`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify({ symbol: stock.symbol, name: stock.name, isFavourite: false, watchlist: selectedWatchlist })
          });
          if (backendRes.ok) {
            const dbStock = await backendRes.json();
            savedStock = { ...stock, name: dbStock.name, isFavourite: !!dbStock.isFavourite, tags: dbStock.tags ?? [], _id: dbStock._id };
          } else if (backendRes.status === 409) {
            return { ok: false, error: 'Stock already exists in this watchlist' };
          }
        } catch {}
      }

      setWatchlistStocks(prev => [savedStock, ...prev]);
      showToast(`${sym.split('.')[0]} added to watchlist`, 'success');
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Failed to add stock' };
    }
  }, [watchlistStocks, apiFailed, selectedWatchlist, showToast]);

  /* — Remove stock — */
  const removeStock = useCallback(async (symbol: string): Promise<boolean> => {
    try {
      if (!apiFailed) {
        const res = await fetch(`${getApiUrl()}/stocks/${encodeURIComponent(symbol)}?watchlist=${encodeURIComponent(selectedWatchlist)}`, {
          method: 'DELETE',
          headers: getHeaders(false)
        });
        if (!res.ok) throw new Error();
      }
      setWatchlistStocks(prev => prev.filter(s => s.symbol.toUpperCase() !== symbol.toUpperCase()));
      showToast(`${symbol.split('.')[0]} removed from watchlist`, 'info');
      return true;
    } catch {
      showToast('Failed to delete stock', 'error');
      return false;
    }
  }, [apiFailed, selectedWatchlist, showToast]);

  /* — Toggle favourite — */
  const toggleFavourite = useCallback(async (symbol: string, currentFav: boolean) => {
    const nextFav = !currentFav;
    // Optimistic update
    setWatchlistStocks(prev => prev.map(s =>
      s.symbol.toUpperCase() === symbol.toUpperCase() ? { ...s, isFavourite: nextFav } : s
    ));
    if (!apiFailed) {
      try {
        await fetch(`${getApiUrl()}/stocks/${encodeURIComponent(symbol)}?watchlist=${encodeURIComponent(selectedWatchlist)}`, {
          method: 'PATCH',
          headers: getHeaders(true),
          body: JSON.stringify({ isFavourite: nextFav, watchlist: selectedWatchlist })
        });
      } catch {
        // Revert
        setWatchlistStocks(prev => prev.map(s =>
          s.symbol.toUpperCase() === symbol.toUpperCase() ? { ...s, isFavourite: currentFav } : s
        ));
        showToast('Failed to update favourite', 'error');
      }
    }
  }, [apiFailed, selectedWatchlist, showToast]);

  /* — Toggle tag — */
  const toggleTag = useCallback(async (symbol: string, tagId: string) => {
    const stock = watchlistStocks.find(s => s.symbol === symbol);
    if (!stock) return;
    const currentTags = stock.tags ?? [];
    const nextTags = currentTags.includes(tagId)
      ? currentTags.filter(t => t !== tagId)
      : [...currentTags, tagId];

    // Optimistic update
    setWatchlistStocks(prev => prev.map(s => s.symbol === symbol ? { ...s, tags: nextTags } : s));
    if (!apiFailed) {
      try {
        await fetch(`${getApiUrl()}/stocks/${encodeURIComponent(symbol)}?watchlist=${encodeURIComponent(selectedWatchlist)}`, {
          method: 'PATCH',
          headers: getHeaders(true),
          body: JSON.stringify({ tags: nextTags, watchlist: selectedWatchlist })
        });
      } catch {
        // Revert
        setWatchlistStocks(prev => prev.map(s => s.symbol === symbol ? { ...s, tags: currentTags } : s));
      }
    }
  }, [watchlistStocks, apiFailed, selectedWatchlist]);

  /* — Filtered + Sorted list (memoized) — */
  const filteredWatchlist = useMemo(() => {
    const q = searchQuery.toLowerCase();
    let filtered = watchlistStocks.filter(s => {
      const matchesSearch = !q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
      const matchesTag = activeTagFilter === 'all' ? true : (s.tags ?? []).includes(activeTagFilter);
      return matchesSearch && matchesTag;
    });

    if (watchlistSort !== 'default') {
      filtered = [...filtered].sort((a, b) => {
        switch (watchlistSort) {
          case 'nameAsc': return a.name.localeCompare(b.name);
          case 'nameDesc': return b.name.localeCompare(a.name);
          case 'priceDesc': return (b.price || 0) - (a.price || 0);
          case 'priceAsc': return (a.price || 0) - (b.price || 0);
          case 'changePctDesc': return (b.changePercent || 0) - (a.changePercent || 0);
          case 'changePctAsc': return (a.changePercent || 0) - (b.changePercent || 0);
          case 'changeAbsDesc': return (b.change || 0) - (a.change || 0);
          case 'changeAbsAsc': return (a.change || 0) - (b.change || 0);
          default: return 0;
        }
      });
    }
    return filtered;
  }, [watchlistStocks, searchQuery, activeTagFilter, watchlistSort]);

  /* — Auto-load watchlists and stocks — */
  useEffect(() => { fetchWatchlists(); }, [fetchWatchlists]);
  useEffect(() => { loadStocks(selectedWatchlist); }, [selectedWatchlist, loadStocks]);

  /* — Live price updater (for WebSocket integration) — */
  const updateLivePrice = useCallback((symbol: string, price: number, change: number, changePercent: number) => {
    setLivePrices(prev => ({ ...prev, [symbol]: price }));
    setWatchlistStocks(prev => prev.map(s => {
      if (s.symbol === symbol) return { ...s, price, change, changePercent };
      return s;
    }));
  }, []);

  /* — Search suggestions (debounced) — */
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback((query: string) => {
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    if (!query.trim() || query.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    setSuggestLoading(true);
    suggestTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 300);
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
  }, []);

  return {
    // State
    watchlists,
    selectedWatchlist,
    setSelectedWatchlist,
    watchlistStocks,
    setWatchlistStocks,
    livePrices,
    watchlistLoading,
    apiFailed,
    searchQuery,
    setSearchQuery,
    activeTagFilter,
    setActiveTagFilter,
    watchlistSort,
    setWatchlistSort,
    toast,
    setToast,
    filteredWatchlist,

    // Suggestions
    suggestions,
    suggestLoading,
    fetchSuggestions,
    clearSuggestions,

    // Actions
    showToast,
    fetchWatchlists,
    createWatchlist,
    renameWatchlist,
    deleteWatchlist,
    loadStocks,
    addStock,
    removeStock,
    toggleFavourite,
    toggleTag,
    updateLivePrice,
  };
}
