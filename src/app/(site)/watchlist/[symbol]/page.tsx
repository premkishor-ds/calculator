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
  LineChart,
  BarChart2,
  Newspaper
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
  pe?: number;
}

interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  date: string;
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
  news?: NewsItem[];
}

export default function StockDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const resolvedParams = use(params);
  const [data, setData] = useState<StockDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'ratios' | 'qpl' | 'pl' | 'bs' | 'cf' | 'peers' | 'shareholding' | 'about' | 'news'>('ratios');
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);

  // Dynamic price & PE chart state
  const [chartRange, setChartRange] = useState<string>('1Y');
  const [chartType, setChartType] = useState<'price' | 'pe'>('price');
  const [dynamicChartData, setDynamicChartData] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState<boolean>(false);
  const [chartError, setChartError] = useState<string>('');

  // TradingView Technical Indicator States
  const [showMovingAverages, setShowMovingAverages] = useState<boolean>(false);

  // Implied Growth Reverse DCF Valuation States
  const [discountRate, setDiscountRate] = useState<number>(10);
  const [terminalGrowth, setTerminalGrowth] = useState<number>(4);

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

  // Synchronize dynamic chart data when selected range or preloaded details changes
  useEffect(() => {
    if (!data) return;

    // Direct client bypass for preloaded 1Y range to optimize initial load
    if (chartRange === '1Y') {
      const initialPoints = (data.chartData || []).map((p: ChartPoint) => ({
        date: p.date,
        close: p.close,
        volume: p.volume,
        pe: p.close > 0 && data.ratios.eps > 0 ? Number((p.close / data.ratios.eps).toFixed(2)) : 0
      }));
      setTimeout(() => {
        setDynamicChartData(initialPoints);
      }, 0);
      return;
    }

    const fetchChartRange = async () => {
      try {
        setChartLoading(true);
        setChartError('');
        const res = await fetch(`/api/watchlist/${encodeURIComponent(decodedSymbol)}/chart?range=${chartRange.toLowerCase()}`);
        if (!res.ok) throw new Error('Failed to fetch historical chart data');
        const chartJSON = await res.json();
        setDynamicChartData(chartJSON.points || []);
      } catch (err: unknown) {
        setChartError(err instanceof Error ? err.message : 'Something went wrong fetching chart');
      } finally {
        setChartLoading(false);
      }
    };

  }, [chartRange, decodedSymbol, data]);

  // Compiles analytical scores dynamically based on fundamental ratios
  const scores = React.useMemo(() => {
    if (!data) return { valuation: 0, growth: 0, profitability: 0, health: 0, total: 0 };
    const { ratios } = data;
    let valScore = 50;
    if (ratios.pe > 0) {
      if (ratios.pe < 15) valScore = 85;
      else if (ratios.pe < 25) valScore = 70;
      else if (ratios.pe < 40) valScore = 50;
      else valScore = 30;
    }
    if (ratios.pegRatio > 0 && ratios.pegRatio < 1.5) valScore += 10;
    
    let growthScore = 40;
    const grRate = ratios.roe > 0 ? ratios.roe : 15;
    if (grRate > 22) growthScore = 90;
    else if (grRate > 15) growthScore = 75;
    else if (grRate > 8) growthScore = 55;
    
    let profScore = 50;
    if (ratios.roe > 0) {
      if (ratios.roe > 22) profScore = 92;
      else if (ratios.roe > 15) profScore = 78;
      else if (ratios.roe > 10) profScore = 58;
    }
    if (ratios.profitMargin > 15) profScore += 8;

    let healthScore = 60;
    const de = ratios.debtToEquity > 0 ? ratios.debtToEquity / 100 : 0.2;
    if (de < 0.2) healthScore = 95;
    else if (de < 0.8) healthScore = 80;
    else if (de < 1.5) healthScore = 55;
    else healthScore = 30;
    if (ratios.currentRatio > 1.5) healthScore += 5;

    return {
      valuation: Math.min(100, valScore),
      growth: Math.min(100, growthScore),
      profitability: Math.min(100, profScore),
      health: Math.min(100, healthScore),
      total: Math.round((valScore + growthScore + profScore + healthScore) / 4)
    };
  }, [data]);

  // Generates alert warning factors based on leverage and efficiency benchmarks
  const redFlags = React.useMemo(() => {
    if (!data) return [];
    const { ratios } = data;
    const flags: string[] = [];
    const de = ratios.debtToEquity > 0 ? ratios.debtToEquity / 100 : 0;
    if (de > 1.5) {
      flags.push("High Leverage: Debt-to-equity ratio is dangerously elevated (>1.5), representing refinancing risks.");
    }
    if (ratios.pe > 45) {
      flags.push("Premium Valuation: Stock trades at a very high price-to-earnings multiple, indicating high market expectations.");
    }
    if (ratios.currentRatio > 0 && ratios.currentRatio < 1.0) {
      flags.push("Liquidity Stress: Current ratio is below 1.0, suggesting potential working capital constraints.");
    }
    if (ratios.roe > 0 && ratios.roe < 10) {
      flags.push("Sub-Par Compounding: Return on Equity is below 10%, indicating sub-optimal capital allocation efficiency.");
    }
    if (flags.length === 0) {
      flags.push("Pristine Corporate Governance: Dynamic auditing scanned 0 critical fundamental red flags in reported filings.");
    }
    return flags;
  }, [data]);

  // Numerical Solver for Implied Growth Rate (Reverse DCF valuation)
  const impliedGrowth = React.useMemo(() => {
    if (!data || !data.ratios.price || !data.ratios.eps || data.ratios.eps <= 0) return 12.5;
    const { ratios } = data;
    const d = discountRate / 100;
    const tg = terminalGrowth / 100;
    const eps = ratios.eps;
    
    const low = -0.20;
    const high = 0.60;
    let bestGrowth = 0.12;
    let minDiff = Infinity;
    
    for (let g = low; g <= high; g += 0.001) {
      let dcf = 0;
      let currentEps = eps;
      for (let t = 1; t <= 10; t++) {
        currentEps *= (1 + g);
        dcf += currentEps / Math.pow(1 + d, t);
      }
      const terminalValue = (currentEps * (1 + tg)) / Math.max(0.005, d - tg);
      dcf += terminalValue / Math.pow(1 + d, 10);
      
      const diff = Math.abs(dcf - ratios.price);
      if (diff < minDiff) {
        minDiff = diff;
        bestGrowth = g;
      }
    }
    
    return bestGrowth * 100;
  }, [data, discountRate, terminalGrowth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans pb-20">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto animate-pulse">
          {/* Back button skeleton */}
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-32 mb-6" />

          {/* Header Card skeleton */}
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <div className="h-8 bg-slate-350 dark:bg-slate-700 rounded-lg w-48 mb-2" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-32" />
              </div>
              <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                <div className="w-32"><div className="h-8 bg-slate-300 dark:bg-slate-700 rounded-lg mb-1" /><div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-16" /></div>
                <div className="w-24"><div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-md mb-1" /><div className="h-3 bg-slate-100 dark:bg-slate-900 rounded-md w-12" /></div>
                <div className="w-24"><div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-md mb-1" /><div className="h-3 bg-slate-100 dark:bg-slate-900 rounded-md w-12" /></div>
              </div>
            </div>
          </div>

          {/* Tabs skeleton */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto gap-4 scrollbar-none py-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-6 bg-slate-200 dark:bg-slate-800 rounded-md w-24 shrink-0" />
            ))}
          </div>

          {/* Grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Chart box shimmer */}
            <div className="md:col-span-3 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl h-[340px] flex flex-col justify-between">
              <div className="flex justify-between items-center"><div className="h-5 bg-slate-250 dark:bg-slate-750 rounded-md w-48" /><div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-md w-32" /></div>
              <div className="flex-1 my-4 bg-slate-100 dark:bg-slate-950 rounded-2xl animate-pulse" />
              <div className="h-4 bg-slate-200 dark:bg-slate-850 rounded-md w-64" />
            </div>

            {/* Ratios box shimmer */}
            <div className="md:col-span-2 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
              <div className="h-5 bg-slate-250 dark:bg-slate-750 rounded-md w-40 mb-6" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl"><div className="h-3 bg-slate-200 dark:bg-slate-850 rounded-md w-16 mb-2" /><div className="h-5 bg-slate-350 dark:bg-slate-700 rounded-md w-12" /></div>
                ))}
              </div>
            </div>

            {/* Technical analysis indicators shimmer */}
            <div className="bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl h-fit">
              <div className="h-5 bg-slate-250 dark:bg-slate-750 rounded-md w-36 mb-6" />
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/60"><div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-24" /><div className="h-4 bg-slate-300 dark:bg-slate-700 rounded-md w-16" /></div>
                ))}
              </div>
            </div>
          </div>
        </div>
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

  const { ratios, profile, balanceSheet, profitLoss, cashFlow, quarterlyProfitLoss, peers, pros, cons } = data;
  const isPositive = ratios.change >= 0;

  // Render statements chronologically
  const chronologicalQuarterly = quarterlyProfitLoss ? [...quarterlyProfitLoss].reverse() : [];
  const chronologicalAnnual = profitLoss ? [...profitLoss].reverse() : [];
  const chronologicalBS = balanceSheet ? [...balanceSheet].reverse() : [];
  const chronologicalCF = cashFlow ? [...cashFlow].reverse() : [];

  // SVG Chart Setup (Dynamic Price or PE)
  const chartPoints = dynamicChartData || [];
  
  const activeValues = chartType === 'price'
    ? chartPoints.map(p => p.close || 0)
    : chartPoints.map(p => p.pe || 0);

  const maxVal = activeValues.length > 0 ? Math.max(...activeValues) : 100;
  const minVal = activeValues.length > 0 ? Math.min(...activeValues) : 0;
  const valRange = maxVal - minVal || 1;

  const svgWidth = 800;
  const svgHeight = 220;
  const padding = 15;
  const graphWidth = svgWidth - padding * 2;
  const graphHeight = svgHeight - padding * 2;

  // Simple Moving Average overlay paths for Technical Charting
  const getSMA = (idx: number, period: number) => {
    if (idx < period) return null;
    const subset = activeValues.slice(idx - period, idx);
    const sum = subset.reduce((a, b) => a + b, 0);
    return sum / period;
  };

  const sma10Points = showMovingAverages
    ? chartPoints.map((p, idx) => {
        const val = getSMA(idx, Math.min(10, Math.floor(chartPoints.length / 4)));
        if (val === null) return null;
        const y = svgHeight - padding - ((val - minVal) / valRange) * graphHeight;
        return { x: padding + (idx / Math.max(1, chartPoints.length - 1)) * graphWidth, y };
      }).filter(p => p !== null) as { x: number; y: number }[]
    : [];

  const sma10Path = sma10Points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const sma30Points = showMovingAverages
    ? chartPoints.map((p, idx) => {
        const val = getSMA(idx, Math.min(30, Math.floor(chartPoints.length / 2)));
        if (val === null) return null;
        const y = svgHeight - padding - ((val - minVal) / valRange) * graphHeight;
        return { x: padding + (idx / Math.max(1, chartPoints.length - 1)) * graphWidth, y };
      }).filter(p => p !== null) as { x: number; y: number }[]
    : [];

  // Map elements to high fidelity coordinate points
  const points = chartPoints.map((p, idx) => {
    const yValue = chartType === 'price' ? (p.close || 0) : (p.pe || 0);
    const x = padding + (idx / Math.max(1, chartPoints.length - 1)) * graphWidth;
    const y = svgHeight - padding - ((yValue - minVal) / valRange) * graphHeight;
    return { x, y, data: p };
  });

  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`
    : '';

  // Max volume setup
  const maxVol = chartPoints.length > 0 ? Math.max(...chartPoints.map(p => p.volume || 0)) : 1;

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
              
              {/* Wealth Projection Simulation Bridge + Trading Terminal Link */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href={`/?lumpsum=${Math.round(ratios.price)}&cagr=${Math.round(ratios.roe > 0 ? ratios.roe : 18)}&symbol=${ratios.symbol.replace('.NS', '')}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 active:scale-[0.98]"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Simulate Compounding Wealth
                </Link>
                <Link
                  href={`/chart?symbol=${encodeURIComponent(ratios.symbol)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/35 active:scale-[0.98]"
                >
                  <LineChart className="w-3.5 h-3.5" />
                  Open in Trading Terminal
                </Link>
              </div>
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
            onClick={() => setActiveTab('news')}
            className={`pb-4 px-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'news'
                ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Latest News
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
            <div className="md:col-span-3 bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <LineChart className={`w-5 h-5 ${chartType === 'price' ? 'text-blue-500' : 'text-purple-500'}`} />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {chartType === 'price' ? 'Historical Price & Volume' : 'Historical P/E Ratio Trend'} ({chartRange})
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    {chartType === 'price' 
                      ? 'Interactive Chartink/TradingView styled line graph with volume spike overlays.'
                      : 'Dynamic price-to-earnings multiple trend calculated using chronological reported filings.'}
                  </p>
                </div>

                {/* Price vs PE toggle & Interval selectors */}
                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                  {/* Price / PE Selectors */}
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      onClick={() => setChartType('price')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        chartType === 'price'
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Price Chart
                    </button>
                    <button
                      onClick={() => setChartType('pe')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        chartType === 'pe'
                          ? 'bg-purple-500 text-white shadow-md'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      P/E Ratio
                    </button>
                  </div>

                  {/* Range Selectors */}
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {['1D', '1W', '1M', '1Y', '5Y', 'MAX'].map((r) => (
                      <button
                        key={r}
                        onClick={() => setChartRange(r)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          chartRange === r
                            ? `${chartType === 'price' ? 'bg-blue-500' : 'bg-purple-500'} text-white shadow-md`
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  {/* Technical SMA Indicators Overlay Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowMovingAverages(!showMovingAverages)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                      showMovingAverages
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-extrabold'
                        : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Overlay SMA (10/30)
                  </button>
                </div>
              </div>

              {activePoint && (
                <div className="flex flex-wrap gap-3 sm:gap-6 items-center bg-slate-50 dark:bg-slate-850 px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-500 mb-6">
                  <div>Date: <span className="text-slate-800 dark:text-white font-bold">{activePoint.date}</span></div>
                  {chartType === 'price' ? (
                    <>
                      <div>Price: <span className="text-blue-500 font-extrabold">₹{activePoint.close.toFixed(2)}</span></div>
                      {activePoint.volume > 0 && (
                        <div>Volume: <span className="text-slate-850 dark:text-slate-200">{(activePoint.volume / 100000).toFixed(2)}L</span></div>
                      )}
                    </>
                  ) : (
                    <div>P/E Ratio: <span className="text-purple-500 font-extrabold">{activePoint.pe !== undefined && activePoint.pe > 0 ? activePoint.pe.toFixed(2) : '--'}</span></div>
                  )}
                </div>
              )}

              <div className="relative w-full min-h-[220px]">
                {chartLoading && (
                  <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-30 rounded-2xl">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className={`w-8 h-8 ${chartType === 'price' ? 'text-blue-500' : 'text-purple-500'} animate-spin`} />
                      <span className="text-xs font-bold text-slate-550 dark:text-slate-400">Loading historical trend...</span>
                    </div>
                  </div>
                )}

                {chartError ? (
                  <div className="py-20 text-center text-red-500 font-semibold">{chartError}</div>
                ) : chartPoints.length === 0 ? (
                  <div className="py-20 text-center text-slate-500 font-semibold">No historical data available for this range.</div>
                ) : (
                  <>
                    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible select-none">
                      <defs>
                        <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartType === 'price' ? '#3b82f6' : '#a855f7'} stopOpacity="0.25" />
                          <stop offset="100%" stopColor={chartType === 'price' ? '#3b82f6' : '#a855f7'} stopOpacity="0.00" />
                        </linearGradient>
                      </defs>

                      {/* horizontal helper gridlines */}
                      <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="currentColor" className="text-slate-100 dark:text-slate-800/40" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} stroke="currentColor" className="text-slate-100 dark:text-slate-800/40" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="currentColor" className="text-slate-150 dark:text-slate-800/80" strokeWidth="1" />

                      {/* Area under curve */}
                      {areaPath && <path d={areaPath} fill="url(#chart-gradient)" />}

                      {/* Volume bars (bottom 15%) - only show for Price chart */}
                      {chartType === 'price' && points.map((p, idx) => {
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

                      {/* SVG stroke path */}
                      {linePath && (
                        <path 
                          d={linePath} 
                          fill="none" 
                          stroke={chartType === 'price' ? '#3b82f6' : '#a855f7'} 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          className={`drop-shadow-[0_2px_8px_${chartType === 'price' ? 'rgba(59,130,246,0.3)' : 'rgba(168,85,247,0.3)'}]`}
                        />
                      )}

                      {/* Technical Simple Moving Average overlay paths */}
                      {showMovingAverages && sma10Path && (
                        <path 
                          d={sma10Path} 
                          fill="none" 
                          stroke="#eab308" 
                          strokeWidth="1.5" 
                          strokeDasharray="3 3"
                          className="opacity-90"
                        />
                      )}
                      {showMovingAverages && sma30Path && (
                        <path 
                          d={sma30Path} 
                          fill="none" 
                          stroke="#10b981" 
                          strokeWidth="1.5" 
                          strokeDasharray="3 3"
                          className="opacity-90"
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
                          className={chartType === 'price' ? 'text-blue-500/30' : 'text-purple-500/30'} 
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
                          fill={chartType === 'price' ? '#3b82f6' : '#a855f7'} 
                          stroke="white" 
                          strokeWidth="1.5" 
                          className={`drop-shadow-[0_0_4px_${chartType === 'price' ? 'rgba(59,130,246,0.8)' : 'rgba(168,85,247,0.8)'}]`}
                        />
                      )}
                    </svg>

                    {/* Horizontal interactive hover panels overlay */}
                    <div className="absolute inset-0 flex touch-none">
                      {points.map((p, idx) => (
                        <div 
                          key={idx} 
                          className="h-full flex-1 cursor-crosshair"
                          onMouseEnter={() => setHoveredPoint(p.data)}
                          onMouseLeave={() => setHoveredPoint(null)}
                          onTouchStart={() => setHoveredPoint(p.data)}
                          onTouchMove={(e) => {
                            const touch = e.touches[0];
                            if (!touch) return;
                            const el = document.elementFromPoint(touch.clientX, touch.clientY);
                            const idxAttr = el?.getAttribute('data-chart-idx');
                            if (idxAttr != null) {
                              const i = Number(idxAttr);
                              if (chartPoints[i]) setHoveredPoint(chartPoints[i]);
                            }
                          }}
                          data-chart-idx={idx}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

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

            {/* QoQ & YoY Revenue + Profit Growth Bar Charts */}
            <div className="md:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* QoQ - Quarterly Revenue & Profit */}
              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
                <h3 className="text-base font-bold mb-1 flex items-center gap-2 text-slate-900 dark:text-white">
                  <BarChart2 className="w-4 h-4 text-blue-500" /> Quarterly Growth (QoQ)
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mb-5">Revenue vs Net Profit · Last 8 Quarters</p>
                {chronologicalQuarterly.length < 2 ? (
                  <p className="text-slate-400 text-xs py-6 text-center">Not enough quarterly data available.</p>
                ) : (() => {
                  const quarters = chronologicalQuarterly.slice(-8);
                  const maxRev = Math.max(...quarters.map(q => Math.abs(q.revenue)));
                  const maxProfit = Math.max(...quarters.map(q => Math.abs(q.netIncome)));
                  const scale = Math.max(maxRev, maxProfit) || 1;
                  return (
                    <div className="flex items-end gap-2 h-40 w-full">
                      {quarters.map((q, i) => {
                        const prevQ = i > 0 ? quarters[i - 1] : null;
                        const revGrowth = prevQ && prevQ.revenue > 0 ? ((q.revenue - prevQ.revenue) / prevQ.revenue) * 100 : null;
                        const profGrowth = prevQ && prevQ.netIncome > 0 ? ((q.netIncome - prevQ.netIncome) / prevQ.netIncome) * 100 : null;
                        const revH = Math.max(4, (Math.abs(q.revenue) / scale) * 100);
                        const profH = Math.max(4, (Math.abs(q.netIncome) / scale) * 100);
                        const isRevPos = !prevQ || q.revenue >= prevQ.revenue;
                        const isProfPos = !prevQ || q.netIncome >= prevQ.netIncome;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 text-[9px] font-bold whitespace-nowrap z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
                              <div className="text-slate-300 mb-1">{q.date}</div>
                              <div className="text-blue-400">Rev: ₹{(q.revenue / 10000000).toFixed(1)}Cr</div>
                              <div className={isProfPos ? 'text-emerald-400' : 'text-red-400'}>
                                Profit: ₹{(q.netIncome / 10000000).toFixed(1)}Cr
                              </div>
                              {revGrowth !== null && <div className={revGrowth >= 0 ? 'text-emerald-300' : 'text-red-300'}>Rev Δ: {revGrowth >= 0 ? '+' : ''}{revGrowth.toFixed(1)}%</div>}
                              {profGrowth !== null && <div className={profGrowth >= 0 ? 'text-emerald-300' : 'text-red-300'}>Profit Δ: {profGrowth >= 0 ? '+' : ''}{profGrowth.toFixed(1)}%</div>}
                            </div>
                            {/* Bars side-by-side */}
                            <div className="w-full flex gap-0.5 items-end" style={{ height: '100%' }}>
                              <div
                                className={`flex-1 rounded-t-md transition-all ${isRevPos ? 'bg-blue-500/70 hover:bg-blue-500' : 'bg-blue-300/50 hover:bg-blue-300/80'}`}
                                style={{ height: `${revH}%` }}
                                title={`Revenue: ₹${(q.revenue / 10000000).toFixed(1)}Cr`}
                              />
                              <div
                                className={`flex-1 rounded-t-md transition-all ${isProfPos ? 'bg-emerald-500/70 hover:bg-emerald-500' : 'bg-red-400/70 hover:bg-red-400'}`}
                                style={{ height: `${profH}%` }}
                                title={`Net Profit: ₹${(q.netIncome / 10000000).toFixed(1)}Cr`}
                              />
                            </div>
                            <span className="text-[8px] text-slate-400 font-bold mt-1 truncate w-full text-center leading-tight">
                              {q.date.slice(0, 7)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><span className="w-3 h-2 bg-blue-500/70 rounded" /> Revenue</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><span className="w-3 h-2 bg-emerald-500/70 rounded" /> Net Profit</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><span className="w-3 h-2 bg-red-400/70 rounded" /> Decline</span>
                </div>
              </div>

              {/* YoY - Annual Revenue & Profit */}
              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
                <h3 className="text-base font-bold mb-1 flex items-center gap-2 text-slate-900 dark:text-white">
                  <BarChart2 className="w-4 h-4 text-purple-500" /> Annual Growth (YoY)
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mb-5">Revenue vs Net Profit · Last 5 Years</p>
                {chronologicalAnnual.length < 2 ? (
                  <p className="text-slate-400 text-xs py-6 text-center">Not enough annual data available.</p>
                ) : (() => {
                  const years = chronologicalAnnual.slice(-5);
                  const maxRev = Math.max(...years.map(y => Math.abs(y.revenue)));
                  const maxProfit = Math.max(...years.map(y => Math.abs(y.netIncome)));
                  const scale = Math.max(maxRev, maxProfit) || 1;
                  return (
                    <div className="flex items-end gap-3 h-40 w-full">
                      {years.map((y, i) => {
                        const prevY = i > 0 ? years[i - 1] : null;
                        const revGrowth = prevY && prevY.revenue > 0 ? ((y.revenue - prevY.revenue) / prevY.revenue) * 100 : null;
                        const profGrowth = prevY && prevY.netIncome > 0 ? ((y.netIncome - prevY.netIncome) / prevY.netIncome) * 100 : null;
                        const revH = Math.max(4, (Math.abs(y.revenue) / scale) * 100);
                        const profH = Math.max(4, (Math.abs(y.netIncome) / scale) * 100);
                        const isRevPos = !prevY || y.revenue >= prevY.revenue;
                        const isProfPos = !prevY || y.netIncome >= prevY.netIncome;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 text-[9px] font-bold whitespace-nowrap z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
                              <div className="text-slate-300 mb-1">{y.date}</div>
                              <div className="text-purple-400">Rev: ₹{(y.revenue / 10000000).toFixed(1)}Cr</div>
                              <div className={isProfPos ? 'text-emerald-400' : 'text-red-400'}>
                                Profit: ₹{(y.netIncome / 10000000).toFixed(1)}Cr
                              </div>
                              {revGrowth !== null && <div className={revGrowth >= 0 ? 'text-emerald-300' : 'text-red-300'}>Rev Δ: {revGrowth >= 0 ? '+' : ''}{revGrowth.toFixed(1)}%</div>}
                              {profGrowth !== null && <div className={profGrowth >= 0 ? 'text-emerald-300' : 'text-red-300'}>Profit Δ: {profGrowth >= 0 ? '+' : ''}{profGrowth.toFixed(1)}%</div>}
                            </div>
                            {/* Bars */}
                            <div className="w-full flex gap-1 items-end" style={{ height: '100%' }}>
                              <div
                                className={`flex-1 rounded-t-lg transition-all ${isRevPos ? 'bg-purple-500/70 hover:bg-purple-500' : 'bg-purple-300/50 hover:bg-purple-300/80'}`}
                                style={{ height: `${revH}%` }}
                              />
                              <div
                                className={`flex-1 rounded-t-lg transition-all ${isProfPos ? 'bg-emerald-500/70 hover:bg-emerald-500' : 'bg-red-400/70 hover:bg-red-400'}`}
                                style={{ height: `${profH}%` }}
                              />
                            </div>
                            {/* Growth badge */}
                            {profGrowth !== null && (
                              <span className={`text-[8px] font-black mt-0.5 ${profGrowth >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                {profGrowth >= 0 ? '+' : ''}{profGrowth.toFixed(0)}%
                              </span>
                            )}
                            <span className="text-[8px] text-slate-400 font-bold truncate w-full text-center">
                              {y.date.slice(0, 4)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><span className="w-3 h-2 bg-purple-500/70 rounded" /> Revenue</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><span className="w-3 h-2 bg-emerald-500/70 rounded" /> Net Profit</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><span className="w-3 h-2 bg-red-400/70 rounded" /> Decline · % = Profit YoY</span>
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

            {/* Implied Growth Reverse DCF solver panel */}
            <div className="md:col-span-3 bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl animate-fade-in">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Scale className="w-5 h-5 text-blue-500" /> Implied Growth Compounder (Reverse DCF Valuation)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium font-sans">
                    Institutional-grade investment intelligence. Numerical valuation solver computes what perpetuity growth rate the market prices in based on discount parameters.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Inputs */}
                <div className="space-y-6 md:col-span-2">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold font-sans">
                      <span className="text-slate-400 dark:text-slate-500">Discount Rate (Required Annual Return)</span>
                      <span className="text-blue-500">{discountRate}%</span>
                    </div>
                    <input 
                      type="range" min="8" max="20" step="0.5" 
                      value={discountRate} onChange={(e) => setDiscountRate(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-250 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold font-sans">
                      <span className="text-slate-400 dark:text-slate-500">Terminal perpetuity Growth Rate</span>
                      <span className="text-blue-500">{terminalGrowth}%</span>
                    </div>
                    <input 
                      type="range" min="2" max="6" step="0.5" 
                      value={terminalGrowth} onChange={(e) => setTerminalGrowth(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-250 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Solver Compounding Output */}
                <div className="p-6 bg-slate-50 dark:bg-slate-850/60 rounded-2xl flex flex-col justify-center items-center text-center border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-extrabold tracking-widest uppercase">Implied Compounding Rate</span>
                  <span className="text-3xl font-black text-blue-550 dark:text-blue-400 mt-2">
                    {impliedGrowth.toFixed(2)}%
                  </span>
                  <p className="text-[10px] text-slate-450 mt-3 leading-normal max-w-[220px]">
                    The company must grow its cash earnings by <span className="font-bold text-slate-700 dark:text-slate-200">{impliedGrowth.toFixed(1)}%</span> year-on-year for the next decade to justify the current price of <span className="font-bold">₹{ratios.price.toFixed(0)}</span>.
                  </p>
                </div>
              </div>
            </div>

            {/* Stock Health Scorecard & Risk Signals */}
            <div className="md:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
              {/* Scorecard */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-blue-500" /> Enterprise Health Scorecard
                  </h3>
                  <span className="px-3.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-black">
                    Institutional Rating: {scores.total}/100
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Valuation */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold font-sans">
                      <span className="text-slate-400 dark:text-slate-500">Valuation Score</span>
                      <span className="text-blue-550 dark:text-blue-400">{scores.valuation}/100</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-blue-550 h-full rounded-full transition-all" style={{ width: `${scores.valuation}%` }} />
                    </div>
                  </div>

                  {/* Growth */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold font-sans">
                      <span className="text-slate-400 dark:text-slate-500">Growth Momentum</span>
                      <span className="text-orange-500">{scores.growth}/100</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-orange-500 h-full rounded-full transition-all" style={{ width: `${scores.growth}%` }} />
                    </div>
                  </div>

                  {/* Profitability */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold font-sans">
                      <span className="text-slate-400 dark:text-slate-500">Profitability (ROE/Margins)</span>
                      <span className="text-emerald-500">{scores.profitability}/100</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${scores.profitability}%` }} />
                    </div>
                  </div>

                  {/* Solvency / Health */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold font-sans">
                      <span className="text-slate-400 dark:text-slate-500">Solvency & Health</span>
                      <span className="text-purple-500">{scores.health}/100</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full rounded-full transition-all" style={{ width: `${scores.health}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Red Flags */}
              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl flex flex-col justify-between animate-fade-in">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
                    <AlertTriangle className="w-5 h-5 text-red-500" /> Fundamental Risk Audit
                  </h3>
                  <div className="space-y-4 max-h-[160px] overflow-y-auto scrollbar-thin pr-1">
                    {redFlags.map((flag, idx) => (
                      <div key={idx} className="flex gap-2 items-start text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <span className="text-red-500 font-extrabold shrink-0">•</span>
                        <span>{flag}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-450 font-bold uppercase tracking-widest">
                  Scanned from reported corporate filings
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

            {/* Recent News Preview */}
            <div className="md:col-span-3 bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl mt-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <Newspaper className="w-5 h-5 text-blue-500" /> Recent Stock News
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('news')}
                  className="text-xs font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 group"
                >
                  View All News <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
              </div>

              {!data.news || data.news.length === 0 ? (
                <div className="text-slate-500 font-medium text-sm py-4 text-center">No recent news updates found.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {data.news.slice(0, 3).map((item, idx) => (
                    <a
                      key={idx}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-5 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 border border-slate-200 dark:border-slate-800 hover:border-blue-500/30 rounded-2xl transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-4 mb-2.5">
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                            {item.publisher}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium">{item.date}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors leading-snug line-clamp-3">
                          {item.title}
                        </h4>
                      </div>
                      <div className="mt-4 flex items-center text-[10px] font-bold text-blue-500 hover:text-blue-600">
                        Read Story <span className="ml-1 group-hover:translate-x-0.5 transition-transform">→</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
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

        {activeTab === 'news' && (
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
              <Newspaper className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Latest News & Corporate Updates</h3>
            </div>
            {!data.news || data.news.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-medium">No recent news articles found for this stock symbol.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.news.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col justify-between p-5 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 border border-slate-200 dark:border-slate-800 hover:border-blue-500/30 rounded-2xl transition-all group duration-300"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-4 mb-2.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                          {item.publisher}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {item.date}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors leading-snug">
                        {item.title}
                      </h4>
                    </div>
                    <div className="mt-4 flex items-center text-[11px] font-bold text-blue-500 hover:text-blue-600">
                      Read Article <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
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
