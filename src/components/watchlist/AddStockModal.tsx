"use client";

import { Plus,RefreshCw, Search, X } from 'lucide-react';
import React, { useCallback, useEffect,useRef, useState } from 'react';

import type { SearchSuggestion } from '@/hooks/useWatchlistStore';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStock: (_symbol: string) => Promise<{ ok: boolean; error?: string }>;
  suggestions: SearchSuggestion[];
  suggestLoading: boolean;
  onFetchSuggestions: (_q: string) => void;
  onClearSuggestions: () => void;
  existingSymbols: string[];
}

/**
 * Modal for adding stocks via suggestion-driven search.
 * Stocks can ONLY be added by clicking a suggestion — Enter alone does NOT add.
 */
export default function AddStockModal({
  isOpen,
  onClose,
  onAddStock,
  suggestions,
  suggestLoading,
  onFetchSuggestions,
  onClearSuggestions,
  existingSymbols,
}: AddStockModalProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setInput('');
      setError('');
      setShowSuggestions(false);
      onClearSuggestions();
      setHighlightIdx(-1);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, onClearSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    setError('');
    setHighlightIdx(-1);
    if (val.trim().length >= 1) {
      setShowSuggestions(true);
      onFetchSuggestions(val);
    } else {
      setShowSuggestions(false);
      onClearSuggestions();
    }
  };

  const handleSelectSuggestion = useCallback(async (suggestion: SearchSuggestion) => {
    const sym = suggestion.symbol;
    // Duplicate check
    if (existingSymbols.some(s => s.toUpperCase() === sym.toUpperCase())) {
      setError(`${sym.split('.')[0]} already exists in this watchlist`);
      return;
    }
    setLoading(true);
    setError('');
    setShowSuggestions(false);
    const result = await onAddStock(sym);
    setLoading(false);
    if (result.ok) {
      setInput('');
      onClearSuggestions();
      onClose();
    } else {
      setError(result.error || 'Failed to add stock');
    }
  }, [existingSymbols, onAddStock, onClearSuggestions, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[highlightIdx]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      onClearSuggestions();
    }
    // Enter without highlight does NOT add — must select a suggestion
  };

  // Scroll highlight into view
  useEffect(() => {
    if (highlightIdx >= 0 && dropdownRef.current) {
      const el = dropdownRef.current.children[highlightIdx] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIdx]);

  // Highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part)
        ? <span key={i} className="text-blue-500 font-black">{part}</span>
        : part
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-[fadeInScale_0.2s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Add Stock</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Search by symbol or company name</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search stocks (e.g. RELIANCE, TCS, Infosys)…"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none transition-all"
              autoComplete="off"
            />
            {(loading || suggestLoading) && (
              <RefreshCw className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
            )}
          </div>

          {error && (
            <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-xl text-xs font-bold text-center">
              {error}
            </div>
          )}

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={dropdownRef}
              className="mt-2 max-h-64 overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl divide-y divide-slate-100 dark:divide-slate-800/60"
            >
              {suggestions.map((s, idx) => {
                const isDuplicate = existingSymbols.some(ex => ex.toUpperCase() === s.symbol.toUpperCase());
                return (
                  <button
                    key={s.symbol}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    disabled={isDuplicate}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-all ${
                      idx === highlightIdx
                        ? 'bg-blue-50 dark:bg-blue-500/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'
                    } ${isDuplicate ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {highlightMatch(s.symbol.split('.')[0], input)}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                          {s.exchange || 'NSE'}
                        </span>
                        {isDuplicate && (
                          <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full">
                            ADDED
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                        {highlightMatch(s.name, input)}
                      </p>
                    </div>
                    {!isDuplicate && (
                      <Plus className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {showSuggestions && !suggestLoading && input.trim().length >= 2 && suggestions.length === 0 && (
            <div className="mt-3 text-center text-xs text-slate-400 font-semibold py-4">
              No stocks found for &quot;{input.trim()}&quot;
            </div>
          )}

          <p className="mt-4 text-[10px] text-slate-400 font-medium text-center leading-relaxed">
            Type to search, then <span className="font-bold text-slate-500">click a suggestion</span> to add it to your watchlist.
            <br />Use ↑↓ arrow keys to navigate, Enter to select.
          </p>
        </div>
      </div>
    </div>
  );
}
