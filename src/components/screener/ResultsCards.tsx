'use client';
import { BarChart2, RefreshCw,TrendingDown, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';

import { ActiveFilters } from './FilterSidebar';

interface StockRow {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  marketCap: number;
  pe: number;
  promHold: number;
  profitGrowth: number;
  divYield: number;
}

export const ResultsCards = ({
  stocks,
  loading,
  activeFilters: _activeFilters,
}: {
  stocks: StockRow[];
  loading: boolean;
  activeFilters: ActiveFilters;
}) => {
  const router = useRouter();

  if (loading && stocks.length === 0) return (
    <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
      <RefreshCw className="w-5 h-5 animate-spin" />
      <span className="text-sm font-semibold">Loading live NSE/BSE data...</span>
    </div>
  );

  if (stocks.length === 0) return (
    <div className="py-20 text-center text-slate-400 text-sm">No stocks match the active filters.</div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {stocks.map((s, i) => {
        const pos = s.changePercent >= 0;
        const signal = s.profitGrowth > 15 && s.pe > 0 && s.pe < 30 ? 'BULLISH'
          : s.profitGrowth < 0 ? 'BEARISH'
          : s.pe > 50 ? 'OVERVALUED'
          : 'NEUTRAL';
        const signalClass = signal === 'BULLISH' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
          : signal === 'BEARISH' ? 'bg-red-500/10 text-red-500 border-red-500/20'
          : signal === 'OVERVALUED' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
          : 'bg-slate-500/10 text-slate-500 border-slate-500/20';

        return (
          <div
            key={i}
            className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-blue-500/30 transition-colors group cursor-pointer"
            onClick={() => router.push(`/watchlist/${encodeURIComponent(s.symbol)}`)}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  {s.symbol.replace(/\.(NS|BO)$/i, '')}
                  <span className="text-[9px] font-medium text-slate-400">{s.symbol.endsWith('.BO') ? 'BSE' : 'NSE'}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${signalClass}`}>
                    {signal}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[180px]">{s.name}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-slate-900 dark:text-white">₹{s.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                <div className={`text-xs font-bold mt-0.5 flex items-center justify-end gap-1 ${pos ? 'text-emerald-500' : 'text-red-500'}`}>
                  {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {pos ? '+' : ''}{s.changePercent.toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Market Cap', value: `₹${(s.marketCap / 10000000).toFixed(0)}Cr` },
                { label: 'P/E Ratio', value: s.pe > 0 ? s.pe.toFixed(1) : '--' },
                { label: 'Promoter %', value: s.promHold > 0 ? `${s.promHold.toFixed(1)}%` : '--' },
                { label: 'Profit Gr.', value: s.profitGrowth !== 0 ? `${s.profitGrowth.toFixed(1)}%` : '--', color: s.profitGrowth >= 0 ? 'text-emerald-500' : 'text-red-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{label}</div>
                  <div className={`text-sm font-semibold ${color || 'text-slate-700 dark:text-slate-300'}`}>{value}</div>
                </div>
              ))}
            </div>

            <button
              onClick={e => { e.stopPropagation(); router.push(`/watchlist/${encodeURIComponent(s.symbol)}`); }}
              className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <BarChart2 className="w-3.5 h-3.5" /> Full Analysis
            </button>
          </div>
        );
      })}
    </div>
  );
};
