"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  ChevronRight,
  Info,
  PieChart,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';

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

interface ChartPoint {
  date: string;
  close: number;
  volume: number;
  pe?: number;
}

import { DEFAULT_SYMBOLS } from '../../utils/symbols';

export default function TradingTerminalPage() {
  // Navigation & Selected stock states
  const [watchlistStocks, setWatchlistStocks] = useState<StockQuote[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('CGPOWER.NS');

  // Derived active stock from selection
  const selectedStock = watchlistStocks.find(s => s.symbol === selectedSymbol) || null;
  
  // Watchlist Sidebar states
  const [searchQuery, setSearchQuery] = useState('');
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  
  // Chart Workspace states
  const [chartRange, setChartRange] = useState<string>('1Y');
  const [chartType, setChartType] = useState<'price' | 'pe'>('price');
  const [dynamicChartData, setDynamicChartData] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState('');
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);
  
  // Interactive Search Ticker for Chart
  const [terminalSearch, setTerminalSearch] = useState('');
  const [terminalSearchError, setTerminalSearchError] = useState('');
  const [terminalSearching, setTerminalSearching] = useState(false);

  // SVG Chart interaction helpers
  const svgRef = useRef<SVGSVGElement | null>(null);

  // 1. Sync custom watchlist from localStorage
  useEffect(() => {
    let active = true;
    const fetchWatchlist = async () => {
      try {
        setWatchlistLoading(true);
        let symbols = DEFAULT_SYMBOLS;
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('vision_watchlist');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                symbols = parsed;
              }
            } catch {}
          }
        }

        const res = await fetch(`/api/watchlist?symbols=${encodeURIComponent(symbols.join(','))}`);
        if (!res.ok) throw new Error('Failed to load watchlist database');
        const data = await res.json();
        
        if (active) {
          setWatchlistStocks(data);
          // Set initial active selection
          if (data.length > 0) {
            const hasDefault = data.find((stock: StockQuote) => stock.symbol === 'CGPOWER.NS');
            setSelectedSymbol(hasDefault ? 'CGPOWER.NS' : data[0].symbol);
          }
        }
      } catch (err) {
        console.error('Watchlist initial load error:', err);
      } finally {
        if (active) setWatchlistLoading(false);
      }
    };

    fetchWatchlist();
    return () => { active = false; };
  }, []);



  // 3. Sync dynamic chart data when selected range or symbol changes
  useEffect(() => {
    if (!selectedSymbol) return;

    let active = true;
    const fetchChartHistory = async () => {
      try {
        setChartLoading(true);
        setChartError('');
        const res = await fetch(`/api/watchlist/${encodeURIComponent(selectedSymbol)}/chart?range=${chartRange.toLowerCase()}`);
        if (!res.ok) throw new Error(`Symbol ${selectedSymbol} not found or charting unsupported.`);
        
        const chartJSON = await res.json();
        if (active) {
          setDynamicChartData(chartJSON.points || []);
          setHoveredPoint(null);
        }
      } catch (err: unknown) {
        if (active) {
          setChartError(err instanceof Error ? err.message : 'Error fetching chart timeline');
          setDynamicChartData([]);
        }
      } finally {
        if (active) setChartLoading(false);
      }
    };

    fetchChartHistory();
    return () => { active = false; };
  }, [selectedSymbol, chartRange]);

  // Handle addition of custom symbol via Terminal Search Bar
  const handleTerminalSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalSearch.trim()) return;

    const rawInput = terminalSearch.trim().toUpperCase();
    const formatted = rawInput.includes('.') ? rawInput : `${rawInput}.NS`;

    // Avoid duplicate fetching if already active
    if (formatted === selectedSymbol) {
      setTerminalSearch('');
      return;
    }

    try {
      setTerminalSearching(true);
      setTerminalSearchError('');

      const res = await fetch(`/api/watchlist?symbols=${encodeURIComponent(formatted)}`);
      if (!res.ok) throw new Error('Stock ticker not found.');
      const data = await res.json();

      if (!data || data.length === 0) {
        throw new Error('No quote returned for ticker.');
      }

      const verifiedStock = data[0];
      
      // Update states
      setSelectedSymbol(verifiedStock.symbol);
      
      // Add to sidebar list if not already present
      if (!watchlistStocks.some(s => s.symbol === verifiedStock.symbol)) {
        const updatedList = [verifiedStock, ...watchlistStocks];
        setWatchlistStocks(updatedList);

        // Sync local storage
        if (typeof window !== 'undefined') {
          const listToSave = updatedList.map(s => s.symbol);
          localStorage.setItem('vision_watchlist', JSON.stringify(listToSave));
        }
      }

      setTerminalSearch('');
    } catch (err: unknown) {
      setTerminalSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setTerminalSearching(false);
    }
  };

  // Filter watchlist list based on search bar query
  const filteredWatchlist = watchlistStocks.filter(stock => 
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // SVG Chart Setup & Dynamic Calculations
  const chartPoints = dynamicChartData || [];
  const activePoint = hoveredPoint || (chartPoints.length > 0 ? chartPoints[chartPoints.length - 1] : null);

  const getPointsBoundary = () => {
    if (chartPoints.length === 0) return { min: 0, max: 100 };
    const vals = chartPoints.map(p => chartType === 'price' ? p.close : (p.pe || 0));
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const padding = (maxVal - minVal) * 0.1 || 10;
    return {
      min: Math.max(0, minVal - padding),
      max: maxVal + padding
    };
  };

  const bounds = getPointsBoundary();
  const width = 1000;
  const height = 480;
  const paddingX = 80;
  const paddingY = 40;

  // Map coordinate helpers
  const getX = (index: number) => {
    if (chartPoints.length <= 1) return paddingX;
    return paddingX + (index / (chartPoints.length - 1)) * (width - 2 * paddingX);
  };

  const getY = (val: number) => {
    const range = bounds.max - bounds.min;
    if (range === 0) return height / 2;
    return height - paddingY - ((val - bounds.min) / range) * (height - 2 * paddingY);
  };

  // SVG Line & Area Path Builders
  let linePath = '';
  let areaPath = '';

  if (chartPoints.length > 0) {
    const coords = chartPoints.map((p, i) => ({
      x: getX(i),
      y: getY(chartType === 'price' ? p.close : (p.pe || 0))
    }));

    linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
    areaPath = `
      ${linePath}
      L ${coords[coords.length - 1].x} ${height - paddingY}
      L ${coords[0].x} ${height - paddingY}
      Z
    `;
  }

  // Hover detection handler on SVG Canvas
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!svgRef.current || chartPoints.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const svgX = (x / rect.width) * width;

    // Find nearest point along the timeline
    let nearestIndex = 0;
    let minDiff = Infinity;

    for (let i = 0; i < chartPoints.length; i++) {
      const px = getX(i);
      const diff = Math.abs(px - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIndex = i;
      }
    }

    setHoveredPoint(chartPoints[nearestIndex]);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  // Color theme variables based on selected view mode
  const accentColor = chartType === 'price' ? '#3b82f6' : '#a855f7';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans overflow-hidden">
      
      {/* 🚀 Terminal Banner / Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-4">
          <Link href="/watchlist" className="p-2 hover:bg-slate-850 rounded-xl transition-all text-slate-400 hover:text-white" title="Return to Watchlist">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent font-extrabold text-xl tracking-tight">VISION TERMINAL</span>
            <span className="hidden md:inline-block px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-extrabold rounded-full tracking-wide">PRO WORKSPACE</span>
          </div>
        </div>

        {/* Ticker direct look-up */}
        <form onSubmit={handleTerminalSearchSubmit} className="relative w-full max-w-[240px] md:max-w-[320px] mx-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Type Symbol (e.g. INFYS, COFORGE)..."
            value={terminalSearch}
            onChange={(e) => setTerminalSearch(e.target.value)}
            disabled={terminalSearching}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 focus:border-blue-500/50 rounded-xl text-xs font-semibold placeholder:text-slate-500 text-slate-100 focus:outline-none transition-all"
          />
          {terminalSearching && (
            <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-500 animate-spin" />
          )}
          {terminalSearchError && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-red-500/10 border border-red-500/20 text-red-400 p-2 rounded-xl text-[10px] font-bold z-50 text-center animate-pulse">
              {terminalSearchError}
            </div>
          )}
        </form>

        <div className="hidden sm:flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400">Status:</span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-extrabold rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span> Live Markets
          </span>
        </div>
      </header>

      {/* 💼 Grid Workspace */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-70px)]">
        
        {/* LEFT WORKSPACE (COLUMNS 1 to 9): Interactive Large Chart */}
        <section className="lg:col-span-9 p-4 md:p-6 overflow-y-auto flex flex-col gap-6 h-full border-r border-slate-850 bg-slate-950/40">
          
          {selectedStock ? (
            <div className="flex flex-col gap-6">
              
              {/* Active Ticker Header Widget */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 border border-slate-850 p-5 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg text-lg">
                    {selectedStock.symbol.split('.')[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="font-extrabold text-lg text-white">{selectedStock.name}</h1>
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold rounded-lg border border-slate-700">{selectedStock.symbol}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">NSE Institutional Equities • INR</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Current Pricing block */}
                  <div className="text-right">
                    <div className="text-2xl font-black text-white">₹{selectedStock.price.toLocaleString('en-IN')}</div>
                    <div className={`flex items-center gap-1 text-xs font-bold mt-1 justify-end ${selectedStock.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {selectedStock.change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      <span>{selectedStock.change >= 0 ? '+' : ''}{selectedStock.change.toFixed(2)}</span>
                      <span>({selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart Control Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/40 border border-slate-850/60 px-5 py-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  {/* Chart type Toggle */}
                  <button
                    onClick={() => setChartType('price')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      chartType === 'price'
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-850'
                    }`}
                  >
                    <Activity className="w-4 h-4" /> Price & Vol
                  </button>
                  <button
                    onClick={() => setChartType('pe')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      chartType === 'pe'
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-850'
                    }`}
                  >
                    <PieChart className="w-4 h-4" /> Historical P/E
                  </button>
                </div>

                {/* Range Selectors */}
                <div className="flex items-center bg-slate-900 border border-slate-800 p-1.5 rounded-xl gap-1">
                  {['1D', '1W', '1M', '1Y', '5Y', 'MAX'].map((rng) => (
                    <button
                      key={rng}
                      onClick={() => setChartRange(rng)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
                        chartRange === rng
                          ? 'bg-slate-800 text-white shadow-sm font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {rng}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart Window */}
              <div className="relative bg-slate-950/80 border border-slate-850/80 p-5 rounded-2xl">
                
                {/* Active Hover Coordinate readout */}
                {activePoint && (
                  <div className="flex flex-wrap gap-4 items-center bg-slate-900 border border-slate-800/80 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 mb-4 justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">TIMEFRAME</span>
                      <span className="text-white font-extrabold bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">{activePoint.date}</span>
                    </div>

                    <div className="flex items-center gap-6">
                      {chartType === 'price' ? (
                        <>
                          <div>Price: <span className="text-blue-400 font-extrabold">₹{activePoint.close.toFixed(2)}</span></div>
                          {activePoint.volume > 0 && (
                            <div>Volume: <span className="text-slate-300 font-extrabold">{(activePoint.volume / 100000).toFixed(2)}L</span></div>
                          )}
                        </>
                      ) : (
                        <div>Trailing P/E: <span className="text-purple-400 font-extrabold">{activePoint.pe !== undefined && activePoint.pe > 0 ? activePoint.pe.toFixed(2) : '--'}</span></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Loading & Error Overlays */}
                {chartLoading && (
                  <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 z-20 rounded-2xl">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Synchronizing Workspace...</span>
                  </div>
                )}

                {chartError && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-4 z-20 rounded-2xl p-6 text-center">
                    <div className="text-red-500/10 border border-red-500/20 bg-red-500/5 p-4 rounded-full">
                      <Info className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-sm">Failed to Load Chart</h3>
                      <p className="text-xs text-slate-500 max-w-sm mt-1">{chartError}</p>
                    </div>
                  </div>
                )}

                {/* SVG Graph Canvas */}
                <div className="relative w-full min-h-[360px] lg:min-h-[440px]">
                  {chartPoints.length > 0 ? (
                    <svg
                      ref={svgRef}
                      viewBox={`0 0 ${width} ${height}`}
                      className="w-full h-full cursor-crosshair overflow-visible select-none"
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                    >
                      {/* Grids */}
                      <g stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3 3">
                        {/* Horizontal Gridlines */}
                        {[0.25, 0.5, 0.75].map((ratio) => (
                          <line
                            key={ratio}
                            x1={paddingX}
                            y1={paddingY + ratio * (height - 2 * paddingY)}
                            x2={width - paddingX}
                            y2={paddingY + ratio * (height - 2 * paddingY)}
                          />
                        ))}
                        {/* Vertical Gridlines */}
                        {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
                          <line
                            key={ratio}
                            x1={paddingX + ratio * (width - 2 * paddingX)}
                            y1={paddingY}
                            x2={paddingX + ratio * (width - 2 * paddingX)}
                            y2={height - paddingY}
                          />
                        ))}
                      </g>

                      {/* Area Fill Gradient Definitions */}
                      <defs>
                        <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={accentColor} stopOpacity="0.25" />
                          <stop offset="100%" stopColor={accentColor} stopOpacity="0.00" />
                        </linearGradient>
                      </defs>

                      {/* Y-Axis Value Labels */}
                      <g fill="#64748b" fontSize="10" fontWeight="bold" textAnchor="end">
                        <text x={paddingX - 12} y={paddingY + 4}>
                          {chartType === 'price' ? `₹${bounds.max.toFixed(0)}` : bounds.max.toFixed(1)}
                        </text>
                        <text x={paddingX - 12} y={height / 2 + 4}>
                          {chartType === 'price' ? `₹${((bounds.max + bounds.min) / 2).toFixed(0)}` : ((bounds.max + bounds.min) / 2).toFixed(1)}
                        </text>
                        <text x={paddingX - 12} y={height - paddingY + 4}>
                          {chartType === 'price' ? `₹${bounds.min.toFixed(0)}` : bounds.min.toFixed(1)}
                        </text>
                      </g>

                      {/* Timeline X-Axis Labels */}
                      <g fill="#64748b" fontSize="10" fontWeight="bold" textAnchor="middle">
                        <text x={paddingX + 10} y={height - paddingY + 22}>
                          {chartPoints[0]?.date}
                        </text>
                        <text x={width / 2} y={height - paddingY + 22}>
                          {chartPoints[Math.floor(chartPoints.length / 2)]?.date}
                        </text>
                        <text x={width - paddingX - 10} y={height - paddingY + 22}>
                          {chartPoints[chartPoints.length - 1]?.date}
                        </text>
                      </g>

                      {/* Dynamic Volume Overlay Column Bars */}
                      {chartType === 'price' && (
                        <g opacity="0.12">
                          {chartPoints.map((p, i) => {
                            const maxVol = Math.max(...chartPoints.map(q => q.volume || 1));
                            const volHeight = maxVol > 0 ? ((p.volume || 0) / maxVol) * 100 : 0;
                            const barWidth = Math.max(1, (width - 2 * paddingX) / chartPoints.length * 0.8);
                            const x = getX(i) - barWidth / 2;
                            const y = height - paddingY - volHeight;
                            
                            // Color code bars depending on daily price change
                            const isGreen = i > 0 ? p.close >= chartPoints[i - 1].close : true;

                            return (
                              <rect
                                key={i}
                                x={x}
                                y={y}
                                width={barWidth}
                                height={volHeight}
                                fill={isGreen ? '#10b981' : '#ef4444'}
                              />
                            );
                          })}
                        </g>
                      )}

                      {/* Ambient Shadow Area */}
                      <path d={areaPath} fill="url(#chart-area-grad)" />

                      {/* Core Trend Curve Line */}
                      <path
                        d={linePath}
                        fill="none"
                        stroke={accentColor}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Interaction Pointer & Coordinates crosshair */}
                      {activePoint && (
                        <g>
                          {/* Nearest point index lookup */}
                          {(() => {
                            const index = chartPoints.indexOf(activePoint);
                            if (index === -1) return null;
                            const cx = getX(index);
                            const cy = getY(chartType === 'price' ? activePoint.close : (activePoint.pe || 0));

                            return (
                              <>
                                {/* Vertical crosshair line */}
                                <line
                                  x1={cx}
                                  y1={paddingY}
                                  x2={cx}
                                  y2={height - paddingY}
                                  stroke="#64748b"
                                  strokeWidth="0.8"
                                  strokeDasharray="4 4"
                                />

                                {/* Horizontal crosshair line */}
                                <line
                                  x1={paddingX}
                                  y1={cy}
                                  x2={width - paddingX}
                                  y2={cy}
                                  stroke="#64748b"
                                  strokeWidth="0.8"
                                  strokeDasharray="4 4"
                                />

                                {/* Glowing accent pointer circle */}
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r="7"
                                  fill={accentColor}
                                  stroke="#1e293b"
                                  strokeWidth="2.5"
                                  className="animate-pulse"
                                />
                              </>
                            );
                          })()}
                        </g>
                      )}
                    </svg>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 text-slate-600 animate-spin" />
                      <span className="text-xs font-bold text-slate-500">Awaiting chronological data stream...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* High-density Institutional Ratio metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                
                <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl text-center">
                  <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Market Capitalization</div>
                  <div className="text-sm font-extrabold text-white mt-1.5">
                    ₹{(selectedStock.marketCap / 10000000).toFixed(1)} Cr
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl text-center">
                  <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">P/E Ratio (TTM)</div>
                  <div className="text-sm font-extrabold text-purple-400 mt-1.5">
                    {selectedStock.pe > 0 ? selectedStock.pe.toFixed(2) : '--'}
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl text-center">
                  <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Earnings Per Share</div>
                  <div className="text-sm font-extrabold text-white mt-1.5">
                    ₹{selectedStock.eps > 0 ? selectedStock.eps.toFixed(2) : '--'}
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl text-center">
                  <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Price to Book Value</div>
                  <div className="text-sm font-extrabold text-white mt-1.5">
                    {selectedStock.cmpBv > 0 ? `${selectedStock.cmpBv}x` : '--'}
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl text-center">
                  <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Dividend Yield</div>
                  <div className="text-sm font-extrabold text-emerald-400 mt-1.5">
                    {selectedStock.divYield > 0 ? `${selectedStock.divYield}%` : '0.00%'}
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl text-center flex flex-col justify-center">
                  <Link
                    href={`/watchlist/${encodeURIComponent(selectedStock.symbol)}`}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md group"
                  >
                    Cockpit Report
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>

              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center gap-4 text-center">
              <RefreshCw className="w-12 h-12 text-slate-700 animate-spin" />
              <div>
                <h3 className="font-extrabold text-white">Opening Trading Workspace...</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">Resolving default watchlist assets from database endpoints.</p>
              </div>
            </div>
          )}

        </section>

        {/* RIGHT WORKSPACE (COLUMNS 10 to 12): High-Density Sidebar Ticker Watchlist */}
        <section className="lg:col-span-3 bg-slate-950 flex flex-col overflow-hidden h-full">
          
          {/* Watchlist Sidebar search */}
          <div className="p-4 border-b border-slate-850 bg-slate-950/90">
            <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" /> WATCHLIST STOCKS
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Filter watchlist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 focus:border-blue-500/50 rounded-xl text-xs font-bold text-slate-200 placeholder:text-slate-550 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* List content */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-900">
            {watchlistLoading ? (
              <div className="p-8 text-center flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                <span className="text-xs text-slate-500 font-semibold">Updating sidebar pricing...</span>
              </div>
            ) : filteredWatchlist.length > 0 ? (
              filteredWatchlist.map((stock) => {
                const isActive = stock.symbol === selectedSymbol;
                const isPositive = stock.change >= 0;

                return (
                  <button
                    key={stock.symbol}
                    onClick={() => setSelectedSymbol(stock.symbol)}
                    className={`w-full text-left px-5 py-4 flex items-center justify-between gap-4 transition-all relative group ${
                      isActive
                        ? 'bg-slate-900 border-l-4 border-blue-500'
                        : 'hover:bg-slate-900/40 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-black ${isActive ? 'text-blue-400' : 'text-slate-100 group-hover:text-white transition-colors'}`}>
                          {stock.symbol.split('.')[0]}
                        </span>
                        {stock.symbol.includes('.') && (
                          <span className="text-[9px] text-slate-650 font-bold bg-slate-900 px-1 rounded-sm">{stock.symbol.split('.')[1]}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold truncate max-w-[140px] mt-0.5">{stock.name}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-white">₹{stock.price.toFixed(2)}</div>
                      <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded-md mt-1 ${
                        isPositive 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                          : 'bg-red-500/10 text-red-400 border border-red-500/15'
                      }`}>
                        {isPositive ? '+' : ''}{stock.changePercent.toFixed(1)}%
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs font-semibold">
                No matching symbols.
              </div>
            )}
          </div>

          {/* Quick-switch tips */}
          <div className="p-4 bg-slate-950 border-t border-slate-900 text-center text-[10px] text-slate-550 flex items-center gap-2 justify-center">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            <span>Click any item to load terminal charts instantly.</span>
          </div>

        </section>

      </main>

    </div>
  );
}
