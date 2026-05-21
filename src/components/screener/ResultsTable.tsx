import React from 'react';
import { Download, ArrowUpDown } from 'lucide-react';

const MOCK_RESULTS = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', price: 2950.45, change: 1.2, mcap: 1980000, pe: 28.5, roe: 14.2, rsi: 65, signal: 'BULLISH' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services', price: 3980.10, change: -0.5, mcap: 1450000, pe: 31.2, roe: 45.8, rsi: 42, signal: 'NEUTRAL' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', price: 1540.80, change: 2.1, mcap: 1120000, pe: 16.5, roe: 17.1, rsi: 72, signal: 'OVERBOUGHT' },
];

export const ResultsTable = () => {
  return (
    <div className="w-full overflow-x-auto">
       <div className="flex justify-end mb-3">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
       </div>
       <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
             <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-800/50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                   Company
                </th>
                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-500">
                   <div className="flex items-center gap-1 justify-end">Price <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-500">
                   <div className="flex items-center gap-1 justify-end">Change <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-500">
                   <div className="flex items-center gap-1 justify-end">M.Cap (Cr) <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-500">
                   <div className="flex items-center gap-1 justify-end">P/E <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-500">
                   <div className="flex items-center gap-1 justify-end">ROE % <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-500">
                   <div className="flex items-center gap-1 justify-end">RSI (14) <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                   Tech Signal
                </th>
                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                   Action
                </th>
             </tr>
          </thead>
          <tbody>
             {MOCK_RESULTS.map((stock, i) => (
               <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                 <td className="p-3 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/30 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <div className="flex flex-col">
                       <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{stock.symbol}</span>
                       <span className="text-xs text-slate-500 truncate max-w-[200px]">{stock.name}</span>
                    </div>
                 </td>
                 <td className="p-3 text-right font-semibold text-sm">₹{stock.price.toFixed(2)}</td>
                 <td className={`p-3 text-right font-bold text-sm ${stock.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {stock.change >= 0 ? '+' : ''}{stock.change}%
                 </td>
                 <td className="p-3 text-right font-medium text-sm text-slate-600 dark:text-slate-300">
                    ₹{(stock.mcap / 100000).toFixed(2)}L
                 </td>
                 <td className="p-3 text-right font-medium text-sm">{stock.pe}</td>
                 <td className="p-3 text-right font-medium text-sm">{stock.roe}%</td>
                 <td className={`p-3 text-right font-medium text-sm ${stock.rsi > 70 ? 'text-red-500' : stock.rsi < 30 ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>
                    {stock.rsi}
                 </td>
                 <td className="p-3">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                       ${stock.signal === 'BULLISH' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : ''}
                       ${stock.signal === 'BEARISH' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : ''}
                       ${stock.signal === 'NEUTRAL' ? 'bg-slate-500/10 text-slate-500 border border-slate-500/20' : ''}
                       ${stock.signal === 'OVERBOUGHT' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : ''}
                    `}>
                       {stock.signal}
                    </span>
                 </td>
                 <td className="p-3 text-center">
                    <button className="text-xs font-bold text-blue-500 hover:text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors">
                       Add to Watchlist
                    </button>
                 </td>
               </tr>
             ))}
          </tbody>
       </table>
    </div>
  );
};
