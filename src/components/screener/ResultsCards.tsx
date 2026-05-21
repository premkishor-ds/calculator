import React from 'react';
import { TrendingUp, Activity, BarChart2, CheckCircle } from 'lucide-react';

const MOCK_RESULTS = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', price: 2950.45, change: 1.2, mcap: 1980000, pe: 28.5, roe: 14.2, rsi: 65, signal: 'BULLISH' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services', price: 3980.10, change: -0.5, mcap: 1450000, pe: 31.2, roe: 45.8, rsi: 42, signal: 'NEUTRAL' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', price: 1540.80, change: 2.1, mcap: 1120000, pe: 16.5, roe: 17.1, rsi: 72, signal: 'OVERBOUGHT' },
];

export const ResultsCards = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
       {MOCK_RESULTS.map((stock, i) => (
         <div key={i} className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-blue-500/30 transition-colors group relative overflow-hidden">
            {/* Top Bar */}
            <div className="flex justify-between items-start mb-4">
               <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                     {stock.symbol}
                     <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider
                        ${stock.signal === 'BULLISH' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : ''}
                        ${stock.signal === 'BEARISH' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : ''}
                        ${stock.signal === 'NEUTRAL' ? 'bg-slate-500/10 text-slate-500 border border-slate-500/20' : ''}
                        ${stock.signal === 'OVERBOUGHT' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : ''}
                     `}>
                        {stock.signal}
                     </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{stock.name}</p>
               </div>
               <div className="text-right">
                  <div className="text-lg font-bold text-slate-900 dark:text-white">₹{stock.price.toFixed(2)}</div>
                  <div className={`text-xs font-bold mt-0.5 flex items-center justify-end gap-1 ${stock.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                     {stock.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                     {stock.change >= 0 ? '+' : ''}{stock.change}%
                  </div>
               </div>
            </div>

            {/* Grid Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-5">
               <div className="bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Market Cap</div>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">₹{(stock.mcap / 100000).toFixed(2)}L Cr</div>
               </div>
               <div className="bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">P/E Ratio</div>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{stock.pe}</div>
               </div>
               <div className="bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">ROE</div>
                  <div className="text-sm font-semibold text-emerald-500">{stock.roe}%</div>
               </div>
               <div className="bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">RSI (14)</div>
                  <div className={`text-sm font-semibold ${stock.rsi > 70 ? 'text-red-500' : stock.rsi < 30 ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>
                     {stock.rsi}
                  </div>
               </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
               <button className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Watchlist
               </button>
               <button className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5" /> Terminal
               </button>
            </div>
         </div>
       ))}
    </div>
  );
};
