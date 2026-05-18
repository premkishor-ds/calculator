"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { DEFAULT_SYMBOLS } from '@/utils/symbols';

/* Dynamically import the chart so it's client-only (no SSR) */
const AdvancedChart = dynamic(() => import('@/components/AdvancedChart'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Initialising Chart Engine…</span>
      </div>
    </div>
  ),
});

interface StockQuote {
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

export default function TradingTerminalPage() {
  /* ── State ─────────────────────────────────────────────────── */
  const [watchlistStocks,  setWatchlistStocks]  = useState<StockQuote[]>([]);
  const [selectedSymbol,   setSelectedSymbol]   = useState<string>('CGPOWER.NS');
  const [searchQuery,      setSearchQuery]       = useState('');
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [chartRange,       setChartRange]        = useState('1Y');
  const [chartMode,        setChartMode]         = useState<'price' | 'pe'>('price');
  const [terminalSearch,   setTerminalSearch]    = useState('');
  const [terminalSearchError, setTerminalSearchError] = useState('');
  const [terminalSearching, setTerminalSearching] = useState(false);
  
  // Expanded dynamic technical & fundamental analysis panel state
  const [deepData,         setDeepData]         = useState<any>(null);
  const [deepLoading,      setDeepLoading]      = useState(false);
  const [activeTab,        setActiveTab]        = useState<'technicals' | 'fundamentals' | 'profile' | 'proscons' | 'strategy'>('technicals');

  /* Derived */
  const selectedStock = watchlistStocks.find(s => s.symbol === selectedSymbol) || null;

  /* ── Load watchlist ────────────────────────────────────────── */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setWatchlistLoading(true);
        let symbols = DEFAULT_SYMBOLS as string[];
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('vision_watchlist');
          if (saved) {
            try {
              const p = JSON.parse(saved);
              if (Array.isArray(p) && p.length > 0) symbols = p;
            } catch {}
          }
        }
        const res  = await fetch(`/api/watchlist?symbols=${encodeURIComponent(symbols.join(','))}`);
        const data = await res.json();
        if (active) {
          setWatchlistStocks(data);
          const def = data.find((s: StockQuote) => s.symbol === 'CGPOWER.NS');
          setSelectedSymbol(def ? 'CGPOWER.NS' : data[0]?.symbol ?? 'CGPOWER.NS');
        }
      } catch (err) {
        console.error('Watchlist load error:', err);
      } finally {
        if (active) setWatchlistLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  /* ── Terminal search ───────────────────────────────────────── */
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalSearch.trim()) return;
    const raw = terminalSearch.trim().toUpperCase();
    const sym = raw.includes('.') ? raw : `${raw}.NS`;
    if (sym === selectedSymbol) { setTerminalSearch(''); return; }
    try {
      setTerminalSearching(true);
      setTerminalSearchError('');
      const res  = await fetch(`/api/watchlist?symbols=${encodeURIComponent(sym)}`);
      if (!res.ok) throw new Error('Ticker not found.');
      const data = await res.json();
      if (!data?.length) throw new Error('No quote returned.');
      const stock = data[0];
      setSelectedSymbol(stock.symbol);
      if (!watchlistStocks.some(s => s.symbol === stock.symbol)) {
        const next = [stock, ...watchlistStocks];
        setWatchlistStocks(next);
        if (typeof window !== 'undefined')
          localStorage.setItem('vision_watchlist', JSON.stringify(next.map(s => s.symbol)));
      }
      setTerminalSearch('');
    } catch (err: unknown) {
      setTerminalSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setTerminalSearching(false);
    }
  };

  /* ── Load Deep Data ────────────────────────────────────────── */
  useEffect(() => {
    if (!selectedSymbol) return;
    let active = true;
    (async () => {
      try {
        setDeepLoading(true);
        const res = await fetch(`/api/watchlist/${encodeURIComponent(selectedSymbol)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (active) {
          setDeepData(data);
        }
      } catch (err) {
        console.error("Deep fetch error:", err);
      } finally {
        if (active) setDeepLoading(false);
      }
    })();
    return () => { active = false; };
  }, [selectedSymbol]);

  const filteredWatchlist = watchlistStocks.filter(s =>
    s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="min-h-dvh lg:h-dvh lg:overflow-hidden bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-slate-950 border-b border-slate-800 shadow-md shrink-0 safe-top">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link href="/watchlist" className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white touch-manipulation shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent font-extrabold text-lg sm:text-xl tracking-tight truncate">
              VISION TERMINAL
            </span>
            <span className="hidden md:inline-block px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-extrabold rounded-full tracking-wide shrink-0">
              PRO
            </span>
          </div>
        </div>

        {/* Symbol search */}
        <form onSubmit={handleSearch} className="relative w-full sm:w-auto sm:flex-1 sm:max-w-xs order-last sm:order-none basis-full sm:basis-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search ticker (e.g. INFY, TATAMOTORS)…"
            value={terminalSearch}
            onChange={e => setTerminalSearch(e.target.value)}
            disabled={terminalSearching}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 focus:border-blue-500/50 rounded-xl text-xs font-semibold placeholder:text-slate-600 text-slate-100 focus:outline-none transition-all"
          />
          {terminalSearching && (
            <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-500 animate-spin" />
          )}
          {terminalSearchError && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-red-500/10 border border-red-500/20 text-red-400 p-2 rounded-xl text-[10px] font-bold z-50 text-center">
              {terminalSearchError}
            </div>
          )}
        </form>

        <div className="hidden sm:flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-extrabold rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
            Live Markets
          </span>
        </div>
      </header>

      {/* ── Main Grid ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 lg:overflow-hidden min-h-0">

        {/* LEFT: Advanced Chart + Stock Info */}
        <section className="lg:col-span-9 flex flex-col min-h-[52dvh] lg:min-h-0 lg:overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950">

          {/* Stock header strip */}
          {selectedStock ? (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-950 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-lg">
                  {selectedStock.symbol.split('.')[0].slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-extrabold text-base text-white">{selectedStock.name}</h1>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold rounded border border-slate-700">
                      {selectedStock.symbol}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">NSE • INR</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-xl font-black text-white">₹{selectedStock.price.toLocaleString('en-IN')}</div>
                  <div className={`flex items-center gap-1 text-xs font-bold mt-0.5 justify-end ${selectedStock.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {selectedStock.change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change.toFixed(2)}
                    <span>({selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%)</span>
                  </div>
                </div>
                <Link
                  href={`/watchlist/${encodeURIComponent(selectedStock.symbol)}`}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md group"
                >
                  Full Report <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="px-5 py-3 border-b border-slate-800 shrink-0">
              <div className="h-10 w-48 bg-slate-800 rounded-xl animate-pulse" />
            </div>
          )}

          {/* ── Advanced Chart (flex-1 fills remaining height) ── */}
          <div className="flex-1 min-h-[320px] lg:min-h-0 relative w-full h-full">
            {selectedSymbol && (
              <AdvancedChart
                symbol={selectedSymbol}
                chartRange={chartRange}
                onRangeChange={setChartRange}
                chartMode={chartMode}
                onModeChange={setChartMode}
              />
            )}
          </div>

          {/* Detailed Intelligence Dashboard Strip */}
          {selectedStock && (
            <div className="flex flex-col bg-slate-950 border-t border-slate-800 shrink-0 select-none">
              
              {/* Tab selector bar */}
              <div className="flex items-center justify-between border-b border-slate-900 bg-slate-950/80 px-4 py-1 shrink-0 overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-1.5 min-w-0">
                  {[
                    { id: 'technicals', label: '📈 Technicals' },
                    { id: 'fundamentals', label: '📊 Fundamentals' },
                    { id: 'profile', label: '🏢 Profile' },
                    { id: 'proscons', label: '✔️ Pros & Cons' },
                    { id: 'strategy', label: '🎯 Strategy' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all shrink-0 ${
                        activeTab === tab.id
                          ? 'bg-slate-900 text-blue-400 border border-blue-500/20'
                          : 'text-slate-500 hover:text-slate-350'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Micro quote details */}
                <div className="hidden sm:flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0">
                  <div>Mkt Cap: <span className="text-white">₹{(selectedStock.marketCap / 10000000).toFixed(0)}Cr</span></div>
                  <div>P/E: <span className="text-purple-400">{selectedStock.pe > 0 ? selectedStock.pe.toFixed(1) : '—'}</span></div>
                  <div>P/BV: <span className="text-white">{selectedStock.cmpBv > 0 ? `${selectedStock.cmpBv}x` : '—'}</span></div>
                </div>
              </div>

              {/* Tab contents panel (Fixed height with scroll safety) */}
              <div className="h-[120px] overflow-y-auto p-4 bg-slate-950/40 text-slate-100 scrollbar-none">
                {deepLoading ? (
                  <div className="h-full flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                      Querying complete corporate intelligence...
                    </span>
                  </div>
                ) : (
                  <>
                    {/* TECHNICALS TAB */}
                    {activeTab === 'technicals' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div className="bg-slate-900/40 border border-slate-900 p-2.5 rounded-xl">
                          <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest block">50-Day SMA</span>
                          <p className="font-extrabold text-slate-100 mt-1">
                            {deepData?.ratios?.fiftyDayAverage ? `₹${deepData.ratios.fiftyDayAverage.toFixed(1)}` : '—'}
                          </p>
                          {deepData?.ratios?.fiftyDayAverage && (
                            <span className={`text-[9px] font-extrabold block mt-0.5 ${
                              selectedStock.price >= deepData.ratios.fiftyDayAverage ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {((selectedStock.price - deepData.ratios.fiftyDayAverage) / deepData.ratios.fiftyDayAverage * 100).toFixed(1)}% vs Avg
                            </span>
                          )}
                        </div>

                        <div className="bg-slate-900/40 border border-slate-900 p-2.5 rounded-xl">
                          <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest block">200-Day SMA</span>
                          <p className="font-extrabold text-slate-100 mt-1">
                            {deepData?.ratios?.twoHundredDayAverage ? `₹${deepData.ratios.twoHundredDayAverage.toFixed(1)}` : '—'}
                          </p>
                          {deepData?.ratios?.twoHundredDayAverage && (
                            <span className={`text-[9px] font-extrabold block mt-0.5 ${
                              selectedStock.price >= deepData.ratios.twoHundredDayAverage ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {((selectedStock.price - deepData.ratios.twoHundredDayAverage) / deepData.ratios.twoHundredDayAverage * 100).toFixed(1)}% vs Avg
                            </span>
                          )}
                        </div>

                        <div className="bg-slate-900/40 border border-slate-900 p-2.5 rounded-xl col-span-2">
                          <div className="flex justify-between items-center text-[9px] text-slate-500 font-extrabold uppercase tracking-widest">
                            <span>52-Week High/Low</span>
                            <span className="text-slate-400 font-bold">
                              H: ₹{deepData?.ratios?.fiftyTwoWeekHigh?.toFixed(0)} | L: ₹{deepData?.ratios?.fiftyTwoWeekLow?.toFixed(0)}
                            </span>
                          </div>
                          
                          {/* Visual high to low progress bar */}
                          {deepData?.ratios?.fiftyTwoWeekHigh && deepData?.ratios?.fiftyTwoWeekLow && (
                            <div className="mt-2.5">
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
                                <div 
                                  className="absolute bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full"
                                  style={{
                                    left: '0%',
                                    width: `${Math.min(100, Math.max(0, 
                                      ((selectedStock.price - deepData.ratios.fiftyTwoWeekLow) / 
                                      (deepData.ratios.fiftyTwoWeekHigh - deepData.ratios.fiftyTwoWeekLow)) * 100
                                    ))}%`
                                  }}
                                />
                              </div>
                              <div className="flex justify-between items-center text-[8px] text-slate-500 font-extrabold mt-1">
                                <span>Low ({((selectedStock.price - deepData.ratios.fiftyTwoWeekLow) / deepData.ratios.fiftyTwoWeekLow * 100).toFixed(0)}% Up)</span>
                                <span>High ({((deepData.ratios.fiftyTwoWeekHigh - selectedStock.price) / selectedStock.price * 100).toFixed(0)}% Down)</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* FUNDAMENTALS TAB */}
                    {activeTab === 'fundamentals' && (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-xs">
                        <div className="bg-slate-900/40 border border-slate-900 p-2 text-center rounded-xl">
                          <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block">ROE</span>
                          <span className="font-extrabold text-white mt-0.5 block">
                            {deepData?.ratios?.roe ? `${deepData.ratios.roe.toFixed(1)}%` : '—'}
                          </span>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-900 p-2 text-center rounded-xl">
                          <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block">ROA</span>
                          <span className="font-extrabold text-white mt-0.5 block">
                            {deepData?.ratios?.roa ? `${deepData.ratios.roa.toFixed(1)}%` : '—'}
                          </span>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-900 p-2 text-center rounded-xl">
                          <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block">Debt/Eq</span>
                          <span className={`font-extrabold mt-0.5 block ${
                            (deepData?.ratios?.debtToEquity / 100) > 1.5 ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            {deepData?.ratios?.debtToEquity !== undefined ? (deepData.ratios.debtToEquity / 100).toFixed(2) : '—'}
                          </span>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-900 p-2 text-center rounded-xl">
                          <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block">Profit Margin</span>
                          <span className="font-extrabold text-emerald-400 mt-0.5 block">
                            {deepData?.ratios?.profitMargin ? `${deepData.ratios.profitMargin.toFixed(1)}%` : '—'}
                          </span>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-900 p-2 text-center rounded-xl">
                          <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block">Profit Growth</span>
                          <span className={`font-extrabold mt-0.5 block ${
                            selectedStock.profitGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {selectedStock.profitGrowth !== 0 ? `${selectedStock.profitGrowth}%` : '—'}
                          </span>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-900 p-2 text-center rounded-xl">
                          <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block">Sales Growth</span>
                          <span className={`font-extrabold mt-0.5 block ${
                            selectedStock.salesGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {selectedStock.salesGrowth !== 0 ? `${selectedStock.salesGrowth}%` : '—'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed">
                        <div className="space-y-1 bg-slate-900/40 border border-slate-900 p-2.5 rounded-xl">
                          <div>Sector: <span className="text-white font-extrabold">{deepData?.profile?.sector || '—'}</span></div>
                          <div>Industry: <span className="text-white font-extrabold">{deepData?.profile?.industry || '—'}</span></div>
                          {deepData?.profile?.employees > 0 && (
                            <div>Employees: <span className="text-white font-extrabold">{deepData.profile.employees.toLocaleString()}</span></div>
                          )}
                        </div>
                        <div className="md:col-span-2 text-[10px] text-slate-400 bg-slate-900/20 border border-slate-900/50 p-2.5 rounded-xl max-h-[90px] overflow-y-auto scrollbar-none font-medium">
                          <span className="font-extrabold text-slate-350 block mb-1">Company Summary:</span>
                          {deepData?.profile?.summary || 'No description available for this ticker.'}
                        </div>
                      </div>
                    )}

                    {/* PROS & CONS TAB */}
                    {activeTab === 'proscons' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] leading-relaxed">
                        <div className="bg-slate-900/30 border border-slate-900/50 p-2.5 rounded-xl">
                          <span className="text-emerald-400 font-extrabold uppercase block mb-1">Strengths / Advantages</span>
                          <ul className="space-y-1 text-slate-400 font-medium list-disc list-inside">
                            {deepData?.pros?.length ? (
                              deepData.pros.slice(0, 3).map((p: string, idx: number) => (
                                <li key={idx} className="truncate">{p}</li>
                              ))
                            ) : (
                              <li>Solid market position with consistent operational metrics.</li>
                            )}
                          </ul>
                        </div>
                        <div className="bg-slate-900/30 border border-slate-900/50 p-2.5 rounded-xl">
                          <span className="text-red-400 font-extrabold uppercase block mb-1">Risks / Limitations</span>
                          <ul className="space-y-1 text-slate-400 font-medium list-disc list-inside">
                            {deepData?.cons?.length ? (
                              deepData.cons.slice(0, 3).map((c: string, idx: number) => (
                                <li key={idx} className="truncate">{c}</li>
                              ))
                            ) : (
                              <li>Exposed to equity market volatilities and economic variances.</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* STRATEGY TAB */}
                    {activeTab === 'strategy' && (() => {
                      const roe = deepData?.ratios?.roe || 0;
                      const debt = (deepData?.ratios?.debtToEquity || 0) / 100;
                      const pe = selectedStock.pe || 0;
                      const price = selectedStock.price || 0;
                      const sma200 = deepData?.ratios?.twoHundredDayAverage || 0;
                      const sma50 = deepData?.ratios?.fiftyDayAverage || 0;

                      // Decision engine math
                      let score = 50;
                      if (roe > 20) score += 15;
                      else if (roe > 12) score += 5;
                      else if (roe < 8 && roe > 0) score -= 10;

                      if (debt > 0 && debt < 0.5) score += 10;
                      else if (debt > 1.5) score -= 15;

                      if (pe > 0 && pe < 25) score += 10;
                      else if (pe > 75) score -= 15;

                      if (price > 0 && sma200 > 0) {
                        if (price > sma200) score += 15;
                        else score -= 15;
                      }
                      if (price > 0 && sma50 > 0) {
                        if (price > sma50) score += 5;
                      }

                      let rating = "HOLD (NEUTRAL)";
                      let badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                      let textColor = "text-amber-400";
                      let stance = " Sideways consolidation or premium valuation suggests waiting for a better price entry. Strong fundamentals hold, but short-term upside is capped.";

                      if (score >= 65) {
                        rating = "ACCUMULATE (BUY)";
                        badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                        textColor = "text-emerald-400";
                        stance = " Dynamic technical support combined with solid Return on Equity (ROE) makes this a high-conviction buy. Favorable long-term wealth compounding candidate.";
                      } else if (score < 45) {
                        rating = "REDUCE / SELL";
                        badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                        textColor = "text-rose-400";
                        stance = " Elevated multiples (high P/E), significant leverage, or pricing below key moving averages (200 SMA) warrants technical caution. Risk profile is high.";
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed">
                          <div className="flex flex-col justify-center items-center bg-slate-900/40 border border-slate-900 p-3 rounded-xl text-center shrink-0">
                            <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block">Vision Stance</span>
                            <div className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border mt-2 ${badgeColor}`}>
                              {rating}
                            </div>
                            <span className="text-[8px] text-slate-500 font-bold mt-2">Score: {score}/100</span>
                          </div>

                          <div className="md:col-span-2 bg-slate-900/20 border border-slate-900/50 p-2.5 rounded-xl max-h-[90px] overflow-y-auto scrollbar-none font-medium text-[10px] text-slate-400">
                            <span className="font-extrabold text-slate-300 block mb-1">Detailed Analyst Rationale:</span>
                            <span className={`font-extrabold ${textColor}`}>{rating}:</span>{stance}
                            
                            {/* Detailed dynamic bullet-points based on score parameters */}
                            <ul className="mt-2 space-y-1 list-disc list-inside text-slate-500 font-semibold">
                              {roe > 15 && <li>Robust Return on Equity ({roe.toFixed(1)}%) indicates excellent capital efficiency.</li>}
                              {debt > 0 && debt < 1.0 && <li>Healthy balance sheet with low gearing (D/E ratio at {debt.toFixed(2)}x).</li>}
                              {pe > 0 && pe < 35 && <li>Attractive valuation multiple (P/E at {pe.toFixed(1)}x) relative to growth indices.</li>}
                              {price > sma200 && sma200 > 0 && <li>Bullish technical structure supported by trades above 200 SMA.</li>}
                              {price < sma200 && sma200 > 0 && <li>Bearish trend alert — trading below 200 SMA indicating heavy overhead resistance.</li>}
                            </ul>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

            </div>
          )}
        </section>

        {/* RIGHT: Watchlist Sidebar */}
        <section className="lg:col-span-3 bg-slate-950 flex flex-col overflow-hidden max-h-[42dvh] lg:max-h-none lg:min-h-0 safe-bottom">

          <div className="p-4 border-b border-slate-800 shrink-0">
            <h2 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-blue-500" /> WATCHLIST
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter stocks…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 focus:border-blue-500/50 rounded-xl text-xs font-bold text-slate-200 placeholder:text-slate-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-900/60">
            {watchlistLoading ? (
              <div className="p-8 text-center flex flex-col items-center gap-3">
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                <span className="text-xs text-slate-500 font-semibold">Loading quotes…</span>
              </div>
            ) : filteredWatchlist.length > 0 ? (
              filteredWatchlist.map(stock => {
                const active   = stock.symbol === selectedSymbol;
                const positive = stock.change >= 0;
                return (
                  <button
                    key={stock.symbol}
                    onClick={() => setSelectedSymbol(stock.symbol)}
                    className={`w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 transition-all border-l-4 touch-manipulation ${
                      active ? 'bg-slate-900 border-blue-500' : 'hover:bg-slate-900/50 border-transparent'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-black ${active ? 'text-blue-400' : 'text-slate-100'}`}>
                          {stock.symbol.split('.')[0]}
                        </span>
                        <span className="text-[9px] text-slate-600 font-bold">{stock.symbol.split('.')[1]}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate max-w-[140px] mt-0.5">{stock.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-white">₹{stock.price.toFixed(0)}</div>
                      <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded mt-0.5 ${
                        positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {positive ? '+' : ''}{stock.changePercent.toFixed(1)}%
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-600 text-xs font-semibold">No matching stocks.</div>
            )}
          </div>

          <div className="p-3 border-t border-slate-900 text-center text-[10px] text-slate-700 flex items-center gap-2 justify-center shrink-0">
            <Sparkles className="w-3 h-3 text-yellow-600" />
            Click any stock to load its chart instantly
          </div>
        </section>
      </main>
    </div>
  );
}
