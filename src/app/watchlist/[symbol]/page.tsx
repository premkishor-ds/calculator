"use client";

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  FileText, 
  PieChart, 
  Info, 
  Shield, 
  Layers, 
  Scale, 
  DollarSign, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  Globe,
  Briefcase,
  LineChart
} from 'lucide-react';

interface Ratios {
  price: number;
  change: number;
  changePercent: number;
  name: string;
  symbol: string;
  marketCap: number;
  volume: number;
  pe: number;
  eps: number;
  cmpBv: number;
  divYield: number;
  promHold: number;
  instHold: number;
  pubHold: number;
  debtToEquity: number;
  currentRatio: number;
  quickRatio: number;
  roe: number;
  roa: number;
  fiftyDayAverage: number;
  twoHundredDayAverage: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  pegRatio: number;
  priceToSales: number;
  enterpriseValue: number;
  evToEbitda: number;
  evToRevenue: number;
  operatingMargin: number;
  profitMargin: number;
  grossMargin: number;
}

interface BalanceSheetItem {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  cash: number;
  debt: number;
  workingCapital: number;
}

interface ProfitLossItem {
  date: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
}

interface QuarterlyItem {
  date: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
}

interface CashFlowItem {
  date: string;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  capitalExpenditure: number; 
  netChangeInCash: number; 
  freeCashFlow: number;
}

interface PeerItem {
  symbol: string;
  name: string;
  price: number;
  pe: number;
  marketCap: number;
  divYield: number;
}

interface OfficerItem {
  name: string;
  title: string;
  age: number | null;
  pay: number | null;
}

interface CorporateProfile {
  sector: string;
  industry: string;
  employees: number;
  website: string;
  city: string;
  summary: string;
  officers: OfficerItem[];
}

interface ChartPoint {
  date: string;
  close: number;
  volume: number;
}

interface StockDetails {
  ratios: Ratios;
  profile: CorporateProfile;
  balanceSheet: BalanceSheetItem[];
  profitLoss: ProfitLossItem[];
  cashFlow: CashFlowItem[];
  quarterlyProfitLoss: QuarterlyItem[];
  chartData: ChartPoint[];
  peers: PeerItem[];
  pros: string[];
  cons: string[];
}

export default function StockDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const resolvedParams = use(params);
  const [data, setData] = useState<StockDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'ratios' | 'qpl' | 'pl' | 'bs' | 'cf' | 'peers' | 'shareholding' | 'about'>('ratios');
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);

  const decodedSymbol = decodeURIComponent(resolvedParams.symbol);

  useEffect(() => {
    let active = true;
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/watchlist/${encodeURIComponent(decodedSymbol)}`);
        if (!res.ok) throw new Error('Failed to fetch detailed stock data');
        const details = await res.json();
        if (active) {
          setData(details);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Something went wrong');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDetails();
    return () => {
      active = false;
    };
  }, [decodedSymbol]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center gap-4">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-slate-500 font-medium text-sm">Compiling complete financial intelligence for {decodedSymbol.replace('.NS', '')}...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center gap-4 px-4">
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl max-w-md text-center shadow-lg">
          <h2 className="font-bold text-lg mb-2">Error Loading Data</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{error || 'Could not load fundamentals.'}</p>
          <Link href="/watchlist" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Watchlist
          </Link>
        </div>
      </div>
    );
  }

  const { ratios, profile, balanceSheet, profitLoss, cashFlow, quarterlyProfitLoss, chartData, peers, pros, cons } = data;
  const isPositive = ratios.change >= 0;

  // Render statements chronologically
  const chronologicalQuarterly = quarterlyProfitLoss ? [...quarterlyProfitLoss].reverse() : [];
  const chronologicalAnnual = profitLoss ? [...profitLoss].reverse() : [];
  const chronologicalBS = balanceSheet ? [...balanceSheet].reverse() : [];
  const chronologicalCF = cashFlow ? [...cashFlow].reverse() : [];

  // SVG Chart Setup
  const chartPoints = chartData || [];
  const closeValues = chartPoints.map(p => p.close);
  const maxClose = closeValues.length > 0 ? Math.max(...closeValues) : 100;
  const minClose = closeValues.length > 0 ? Math.min(...closeValues) : 0;
  const closeRange = maxClose - minClose || 1;

  const svgWidth = 800;
  const svgHeight = 220;
  const padding = 15;
  const graphWidth = svgWidth - padding * 2;
  const graphHeight = svgHeight - padding * 2;

  // Map elements to high fidelity coordinate points
  const points = chartPoints.map((p, idx) => {
    const x = padding + (idx / Math.max(1, chartPoints.length - 1)) * graphWidth;
    const y = svgHeight - padding - ((p.close - minClose) / closeRange) * graphHeight;
    return { x, y, data: p };
  });

  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`
    : '';

  // Max volume setup
  const maxVol = chartPoints.length > 0 ? Math.max(...chartPoints.map(p => p.volume)) : 1;

  // Hover target tracking
  const activePoint = hoveredPoint || (chartPoints.length > 0 ? chartPoints[chartPoints.length - 1] : null);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans pb-20">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        
        {/* Navigation back */}
        <Link href="/watchlist" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors mb-6 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Watchlist
        </Link>

        {/* Dashboard Header */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                  {ratios.symbol.replace('.NS', '')}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  NSE India
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1 font-medium">{ratios.name}</p>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
              <div className="text-right lg:text-left">
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  ₹{ratios.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className={`flex items-center justify-end lg:justify-start gap-1 font-semibold text-sm mt-1 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                  {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{isPositive ? '+' : ''}{ratios.change.toFixed(2)} ({isPositive ? '+' : ''}{ratios.changePercent.toFixed(2)}%)</span>
                </div>
              </div>

              <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Market Cap</div>
                <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  ₹{(ratios.marketCap / 10000000).toFixed(2)}Cr
                </div>
              </div>

              <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Volume (Lakhs)</div>
                <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {(ratios.volume / 100000).toFixed(2)}L
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto gap-4 scrollbar-none">
          <button
            onClick={() => setActiveTab('ratios')}
            className={`pb-4 px-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'ratios'
                ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Overview & Ratios
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`pb-4 px-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'about'
                ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            About & Profile
          </button>
          <button
            onClick={() => setActiveTab('qpl')}
            className={`pb-4 px-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'qpl'
                ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Quarterly Results (Recent)
          </button>
          <button
            onClick={() => setActiveTab('pl')}
            className={`pb-4 px-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'pl'
                ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Profit & Loss (10Y)
          </button>
          <button
            onClick={() => setActiveTab('bs')}
            className={`pb-4 px-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'bs'
                ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Balance Sheet (10Y)
          </button>
          <button
            onClick={() => setActiveTab('cf')}
            className={`pb-4 px-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'cf'
                ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Cash Flow (10Y)
          </button>
          <button
            onClick={() => setActiveTab('peers')}
            className={`pb-4 px-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'peers'
                ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Peer Comparison
          </button>
          <button
            onClick={() => setActiveTab('shareholding')}
            className={`pb-4 px-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'shareholding'
                ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Shareholding Pattern
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'ratios' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Interactive high-fidelity Price & Volume Chart block */}
            {chartPoints.length > 0 && (
              <div className="md:col-span-3 bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                      <LineChart className="w-5 h-5 text-blue-500" /> Historical Price & Volume (1 Year)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Interactive Chartink/TradingView styled line graph with volume spike overlays.</p>
                  </div>

                  {activePoint && (
                    <div className="flex flex-wrap gap-3 sm:gap-6 items-center bg-slate-50 dark:bg-slate-850 px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-500">
                      <div>Date: <span className="text-slate-800 dark:text-white font-bold">{activePoint.date}</span></div>
                      <div>Price: <span className="text-blue-500 font-extrabold">₹{activePoint.close.toFixed(2)}</span></div>
                      <div>Volume: <span className="text-slate-850 dark:text-slate-200">{(activePoint.volume / 100000).toFixed(2)}L</span></div>
                    </div>
                  )}
                </div>

                <div className="relative w-full">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible select-none">
                    <defs>
                      <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
                      </linearGradient>
                    </defs>

                    {/* horizontal helper gridlines */}
                    <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="currentColor" className="text-slate-100 dark:text-slate-800/40" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} stroke="currentColor" className="text-slate-100 dark:text-slate-800/40" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="currentColor" className="text-slate-150 dark:text-slate-800/80" strokeWidth="1" />

                    {/* Area under curve */}
                    {areaPath && <path d={areaPath} fill="url(#chart-gradient)" />}

                    {/* Volume bars (bottom 15%) */}
                    {points.map((p, idx) => {
                      const barHeight = (p.data.volume / maxVol) * 35;
                      const yStart = svgHeight - padding;
                      const yEnd = yStart - barHeight;
                      return (
                        <line 
                          key={idx} 
                          x1={p.x} 
                          y1={yStart} 
                          x2={p.x} 
                          y2={yEnd} 
                          stroke="currentColor" 
                          className="text-slate-200 dark:text-slate-850" 
                          strokeWidth="2.5" 
                        />
                      );
                    })}

                    {/* SVG price stroke path */}
                    {linePath && (
                      <path 
                        d={linePath} 
                        fill="none" 
                        stroke="#3b82f6" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className="drop-shadow-[0_2px_8px_rgba(59,130,246,0.3)]"
                      />
                    )}

                    {/* Hover vertical alignment line */}
                    {activePoint && points.find(p => p.data.date === activePoint.date) && (
                      <line 
                        x1={points.find(p => p.data.date === activePoint.date)!.x} 
                        y1={padding} 
                        x2={points.find(p => p.data.date === activePoint.date)!.x} 
                        y2={svgHeight - padding} 
                        stroke="currentColor" 
                        className="text-blue-500/30" 
                        strokeWidth="1.5" 
                        strokeDasharray="2 2"
                      />
                    )}

                    {/* Hover target circle indicator */}
                    {activePoint && points.find(p => p.data.date === activePoint.date) && (
                      <circle 
                        cx={points.find(p => p.data.date === activePoint.date)!.x} 
                        cy={points.find(p => p.data.date === activePoint.date)!.y} 
                        r="5" 
                        fill="#3b82f6" 
                        stroke="white" 
                        strokeWidth="1.5" 
                        className="drop-shadow-[0_0_4px_rgba(59,130,246,0.8)]"
                      />
                    )}
                  </svg>

                  {/* Horizontal interactive hover panels overlay */}
                  <div className="absolute inset-0 flex">
                    {points.map((p, idx) => (
                      <div 
                        key={idx} 
                        className="h-full flex-1 cursor-crosshair"
                        onMouseEnter={() => setHoveredPoint(p.data)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Fundamental Ratios Panel */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                  <Scale className="w-5 h-5 text-blue-500" /> Key Fundamental Ratios
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold uppercase">P/E Ratio</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.pe > 0 ? ratios.pe.toFixed(2) : '--'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold uppercase">EPS (12M)</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.eps > 0 ? `₹${ratios.eps.toFixed(2)}` : '--'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold uppercase">CMP/BV</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.cmpBv > 0 ? ratios.cmpBv.toFixed(2) : '--'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Dividend Yield</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.divYield > 0 ? `${ratios.divYield.toFixed(2)}%` : '0.00%'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold uppercase">ROE (%)</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.roe !== 0 ? `${ratios.roe.toFixed(2)}%` : '--'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold uppercase">ROA (%)</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.roa !== 0 ? `${ratios.roa.toFixed(2)}%` : '--'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Debt-to-Equity</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.debtToEquity > 0 ? (ratios.debtToEquity / 100).toFixed(2) : '0.00'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Current Ratio</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.currentRatio > 0 ? ratios.currentRatio.toFixed(2) : '--'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Quick Ratio</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.quickRatio > 0 ? ratios.quickRatio.toFixed(2) : '--'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical analysis cockpit */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                  <Shield className="w-5 h-5 text-blue-500" /> Technical Indicators
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-xs font-semibold text-slate-400">50-Day Moving Avg</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-white">₹{ratios.fiftyDayAverage?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-xs font-semibold text-slate-400">200-Day Moving Avg</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-white">₹{ratios.twoHundredDayAverage?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-xs font-semibold text-slate-400">52-Week High</span>
                    <span className="text-sm font-bold text-emerald-500">₹{ratios.fiftyTwoWeekHigh?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5">
                    <span className="text-xs font-semibold text-slate-400">52-Week Low</span>
                    <span className="text-sm font-bold text-red-500">₹{ratios.fiftyTwoWeekLow?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Valuation & Margins panel */}
            <div className="md:col-span-3 bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                <Layers className="w-5 h-5 text-blue-500" /> Advanced Valuation & Enterprise Margins
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                  <span className="text-xs text-slate-400 font-semibold uppercase">PEG Ratio</span>
                  <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.pegRatio > 0 ? ratios.pegRatio.toFixed(2) : '--'}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Price-to-Sales (P/S)</span>
                  <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.priceToSales > 0 ? ratios.priceToSales.toFixed(2) : '--'}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl col-span-1 sm:col-span-2">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Enterprise Value (EV)</span>
                  <p className="text-lg font-bold text-slate-800 dark:text-white mt-1 font-sans">
                    {ratios.enterpriseValue > 0 ? `₹${(ratios.enterpriseValue / 10000000).toFixed(2)}Cr` : '--'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                  <span className="text-xs text-slate-400 font-semibold uppercase">EV / EBITDA</span>
                  <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.evToEbitda > 0 ? ratios.evToEbitda.toFixed(2) : '--'}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                  <span className="text-xs text-slate-400 font-semibold uppercase">EV / Revenue</span>
                  <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.evToRevenue > 0 ? ratios.evToRevenue.toFixed(2) : '--'}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Operating Margin</span>
                  <p className="text-lg font-bold text-emerald-500 mt-1">{ratios.operatingMargin !== 0 ? `${ratios.operatingMargin.toFixed(2)}%` : '--'}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Net Profit Margin</span>
                  <p className="text-lg font-bold text-emerald-500 mt-1">{ratios.profitMargin !== 0 ? `${ratios.profitMargin.toFixed(2)}%` : '--'}</p>
                </div>
              </div>
            </div>

            {/* Pros & Cons Section */}
            <div className="md:col-span-3 bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl">
              <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-white">Vision Analysis: Pros & Cons</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Pros */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                    <CheckCircle className="w-5 h-5" />
                    <span>PROS / ADVANTAGES</span>
                  </div>
                  <ul className="space-y-3">
                    {pros.map((pro, index) => (
                      <li key={index} className="flex gap-2 items-start text-sm text-slate-600 dark:text-slate-350">
                        <span className="text-emerald-500 mt-0.5">•</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Cons */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5" />
                    <span>CONS / LIMITATIONS</span>
                  </div>
                  <ul className="space-y-3">
                    {cons.map((con, index) => (
                      <li key={index} className="flex gap-2 items-start text-sm text-slate-600 dark:text-slate-350">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            
          </div>
        )}

        {activeTab === 'about' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Corporate Profile overview */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                  <Briefcase className="w-5 h-5 text-blue-500" /> Corporate Profile & Summary
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-sans whitespace-pre-line">
                  {profile.summary}
                </p>
              </div>
            </div>

            {/* General Corporate Stats and website link */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
                <h3 className="text-base font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                  <Globe className="w-5 h-5 text-blue-500" /> Corporate Identity
                </h3>
                
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-xs font-semibold text-slate-450 uppercase">Sector</span>
                    <span className="font-bold text-slate-700 dark:text-white">{profile.sector}</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-xs font-semibold text-slate-450 uppercase">Industry</span>
                    <span className="font-bold text-slate-700 dark:text-white">{profile.industry}</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-xs font-semibold text-slate-450 uppercase">Full-Time Employees</span>
                    <span className="font-bold text-slate-700 dark:text-white">
                      {profile.employees > 0 ? profile.employees.toLocaleString('en-IN') : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-xs font-semibold text-slate-450 uppercase">HQ City</span>
                    <span className="font-bold text-slate-700 dark:text-white">{profile.city}</span>
                  </div>
                  {profile.website && (
                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-xs font-semibold text-slate-455 uppercase">Corporate Website</span>
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-500 hover:underline flex items-center gap-1">
                        Visit Website <Globe className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Key Executive officers table */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Key Executive Officers & Governance</h3>
              </div>
              {!profile.officers || profile.officers.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-medium">No corporate officers list reported for this stock symbol.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <th className="p-4">Officer Name</th>
                        <th className="p-4">Title / Role</th>
                        <th className="p-4 text-center">Age</th>
                        <th className="p-4 text-right">Compensation (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-sm">
                      {profile.officers.map((off, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="p-4 font-bold text-slate-900 dark:text-white">{off.name}</td>
                          <td className="p-4 font-medium text-slate-600 dark:text-slate-350">{off.title}</td>
                          <td className="p-4 text-center font-medium">{off.age ? off.age : '--'}</td>
                          <td className="p-4 text-right font-bold text-slate-800 dark:text-slate-100">
                            {off.pay ? `₹${(off.pay / 10000000).toFixed(2)}Cr` : '--'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === 'qpl' && (
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quarterly Financial Results (Recent Quarters)</h3>
              </div>
              <div className="flex items-start gap-1.5 p-2 bg-blue-500/5 dark:bg-blue-500/10 rounded-xl border border-blue-500/10 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                <span>
                  Yahoo Finance&apos;s public API limits active time-series queries to the last 5 consecutive quarters for international NSE/BSE securities.
                </span>
              </div>
            </div>
            {!chronologicalQuarterly || chronologicalQuarterly.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-medium">Historical quarterly statements are currently unavailable for this stock symbol.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="p-4">Fiscal Period</th>
                      <th className="p-4 text-right">Total Revenue</th>
                      <th className="p-4 text-right">Cost of Revenue</th>
                      <th className="p-4 text-right">Gross Profit</th>
                      <th className="p-4 text-right">Operating Income</th>
                      <th className="p-4 text-right font-bold text-slate-800 dark:text-white">Net Income</th>
                      <th className="p-4 text-right">Basic EPS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-sm">
                    {chronologicalQuarterly.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="p-4 font-bold text-slate-900 dark:text-white">{item.date}</td>
                        <td className="p-4 text-right font-medium">₹{item.revenue ? (item.revenue / 10000000).toFixed(2) : '0.00'}Cr</td>
                        <td className="p-4 text-right">₹{item.costOfRevenue ? (item.costOfRevenue / 10000000).toFixed(2) : '0.00'}Cr</td>
                        <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-350">₹{item.grossProfit ? (item.grossProfit / 10000000).toFixed(2) : '0.00'}Cr</td>
                        <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-350">₹{item.operatingIncome ? (item.operatingIncome / 10000000).toFixed(2) : '0.00'}Cr</td>
                        <td className={`p-4 text-right font-bold ${item.netIncome >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          ₹{item.netIncome ? (item.netIncome / 10000000).toFixed(2) : '0.00'}Cr
                        </td>
                        <td className="p-4 text-right font-semibold text-slate-900 dark:text-white">₹{item.eps?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'pl' && (
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Annual Profit & Loss Statement (10-Year Trend)</h3>
            </div>
            {!chronologicalAnnual || chronologicalAnnual.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-medium">Historical P&L data is currently unavailable for this stock symbol.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="p-4">Fiscal Period</th>
                      <th className="p-4 text-right">Total Revenue</th>
                      <th className="p-4 text-right">Cost of Revenue</th>
                      <th className="p-4 text-right">Gross Profit</th>
                      <th className="p-4 text-right">Operating Income</th>
                      <th className="p-4 text-right">Net Income</th>
                      <th className="p-4 text-right">Basic EPS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-sm">
                    {chronologicalAnnual.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="p-4 font-bold text-slate-900 dark:text-white">{item.date}</td>
                        <td className="p-4 text-right font-medium">₹{item.revenue ? (item.revenue / 10000000).toFixed(2) : '0.00'}Cr</td>
                        <td className="p-4 text-right">₹{item.costOfRevenue ? (item.costOfRevenue / 10000000).toFixed(2) : '0.00'}Cr</td>
                        <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-350">₹{item.grossProfit ? (item.grossProfit / 10000000).toFixed(2) : '0.00'}Cr</td>
                        <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-350">₹{item.operatingIncome ? (item.operatingIncome / 10000000).toFixed(2) : '0.00'}Cr</td>
                        <td className={`p-4 text-right font-semibold ${item.netIncome >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          ₹{item.netIncome ? (item.netIncome / 10000000).toFixed(2) : '0.00'}Cr
                        </td>
                        <td className="p-4 text-right font-semibold text-slate-900 dark:text-white">₹{item.eps?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'bs' && (
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Annual Balance Sheet (10-Year Trend)</h3>
            </div>
            {!chronologicalBS || chronologicalBS.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-medium">Historical Balance Sheet is currently unavailable for this stock symbol.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="p-4">Fiscal Period</th>
                      <th className="p-4 text-right">Total Assets</th>
                      <th className="p-4 text-right">Cash & Cash Equiv.</th>
                      <th className="p-4 text-right">Working Capital</th>
                      <th className="p-4 text-right">Total Liabilities</th>
                      <th className="p-4 text-right">Total Debt</th>
                      <th className="p-4 text-right">Shareholder Equity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-sm">
                    {chronologicalBS.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="p-4 font-bold text-slate-900 dark:text-white">{item.date}</td>
                        <td className="p-4 text-right font-medium">₹{(item.totalAssets / 10000000).toFixed(2)}Cr</td>
                        <td className="p-4 text-right">₹{item.cash ? (item.cash / 10000000).toFixed(2) : '0.00'}Cr</td>
                        <td className="p-4 text-right">₹{item.workingCapital ? (item.workingCapital / 10000000).toFixed(2) : '0.00'}Cr</td>
                        <td className="p-4 text-right">₹{(item.totalLiabilities / 10000000).toFixed(2)}Cr</td>
                        <td className="p-4 text-right font-medium text-red-500">₹{item.debt ? (item.debt / 10000000).toFixed(2) : '0.00'}Cr</td>
                        <td className="p-4 text-right font-semibold text-emerald-500">₹{(item.equity / 10000000).toFixed(2)}Cr</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cf' && (
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Annual Cash Flow Statement (10-Year High-Density Trend)</h3>
            </div>
            {!chronologicalCF || chronologicalCF.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-medium">Historical Cash Flow data is currently unavailable for this stock symbol.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="p-4">Fiscal Period</th>
                      <th className="p-4 text-right">Operating Cash Flow</th>
                      <th className="p-4 text-right">Investing Cash Flow</th>
                      <th className="p-4 text-right">Financing Cash Flow</th>
                      <th className="p-4 text-right font-semibold">Capital Expenditure (CapEx)</th>
                      <th className="p-4 text-right font-semibold text-slate-700 dark:text-slate-350">Net Cash Flow</th>
                      <th className="p-4 text-right font-bold text-slate-850 dark:text-white">Free Cash Flow (FCF)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-sm">
                    {chronologicalCF.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="p-4 font-bold text-slate-900 dark:text-white">{item.date}</td>
                        <td className={`p-4 text-right font-medium ${item.operatingCashFlow >= 0 ? 'text-slate-700 dark:text-slate-350' : 'text-red-500'}`}>
                          ₹{item.operatingCashFlow ? (item.operatingCashFlow / 10000000).toFixed(2) : '0.00'}Cr
                        </td>
                        <td className={`p-4 text-right ${item.investingCashFlow >= 0 ? 'text-slate-700 dark:text-slate-350' : 'text-red-500'}`}>
                          ₹{item.investingCashFlow ? (item.investingCashFlow / 10000000).toFixed(2) : '0.00'}Cr
                        </td>
                        <td className={`p-4 text-right ${item.financingCashFlow >= 0 ? 'text-slate-700 dark:text-slate-350' : 'text-red-500'}`}>
                          ₹{item.financingCashFlow ? (item.financingCashFlow / 10000000).toFixed(2) : '0.00'}Cr
                        </td>
                        <td className="p-4 text-right font-medium text-red-500">
                          ₹{item.capitalExpenditure ? (Math.abs(item.capitalExpenditure) / 10000000).toFixed(2) : '0.00'}Cr
                        </td>
                        <td className={`p-4 text-right font-semibold ${item.netChangeInCash >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                          ₹{item.netChangeInCash ? (item.netChangeInCash / 10000000).toFixed(2) : '0.00'}Cr
                        </td>
                        <td className={`p-4 text-right font-bold ${item.freeCashFlow >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          ₹{item.freeCashFlow ? (item.freeCashFlow / 10000000).toFixed(2) : '0.00'}Cr
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'peers' && (
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Comparative Peer Analysis</h3>
            </div>
            {!peers || peers.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-medium">Comparative peers are currently unavailable for this sector.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="p-4">Ticker Symbol</th>
                      <th className="p-4">Company Name</th>
                      <th className="p-4 text-right">Current Price (₹)</th>
                      <th className="p-4 text-right">P/E Ratio</th>
                      <th className="p-4 text-right">Market Cap (₹)</th>
                      <th className="p-4 text-right">Div. Yield (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-sm">
                    {/* Current Stock row for visual highlighting */}
                    <tr className="bg-blue-500/5 hover:bg-blue-500/10 transition-colors font-semibold">
                      <td className="p-4 text-blue-500 font-bold">{ratios.symbol.replace('.NS', '')} (Current)</td>
                      <td className="p-4 text-slate-800 dark:text-white">{ratios.name}</td>
                      <td className="p-4 text-right">₹{ratios.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="p-4 text-right">{ratios.pe > 0 ? ratios.pe.toFixed(2) : '--'}</td>
                      <td className="p-4 text-right">₹{(ratios.marketCap / 10000000).toFixed(2)}Cr</td>
                      <td className="p-4 text-right">{ratios.divYield > 0 ? `${ratios.divYield.toFixed(2)}%` : '0.00%'}</td>
                    </tr>
                    
                    {peers.map((peer, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                          <Link href={`/watchlist/${encodeURIComponent(peer.symbol)}`} className="text-slate-950 dark:text-slate-200 hover:text-blue-500 transition-colors underline">
                            {peer.symbol.replace('.NS', '')}
                          </Link>
                        </td>
                        <td className="p-4">{peer.name}</td>
                        <td className="p-4 text-right">₹{peer.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="p-4 text-right">{peer.pe > 0 ? peer.pe.toFixed(2) : '--'}</td>
                        <td className="p-4 text-right">₹{(peer.marketCap / 10000000).toFixed(2)}Cr</td>
                        <td className="p-4 text-right">{peer.divYield > 0 ? `${peer.divYield.toFixed(2)}%` : '0.00%'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'shareholding' && (
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl">
            <h3 className="text-lg font-bold mb-8 flex items-center gap-2 text-slate-900 dark:text-white">
              <PieChart className="w-5 h-5 text-blue-500" /> Shareholding Pattern Breakup
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Progress bars representing slices */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center text-sm font-semibold mb-2">
                    <span className="text-slate-600 dark:text-slate-350">Promoter Holding</span>
                    <span className="text-blue-500">{ratios.promHold.toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${ratios.promHold}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-sm font-semibold mb-2">
                    <span className="text-slate-600 dark:text-slate-350">Institutional Holding</span>
                    <span className="text-cyan-500">{ratios.instHold.toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full rounded-full transition-all duration-500" style={{ width: `${ratios.instHold}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-sm font-semibold mb-2">
                    <span className="text-slate-600 dark:text-slate-350">Public & Others</span>
                    <span className="text-emerald-500">{ratios.pubHold.toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${ratios.pubHold}%` }}></div>
                  </div>
                </div>
              </div>

              {/* High precision info block */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                <h4 className="font-bold text-slate-800 dark:text-white mb-2">Holding Classification Policy</h4>
                * **Promoter Equity**: Represents controlling interests held directly by original founders or core management entities. High promoter stakes indicate strong conviction and skin-in-the-game.
                <br /><br />
                * **Institutional Assets**: Mutual funds, pension accounts, insurance entities, and Foreign Portfolio Investors (FPI). High institutional density indicates institutional trust and validation.
                <br /><br />
                * **Retail & Public Allocation**: Represents open market equity held by retail investors and corporate treasuries.
              </div>
            </div>
          </div>
        )}

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
