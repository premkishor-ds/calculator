"use client";

import { Check, Pencil, X } from 'lucide-react';
import React from 'react';

import { buildAllTags, CUSTOM_TAG_IDS, type CustomTagRaw } from '@/utils/tags';

interface TagManagerProps {
  stockSymbol: string;
  stockTags: string[];
  customTagRaw: CustomTagRaw[];
  onToggleTag: (_symbol: string, _tagId: string) => void;
  onClose: () => void;
}

/**
 * Tag assignment popover for a single stock.
 * Shows all available tags with checkmarks for assigned ones.
 */
export function TagPopover({ stockSymbol, stockTags, customTagRaw, onToggleTag, onClose }: TagManagerProps) {
  const allTags = buildAllTags(customTagRaw);

  return (
    <div
      className="absolute right-0 top-7 z-50 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2.5 animate-[fadeInScale_0.15s_ease-out]"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assign Tags</p>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
        {allTags.map(tag => {
          const isActive = stockTags.includes(tag.id);
          const isCustom = tag.custom;
          return (
            <button
              key={tag.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleTag(stockSymbol, tag.id);
              }}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[10px] font-bold text-left transition-all ${
                isActive
                  ? isCustom
                    ? ''
                    : tag.color
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/80'
              }`}
              style={isCustom && isActive ? {
                backgroundColor: tag.dot + '20',
                color: tag.dot,
              } : isCustom ? {} : {}}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 transition-all"
                style={{ backgroundColor: isActive ? tag.dot : '#94a3b8' }}
              />
              <span className="flex-1 truncate">{tag.label}</span>
              {isActive && <Check className="w-3 h-3 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Tag Filter Bar ───────────────────────────────────────── */

interface TagFilterBarProps {
  allStocks: Array<{ tags?: string[] }>;
  activeTagFilter: string;
  onSetFilter: (_tagId: string) => void;
  customTagRaw: CustomTagRaw[];
  onEditCustomTag?: (_tag: CustomTagRaw) => void;
}

export function TagFilterBar({ allStocks, activeTagFilter, onSetFilter, customTagRaw, onEditCustomTag }: TagFilterBarProps) {
  const allTags = buildAllTags(customTagRaw);

  return (
    <div className="flex flex-wrap gap-1">
      <button
        type="button"
        onClick={() => onSetFilter('all')}
        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border transition-all ${
          activeTagFilter === 'all'
            ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white border-slate-300 dark:border-slate-600 shadow-sm'
            : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-850 hover:border-slate-400 dark:hover:border-slate-600'
        }`}
      >
        All ({allStocks.length})
      </button>
      {allTags.map(tag => {
        const count = allStocks.filter(s => (s.tags ?? []).includes(tag.id)).length;
        if (count === 0 && activeTagFilter !== tag.id) return null;
        const isCustom = CUSTOM_TAG_IDS.includes(tag.id as typeof CUSTOM_TAG_IDS[number]);
        const raw = isCustom ? customTagRaw.find(t => t.tagId === tag.id) : null;
        return (
          <div key={tag.id} className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onSetFilter(activeTagFilter === tag.id ? 'all' : tag.id)}
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
            {isCustom && onEditCustomTag && raw && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEditCustomTag(raw); }}
                className="text-slate-400 hover:text-slate-650 transition-colors text-[9px] leading-none"
              >
                <Pencil className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
