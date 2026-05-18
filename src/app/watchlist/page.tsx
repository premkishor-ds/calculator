"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, RefreshCw, Search, ChevronDown, ChevronUp, ChevronsUpDown, Info } from 'lucide-react';

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
}

export default function WatchlistPage() {
  const router = useRouter();
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<keyof StockData>('marketCap');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const fetchStocks = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/watchlist');
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      setStocks(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStocks();
    
    // Auto refresh every 60 seconds
    const interval = setInterval(fetchStocks, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSort = (field: keyof StockData) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedStocks = stocks
    .filter(stock => 
      stock.symbol.toLowerCase().includes(search.toLowerCase()) || 
      stock.name.toLowerCase().includes(search.toLowerCase())
    )
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
            <ChevronsUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 max-w-[1600px] mx-auto">
        
        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Live Core Watchlist</h1>
            <p className="text-sm text-slate-500 mt-2">Real-time tracking of your custom, high-growth Core Watchlist equities with fundamental and technical insights.</p>
          </div>
          
          <div className="flex w-full md:w-auto items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stock symbol or name..."
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-sm outline-none focus:ring-2 ring-blue-500 dark:focus:ring-blue-500/50 transition-all shadow-sm"
              />
            </div>

            {/* Refresh Button */}
            <button 
              onClick={fetchStocks} 
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-full transition-colors disabled:opacity-50 shadow-md shadow-blue-500/20"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-8">
            {error}
          </div>
        )}

        {/* Dense Screener-Style Data Table */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left border-collapse min-w-[1400px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  {renderHeader("Symbol", "symbol", false, true)}
                  {renderHeader("LTP (₹)", "price")}
                  {renderHeader("Change", "change")}
                  {renderHeader("% Change", "changePercent")}
                  {renderHeader("P/E", "pe")}
                  {renderHeader("EPS (12M)", "eps")}
                  {renderHeader("CMP/BV", "cmpBv")}
                  {renderHeader("Div Yield %", "divYield")}
                  {renderHeader("Prom. Hold %", "promHold")}
                  {renderHeader("Profit Growth %", "profitGrowth")}
                  {renderHeader("Sales Growth %", "salesGrowth")}
                  {renderHeader("Volume", "volume")}
                  {renderHeader("Market Cap", "marketCap")}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading && stocks.length === 0 ? (
                  Array.from({ length: 15 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-4 sticky left-0 bg-white dark:bg-slate-900 z-10"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24"></div></td>
                      {Array.from({ length: 12 }).map((_, j) => (
                        <td key={j} className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16 ml-auto"></div></td>
                      ))}
                    </tr>
                  ))
                ) : filteredAndSortedStocks.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-12 text-center text-slate-500 font-medium">
                      No matching stocks found. Try searching for another symbol or company.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedStocks.map((stock) => {
                    const isPositive = stock.change >= 0;
                    return (
                      <tr 
                        key={stock.symbol} 
                        onClick={() => router.push(`/watchlist/${encodeURIComponent(stock.symbol)}`)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                      >
                        {/* Sticky Stock Symbol Column */}
                        <td className="p-4 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:underline transition-colors">{stock.symbol.replace('.NS', '')}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[150px]">{stock.name}</div>
                        </td>
                        
                        {/* LTP (Last Traded Price) */}
                        <td className="p-4 text-right font-semibold text-slate-900 dark:text-white text-sm">
                          ₹{stock.price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        
                        {/* Price Change */}
                        <td className={`p-4 text-right font-medium text-sm ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                          <div className="flex items-center justify-end gap-1">
                            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {stock.change > 0 ? '+' : ''}{stock.change?.toFixed(2)}
                          </div>
                        </td>
                        
                        {/* Change Percent */}
                        <td className={`p-4 text-right font-semibold text-sm ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-opacity-10 ${isPositive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                            {stock.changePercent > 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                          </span>
                        </td>
                        
                        {/* P/E Ratio */}
                        <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-300 text-sm">
                          {stock.pe > 0 ? stock.pe.toFixed(2) : '--'}
                        </td>
                        
                        {/* EPS */}
                        <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-300 text-sm">
                          {stock.eps > 0 ? `₹${stock.eps.toFixed(2)}` : '--'}
                        </td>
                        
                        {/* CMP/BV */}
                        <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-300 text-sm">
                          {stock.cmpBv > 0 ? stock.cmpBv.toFixed(2) : '--'}
                        </td>
                        
                        {/* Dividend Yield */}
                        <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-300 text-sm">
                          {stock.divYield > 0 ? `${stock.divYield.toFixed(2)}%` : '0.00%'}
                        </td>
                        
                        {/* Promoter Holding */}
                        <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-300 text-sm">
                          {stock.promHold.toFixed(2)}%
                        </td>
                        
                        {/* Profit Growth */}
                        <td className={`p-4 text-right font-semibold text-sm ${stock.profitGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {stock.profitGrowth > 0 ? '+' : ''}{stock.profitGrowth.toFixed(2)}%
                        </td>
                        
                        {/* Sales Growth */}
                        <td className={`p-4 text-right font-semibold text-sm ${stock.salesGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {stock.salesGrowth > 0 ? '+' : ''}{stock.salesGrowth.toFixed(2)}%
                        </td>
                        
                        {/* Volume */}
                        <td className="p-4 text-right text-sm text-slate-600 dark:text-slate-400">
                          {(stock.volume / 100000).toFixed(2)}L
                        </td>
                        
                        {/* Market Capitalization */}
                        <td className="p-4 text-right font-semibold text-sm text-slate-900 dark:text-white">
                          ₹{(stock.marketCap / 10000000).toFixed(2)}Cr
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Help Info Banner */}
        <div className="mt-8 flex items-start gap-3 p-4 bg-blue-500/5 dark:bg-blue-500/10 rounded-2xl border border-blue-500/20 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-blue-600 dark:text-blue-400">Screener Pro Tip:</span> You can click on any column header to sort ascending or descending. The symbol column remains sticky on the left as you scroll horizontally. Fundamental data (P/E, EPS, Div Yield, CMP/BV) is compiled live from Yahoo Finance, while structural metrics (Promoter Holding, Profit/Sales Growth) are matched against latest reported filings.
          </div>
        </div>

      </div>
    </div>
  );
}
