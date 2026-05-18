"use client";

import React, { useEffect, useState, useCallback } from 'react';
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
  TrendingUp as StockIcon,
  Star
} from 'lucide-react';
import { DEFAULT_SYMBOLS } from '@/utils/symbols';

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
  isFavourite?: boolean;
}

interface BackendStock {
  symbol: string;
  name: string;
  isFavourite?: boolean;
}

interface LiveStock {
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

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export default function WatchlistPage() {
  const router = useRouter();

  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [sortField, setSortField] = useState<keyof StockData>('marketCap');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [apiFailed, setApiFailed] = useState(false);
  const [showFavouritesOnly, setShowFavouritesOnly] = useState(false);

  // Fetch stocks from the Mongoose backend and merge with live Yahoo Finance quotes
  const fetchStocksFromAPI = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setApiFailed(false);

      // 1. Try to fetch stocks from Express backend API
      let backendStocks: BackendStock[] = [];
      try {
        const backendRes = await fetch(`${BACKEND_API_URL}/stocks`);
        if (!backendRes.ok) throw new Error();
        backendStocks = await backendRes.json();
      } catch (err) {
        console.warn("Express backend failed - falling back to default stocks list", err);
        setApiFailed(true);
        // Clear local storage on API failure as requested
        if (typeof window !== 'undefined') {
          localStorage.removeItem('vision_watchlist');
        }
        
        // Build mock stocks list from default symbols
        backendStocks = DEFAULT_SYMBOLS.map(symbol => ({
          symbol,
          name: symbol.split('.')[0] + ' Ltd.',
          isFavourite: false
        }));
      }

      if (backendStocks.length === 0) {
        setStocks([]);
        setLoading(false);
        return;
      }

      const symbols = backendStocks.map(s => s.symbol);

      // 2. Fetch live metrics from Next.js Yahoo Finance API
      const liveRes = await fetch(`/api/watchlist?symbols=${encodeURIComponent(symbols.join(','))}`);
      if (!liveRes.ok) throw new Error('Live data fetch failed');
      const liveData = await liveRes.json();

      // 3. Merge Live Quote metrics with Backend details
      const mergedData = liveData.map((liveStock: LiveStock) => {
        const backendStock = backendStocks.find(
          (s: BackendStock) => s.symbol.toUpperCase() === liveStock.symbol.toUpperCase()
        );
        return {
          ...liveStock,
          name: backendStock ? backendStock.name : liveStock.name,
          isFavourite: backendStock ? !!backendStock.isFavourite : false
        };
      });

      setStocks(mergedData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong while fetching watchlist');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch stocks on mount and schedule live updates every 60s
  useEffect(() => {
    Promise.resolve().then(() => {
      fetchStocksFromAPI();
    });
    const interval = setInterval(fetchStocksFromAPI, 60000);
    return () => clearInterval(interval);
  }, [fetchStocksFromAPI]);

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
    if (stocks.some(s => s.symbol.toUpperCase() === formattedSym.toUpperCase())) {
      setAddError(`${cleanSym} is already in your watchlist.`);
      return;
    }

    try {
      setAddLoading(true);
      // 1. Validate symbol using Next.js live Yahoo Finance API
      const res = await fetch(`/api/watchlist?symbols=${formattedSym}`);
      if (!res.ok) throw new Error();
      const testData = await res.json();

      if (!testData || testData.length === 0) {
        setAddError(`Symbol ${cleanSym} not found. Please verify standard Yahoo Finance tickers.`);
        return;
      }

      const validatedStock = testData[0];

      // 2. Add to Mongoose backend API (if online)
      let dbStock = { symbol: validatedStock.symbol, name: validatedStock.name, isFavourite: false };
      if (!apiFailed) {
        try {
          const backendPostRes = await fetch(`${BACKEND_API_URL}/stocks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              symbol: validatedStock.symbol,
              name: validatedStock.name,
              isFavourite: false
            })
          });
          if (backendPostRes.ok) {
            dbStock = await backendPostRes.json();
          } else {
            const errData = await backendPostRes.json();
            throw new Error(errData.error || 'Failed to add stock to backend database');
          }
        } catch (backendErr) {
          console.error('Backend save error:', backendErr);
          setAddError('Database save failed, operating locally');
        }
      }

      // Add to state list
      const nextStock: StockData = {
        ...validatedStock,
        name: dbStock.name,
        isFavourite: !!dbStock.isFavourite
      };
      setStocks(prev => [nextStock, ...prev]);
      setNewSymbol('');
    } catch {
      setAddError(`Failed to fetch validation stats for ${cleanSym}.`);
    } finally {
      setAddLoading(false);
    }
  };

  // Toggle Favourite Status
  const handleToggleFavourite = async (symbolToToggle: string, currentFavStatus: boolean) => {
    try {
      const nextFavStatus = !currentFavStatus;

      // 1. Optimistic UI update
      setStocks(prev => prev.map(s => {
        if (s.symbol.toUpperCase() === symbolToToggle.toUpperCase()) {
          return { ...s, isFavourite: nextFavStatus };
        }
        return s;
      }));

      // 2. Call backend if online
      if (!apiFailed) {
        const res = await fetch(`${BACKEND_API_URL}/stocks/${encodeURIComponent(symbolToToggle)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isFavourite: nextFavStatus })
        });
        if (!res.ok) {
          throw new Error('Failed to toggle favourite status in database');
        }
      }
    } catch (err) {
      console.error('Toggle favorite error:', err);
      // Revert optimistic update on failure
      setStocks(prev => prev.map(s => {
        if (s.symbol.toUpperCase() === symbolToToggle.toUpperCase()) {
          return { ...s, isFavourite: currentFavStatus };
        }
        return s;
      }));
      alert(err instanceof Error ? err.message : 'Failed to update favorite status');
    }
  };

  // Delete dynamic ticker action
  const handleDeleteStock = async (symToDelete: string) => {
    if (!confirm(`Are you sure you want to delete ${symToDelete.split('.')[0]} from the watchlist?`)) return;

    try {
      // 1. Call backend if online
      if (!apiFailed) {
        const res = await fetch(`${BACKEND_API_URL}/stocks/${encodeURIComponent(symToDelete)}`, {
          method: 'DELETE'
        });
        if (!res.ok) {
          throw new Error('Failed to delete stock from database');
        }
      }

      // 2. Update local state
      setStocks(prev => prev.filter(s => s.symbol.toLowerCase() !== symToDelete.toLowerCase()));
    } catch (err) {
      console.error('Delete stock error:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete stock');
    }
  };

  // Reset watchlist back to standard institutional defaults
  const handleResetWatchlist = async () => {
    if (!window.confirm("Are you sure you want to restore the default institutional-grade stock watchlist?")) return;

    try {
      setLoading(true);
      if (!apiFailed) {
        // Delete all current stocks
        await Promise.all(
          stocks.map(s =>
            fetch(`${BACKEND_API_URL}/stocks/${encodeURIComponent(s.symbol)}`, { method: 'DELETE' }).catch(() => {})
          )
        );

        // Add back the default institutional-grade seed list
        const defaultSeeds = [
          { symbol: 'VOLTAMP.NS', name: 'Voltamp Transformers Ltd.' },
          { symbol: 'TDPOWERSYS.NS', name: 'TD Power Systems Ltd.' },
          { symbol: 'TARIL.NS', name: 'Transformers & Rectifiers (India) Ltd.' },
          { symbol: 'PRECWIRE.NS', name: 'Precision Wires India Ltd.' },
          { symbol: 'MAZDOCK.NS', name: 'Mazagon Dock Shipbuilders Ltd.' },
          { symbol: 'KIRLOSENG.NS', name: 'Kirloskar Oil Engines Ltd.' },
          { symbol: 'HSCL.NS', name: 'Himadri Speciality Chemical Ltd.' },
          { symbol: 'HFCL.NS', name: 'HFCL Ltd.' },
          { symbol: 'E2E.NS', name: 'E2E Networks Ltd.' },
          { symbol: 'BECTORFOOD.NS', name: 'Mrs. Bectors Food Specialities Ltd.' },
          { symbol: 'AURIONPRO.NS', name: 'Aurionpro Solutions Ltd.' },
          { symbol: 'KEI.NS', name: 'KEI Industries Ltd.' },
          { symbol: 'COFORGE.NS', name: 'Coforge Ltd.' },
          { symbol: 'MANORAMA.NS', name: 'Manorama Industries Ltd.' },
          { symbol: 'ZENTEC.NS', name: 'Zen Technologies Ltd.' },
          { symbol: 'APARINDS.NS', name: 'Apar Industries Ltd.' },
          { symbol: 'SHILCTECH.NS', name: 'Shilpa Medicare Ltd.' },
          { symbol: 'INOXINDIA.NS', name: 'Inox India Ltd.' },
          { symbol: 'KRN.NS', name: 'KRN Heat Exchanger and Refrigeration Ltd.' },
          { symbol: 'IDEAFORGE.NS', name: 'ideaForge Technology Ltd.' },
          { symbol: 'GRSE.NS', name: 'Garden Reach Shipbuilders & Engineers Ltd.' },
          { symbol: 'PARAS.NS', name: 'Paras Defence and Space Technologies Ltd.' },
          { symbol: 'ASTRAMICRO.NS', name: 'Astra Microwave Products Ltd.' },
          { symbol: 'SYRMA.NS', name: 'Syrma SGS Technology Ltd.' },
          { symbol: 'KAYNES.NS', name: 'Kaynes Technology India Ltd.' },
          { symbol: 'AEROFLEX.NS', name: 'Aeroflex Industries Ltd.' },
          { symbol: 'KMEW.NS', name: 'Knowledge Marine & Export Works Ltd.' },
          { symbol: 'GVT&D.NS', name: 'GE Vernova T&D India Ltd.' },
          { symbol: 'CGPOWER.NS', name: 'CG Power & Industrial Solutions Ltd.' },
          { symbol: 'APOLLO.NS', name: 'Apollo Hospitals Enterprise Ltd.' },
          { symbol: 'UNIMECH.NS', name: 'Unimech Aerospace and Manufacture Ltd.' },
          { symbol: 'DATAPATTNS.NS', name: 'Data Patterns (India) Ltd.' },
          { symbol: 'MTARTECH.NS', name: 'MTAR Technologies Ltd.' },
          { symbol: 'NETWEB.NS', name: 'Netweb Technologies India Ltd.' }
        ];

        await Promise.all(
          defaultSeeds.map(item =>
            fetch(`${BACKEND_API_URL}/stocks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ symbol: item.symbol, name: item.name, isFavourite: false })
            }).catch(() => {})
          )
        );
      }
      await fetchStocksFromAPI();
    } catch (err) {
      console.error('Reset watchlist error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedStocks = stocks
    .filter(stock => {
      const matchesSearch = stock.symbol.toLowerCase().includes(search.toLowerCase()) || 
                           stock.name.toLowerCase().includes(search.toLowerCase());
      const matchesFav = showFavouritesOnly ? !!stock.isFavourite : true;
      return matchesSearch && matchesFav;
    })
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
              Build and curate your own portfolio workspace in real-time. Dynamic search, live ticker validators, persistent backend watchlist reloads, and tabular CSV exports.
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

        {/* Watchlist Mode Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-slate-200/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md">
          <button
            type="button"
            onClick={() => setShowFavouritesOnly(false)}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
              !showFavouritesOnly
                ? 'bg-white dark:bg-slate-800 text-blue-500 dark:text-blue-400 shadow-md border border-slate-200/20'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All Watchlist ({stocks.length})
          </button>
          <button
            type="button"
            onClick={() => setShowFavouritesOnly(true)}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              showFavouritesOnly
                ? 'bg-white dark:bg-slate-800 text-yellow-500 shadow-md border border-slate-200/20'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            ★ Starred Favorites ({stocks.filter(s => s.isFavourite).length})
          </button>
        </div>

        {apiFailed && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-extrabold rounded-2xl flex items-center justify-between animate-pulse max-w-md">
            <span>⚠️ MongoDB Database API Offline</span>
            <span className="text-[10px] bg-red-500/25 px-2 py-0.5 rounded-full uppercase">Local Mode</span>
          </div>
        )}

        {/* Live table list */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          {loading && stocks.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-slate-500 text-sm font-semibold">Compiling live database portfolio valuations...</p>
            </div>
          ) : error && stocks.length === 0 ? (
            <div className="p-20 text-center text-red-500 font-semibold">{error}</div>
          ) : filteredAndSortedStocks.length === 0 ? (
            <div className="p-20 text-center text-slate-500 font-semibold">
              {showFavouritesOnly 
                ? "No starred favorite stocks found. Star your key tickers to filter them here!"
                : "Your watchlist is empty. Add standard Yahoo Finance tickers above to build your custom portfolio."
              }
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
                        {/* Ticker link to detailed cockpit with favorite toggle */}
                        <td className="p-4 font-bold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-850/60 z-10 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleToggleFavourite(stock.symbol, !!stock.isFavourite)}
                              className={`p-1 rounded-lg transition-all hover:scale-115 ${
                                stock.isFavourite
                                  ? 'text-yellow-450 hover:text-yellow-500'
                                  : 'text-slate-300 dark:text-slate-700 hover:text-slate-500'
                              }`}
                              title={stock.isFavourite ? "Remove from Favourites" : "Mark as Favourite"}
                            >
                              <Star className={`w-4 h-4 ${stock.isFavourite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                            </button>
                            <span 
                              onClick={() => router.push(`/watchlist/${encodeURIComponent(stock.symbol)}`)}
                              className="text-slate-950 dark:text-slate-100 hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer underline"
                            >
                              {stock.symbol.replace('.NS', '')}
                            </span>
                          </div>
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
            <span className="font-semibold text-blue-600 dark:text-blue-400">Stock Market Disclaimer:</span> Investment in securities market are subject to market risks, read all the related documents carefully before investing. Fundamental ratio analysis and technical indicators presented on this cockpit are fetched dynamically from active database corporate filings and standard market quote tickers in real-time. Past performance is not indicative of future investment returns.
          </div>
        </div>

      </div>
    </div>
  );
}
