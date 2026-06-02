"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Search, Layers, Plus, Trash2, Star, TrendingUp, TrendingDown, RefreshCw, ChevronDown, X, Check, Pencil, Download, Upload, Copy, Sparkles
} from 'lucide-react';
import VirtualStockList from '@/components/watchlist/VirtualStockList';
import AddStockModal from '@/components/watchlist/AddStockModal';
import { TagPopover, TagFilterBar } from '@/components/watchlist/TagManager';
import { buildAllTags, DEFAULT_CUSTOM_TAGS, type CustomTagRaw } from '@/utils/tags';
import type { StockQuote, WatchlistSortOption } from '@/hooks/useWatchlistStore';
import { getBackendApiUrl } from '@/lib/backend-config';

/* ── Props ──────────────────────────────────────────────── */

export interface WatchlistSidebarProps {
  watchlists: Array<{ name: string; isDefault: boolean; _id?: string }>;
  selectedWatchlist: string;
  onSelectWatchlist: (name: string) => void;
  onCreateWatchlist: (name: string) => Promise<{ ok: boolean; error?: string }>;
  onRenameWatchlist: (oldName: string, newName: string) => Promise<{ ok: boolean; error?: string }>;
  onDeleteWatchlist: (name: string) => Promise<boolean>;

  watchlistStocks: StockQuote[];
  filteredWatchlist: StockQuote[];
  watchlistLoading: boolean;
  livePrices: Record<string, number>;

  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeTagFilter: string;
  onSetTagFilter: (tagId: string) => void;
  watchlistSort: WatchlistSortOption;
  onSortChange: (sort: WatchlistSortOption) => void;

  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;

  onAddStock: (symbol: string) => Promise<{ ok: boolean; error?: string }>;
  onRemoveStock: (symbol: string) => Promise<boolean>;
  onToggleTag: (symbol: string, tagId: string) => void;

  suggestions: Array<{ symbol: string; name: string; exchange: string }>;
  suggestLoading: boolean;
  onFetchSuggestions: (q: string) => void;
  onClearSuggestions: () => void;

  customTagRaw?: CustomTagRaw[];
  onEditCustomTag?: (tag: CustomTagRaw) => void;

  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
  onMobileSwitchToChart?: () => void;
}

/* ── Row height ─────────────────────────────────────────── */
const STOCK_ROW_HEIGHT = 60;

/* ── Component ──────────────────────────────────────────── */

export default function WatchlistSidebar({
  watchlists,
  selectedWatchlist,
  onSelectWatchlist,
  onCreateWatchlist,
  onRenameWatchlist,
  onDeleteWatchlist,
  watchlistStocks,
  filteredWatchlist,
  watchlistLoading,
  livePrices,
  searchQuery,
  onSearchChange,
  activeTagFilter,
  onSetTagFilter,
  watchlistSort,
  onSortChange,
  selectedSymbol,
  onSelectSymbol,
  onAddStock,
  onRemoveStock,
  onToggleTag,
  suggestions,
  suggestLoading,
  onFetchSuggestions,
  onClearSuggestions,
  customTagRaw = DEFAULT_CUSTOM_TAGS,
  onEditCustomTag,
  showToast,
  onMobileSwitchToChart,
}: WatchlistSidebarProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [tagPopoverSym, setTagPopoverSym] = useState<string | null>(null);
  const [showWlDropdown, setShowWlDropdown] = useState(false);

  // States
  const [analyticsData, setAnalyticsData] = useState<{ dailyReturn: number; topGainer: any; topLoser: any } | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [smartFilter, setSmartFilter] = useState<'all' | 'high_volume' | 'breakout' | 'momentum'>('all');
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    setLimit(10);
  }, [selectedWatchlist, searchQuery, smartFilter, activeTagFilter]);

  const fetchAnalytics = useCallback(async () => {
    if (!selectedWatchlist) return;
    try {
      setLoadingAnalytics(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch(`${getBackendApiUrl()}/watchlists/${encodeURIComponent(selectedWatchlist)}/analytics`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [selectedWatchlist]);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedWatchlist, fetchAnalytics]);

  const allTags = buildAllTags(customTagRaw);
  const tagMap = Object.fromEntries(allTags.map(t => [t.id, t]));
  const existingSymbols = useMemo(() => watchlistStocks.map(s => s.symbol), [watchlistStocks]);

  // Smart Watchlist Filter Evaluator
  const processedSmartWatchlist = useMemo(() => {
    return filteredWatchlist.filter(s => {
      if (smartFilter === 'all') return true;
      if (smartFilter === 'high_volume') return s.volume >= 2000000 || s.volume === 0;
      if (smartFilter === 'breakout') return Math.abs(s.changePercent) >= 3.0;
      if (smartFilter === 'momentum') return s.changePercent >= 1.5;
      return true;
    });
  }, [filteredWatchlist, smartFilter]);

  const handleDeleteStock = useCallback(async (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Remove ${symbol.split('.')[0]} from this watchlist?`)) return;
    await onRemoveStock(symbol);
  }, [onRemoveStock]);

  const handleAddStock = useCallback(async (sym: string) => {
    return onAddStock(sym);
  }, [onAddStock]);

  const handleExportCSV = () => {
    if (watchlistStocks.length === 0) {
      if (showToast) showToast('No stocks to export', 'info');
      return;
    }
    const csvRows = [
      ['Symbol', 'Name', 'Tags'],
      ...watchlistStocks.map(stock => [
        stock.symbol,
        stock.name.replace(/,/g, ' '),
        (stock.tags || []).join(';')
      ])
    ];
    const csvContent = "data:text/csv;charset=utf-8," 
      + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `watchlist_${selectedWatchlist.toLowerCase()}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast('Watchlist exported successfully!', 'success');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;
        const lines = text.split(/\r?\n/);
        if (lines.length <= 1) {
          if (showToast) showToast('CSV is empty or invalid', 'error');
          return;
        }
        
        const importedSymbols: string[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.split(',');
          const sym = parts[0]?.trim();
          if (sym && !existingSymbols.includes(sym)) {
            importedSymbols.push(sym);
          }
        }

        if (importedSymbols.length === 0) {
          if (showToast) showToast('No new unique symbols found in CSV', 'info');
          return;
        }

        if (showToast) showToast(`Importing ${importedSymbols.length} stocks...`, 'info');
        let successCount = 0;
        for (const sym of importedSymbols) {
          const res = await onAddStock(sym);
          if (res.ok) successCount++;
        }
        if (showToast) showToast(`Successfully imported ${successCount} stocks!`, 'success');
      } catch (err) {
        if (showToast) showToast('Failed to parse CSV file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  /* ── Render single stock row ───────────────────────────── */
  const renderStockRow = useCallback((stock: StockQuote, _index: number) => {
    const active = stock.symbol === selectedSymbol;
    const positive = stock.changePercent >= 0;
    const displayPrice = livePrices[stock.symbol] || stock.price;
    const stockTags = stock.tags ?? [];

    const firstTagId = stockTags[0];
    const firstTagDef = firstTagId ? tagMap[firstTagId] : null;
    const borderLeftColor = firstTagDef ? firstTagDef.dot : null;

    // Generate dynamic hash color for logo initials background to make it look premium
    const getLogoBgColor = (sym: string) => {
      const colors = [
        'bg-indigo-500/10 text-indigo-500',
        'bg-emerald-500/10 text-emerald-500',
        'bg-rose-500/10 text-rose-500',
        'bg-amber-500/10 text-amber-500',
        'bg-blue-500/10 text-blue-500',
        'bg-purple-500/10 text-purple-500',
        'bg-pink-500/10 text-pink-500',
        'bg-cyan-500/10 text-cyan-500'
      ];
      const charSum = sym.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      return colors[charSum % colors.length];
    };

    return (
      <div
        onClick={() => {
          onSelectSymbol(stock.symbol);
          onMobileSwitchToChart?.();
        }}
        className={`w-full h-full text-left px-4 flex items-center justify-between gap-3 transition-all touch-manipulation cursor-pointer group/item border-b border-slate-100 dark:border-slate-900/60 ${
          active
            ? 'bg-blue-500/5 dark:bg-blue-500/5 border-l-4 border-l-blue-500'
            : 'hover:bg-slate-50 dark:hover:bg-slate-900/40 border-l-4 border-l-transparent'
        }`}
        style={!active && borderLeftColor ? { borderLeftColor } : {}}
      >
        {/* Left Section: Circular Logo & Ticker Details */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Circular Logo/Avatar */}
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 select-none overflow-hidden border border-slate-200/50 dark:border-slate-800 ${getLogoBgColor(stock.symbol)}`}>
            {stock.symbol.charAt(0).toUpperCase()}
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={`text-[13px] font-black tracking-tight ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
                {stock.symbol.split('.')[0]}
              </span>
              <span className="text-[8px] text-slate-400 dark:text-slate-655 font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-900 px-1 py-0.2 rounded shrink-0">{stock.symbol.split('.')[1] || 'IN'}</span>

              {/* Tag flags */}
              {stockTags.length > 0 && (
                <div className="flex gap-1 ml-1 shrink-0">
                  {stockTags.slice(0, 2).map(tid => {
                    const td = tagMap[tid];
                    if (!td) return null;
                    return (
                      <span 
                        key={tid} 
                        className="w-1.5 h-1.5 rounded-full shrink-0 border border-black/10 dark:border-white/10" 
                        style={{ backgroundColor: td.dot }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 truncate max-w-[180px] mt-0.5 font-semibold">
              {stock.name}
            </p>
          </div>
        </div>

        {/* Right Section: Price & Color-Coded Deltas */}
        <div className="flex items-center gap-3 shrink-0 relative pr-1">
          <div className="flex flex-col items-end gap-0.5 group-hover/item:opacity-20 transition-opacity">
            {/* Price */}
            <span className="text-[13px] font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
              ₹{displayPrice > 0 ? displayPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
            </span>
            {/* Delta value + Change percentage */}
            <span className={`text-[10px] font-black font-mono tracking-tight ${positive ? 'text-emerald-500 dark:text-emerald-455' : 'text-rose-500 dark:text-rose-455'}`}>
              {stock.change !== 0 ? (
                <>
                  {positive ? '+' : ''}{stock.change.toFixed(2)} {positive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </>
              ) : (
                '0.00 0.00%'
              )}
            </span>
          </div>

          {/* Hover actions overlay */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity bg-slate-50 dark:bg-slate-900 pl-2 rounded-l-lg py-1 z-10">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setTagPopoverSym(tagPopoverSym === stock.symbol ? null : stock.symbol); }}
              className="p-1 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-555 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15 transition-all"
              title="Manage tags"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => handleDeleteStock(stock.symbol, e)}
              className="p-1 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-555 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15 transition-all"
              title="Remove from watchlist"
            >
              <Trash2 className="w-3 h-3" />
            </button>

            {/* Tag popover */}
            {tagPopoverSym === stock.symbol && (
              <TagPopover
                stockSymbol={stock.symbol}
                stockTags={stockTags}
                customTagRaw={customTagRaw}
                onToggleTag={onToggleTag}
                onClose={() => setTagPopoverSym(null)}
              />
            )}
          </div>
        </div>
      </div>
    );
  }, [selectedSymbol, livePrices, tagMap, tagPopoverSym, customTagRaw, onSelectSymbol, onToggleTag, handleDeleteStock, onMobileSwitchToChart]);

  /* ── Skeleton loader ───────────────────────────────────── */
  const renderSkeleton = () => (
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
  );

  return (
    <>
      {/* Header section (scrollable controls) */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-855 shrink-0" onClick={() => setTagPopoverSym(null)}>
        {/* Watchlist switcher drop-down (styled exactly like TradingView) */}
        <div className="mb-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowWlDropdown(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs font-black text-slate-855 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all select-none cursor-pointer w-full justify-between shadow-sm"
            >
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {selectedWatchlist === 'default' ? '🏛️ Default Watchlist' : `📋 ${selectedWatchlist}`}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-450 transition-transform ${showWlDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showWlDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowWlDropdown(false)} />
                <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-2xl shadow-2xl py-2.5 font-bold text-slate-700 dark:text-slate-200 z-50 text-[10.5px] animate-fade-in">
                  
                  {/* Select Watchlist Options List */}
                  <div className="px-3 pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-2">
                    <span className="text-[8.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">Select Active List</span>
                    <div className="space-y-1 max-h-36 overflow-y-auto scrollbar-none">
                      {watchlists.map(w => (
                        <div
                          key={w.name}
                          onClick={() => { onSelectWatchlist(w.name); onSetTagFilter('all'); setShowWlDropdown(false); }}
                          className={`px-3 py-2 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                            selectedWatchlist === w.name
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black ring-1 ring-blue-500/10'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-655 dark:text-slate-300'
                          }`}
                        >
                          <span>{w.name === 'default' ? '🏛️ Default Watchlist' : w.name}</span>
                          {selectedWatchlist === w.name && <Check className="w-3.5 h-3.5 text-blue-550 dark:text-blue-400" />}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Operational Dropdown List Actions */}
                  <div className="space-y-0.5 px-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        const name = prompt('Enter name for the copy:', `${selectedWatchlist} Copy`);
                        if (name && name.trim()) {
                          try {
                            const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
                            const res = await fetch(`${getBackendApiUrl()}/watchlists/${encodeURIComponent(selectedWatchlist)}/clone`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                              },
                              body: JSON.stringify({ targetName: name.trim() })
                            });
                            if (res.ok) {
                              if (showToast) showToast(`Watchlist cloned to ${name.trim()} successfully!`, 'success');
                              window.location.reload();
                            } else {
                              const err = await res.json();
                              if (showToast) showToast(err.error || 'Failed to clone watchlist', 'error');
                            }
                          } catch {
                            if (showToast) showToast('Network error during cloning', 'error');
                          }
                        }
                        setShowWlDropdown(false);
                      }}
                      className="w-full text-left px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl flex items-center gap-2 font-black text-blue-600 dark:text-blue-400"
                    >
                      <Copy className="w-3.5 h-3.5 text-blue-500" />
                      <span>Make a copy...</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const newName = prompt('Rename watchlist:', selectedWatchlist);
                        if (newName && newName.trim() && newName.trim() !== selectedWatchlist) {
                          const res = await onRenameWatchlist(selectedWatchlist, newName.trim());
                          if (res.ok && showToast) showToast('Watchlist renamed!', 'success');
                        }
                        setShowWlDropdown(false);
                      }}
                      className="w-full text-left px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl flex items-center gap-2 text-slate-600 dark:text-slate-350"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Rename</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (selectedWatchlist === 'default') {
                          if (showToast) showToast('Cannot delete default watchlist', 'error');
                          return;
                        }
                        if (confirm(`Delete watchlist "${selectedWatchlist}"?`)) {
                          const ok = await onDeleteWatchlist(selectedWatchlist);
                          if (ok && showToast) showToast('Watchlist deleted!', 'info');
                        }
                        setShowWlDropdown(false);
                      }}
                      className="w-full text-left px-2.5 py-2 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-555" />
                      <span>Clear list / Delete</span>
                    </button>

                    <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />

                    <button
                      type="button"
                      onClick={async () => {
                        const name = prompt('Enter new watchlist name:');
                        if (name && name.trim()) {
                          const res = await onCreateWatchlist(name.trim());
                          if (res.ok && showToast) showToast(`Watchlist "${name.trim()}" created!`, 'success');
                        }
                        setShowWlDropdown(false);
                      }}
                      className="w-full text-left px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl flex items-center gap-2 text-slate-600 dark:text-slate-350"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create new list...</span>
                    </button>

                    <label className="w-full text-left px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl flex items-center gap-2 text-slate-600 dark:text-slate-350 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload list...</span>
                      <input type="file" accept=".csv" className="hidden" onChange={(e) => { handleImportCSV(e); setShowWlDropdown(false); }} />
                    </label>

                    <button
                      type="button"
                      onClick={() => { handleExportCSV(); setShowWlDropdown(false); }}
                      className="w-full text-left px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl flex items-center gap-2 text-slate-600 dark:text-slate-350"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Open list / Export...</span>
                    </button>
                  </div>

                  {/* Watchlist Analytics */}
                  {analyticsData && (
                    <div className="mx-3 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[9px] font-bold">
                      <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Performance</span>
                      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80">
                        <div>
                          <span className="text-slate-400 block text-[8px]">DAILY ROI</span>
                          <span className={`text-[10px] font-black ${analyticsData.dailyReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {analyticsData.dailyReturn >= 0 ? '+' : ''}{analyticsData.dailyReturn.toFixed(2)}%
                          </span>
                        </div>
                        {analyticsData.topGainer && (
                          <div className="text-right">
                            <span className="text-slate-400 block text-[8px]">🔥 TOP GAINER</span>
                            <span className="text-green-500 truncate block font-black text-[9px]">
                              {analyticsData.topGainer.symbol.split('.')[0]} (+{analyticsData.topGainer.changePercent.toFixed(1)}%)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </>
            )}
          </div>
        </div>

        {/* Title + Add button */}
        <h2 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2 select-none">
          <Layers className="w-3.5 h-3.5 text-blue-500" /> Watchlist
          <span className="text-slate-300 dark:text-slate-700 font-mono">({processedSmartWatchlist.length})</span>
          
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="ml-auto flex items-center justify-center p-1.5 bg-blue-500/10 border border-blue-550/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-550/20 transition-all cursor-pointer"
            title="Add Stock"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </h2>

        {/* Search + Filter + Sort */}
        <div className="flex items-center gap-1.5 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <input
              id="watchlist-filter-input"
              type="text"
              placeholder="Filter..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-7 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 focus:border-blue-500/50 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-455 dark:placeholder:text-slate-600 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Smart Filter Switcher */}
          <select
            value={smartFilter}
            onChange={e => setSmartFilter(e.target.value as any)}
            className="px-2 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-bold text-slate-650 dark:text-slate-400 focus:outline-none cursor-pointer shrink-0"
            title="Smart Filter"
          >
            <option value="all">🔍 All</option>
            <option value="high_volume">🔥 Volume</option>
            <option value="breakout">📈 Breakout</option>
            <option value="momentum">⚡ Momentum</option>
          </select>
        </div>

        {/* Tag filters */}
        <TagFilterBar
          allStocks={watchlistStocks}
          activeTagFilter={activeTagFilter}
          onSetFilter={onSetTagFilter}
          customTagRaw={customTagRaw}
          onEditCustomTag={onEditCustomTag}
        />
      </div>

      {/* Virtualized stock list */}
      {watchlistLoading ? (
        renderSkeleton()
      ) : (
        <>
          {/* Column Headers */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-850/80 bg-slate-50/50 dark:bg-slate-900/20 text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none shrink-0">
            <div className="flex items-center gap-1.5">
              {/* Flag / Tag Sort Header */}
              <div 
                onClick={() => {
                  const nextSort = watchlistSort === 'tagAsc' ? 'tagDesc' : 'tagAsc';
                  onSortChange(nextSort);
                }}
                className={`cursor-pointer hover:text-blue-500 transition-colors flex items-center shrink-0 select-none ${
                  (watchlistSort === 'tagAsc' || watchlistSort === 'tagDesc') ? 'text-blue-550 dark:text-blue-400' : 'text-slate-400 dark:text-slate-600'
                }`}
                title={`Click to sort by Flag ${watchlistSort === 'tagAsc' ? '↓' : '↑'}`}
              >
                <span className="inline-block w-3.5 h-2.5 bg-current" style={{ clipPath: 'polygon(0% 0%, 80% 0%, 100% 50%, 80% 100%, 0% 100%)', WebkitClipPath: 'polygon(0% 0%, 80% 0%, 100% 50%, 80% 100%, 0% 100%)' }} />
              </div>

              <div 
                onClick={() => {
                  const nextSort = watchlistSort === 'nameAsc' ? 'nameDesc' : 'nameAsc';
                  onSortChange(nextSort);
                }}
                className={`cursor-pointer hover:text-blue-500 transition-colors flex items-center gap-0.5 ${
                  (watchlistSort === 'nameAsc' || watchlistSort === 'nameDesc') ? 'text-blue-550 dark:text-blue-400 font-black' : ''
                }`}
              >
                Symbol
                {watchlistSort === 'nameAsc' && ' ↑'}
                {watchlistSort === 'nameDesc' && ' ↓'}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div 
                onClick={() => {
                  const nextSort = watchlistSort === 'priceDesc' ? 'priceAsc' : 'priceDesc';
                  onSortChange(nextSort);
                }}
                className={`w-20 text-right cursor-pointer hover:text-blue-500 transition-colors flex items-center justify-end gap-0.5 ${
                  (watchlistSort === 'priceAsc' || watchlistSort === 'priceDesc') ? 'text-blue-550 dark:text-blue-400 font-black' : ''
                }`}
              >
                Last
                {watchlistSort === 'priceAsc' && ' ↑'}
                {watchlistSort === 'priceDesc' && ' ↓'}
              </div>

              <div 
                onClick={() => {
                  const nextSort = watchlistSort === 'changePctDesc' ? 'changePctAsc' : 'changePctDesc';
                  onSortChange(nextSort);
                }}
                className={`w-20 text-right cursor-pointer hover:text-blue-500 transition-colors flex items-center justify-end gap-0.5 ${
                  (watchlistSort === 'changePctAsc' || watchlistSort === 'changePctDesc') ? 'text-blue-550 dark:text-blue-400 font-black' : ''
                }`}
              >
                Chg
                {watchlistSort === 'changePctAsc' && ' ↑'}
                {watchlistSort === 'changePctDesc' && ' ↓'}
              </div>

              <div 
                onClick={() => {
                  const nextSort = watchlistSort === 'changePctDesc' ? 'changePctAsc' : 'changePctDesc';
                  onSortChange(nextSort);
                }}
                className={`w-20 text-right cursor-pointer hover:text-blue-500 transition-colors flex items-center justify-end gap-0.5 ${
                  (watchlistSort === 'changePctAsc' || watchlistSort === 'changePctDesc') ? 'text-blue-550 dark:text-blue-400 font-black' : ''
                }`}
              >
                Chg%
                {watchlistSort === 'changePctAsc' && ' ↑'}
                {watchlistSort === 'changePctDesc' && ' ↓'}
              </div>
            </div>
          </div>

          <VirtualStockList
            items={processedSmartWatchlist.slice(0, limit)}
            itemHeight={STOCK_ROW_HEIGHT}
            containerClassName="flex-1 min-h-0"
            getItemKey={(item) => item.symbol}
            renderItem={renderStockRow}
            emptyState={
              <div className="p-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Search className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-xs font-bold text-slate-500 mb-1">No stocks found</p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {searchQuery ? `No results for "${searchQuery}"` : 'This watchlist is empty'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold rounded-xl transition-colors shadow-md"
                >
                  + Add Stock
                </button>
              </div>
            }
          />

          {/* Load More Button */}
          {processedSmartWatchlist.length > limit && (
            <div className="p-3 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-850 flex justify-center shrink-0">
              <button
                type="button"
                onClick={() => setLimit(prev => prev + 10)}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-855 dark:text-slate-150 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border border-slate-200 dark:border-slate-800 hover:scale-[1.01]"
              >
                Load More <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Add Stock Modal */}
      <AddStockModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddStock={handleAddStock}
        suggestions={suggestions}
        suggestLoading={suggestLoading}
        onFetchSuggestions={onFetchSuggestions}
        onClearSuggestions={onClearSuggestions}
        existingSymbols={existingSymbols}
      />
    </>
  );
}
