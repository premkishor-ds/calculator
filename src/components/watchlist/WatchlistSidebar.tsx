"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Search, Layers, Plus, Trash2, Star, TrendingUp, TrendingDown, RefreshCw, ChevronDown, X, Check, Pencil, Download, Upload
} from 'lucide-react';
import VirtualStockList from '@/components/watchlist/VirtualStockList';
import AddStockModal from '@/components/watchlist/AddStockModal';
import { TagPopover, TagFilterBar } from '@/components/watchlist/TagManager';
import WatchlistSwitcher from '@/components/watchlist/WatchlistSwitcher';
import { buildAllTags, DEFAULT_CUSTOM_TAGS, CUSTOM_TAG_IDS, type CustomTagRaw, type TagDef } from '@/utils/tags';
import type { StockQuote, WatchlistSortOption } from '@/hooks/useWatchlistStore';

/* ── Props ──────────────────────────────────────────────── */

export interface WatchlistSidebarProps {
  /* Core state (from useWatchlistStore or parent) */
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

  /* Search / filter */
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeTagFilter: string;
  onSetTagFilter: (tagId: string) => void;
  watchlistSort: WatchlistSortOption;
  onSortChange: (sort: WatchlistSortOption) => void;

  /* Selection */
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;

  /* Actions */
  onAddStock: (symbol: string) => Promise<{ ok: boolean; error?: string }>;
  onRemoveStock: (symbol: string) => Promise<boolean>;
  onToggleTag: (symbol: string, tagId: string) => void;

  /* Suggestions */
  suggestions: Array<{ symbol: string; name: string; exchange: string }>;
  suggestLoading: boolean;
  onFetchSuggestions: (q: string) => void;
  onClearSuggestions: () => void;

  /* Custom tags */
  customTagRaw?: CustomTagRaw[];
  onEditCustomTag?: (tag: CustomTagRaw) => void;

  /* Toast */
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;

  /* Optional overrides */
  onMobileSwitchToChart?: () => void;
}

/* ── Row height ─────────────────────────────────────────── */
const STOCK_ROW_HEIGHT = 72;

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

  const allTags = buildAllTags(customTagRaw);
  const tagMap = Object.fromEntries(allTags.map(t => [t.id, t]));
  const existingSymbols = useMemo(() => watchlistStocks.map(s => s.symbol), [watchlistStocks]);

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

    return (
      <div
        onClick={() => {
          onSelectSymbol(stock.symbol);
          onMobileSwitchToChart?.();
        }}
        className={`w-full h-full text-left px-4 flex items-center justify-between gap-3 transition-all border-l-4 touch-manipulation cursor-pointer group/item ${
          active
            ? 'bg-blue-50/50 dark:bg-blue-500/5 border-blue-550 dark:border-blue-500'
            : 'hover:bg-slate-50 dark:hover:bg-slate-900/40 border-transparent'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-black ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-100'}`}>
              {stock.symbol.split('.')[0]}
            </span>
            <span className="text-[9px] text-slate-400 dark:text-slate-600 font-bold">{stock.symbol.split('.')[1]}</span>
          </div>
          <p className="text-[10px] text-slate-500 truncate max-w-[130px] mt-0.5 font-medium">
            {stock.name}
          </p>
          {/* Tag pills */}
          {stockTags.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mt-1">
              {stockTags.slice(0, 3).map(tid => {
                const td = tagMap[tid];
                if (!td) return null;
                return td.custom ? (
                  <span key={tid} className="px-1.5 py-0 rounded-full text-[7px] font-extrabold border"
                    style={{ backgroundColor: td.dot + '25', color: td.dot, borderColor: td.dot + '60' }}>
                    {td.label}
                  </span>
                ) : (
                  <span key={tid} className={`px-1.5 py-0 rounded-full text-[7px] font-extrabold border ${td.color}`}>
                    {td.label}
                  </span>
                );
              })}
              {stockTags.length > 3 && (
                <span className="text-[7px] text-slate-400 font-bold">+{stockTags.length - 3}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className="text-xs font-black text-slate-900 dark:text-white font-mono">
              ₹{displayPrice > 0 ? displayPrice.toFixed(0) : '—'}
            </div>
            {stock.changePercent !== 0 && (
              <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded mt-0.5 ${
                positive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-500 dark:text-red-400'
              }`}>
                <span>{positive ? '+' : ''}{stock.changePercent.toFixed(1)}%</span>
              </span>
            )}
          </div>

          {/* Hover actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity relative">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setTagPopoverSym(tagPopoverSym === stock.symbol ? null : stock.symbol); }}
              className="p-1 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-550 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15 transition-all"
              title="Manage tags"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => handleDeleteStock(stock.symbol, e)}
              className="p-1 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-550 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15 transition-all"
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
      <div className="p-4 border-b border-slate-100 dark:border-slate-850 shrink-0" onClick={() => setTagPopoverSym(null)}>
        {/* Watchlist switcher */}
        <div className="mb-4">
          <WatchlistSwitcher
            watchlists={watchlists}
            selectedWatchlist={selectedWatchlist}
            onSelect={(name) => { onSelectWatchlist(name); onSetTagFilter('all'); }}
            onCreate={onCreateWatchlist}
            onRename={onRenameWatchlist}
            onDelete={onDeleteWatchlist}
          />
        </div>

        {/* Title + Add button */}
        <h2 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2 select-none">
          <Layers className="w-3.5 h-3.5 text-blue-500" /> Watchlist
          <span className="text-slate-300 dark:text-slate-700 font-mono">({filteredWatchlist.length})</span>
          
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center justify-center p-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              title="Export Watchlist to CSV"
            >
              <Download className="w-3 h-3" />
            </button>
            <label
              className="flex items-center justify-center p-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-all"
              title="Import Watchlist from CSV"
            >
              <Upload className="w-3 h-3" />
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportCSV}
              />
            </label>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/10 border border-blue-550/20 text-blue-600 dark:text-blue-450 text-[9px] font-extrabold rounded-lg hover:bg-blue-550/20 transition-all"
            >
              <Plus className="w-2.5 h-2.5" /> ADD
            </button>
          </div>
        </h2>

        {/* Search + Sort */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <input
              id="watchlist-filter-input"
              type="text"
              placeholder="Filter stocks (Press Space)…"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-500/50 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <select
            value={watchlistSort}
            onChange={e => onSortChange(e.target.value as WatchlistSortOption)}
            className="px-2 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 focus:outline-none cursor-pointer shrink-0"
            title="Sort"
          >
            <option value="default">Default</option>
            <option value="nameAsc">Name A→Z</option>
            <option value="nameDesc">Name Z→A</option>
            <option value="priceDesc">Price ↓</option>
            <option value="priceAsc">Price ↑</option>
            <option value="changePctDesc">%Chg ↓</option>
            <option value="changePctAsc">%Chg ↑</option>
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
        <VirtualStockList
          items={filteredWatchlist}
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
