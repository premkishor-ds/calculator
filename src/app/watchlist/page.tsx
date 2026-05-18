"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Plus, 
  Trash2, 
  AlertCircle,
  TrendingUp as StockIcon
} from 'lucide-react';

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

const DEFAULT_SYMBOLS = [
  'VOLTAMP.NS',
  'TDPOWERSYS.NS',
  'TARIL.NS',
  'PRECWIRE.NS',
  'MAZDOCK.NS',
  'KIRLOSENG.NS',
  'HSCL.NS',
  'HFCL.NS',
  'E2E.NS',
  'BECTORFOOD.NS',
  'AURIONPRO.NS',
  'KEI.NS',
  'COFORGE.NS',
  'MANORAMA.NS',
  'ZENTEC.NS',
  'APARINDS.NS',
  'SHILCTECH.NS',
  'INOXINDIA.NS',
  'KRN.NS',
  'IDEAFORGE.NS',
  'GRSE.NS',
  'PARAS.NS',
  'ASTRAMICRO.NS',
  'SYRMA.NS',
  'KAYNES.NS',
  'AEROFLEX.NS',
  'KMEW.NS',
  'GVT&D.NS',
  'CGPOWER.NS',
  'APOLLO.NS',
  'UNIMECH.NS',
  'DATAPATTNS.NS',
  'MTARTECH.NS',
  'NETWEB.NS'
];

export default function WatchlistPage() {
  const router = useRouter();
  
  // Initialize watchlist directly from localStorage during creation to prevent mount flash and synchronous updates
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vision_watchlist');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch {
          // Fallback
        }
      }
    }
    return DEFAULT_SYMBOLS;
  });

  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Custom interactive search and add state
  const [search, setSearch] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState<keyof StockData>('marketCap');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sync initial seed with localStorage if it is not set
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('vision_watchlist')) {
      localStorage.setItem('vision_watchlist', JSON.stringify(DEFAULT_SYMBOLS));
    }
  }, []);

  // Fetch stocks when watchlist state updates
  useEffect(() => {
    const fetchStocks = async () => {
      if (watchlist.length === 0) {
        setStocks([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/watchlist?symbols=${watchlist.join(',')}`);
        if (!res.ok) throw new Error('Failed to fetch live stock data');
        const data = await res.json();
        setStocks(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
    const interval = setInterval(fetchStocks, 60000);
    return () => clearInterval(interval);
  }, [watchlist]);

  const handleSort = (field: keyof StockData) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Add custom ticker dynamic action
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    const cleanSym = newSymbol.trim().toUpperCase();
    if (!cleanSym) return;

    // Check formatting, append .NS if not specified for Indian stocks by default
    const formattedSym = cleanSym.includes('.') ? cleanSym : `${cleanSym}.NS`;

    // Prevent duplicate entries
    if (watchlist.map(s => s.toUpperCase()).includes(formattedSym)) {
      setAddError(`${cleanSym} is already in your watchlist.`);
      return;
    }

    try {
      setAddLoading(true);
      // Validate symbol using the API route
      const res = await fetch(`/api/watchlist?symbols=${formattedSym}`);
      if (!res.ok) throw new Error();
      const testData = await res.json();

      if (!testData || testData.length === 0) {
        setAddError(`Symbol ${cleanSym} not found. Please verify standard Yahoo Finance tickers.`);
        return;
      }

      // Add to list and persist
      const updatedList = [...watchlist, formattedSym];
      setWatchlist(updatedList);
      localStorage.setItem('vision_watchlist', JSON.stringify(updatedList));
      setNewSymbol('');
    } catch {
      setAddError(`Failed to fetch validation stats for ${cleanSym}.`);
    } finally {
      setAddLoading(false);
    }
  };

  // Delete dynamic ticker action
  const handleDeleteStock = (symToDelete: string) => {
    const updatedList = watchlist.filter(s => s.toLowerCase() !== symToDelete.toLowerCase());
    setWatchlist(updatedList);
    localStorage.setItem('vision_watchlist', JSON.stringify(updatedList));
  };

  // Reset to default portfolio
  const handleResetWatchlist = () => {
    if (window.confirm("Are you sure you want to restore the default institutional-grade stock watchlist?")) {
      setWatchlist(DEFAULT_SYMBOLS);
      localStorage.setItem('vision_watchlist', JSON.stringify(DEFAULT_SYMBOLS));
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
            <ChevronUp className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
          )}
        </div>
      </th>
    );
  };

  // CSV Export utility
  const handleExportCSV = () => {
    if (stocks.length === 0) return;
    const headers = ["Ticker", "Company Name", "Price (INR)", "Change (%)", "Market Cap (Cr)", "P/E", "ROE (%)", "Debt-to-Equity"];
    const rows = filteredAndSortedStocks.map(s => [
      s.symbol.replace('.NS', ''),
      s.name,
      s.price.toFixed(2),
      s.changePercent.toFixed(2),
      (s.marketCap / 10000000).toFixed(2),
      s.pe > 0 ? s.pe.toFixed(2) : 'N/A',
      s.profitGrowth.toFixed(2),
      (s.cmpBv).toFixed(2)
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vision_wealth_screener.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans pb-20">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 max-w-[1600px] mx-auto">
        
        {/* Page title and description */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StockIcon className="w-6 h-6 text-blue-500 animate-pulse" />
              <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Active Stock Research Cockpit</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Institutional Screener
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xl font-medium leading-relaxed">
              Build and curate your own portfolio workspace in real-time. Dynamic search, live ticker validators, persistent browser watchlist reloads, and tabular CSV exports.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <button 
              onClick={handleExportCSV}
              disabled={stocks.length === 0}
              className="flex-1 md:flex-initial px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-2xl text-xs font-bold transition-all shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]"
            >
              Export Screener to CSV
            </button>
            <button 
              onClick={handleResetWatchlist}
              className="flex-1 md:flex-initial px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-850 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all active:scale-[0.98]"
            >
              Reset Default Portfolio
            </button>
          </div>
        </div>

        {/* Dynamic add search dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick search filter */}
          <div className="lg:col-span-2 relative bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-center">
            <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">Quick Filter Watchlist</label>
            <div className="relative">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filter currently active symbols or company names..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-slate-850 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Inline stock validator symbol form */}
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
            <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">Add New Stock Ticker</label>
            <form onSubmit={handleAddStock} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="e.g. TCS, HDFCBANK, INFY"
                  value={newSymbol}
                  onChange={(e) => {
                    setNewSymbol(e.target.value);
                    setAddError('');
                  }}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-bold uppercase text-slate-850 dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                disabled={addLoading || !newSymbol.trim()}
                className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white rounded-2xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-1 min-w-[70px] active:scale-[0.95]"
              >
                {addLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Add</>}
              </button>
            </form>

            {addError && (
              <div className="mt-3 flex items-start gap-1.5 text-xs text-red-500 font-semibold leading-relaxed">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{addError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Live table list */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          {loading && stocks.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-slate-500 text-sm font-semibold">Compiling live portfolio valuations...</p>
            </div>
          ) : error && stocks.length === 0 ? (
            <div className="p-20 text-center text-red-500 font-semibold">{error}</div>
          ) : watchlist.length === 0 ? (
            <div className="p-20 text-center text-slate-500 font-semibold">
              Your watchlist is empty. Add standard Yahoo Finance tickers above to build your custom portfolio.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                    {renderHeader("Ticker Symbol", "symbol", false, true)}
                    {renderHeader("Company Name", "name", false)}
                    {renderHeader("Price (INR)", "price")}
                    {renderHeader("Change (%)", "changePercent")}
                    {renderHeader("Mkt Cap (Cr)", "marketCap")}
                    {renderHeader("P/E Ratio", "pe")}
                    {renderHeader("EPS (12M)", "eps")}
                    {renderHeader("CMP/BV", "cmpBv")}
                    {renderHeader("Div Yield (%)", "divYield")}
                    {renderHeader("Promoter (%)", "promHold")}
                    {renderHeader("Profit Gr. (%)", "profitGrowth")}
                    {renderHeader("Sales Gr. (%)", "salesGrowth")}
                    <th className="p-4 text-center font-bold text-xs uppercase tracking-wider text-slate-500 select-none">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-sm font-sans">
                  {filteredAndSortedStocks.map((stock, idx) => {
                    const isPositive = stock.change >= 0;
                    return (
                      <tr 
                        key={idx} 
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group"
                      >
                        {/* Ticker link to detailed cockpit */}
                        <td className="p-4 font-bold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-850/60 z-10 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          <span 
                            onClick={() => router.push(`/watchlist/${encodeURIComponent(stock.symbol)}`)}
                            className="text-slate-950 dark:text-slate-100 hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer underline"
                          >
                            {stock.symbol.replace('.NS', '')}
                          </span>
                        </td>
                        <td className="p-4 font-medium text-slate-500 dark:text-slate-400">{stock.name}</td>
                        <td className="p-4 text-right font-bold">₹{stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className={`p-4 text-right font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                          <span className="flex items-center justify-end gap-1">
                            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            <span>{isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                          </span>
                        </td>
                        <td className="p-4 text-right font-medium">₹{(stock.marketCap / 10000000).toFixed(2)}Cr</td>
                        <td className="p-4 text-right font-medium">{stock.pe > 0 ? stock.pe.toFixed(2) : '--'}</td>
                        <td className="p-4 text-right font-medium">₹{stock.eps > 0 ? stock.eps.toFixed(2) : '--'}</td>
                        <td className="p-4 text-right font-medium">{stock.cmpBv > 0 ? stock.cmpBv.toFixed(2) : '--'}</td>
                        <td className="p-4 text-right font-medium">{stock.divYield > 0 ? `${stock.divYield.toFixed(2)}%` : '0.00%'}</td>
                        <td className="p-4 text-right font-medium">{stock.promHold > 0 ? `${stock.promHold.toFixed(2)}%` : '--'}</td>
                        <td className={`p-4 text-right font-semibold ${stock.profitGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {stock.profitGrowth !== 0 ? `${stock.profitGrowth.toFixed(2)}%` : '--'}
                        </td>
                        <td className={`p-4 text-right font-semibold ${stock.salesGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {stock.salesGrowth !== 0 ? `${stock.salesGrowth.toFixed(2)}%` : '--'}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteStock(stock.symbol)}
                            className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-xl transition-all active:scale-[0.90]"
                            title={`Remove ${stock.symbol.replace('.NS', '')} from watchlist`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Dynamic Disclaimer Banner */}
        <div className="mt-8 flex items-start gap-3 p-4 bg-blue-500/5 dark:bg-blue-500/10 rounded-2xl border border-blue-500/20 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-blue-600 dark:text-blue-400">Stock Market Disclaimer:</span> Investment in securities market are subject to market risks, read all the related documents carefully before investing. Fundamental ratio analysis and technical indicators presented on this cockpit are fetched dynamically from active corporate filings and standard market quote tickers in real-time. Past performance is not indicative of future investment returns.
          </div>
        </div>

      </div>
    </div>
  );
}
