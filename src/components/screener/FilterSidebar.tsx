'use client';
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Filter, Search, Check, X, Save, Trash2 } from 'lucide-react';

// Filter field metadata: which fields support range inputs vs boolean toggles
export interface FilterField {
  id: string;
  label: string;
  type: 'range' | 'boolean' | 'select';
  unit?: string;
  options?: string[];
}

export interface FilterValue {
  min?: number;
  max?: number;
  bool?: boolean;
  select?: string;
}

export type ActiveFilters = Record<string, FilterValue>;

const FILTER_GROUPS: { id: string; label: string; fields: FilterField[] }[] = [
  {
    id: 'valuation',
    label: 'Valuation',
    fields: [
      { id: 'pe', label: 'P/E Ratio', type: 'range' },
      { id: 'forwardPe', label: 'Forward P/E', type: 'range' },
      { id: 'peg', label: 'PEG Ratio', type: 'range' },
      { id: 'pb', label: 'Price / Book', type: 'range' },
      { id: 'ps', label: 'Price / Sales', type: 'range' },
      { id: 'evEbitda', label: 'EV / EBITDA', type: 'range' },
      { id: 'divYield', label: 'Dividend Yield (%)', type: 'range', unit: '%' },
    ],
  },
  {
    id: 'profitability',
    label: 'Profitability',
    fields: [
      { id: 'roe', label: 'ROE (%)', type: 'range', unit: '%' },
      { id: 'roa', label: 'ROA (%)', type: 'range', unit: '%' },
      { id: 'grossMargin', label: 'Gross Margin (%)', type: 'range', unit: '%' },
      { id: 'operatingMargin', label: 'Operating Margin (%)', type: 'range', unit: '%' },
      { id: 'netMargin', label: 'Net Margin (%)', type: 'range', unit: '%' },
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    fields: [
      { id: 'revenueGrowth', label: 'Revenue Growth (%)', type: 'range', unit: '%' },
      { id: 'profitGrowth', label: 'Profit Growth (%)', type: 'range', unit: '%' },
      { id: 'epsGrowth', label: 'EPS Growth (%)', type: 'range', unit: '%' },
      { id: 'salesGrowth', label: 'Sales Growth (%)', type: 'range', unit: '%' },
    ],
  },
  {
    id: 'health',
    label: 'Financial Health',
    fields: [
      { id: 'debtEquity', label: 'Debt / Equity', type: 'range' },
      { id: 'currentRatio', label: 'Current Ratio', type: 'range' },
      { id: 'quickRatio', label: 'Quick Ratio', type: 'range' },
      { id: 'interestCoverage', label: 'Interest Coverage', type: 'range' },
    ],
  },
  {
    id: 'ownership',
    label: 'Shareholding',
    fields: [
      { id: 'promoterHolding', label: 'Promoter Holding (%)', type: 'range', unit: '%' },
      { id: 'fiiHolding', label: 'FII Holding (%)', type: 'range', unit: '%' },
      { id: 'diiHolding', label: 'DII Holding (%)', type: 'range', unit: '%' },
      { id: 'publicHolding', label: 'Public Holding (%)', type: 'range', unit: '%' },
    ],
  },
  {
    id: 'technical',
    label: 'Technical',
    fields: [
      { id: 'rsi', label: 'RSI (14)', type: 'range' },
      { id: 'changePercent', label: 'Price Change (%)', type: 'range', unit: '%' },
      { id: 'distFrom52wHigh', label: 'Distance from 52W High (%)', type: 'range', unit: '%' },
      { id: 'distFrom52wLow', label: 'Distance from 52W Low (%)', type: 'range', unit: '%' },
    ],
  },
  {
    id: 'size',
    label: 'Size',
    fields: [
      { id: 'marketCap', label: 'Market Cap (Cr)', type: 'range', unit: 'Cr' },
      { id: 'volume', label: 'Volume (Lakhs)', type: 'range', unit: 'L' },
      { id: 'price', label: 'Price (₹)', type: 'range', unit: '₹' },
    ],
  },
];

// Saved preset type
interface Preset {
  name: string;
  filters: ActiveFilters;
}

const PRESET_TEMPLATES: Preset[] = [
  {
    name: '🔥 High ROE Multibaggers',
    filters: { roe: { min: 20 }, pe: { max: 35 }, profitGrowth: { min: 20 } },
  },
  {
    name: '💸 Undervalued Compounders',
    filters: { pe: { max: 18 }, profitGrowth: { min: 10 } },
  },
  {
    name: '🛡️ Promoter Shield',
    filters: { promoterHolding: { min: 60 }, profitGrowth: { min: 12 } },
  },
  {
    name: '📈 Momentum Breakout',
    filters: { rsi: { min: 55, max: 70 }, changePercent: { min: 2 } },
  },
];

export const FilterSidebar = ({
  activeFilters,
  onFiltersChange,
}: {
  activeFilters: ActiveFilters;
  onFiltersChange: (filters: ActiveFilters) => void;
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ valuation: true });
  const [searchQuery, setSearchQuery] = useState('');
  const [savedPresets, setSavedPresets] = useState<Preset[]>(PRESET_TEMPLATES);
  const [presetName, setPresetName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  const activeCount = Object.keys(activeFilters).length;

  const toggleGroup = (id: string) =>
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));

  const setFilter = (fieldId: string, value: FilterValue | null) => {
    const next = { ...activeFilters };
    if (value === null || (value.min === undefined && value.max === undefined && value.bool === undefined && value.select === undefined)) {
      delete next[fieldId];
    } else {
      next[fieldId] = value;
    }
    onFiltersChange(next);
  };

  const clearAll = () => onFiltersChange({});

  const applyPreset = (preset: Preset) => onFiltersChange({ ...preset.filters });

  const savePreset = () => {
    if (!presetName.trim()) return;
    setSavedPresets(prev => [...prev, { name: presetName.trim(), filters: { ...activeFilters } }]);
    setPresetName('');
    setShowSaveInput(false);
  };

  const deletePreset = (idx: number) =>
    setSavedPresets(prev => prev.filter((_, i) => i !== idx));

  const filteredGroups = FILTER_GROUPS.map(g => ({
    ...g,
    fields: searchQuery
      ? g.fields.filter(f => f.label.toLowerCase().includes(searchQuery.toLowerCase()))
      : g.fields,
  })).filter(g => g.fields.length > 0);

  return (
    <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Filters {activeCount > 0 && <span className="ml-1 text-blue-500">({activeCount})</span>}
          </h2>
        </div>
        {activeCount > 0 && (
          <button onClick={clearAll} className="text-xs text-slate-400 hover:text-red-500 font-semibold transition-colors flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Clear All
          </button>
        )}
      </div>

      {/* Global search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search filters..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-blue-500 text-slate-700 dark:text-slate-200"
        />
      </div>

      {/* Preset templates */}
      <div className="mb-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Quick Presets</p>
        <div className="flex flex-col gap-1.5">
          {savedPresets.map((preset, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <button
                onClick={() => applyPreset(preset)}
                className="flex-1 text-left px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-blue-500/10 border border-slate-200 dark:border-slate-700 hover:border-blue-500/30 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors truncate"
              >
                {preset.name}
              </button>
              {idx >= PRESET_TEMPLATES.length && (
                <button onClick={() => deletePreset(idx)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Save current filters as preset */}
        {activeCount > 0 && (
          <div className="mt-2">
            {showSaveInput ? (
              <div className="flex gap-1.5">
                <input
                  autoFocus
                  type="text"
                  placeholder="Preset name..."
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && savePreset()}
                  className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-blue-400 rounded-xl text-xs focus:outline-none text-slate-700 dark:text-slate-200"
                />
                <button onClick={savePreset} className="px-3 py-1.5 bg-blue-500 text-white rounded-xl text-xs font-bold">
                  <Save className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setShowSaveInput(false)} className="px-2 py-1.5 text-slate-400 hover:text-slate-600 text-xs">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveInput(true)}
                className="w-full py-2 text-xs font-bold text-blue-500 hover:bg-blue-500/10 border border-blue-500/20 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Save Current Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter groups */}
      <div className="space-y-2">
        {filteredGroups.map(group => {
          const groupActiveCount = group.fields.filter(f => activeFilters[f.id]).length;
          return (
            <div key={group.id} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{group.label}</span>
                  {groupActiveCount > 0 && (
                    <span className="text-[10px] bg-blue-500 px-1.5 py-0.5 rounded-md text-white font-bold">
                      {groupActiveCount}
                    </span>
                  )}
                </div>
                {expandedGroups[group.id] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {expandedGroups[group.id] && (
                <div className="p-3 bg-white dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  {group.fields.map(field => {
                    const current = activeFilters[field.id];
                    const isActive = !!current;
                    return (
                      <div key={field.id} className={`p-2.5 rounded-xl border transition-colors ${isActive ? 'border-blue-500/30 bg-blue-500/5' : 'border-slate-100 dark:border-slate-800'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{field.label}</span>
                          {isActive && (
                            <button onClick={() => setFilter(field.id, null)} className="text-slate-400 hover:text-red-500 transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {field.type === 'range' && (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              placeholder="Min"
                              value={current?.min ?? ''}
                              onChange={e => {
                                const val = e.target.value === '' ? undefined : Number(e.target.value);
                                setFilter(field.id, { ...current, min: val });
                              }}
                              className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-700 dark:text-slate-200"
                            />
                            <span className="text-slate-400 text-xs shrink-0">–</span>
                            <input
                              type="number"
                              placeholder="Max"
                              value={current?.max ?? ''}
                              onChange={e => {
                                const val = e.target.value === '' ? undefined : Number(e.target.value);
                                setFilter(field.id, { ...current, max: val });
                              }}
                              className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-700 dark:text-slate-200"
                            />
                            {field.unit && <span className="text-[10px] text-slate-400 shrink-0">{field.unit}</span>}
                          </div>
                        )}
                        {field.type === 'boolean' && (
                          <button
                            onClick={() => setFilter(field.id, isActive ? null : { bool: true })}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isActive ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                          >
                            {isActive && <Check className="w-3 h-3" />} {isActive ? 'Active' : 'Enable'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
