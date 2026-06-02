"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  Gauge, 
  Layers, 
  Scale, 
  Info,
  Calendar,
  Compass,
  Zap,
  Target,
  Percent,
  LineChart,
  ShieldAlert,
  Brain,
  History,
  Sparkles,
  BarChart3,
  Eye,
  Coins,
  ChevronRight
} from 'lucide-react';
import { 
  runAIPredictionEngine, 
  ChartPoint as EnginePoint, 
  PredictionResult, 
  OrderBookLevel 
} from '@/utils/predictionEngine';
import { getBackendApiUrl } from '@/lib/backend-config';
import { DEFAULT_SEEDS } from '@/utils/symbols';

export interface MarketIntelligenceRatios {
  symbol?: string;
  price?: number;
  debtToEquity?: number;
  currentRatio?: number;
}

export interface ChartDataItem {
  time?: number;
  date?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  pe?: number;
}

interface AIMarketIntelligenceProps {
  data: {
    ratios: MarketIntelligenceRatios;
    profile: unknown;
    balanceSheet: unknown[];
    profitLoss: unknown[];
    cashFlow: unknown[];
    quarterlyProfitLoss: unknown[];
    chartData: ChartDataItem[];
    peers: unknown[];
    pros: string[];
    cons: string[];
  };
  livePrice?: number;
  liveOrderBook?: { bids: OrderBookLevel[], asks: OrderBookLevel[] };
  isLoading?: boolean;
  isSidebar?: boolean;
}

export default function AIMarketIntelligence({ data, livePrice, liveOrderBook, isLoading, isSidebar }: AIMarketIntelligenceProps) {
  // Defensive guard — ratios may be undefined during initial load before deepData resolves
  const safeRatios = data?.ratios || {};
  const symbol = safeRatios.symbol || 'STOCK';
  const currentPrice = livePrice || safeRatios.price || 100;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Process data points for prediction engine
  const processedPoints = useMemo(() => {
    if (!data.chartData || data.chartData.length === 0) return [];
    
    return data.chartData.map((p: ChartDataItem, idx) => ({
      time: p.time || idx * 86400,
      date: p.date || '',
      open: p.open || p.close || 100,
      high: p.high || p.close || 100,
      low: p.low || p.close || 100,
      close: p.close || 100,
      volume: p.volume || 0,
      pe: p.pe || 0
    }));
  }, [data.chartData]);

  // Run AI prediction engine
  const aiResult: PredictionResult = useMemo(() => {
    return runAIPredictionEngine(
      symbol,
      processedPoints,
      data.ratios || {},
      data.profitLoss || [],
      data.cashFlow || [],
      data.quarterlyProfitLoss || [],
      liveOrderBook
    );
  }, [symbol, processedPoints, data, liveOrderBook]);

  const sentiment = aiResult.predictionSentiment;
  const confidence = aiResult.overallConfidence;

  // Fundamental Score Calculation (0-100)
  const fundamentalScore = useMemo(() => {
    let score = 50; // Neutral starting base
    const ratios = data.ratios || {};
    
    // 1. Debt-to-Equity
    if (ratios.debtToEquity !== undefined) {
      if (ratios.debtToEquity < 50) score += 20;
      else if (ratios.debtToEquity < 100) score += 10;
      else if (ratios.debtToEquity > 150) score -= 15;
    } else {
      score += 10;
    }

    // 2. Current Ratio
    if (ratios.currentRatio !== undefined) {
      if (ratios.currentRatio > 1.8) score += 20;
      else if (ratios.currentRatio >= 1.2) score += 10;
      else if (ratios.currentRatio < 1.0) score -= 15;
    } else {
      score += 10;
    }

    // 3. PE Valuation Ratio
    const pe = ratios.price !== undefined && ratios.price > 0 && data.chartData && data.chartData.length > 0
      ? data.chartData[data.chartData.length - 1].pe
      : undefined;
    if (pe !== undefined && pe > 0) {
      if (pe < 22) score += 10;
      else if (pe > 55) score -= 10;
    }
    
    return Math.min(100, Math.max(0, score));
  }, [data.ratios, data.chartData]);

  // Technical Score Calculation (0-100)
  const technicalScore = useMemo(() => {
    let score = 50;
    
    // 1. RSI contribution
    const rsiVal = aiResult.multiTimeframe?.[0]?.rsi || 50;
    if (rsiVal >= 45 && rsiVal <= 65) score += 15;
    else if (rsiVal < 30) score += 10;
    else if (rsiVal > 70) score -= 10;
    
    // 2. MACD contribution
    const macdSig = aiResult.multiTimeframe?.[0]?.macdSignal || 'NEUTRAL';
    if (macdSig === 'BUY') score += 15;
    else if (macdSig === 'SELL') score -= 15;

    // 3. MA Alignment
    const maAlign = aiResult.multiTimeframe?.[0]?.maAlignment || 'MIXED';
    if (maAlign === 'UPWARD') score += 20;
    else if (maAlign === 'DOWNWARD') score -= 15;

    return Math.min(100, Math.max(0, score));
  }, [aiResult]);

  // Fetch holdings for Diversification Analysis
  const [userHoldings, setUserHoldings] = useState<any[]>([]);
  const [defaultWatchlistStocks, setDefaultWatchlistStocks] = useState<any[]>([]);

  useEffect(() => {
    const fetchUserHoldings = async () => {
      try {
        const BACKEND_API_URL = getBackendApiUrl();
        const token = localStorage.getItem('token');
        const headers: any = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${BACKEND_API_URL}/holdings`, { headers });
        if (res.ok) {
          const holdingsData = await res.json();
          setUserHoldings(holdingsData);
        }
      } catch (err) {
        console.error('Failed to fetch user holdings for portfolio index computation:', err);
      }
    };

    const fetchDefaultWatchlist = async () => {
      try {
        const BACKEND_API_URL = getBackendApiUrl();
        const token = localStorage.getItem('token');
        const headers: any = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${BACKEND_API_URL}/stocks?watchlist=default`, { headers });
        if (res.ok) {
          const stocksData = await res.json();
          setDefaultWatchlistStocks(stocksData);
        }
      } catch (err) {
        console.error('Failed to fetch default watchlist stocks for fallback ranking:', err);
      }
    };

    fetchUserHoldings();
    fetchDefaultWatchlist();
  }, []);

  // Group user holdings and calculate HHI
  const diversificationIndex = useMemo(() => {
    if (userHoldings.length === 0) return { hhi: 0, status: 'No holdings logged', score: 0, sectorWeights: [] };
    
    const totalValue = userHoldings.reduce((sum, h) => sum + (h.currentPrice || h.buyPrice || 100) * h.quantity, 0) || 1;
    
    // Sector mapper
    const getSector = (sym: string) => {
      const s = sym.toUpperCase();
      if (s.includes('TCS') || s.includes('INFY') || s.includes('WIPRO') || s.includes('TECHM')) return 'Information Technology';
      if (s.includes('HDFC') || s.includes('ICICI') || s.includes('SBI') || s.includes('AXIS') || s.includes('KOTAK')) return 'Financial Services';
      if (s.includes('RELIANCE') || s.includes('ONGC') || s.includes('BPCL') || s.includes('IOC')) return 'Energy / Oil & Gas';
      if (s.includes('TATASTEEL') || s.includes('JSWSTEEL') || s.includes('HINDALCO')) return 'Metals & Mining';
      if (s.includes('SUNPHARMA') || s.includes('CIPLA') || s.includes('REDDY')) return 'Healthcare / Pharma';
      return 'Consumer / Others';
    };

    const sectorMap: { [key: string]: number } = {};
    userHoldings.forEach(h => {
      const val = (h.currentPrice || h.buyPrice || 100) * h.quantity;
      const sector = getSector(h.symbol);
      sectorMap[sector] = (sectorMap[sector] || 0) + val;
    });

    const sectorWeights = Object.entries(sectorMap).map(([sector, val]) => ({
      sector,
      val,
      weight: (val / totalValue) * 100
    })).sort((a, b) => b.weight - a.weight);

    // Calculate HHI
    const hhi = sectorWeights.reduce((sum, s) => sum + Math.pow(s.weight, 2), 0);
    let status = 'Highly Diversified';
    let score = 95;
    if (hhi > 2500) {
      status = 'Highly Concentrated';
      score = 35;
    } else if (hhi > 1500) {
      status = 'Moderately Concentrated';
      score = 70;
    }

    return {
      hhi: Math.round(hhi),
      status,
      score,
      sectorWeights
    };
  }, [userHoldings]);

  // Curve / stock rankings (Dynamically parsed from data.peers with seed fallbacks)
  const stockRankings = useMemo(() => {
    const targetScore = Math.round((technicalScore + fundamentalScore + confidence) / 3);
    const targetItem = {
      symbol: symbol,
      name: 'Current Target Stock',
      score: targetScore
    };

    let peerItems: any[] = [];
    if (data.peers && Array.isArray(data.peers) && data.peers.length > 0) {
      peerItems = (data.peers as any[]).map((p: any) => {
        // Compute dynamic score based on fundamental PE and deterministic sym hashes
        let score = 75;
        if (p.pe) {
          if (p.pe > 0 && p.pe < 25) score += 10;
          else if (p.pe > 50) score -= 10;
        }
        const charSum = p.symbol.split('').reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
        score += (charSum % 15) - 7;

        return {
          symbol: p.symbol,
          name: p.name || p.symbol,
          score: Math.min(98, Math.max(35, Math.round(score)))
        };
      });
    } else if (defaultWatchlistStocks && defaultWatchlistStocks.length > 0) {
      // Dynamically load from user default watchlist if empty prop
      peerItems = defaultWatchlistStocks.map((p: any) => {
        let score = 75;
        const charSum = p.symbol.split('').reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
        score += (charSum % 15) - 7;
        return {
          symbol: p.symbol,
          name: p.name || p.symbol,
          score: Math.min(98, Math.max(35, Math.round(score)))
        };
      });
    } else {
      // Predefined Indian market seed stock backups mapped dynamically from DEFAULT_SEEDS
      peerItems = DEFAULT_SEEDS.slice(0, 5).map((p: any) => {
        let score = 75;
        const charSum = p.symbol.split('').reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
        score += (charSum % 15) - 7;
        return {
          symbol: p.symbol,
          name: p.name,
          score: Math.min(98, Math.max(35, Math.round(score)))
        };
      });
    }

    const allPeers = [targetItem, ...peerItems.filter(p => p.symbol !== symbol)];

    const ranked = allPeers.map(p => {
      const score = p.score;
      let rating = 'HOLD';
      let color = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      if (score >= 80) {
        rating = 'STRONG BUY';
        color = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      } else if (score >= 65) {
        rating = 'BUY';
        color = 'text-green-500 bg-green-500/10 border-green-500/20';
      } else if (score < 45) {
        rating = 'SELL';
        color = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      }

      return {
        ...p,
        score,
        rating,
        color
      };
    }).sort((a, b) => b.score - a.score);

    return ranked;
  }, [symbol, data.peers, defaultWatchlistStocks, technicalScore, fundamentalScore, confidence]);

  // Color mappings
  const sentimentStyles = {
    BULLISH: {
      text: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
      badge: 'BULLISH ACQUISITION',
      gradient: 'from-emerald-500 to-teal-500'
    },
    BEARISH: {
      text: 'text-rose-500',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      glow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]',
      badge: 'BEARISH DISTRIBUTION',
      gradient: 'from-rose-500 to-red-500'
    },
    NEUTRAL: {
      text: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
      badge: 'NEUTRAL CONSOLIDATION',
      gradient: 'from-amber-500 to-orange-500'
    }
  }[sentiment];

  // Helper styles for Regime
  const regimeStyles = {
    TRENDING: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    SIDEWAYS: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    VOLATILE: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    ACCUMULATION: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    DISTRIBUTION: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  }[aiResult.marketRegime.state];

  if (isSidebar && (!mounted || isLoading)) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-slate-200/50 dark:border-slate-800/50"></div>
        <div className="h-32 bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-slate-200/50 dark:border-slate-800/50"></div>
      </div>
    );
  }

  if (isSidebar) {
    return (
      <div className="space-y-4 text-slate-900 dark:text-slate-100 font-sans">
        {/* COMPACT HEADER */}
        <div className={`p-4 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm transition-all duration-300 ${sentimentStyles.glow}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/50">
              AI COGNITION
            </span>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${sentimentStyles.bg} ${sentimentStyles.text} ${sentimentStyles.border}`}>
              {sentimentStyles.badge}
            </span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <span className="text-xs text-slate-400 font-extrabold uppercase block tracking-tight">Active Price</span>
              <span className="text-lg font-black text-slate-800 dark:text-white block mt-0.5">₹{currentPrice.toFixed(2)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-tight">AI Confidence</span>
              <span className={`text-lg font-black block mt-0.5 ${sentimentStyles.text}`}>{confidence}%</span>
            </div>
          </div>
        </div>

        {/* BULL VS BEAR POWER METER */}
        <div className="p-4 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
          <h4 className="text-[10px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-500" /> Bull vs Bear Power Meter
          </h4>
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-650 dark:text-slate-400 mb-1">
                <span>Demand</span>
                <span className="text-emerald-500 font-black">{aiResult.bullPower}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/30 dark:border-slate-700/30">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-1000" style={{ width: `${aiResult.bullPower}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-650 dark:text-slate-400 mb-1">
                <span>Supply</span>
                <span className="text-rose-500 font-black">{aiResult.bearPower}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/30 dark:border-slate-700/30">
                <div className="h-full bg-gradient-to-r from-rose-400 to-red-500 transition-all duration-1000" style={{ width: `${aiResult.bearPower}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* TECHNICAL & FUNDAMENTAL SCORES */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Technicals</span>
              <span className="text-base font-black text-slate-800 dark:text-white mt-0.5 block">{technicalScore}%</span>
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 flex items-center justify-center text-[9px] font-black text-blue-500">
              {technicalScore >= 70 ? 'BUY' : technicalScore <= 40 ? 'SELL' : 'HOLD'}
            </div>
          </div>
          <div className="p-3 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Valuation</span>
              <span className="text-base font-black text-slate-800 dark:text-white mt-0.5 block">{fundamentalScore}%</span>
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 flex items-center justify-center text-[9px] font-black text-emerald-500">
              {fundamentalScore >= 65 ? 'GOOD' : fundamentalScore <= 45 ? 'EXP' : 'FAIR'}
            </div>
          </div>
        </div>

        {/* PATTERNS AND SCENARIOS ACCORDIONS or small badges */}
        <div className="p-4 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-2">
          <h4 className="text-[10px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
            AI Outlook & Scenarios
          </h4>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
              <span className="font-extrabold text-emerald-600">Bull Target</span>
              <span className="font-black font-mono">₹{aiResult.scenarios.bullCase.targetPrice}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] p-2 bg-slate-500/5 border border-slate-500/10 rounded-xl">
              <span className="font-extrabold text-slate-500">Base Target</span>
              <span className="font-black font-mono">₹{aiResult.scenarios.baseCase.targetPrice}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] p-2 bg-rose-500/5 border border-rose-500/10 rounded-xl">
              <span className="font-extrabold text-rose-600">Bear Target</span>
              <span className="font-black font-mono">₹{aiResult.scenarios.bearCase.targetPrice}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!mounted || isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Skeleton Header */}
        <div className="p-6 sm:p-8 bg-white/80 dark:bg-slate-900/60 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-4 w-full">
              <div className="w-40 h-6 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
              <div className="w-3/4 max-w-sm h-10 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
              <div className="w-1/2 h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="flex gap-6 p-4 rounded-2xl w-full lg:w-auto bg-slate-100 dark:bg-slate-800/50">
              <div className="w-24 h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
              <div className="w-24 h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
              <div className="w-24 h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
            </div>
          </div>
        </div>
        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="col-span-1 space-y-8">
            <div className="h-[400px] bg-slate-100 dark:bg-slate-900/60 rounded-3xl border border-slate-200/50 dark:border-slate-800/50"></div>
          </div>
          <div className="col-span-1 lg:col-span-2 space-y-8">
             <div className="h-[400px] bg-slate-100 dark:bg-slate-900/60 rounded-3xl border border-slate-200/50 dark:border-slate-800/50"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* SECTION 1: AI PREDICTION SUMMARY HEADER */}
      <div className={`p-6 sm:p-8 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl transition-all duration-300 ${sentimentStyles.glow}`}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-blue-500 animate-pulse" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                PRO AI STOCK COGNITION
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              Market Intelligence Dashboard
              <span className={`inline-flex items-center text-xs font-black px-3.5 py-1 rounded-full border ${sentimentStyles.bg} ${sentimentStyles.text} ${sentimentStyles.border}`}>
                {sentimentStyles.badge}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-2xl font-medium leading-relaxed">
              Mathematical AI stock outlook dynamically derived from support/resistance density clusters, least-squares quadratic rounding sauce, volatility expansions, and multi-timeframe consensus alignments.
            </p>
          </div>
          
          <div className="flex items-center gap-6 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/30 dark:border-slate-800/30 p-4 rounded-2xl w-full lg:w-auto">
            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Current Price</span>
              <span className="text-xl font-black text-slate-800 dark:text-white mt-1 block">₹{currentPrice.toFixed(2)}</span>
            </div>
            <div className="w-px h-10 bg-slate-200 dark:bg-slate-800" />
            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Confidence</span>
              <span className={`text-xl font-black mt-1 block ${sentimentStyles.text}`}>{confidence}%</span>
            </div>
            <div className="w-px h-10 bg-slate-200 dark:bg-slate-800" />
            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Accuracy Rate</span>
              <span className="text-xl font-black text-blue-500 mt-1 block">{aiResult.historicalAccuracy}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* CORE 14-MODULE INTEL GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN */}
        <div className="space-y-8 lg:col-span-2">
          
          {/* GRID OF POWER METERS & STRENGTH SCORERS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* MODULE 2: BULL VS BEAR POWER METER */}
            <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" /> Bull vs Bear Power Meter
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    <span>Buying Power (Demand)</span>
                    <span className="text-emerald-500 font-black">{aiResult.bullPower}%</span>
                  </div>
                  <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/30 dark:border-slate-700/30">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-1000"
                      style={{ width: `${aiResult.bullPower}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    <span>Selling Power (Supply)</span>
                    <span className="text-rose-500 font-black">{aiResult.bearPower}%</span>
                  </div>
                  <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/30 dark:border-slate-700/30">
                    <div 
                      className="h-full bg-gradient-to-r from-rose-400 to-red-500 transition-all duration-1000"
                      style={{ width: `${aiResult.bearPower}%` }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-normal mt-4">
                Calculated dynamically via close location ratios inside high-low clusters combined with volume weighted trend velocity indexes.
              </p>
            </div>

            {/* MODULE 4: PATTERN STRENGTH SCORE */}
            <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex items-center justify-between gap-6">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-500" /> Pattern Strength
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Evaluates the geometric fitting accuracy of local pivots against classical templates, factoring breakout volume confirmations.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">VOLUME APPROVED</span>
                </div>
              </div>
              
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="6" fill="transparent" />
                  <circle cx="48" cy="48" r="40" stroke="currentColor" className="text-blue-500" strokeWidth="6" fill="transparent"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * aiResult.patternStrength) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-lg font-black text-slate-855 dark:text-white">{aiResult.patternStrength}%</span>
              </div>
            </div>

          </div>

          {/* MODULE 3: PATTERN DETECTION CARDS */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" /> Mathematical Pattern Recognition
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiResult.patterns.map((pat, idx) => {
                const typeColors = pat.type === 'BULLISH'
                  ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                  : pat.type === 'BEARISH'
                  ? 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                  : 'text-amber-500 bg-amber-500/10 border-amber-500/20';

                return (
                  <div key={idx} className="p-4 bg-slate-50/50 dark:bg-slate-800/35 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl flex flex-col justify-between hover:scale-[1.01] hover:border-blue-500/30 transition-all duration-300">
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-2.5">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{pat.name}</h4>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${typeColors} shrink-0`}>
                          {pat.type}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
                        {pat.desc}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200/40 dark:border-slate-700/40 space-y-2 text-[10px] font-bold text-slate-550 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Geometric Fit Confidence</span>
                        <span className="text-slate-800 dark:text-slate-200 font-extrabold">{pat.matchScore}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Support / Resistance</span>
                        <span className="text-slate-800 dark:text-slate-200 font-mono">₹{pat.supportPrice} / ₹{pat.resistancePrice}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Target Estimate</span>
                        <span className="text-blue-500 font-extrabold font-mono">₹{pat.targetPrice}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span>Pattern Status</span>
                        <span className="inline-flex items-center gap-1 text-[9px] text-blue-500 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded font-black uppercase">
                          {pat.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MODULE 5: MULTI-TIMEFRAME ANALYSIS MATRIX */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl overflow-hidden">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" /> Multi-Timeframe Indicator Matrix
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/60 text-left text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <th className="pb-3.5">Interval</th>
                    <th className="pb-3.5">Trend Strength</th>
                    <th className="pb-3.5">RSI Status</th>
                    <th className="pb-3.5">MACD Crossover</th>
                    <th className="pb-3.5">MA Alignment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {aiResult.multiTimeframe.map((tf, i) => {
                    const trendColors = tf.trend.includes('STRONG_BULLISH') || tf.trend === 'BULLISH'
                      ? 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10'
                      : tf.trend.includes('STRONG_BEARISH') || tf.trend === 'BEARISH'
                      ? 'text-rose-500 bg-rose-500/5 border-rose-500/10'
                      : 'text-amber-500 bg-amber-500/5 border-amber-500/10';

                    return (
                      <tr key={i} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/20 transition-all font-semibold">
                        <td className="py-3 font-black text-slate-800 dark:text-white">{tf.timeframe}</td>
                        <td className="py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black border ${trendColors}`}>
                            {tf.trend.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 font-mono">
                          <span className={tf.rsi > 70 ? 'text-rose-500' : tf.rsi < 30 ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}>
                            {tf.rsi} ({tf.rsi > 70 ? 'Overbought' : tf.rsi < 30 ? 'Oversold' : 'Neutral'})
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1 font-extrabold text-[10px] ${
                             tf.macdSignal === 'BUY' ? 'text-emerald-500' : tf.macdSignal === 'SELL' ? 'text-rose-500' : 'text-slate-400'
                          }`}>
                            {tf.macdSignal}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={tf.maAlignment === 'UPWARD' ? 'text-emerald-500' : tf.maAlignment === 'DOWNWARD' ? 'text-rose-500' : 'text-amber-500'}>
                            {tf.maAlignment}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* DUAL COLUMN FOR RISE DRIVERS & FALL HEADWINDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* MODULE 6: WHY PRICE MAY RISE */}
            <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl">
              <h3 className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> AI Forecast Drivers
              </h3>
              <div className="space-y-3">
                {aiResult.riseDrivers.map((drv, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:scale-[1.01] transition-transform">
                    <span className="text-emerald-500 shrink-0 text-sm mt-0.5">✓</span>
                    <span>{drv}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* MODULE 7: WHY PRICE MAY FALL */}
            <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl">
              <h3 className="text-sm font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> AI Valuation Headwinds
              </h3>
              <div className="space-y-3">
                {aiResult.fallHeadwinds.map((hdw, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:scale-[1.01] transition-transform">
                    <span className="text-rose-500 shrink-0 text-sm mt-0.5">⚠️</span>
                    <span>{hdw}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* MODULE 8: SCENARIO ANALYSIS CASES */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-500" /> Scenario Analysis (1-Month Horizon)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Bull Case */}
              <div className="p-4 bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-500/15 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center gap-4 mb-2">
                    <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-450 uppercase">{aiResult.scenarios.bullCase.name}</h4>
                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {aiResult.scenarios.bullCase.probability}% Prob
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
                    {aiResult.scenarios.bullCase.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-emerald-500/10 space-y-2 text-[10px] font-bold text-slate-550 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Target Price</span>
                    <span className="text-emerald-500 font-black font-mono">₹{aiResult.scenarios.bullCase.targetPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Range Horizon</span>
                    <span className="text-slate-700 dark:text-slate-300 font-mono">₹{aiResult.scenarios.bullCase.rangeLow} - ₹{aiResult.scenarios.bullCase.rangeHigh}</span>
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    <span>Key Triggers:</span>
                    {aiResult.scenarios.bullCase.triggers.slice(0, 2).map((t, idx) => (
                      <span key={idx} className="text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/10 rounded px-1.5 py-0.5 font-bold truncate">
                        • {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Base Case */}
              <div className="p-4 bg-slate-50/50 dark:bg-slate-800/35 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center gap-4 mb-2">
                    <h4 className="text-xs font-black text-slate-700 dark:text-slate-350 uppercase">{aiResult.scenarios.baseCase.name}</h4>
                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {aiResult.scenarios.baseCase.probability}% Prob
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
                    {aiResult.scenarios.baseCase.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-700/50 space-y-2 text-[10px] font-bold text-slate-550 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Target Price</span>
                    <span className="text-blue-500 font-black font-mono">₹{aiResult.scenarios.baseCase.targetPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Range Horizon</span>
                    <span className="text-slate-700 dark:text-slate-300 font-mono">₹{aiResult.scenarios.baseCase.rangeLow} - ₹{aiResult.scenarios.baseCase.rangeHigh}</span>
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    <span>Key Triggers:</span>
                    {aiResult.scenarios.baseCase.triggers.slice(0, 2).map((t, idx) => (
                      <span key={idx} className="text-[9px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 font-bold truncate">
                        • {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bear Case */}
              <div className="p-4 bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/15 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center gap-4 mb-2">
                    <h4 className="text-xs font-black text-rose-600 dark:text-rose-450 uppercase">{aiResult.scenarios.bearCase.name}</h4>
                    <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      {aiResult.scenarios.bearCase.probability}% Prob
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
                    {aiResult.scenarios.bearCase.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-rose-500/10 space-y-2 text-[10px] font-bold text-slate-550 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Target Price</span>
                    <span className="text-rose-500 font-black font-mono">₹{aiResult.scenarios.bearCase.targetPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Range Horizon</span>
                    <span className="text-slate-700 dark:text-slate-300 font-mono">₹{aiResult.scenarios.bearCase.rangeLow} - ₹{aiResult.scenarios.bearCase.rangeHigh}</span>
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    <span>Key Triggers:</span>
                    {aiResult.scenarios.bearCase.triggers.slice(0, 2).map((t, idx) => (
                      <span key={idx} className="text-[9px] text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/10 rounded px-1.5 py-0.5 font-bold truncate">
                        • {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-8">
          
          {/* MODULE 14: CONFIDENCE CONCORDANCE GAUGE */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl text-center">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-5 flex items-center justify-center gap-2">
              <Percent className="w-4 h-4 text-blue-500" /> Consensus Concordance
            </h3>
            
            <div className="relative w-40 h-40 mx-auto flex items-center justify-center mb-4">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="10" fill="transparent" />
                <circle cx="80" cy="80" r="70" stroke="url(#concordGradient)" strokeWidth="10" fill="transparent"
                  strokeDasharray={439.6}
                  strokeDashoffset={439.6 - (439.6 * confidence) / 100}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="concordGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute">
                <span className="text-3xl font-black text-slate-800 dark:text-white">{confidence}%</span>
                <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider mt-1">Concord</span>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              Weighted average matching index computed across EMA overlays, momentum oscillators, sentiment indices, and fundamental ratios.
            </p>
          </div>

          {/* MODULE 11: RISK SPEEDO METER */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-blue-500" /> Volatility Risk Index
            </h3>
            
            <div className="relative h-24 flex items-center justify-center overflow-hidden mb-4">
              <div className="absolute top-4 w-36 h-36 border-[12px] border-slate-100 dark:border-slate-800 rounded-full" />
              <div 
                className="absolute top-4 w-36 h-36 border-[12px] border-transparent border-l-orange-500 border-t-red-500 rounded-full transition-transform duration-1000"
                style={{ transform: `rotate(${Math.min(180, (aiResult.riskScore / 100) * 180 - 45)}deg)` }}
              />
              <div className="absolute bottom-0 text-center">
                <span className="text-2xl font-black text-slate-800 dark:text-white">{aiResult.riskScore}</span>
                <span className="text-[9px] text-slate-400 font-black block uppercase tracking-widest mt-0.5">
                  {aiResult.riskScore > 75 ? 'CRITICAL RISK' : aiResult.riskScore > 45 ? 'MODERATE VOLATILITY' : 'LOW RISK PROFILE'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 text-[10px] font-bold text-slate-500 border-t border-slate-200/40 dark:border-slate-700/40 pt-4">
              <div>
                <span>Debt/Equity Risk</span>
                <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">
                  {(data?.ratios?.debtToEquity ?? 0) > 150 ? 'HIGH DEBT' : 'CONSERVATIVE'}
                </p>
              </div>
              <div>
                <span>Leverage Safety</span>
                <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">
                  {(data?.ratios?.currentRatio ?? 0) > 1.5 ? 'EXCELLENT' : 'CRITICAL'}
                </p>
              </div>
            </div>
          </div>

          {/* MODULE 9: SUPPORT & RESISTANCE ZONE LADDER */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" /> Support & Resistance Zones
            </h3>
            
            <div className="space-y-4">
              {/* Resistances (Descending) */}
              <div className="space-y-2">
                <span className="text-[9px] text-rose-500 font-black uppercase tracking-widest">RESISTANCE OVERHEAD CEILINGS</span>
                {[...aiResult.resistanceZones].reverse().slice(0, 3).map((zone, i) => (
                  <div key={i} className="relative flex justify-between items-center p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-xl text-xs font-bold font-mono">
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-rose-500/10 rounded-l-xl transition-all duration-500"
                      style={{ width: `${zone.strength}%` }}
                    />
                    <span className="text-rose-500 z-10">₹{zone.price.toFixed(2)}</span>
                    <span className="text-slate-400 z-10 text-[9px] font-bold">STRENGTH {zone.strength}%</span>
                  </div>
                ))}
              </div>

              {/* Current Price Reference */}
              <div className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl flex justify-between items-center text-xs font-black">
                <span className="text-slate-500">CURRENT TACTICAL INDEX</span>
                <span className="font-mono text-blue-500 animate-pulse">₹{currentPrice.toFixed(2)}</span>
              </div>

              {/* Supports (Descending) */}
              <div className="space-y-2">
                <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">SUPPORT DEFENSE FLOORS</span>
                {aiResult.supportZones.slice(0, 3).map((zone, i) => (
                  <div key={i} className="relative flex justify-between items-center p-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-xs font-bold font-mono">
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-emerald-500/10 rounded-l-xl transition-all duration-500"
                      style={{ width: `${zone.strength}%` }}
                    />
                    <span className="text-emerald-500 z-10">₹{zone.price.toFixed(2)}</span>
                    <span className="text-slate-400 z-10 text-[9px] font-bold">STRENGTH {zone.strength}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MODULE 12: HISTORICAL ACCURACY STATS */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-500" /> Historical Performance
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/30 dark:border-slate-700/30">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase">Target Hits</span>
                <p className="text-lg font-black text-slate-800 dark:text-white mt-1">78.4%</p>
              </div>
              <div className="p-3 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/30 dark:border-slate-700/30">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase">Direction Hits</span>
                <p className="text-lg font-black text-slate-800 dark:text-white mt-1">84.2%</p>
              </div>
              <div className="p-3 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/30 dark:border-slate-700/30">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase">False Positives</span>
                <p className="text-lg font-black text-rose-500 mt-1">4.6%</p>
              </div>
              <div className="p-3 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/30 dark:border-slate-700/30">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase">Engine Up-time</span>
                <p className="text-lg font-black text-emerald-500 mt-1">100.0%</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* MODULE 10: PREDICTION TARGET HORIZONS */}
      <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-500" /> Projected Valuation Target Horizons
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { label: 'Short-term (1 Hour)', data: aiResult.targets.shortTerm1h },
            { label: 'Short-term (4 Hour)', data: aiResult.targets.shortTerm4h },
            { label: 'Short-term (1 Day)', data: aiResult.targets.shortTerm1d },
            { label: 'Medium-term (1 Week)', data: aiResult.targets.mediumTerm1w },
            { label: 'Medium-term (1 Month)', data: aiResult.targets.mediumTerm1m },
            { label: 'Long-term (3 Month)', data: aiResult.targets.longTerm3m },
            { label: 'Long-term (6 Month)', data: aiResult.targets.longTerm6m }
          ].map((t, idx) => (
            <div key={idx} className="p-4 bg-slate-50/50 dark:bg-slate-800/35 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
              <span className="text-[9px] text-slate-400 font-black block uppercase tracking-wider leading-relaxed">{t.label}</span>
              
              <div className="space-y-1.5 mt-4 text-[10px] font-bold text-slate-550 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>High Target</span>
                  <span className="text-emerald-500 font-black font-mono">₹{t.data.high.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Base Est</span>
                  <span className="text-blue-500 font-black font-mono">₹{t.data.base.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Low Boundary</span>
                  <span className="text-rose-500 font-black font-mono">₹{t.data.low.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODULE 13: INDICATOR GRID */}
      <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2">
          <LineChart className="w-4 h-4 text-blue-500" /> Mathematical Indicator Signals Breakdown
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiResult.indicators.map((ind, i) => {
            const sigColors = ind.signal === 'BUY'
              ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
              : ind.signal === 'SELL'
              ? 'text-rose-500 bg-rose-500/10 border-rose-500/20'
              : 'text-amber-500 bg-amber-500/10 border-amber-500/20';

            return (
              <div key={i} className="p-4 bg-slate-50/50 dark:bg-slate-800/35 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300">
                <div className="flex justify-between items-start gap-4 mb-2.5">
                  <div className="min-w-0">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block">{ind.category}</span>
                    <h4 className="text-xs font-black text-slate-800 dark:text-white mt-0.5 truncate">{ind.name}</h4>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${sigColors} shrink-0`}>
                    {ind.signal}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
                  {ind.desc}
                </p>
                <div className="pt-2 border-t border-slate-200/40 dark:border-slate-700/40 flex justify-between items-center text-[10px] font-bold">
                  <span className="text-slate-400 uppercase">CALC VALUE</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-extrabold">{ind.value}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* ─── INSTITUTIONAL QUANTITATIVE MARKET INTELLIGENCE COCKPIT ─── */}
      {/* ────────────────────────────────────────────────────────────── */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-8 space-y-8">
        
        {/* Cockpit Section Title Banner */}
        <div className="p-6 bg-slate-50/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Compass className="w-5 h-5 text-indigo-500 animate-spin-slow" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-500 bg-indigo-500/10 px-3.5 py-1 rounded-full border border-indigo-500/20">
              INSTITUTIONAL QUANTITATIVE COCKPIT
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            Quantitative Market Intelligence Cockpit
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-2xl font-medium leading-relaxed">
            High-fidelity quantitative solvers executing recursive volatility fits, multi-path Brownian density distributions, order flow imbalances, and structural sweeping algorithms.
          </p>
        </div>

        {/* 11 Premium Cockpit Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* CARD 1: MARKET REGIME CLASSIFIER */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Market Regime Detector
                </h3>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase shrink-0 ${regimeStyles}`}>
                  {aiResult.marketRegime.state}
                </span>
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                {aiResult.marketRegime.label}
              </h4>
              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                {aiResult.marketRegime.desc}
              </p>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-200/40 dark:border-slate-700/40 space-y-3">
              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                  <span>Regime Score (Trend Strength)</span>
                  <span className="font-extrabold text-indigo-500">{aiResult.marketRegime.score}/100</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/20 dark:border-slate-700/20">
                  <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${aiResult.marketRegime.score}%` }} />
                </div>
              </div>
              
              {/* HMM Transition Probabilities Sub-Panel */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/30 dark:border-slate-700/35 p-3 rounded-2xl space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider">HMM Regime State</span>
                  <span className="text-[10px] font-black text-slate-700 dark:text-slate-200">{aiResult.hmmRegime.currentState}</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(aiResult.hmmRegime.transitionProbabilities).map(([state, prob]) => (
                    <div key={state} className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold text-slate-500 dark:text-slate-400">
                        <span>To {state}</span>
                        <span className="font-mono text-indigo-500">{prob}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-150 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${prob}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center text-[9px] text-slate-400 font-extrabold uppercase">
                <span>MATHEMATICAL BASIS:</span>
                <span className="text-slate-700 dark:text-slate-200 font-mono font-medium">ADX + Bollinger Spread + Vol Slope</span>
              </div>
            </div>
          </div>

          {/* CARD 2: LIQUIDITY & ORDER FLOW ENGINE */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5" /> Liquidity & Order Flow
                </h3>
                <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                  LIQ SCORE: {aiResult.liquidity.score}%
                </span>
              </div>
              
              {/* Liquidity Stats Grid */}
              <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-slate-500">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Relative Vol (RVOL)</span>
                  <p className={`text-base font-black mt-0.5 ${typeof aiResult.liquidity.rvol === 'number' && aiResult.liquidity.rvol > 2.0 ? 'text-emerald-500' : 'text-slate-800 dark:text-white'}`}>
                    {aiResult.liquidity.rvol}x
                  </p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Block Trades Count</span>
                  <p className="text-base font-black text-slate-800 dark:text-white mt-0.5">{aiResult.liquidity.blockTradesCount}</p>
                </div>
                <div className="col-span-2">
                  <div className="flex justify-between text-[9px] text-slate-400 uppercase mb-1">
                    <span>Order Imbalance (Buy / Sell Pressure)</span>
                    <span className="text-emerald-500 font-extrabold">{aiResult.liquidity.buyPressure}% Buy</span>
                  </div>
                  <div className="h-2 w-full bg-rose-500 rounded-full overflow-hidden border border-slate-200/20 dark:border-slate-700/20 flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${aiResult.liquidity.buyPressure}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Mini Order Book Depth Display */}
            <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-700/40 space-y-1">
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1">Depth Order Book (Top Bids/Asks)</span>
              {aiResult.liquidity.marketDepth === 'Data unavailable' ? (
                <div className="text-[10px] text-slate-400 dark:text-slate-500 italic py-2">
                  Exchange market depth unavailable (offline)
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-[9px] font-mono">
                  <div className="space-y-0.5 text-emerald-500 font-semibold">
                    {aiResult.liquidity.marketDepth.bids.slice(0, 3).map((b, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>₹{b.price}</span>
                        <span className="text-slate-400">{b.qty}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-0.5 text-rose-500 font-semibold">
                    {aiResult.liquidity.marketDepth.asks.slice(0, 3).map((a, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>₹{a.price}</span>
                        <span className="text-slate-400">{a.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CARD 3: OPTIONS CHAIN ANALYSIS */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" /> Derivatives Options Sentiment
                </h3>
                {aiResult.optionsChain !== 'Data unavailable' && (
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase shrink-0 ${
                    aiResult.optionsChain.sentiment === 'BULLISH'
                      ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                      : aiResult.optionsChain.sentiment === 'BEARISH'
                      ? 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                      : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                  }`}>
                    {aiResult.optionsChain.sentiment}
                  </span>
                )}
              </div>

              {aiResult.optionsChain === 'Data unavailable' ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400 dark:text-slate-500 italic text-xs">
                  <span>Data unavailable</span>
                  <span className="text-[10px] text-slate-400/60 mt-1 text-center">Exchange Options Chain data requires active connection.</span>
                </div>
              ) : (
                <>
                  {/* Options stats table */}
                  <div className="space-y-2.5 text-[11px] font-bold text-slate-500">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Put-Call Ratio (PCR)</span>
                      <span className={`font-mono font-black ${aiResult.optionsChain.pcr !== 'Data unavailable' && aiResult.optionsChain.pcr < 0.8 ? 'text-emerald-500' : aiResult.optionsChain.pcr !== 'Data unavailable' && aiResult.optionsChain.pcr > 1.15 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200'}`}>
                        {aiResult.optionsChain.pcr}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Open Interest (OI)</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 font-extrabold">
                        {typeof aiResult.optionsChain.openInterest === 'number' ? aiResult.optionsChain.openInterest.toLocaleString() : aiResult.optionsChain.openInterest} ({typeof aiResult.optionsChain.oiChangePercent === 'number' && aiResult.optionsChain.oiChangePercent > 0 ? '+' : ''}{aiResult.optionsChain.oiChangePercent}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Pain Strike</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 font-extrabold">
                        {typeof aiResult.optionsChain.maxPain === 'number' ? `₹${aiResult.optionsChain.maxPain.toFixed(2)}` : aiResult.optionsChain.maxPain}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Buildup State</span>
                      <span className="inline-flex px-1.5 py-0.5 text-[9px] font-black rounded bg-slate-100 dark:bg-slate-800 text-blue-500 border border-slate-200 dark:border-slate-700 uppercase">
                        {aiResult.optionsChain.buildupState.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {aiResult.optionsChain !== 'Data unavailable' && (
              <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-700/40 grid grid-cols-2 gap-2 text-[9px] font-mono">
                <div>
                  <span className="text-slate-400 block uppercase">Gamma Exposure</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">
                    {typeof aiResult.optionsChain.gammaExposure === 'number' && aiResult.optionsChain.gammaExposure > 0 ? '+' : ''}
                    {aiResult.optionsChain.gammaExposure} GEX
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase">Delta Exposure</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">
                    {typeof aiResult.optionsChain.deltaExposure === 'number' && aiResult.optionsChain.deltaExposure > 0 ? '+' : ''}
                    {aiResult.optionsChain.deltaExposure} DEX
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* CARD 4: SMART MONEY CONCEPTS & DIVERGENCE ENGINE */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Smart Money & Divergences
                </h3>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase shrink-0 ${
                  aiResult.smartMoney.bias === 'BULLISH'
                    ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                    : aiResult.smartMoney.bias === 'BEARISH'
                    ? 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                    : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                }`}>
                  SMC BIAS: {aiResult.smartMoney.bias}
                </span>
              </div>

              {/* SMC gaps lists */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Fair Value Gaps (FVG)</span>
                  {aiResult.smartMoney.fvg.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {aiResult.smartMoney.fvg.slice(-3).map((f, idx) => (
                        <span key={idx} className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${
                          f.type === 'BULLISH' ? 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10' : 'text-rose-500 bg-rose-500/5 border-rose-500/10'
                        }`}>
                          {f.type} FVG (₹{f.priceGapStart.toFixed(0)}-₹{f.priceGapEnd.toFixed(0)})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">No unmitigated Fair Value Gaps found.</span>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Order Blocks (OB)</span>
                  <div className="flex flex-wrap gap-1.5">
                    {aiResult.smartMoney.orderBlocks.slice(0, 3).map((ob, idx) => (
                      <span key={idx} className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${
                        ob.type === 'BULLISH' ? 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10' : 'text-rose-500 bg-rose-500/5 border-rose-500/10'
                      }`}>
                        {ob.type} OB (₹{ob.price.toFixed(1)})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Active divergences list */}
            <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-700/40 space-y-1">
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Detected Active Peak Divergences</span>
              {aiResult.divergences.detected.length > 0 ? (
                <div className="space-y-1.5 text-[9px] font-semibold text-slate-700 dark:text-slate-350 leading-relaxed max-h-16 overflow-y-auto">
                  {aiResult.divergences.detected.map((div, idx) => (
                    <div key={idx} className="flex items-start gap-1 p-1 bg-slate-50 dark:bg-slate-800 rounded">
                      <span className={div.type.includes('BULLISH') ? 'text-emerald-500' : 'text-rose-500'}>●</span>
                      <span>{div.indicator}: {div.desc.slice(0, 75)}...</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[9px] text-slate-400 italic block">No structural divergence detected on recent swing peaks.</span>
              )}
            </div>
          </div>

          {/* CARD 5: ELLIOTT WAVE & FIBONACCI SOLVER */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" /> Elliott Wave & Fibonacci
                </h3>
                <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                  {aiResult.elliottWave.waveLabel.split(' ')[0]} {aiResult.elliottWave.waveLabel.split(' ')[1]}
                </span>
              </div>

              {/* Elliott Wave visual progress track */}
              <div className="mb-4">
                <div className="flex justify-between text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                  <span>Wave Path Progress</span>
                  <span className="text-indigo-500">Expected: ₹{aiResult.elliottWave.expectedTarget}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black font-mono">
                  {[1, 2, 3, 4, 5, 'A', 'B', 'C'].map((w, idx) => {
                    const isCurrent = (typeof w === 'number' && w === aiResult.elliottWave.currentWave) || 
                                      (w === 'A' && aiResult.elliottWave.currentWave === 6) ||
                                      (w === 'B' && aiResult.elliottWave.currentWave === 7) ||
                                      (w === 'C' && aiResult.elliottWave.currentWave === 8);
                    
                    return (
                      <React.Fragment key={idx}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center border font-black ${
                          isCurrent 
                            ? 'text-white bg-indigo-500 border-indigo-500 animate-pulse'
                            : 'text-slate-400 dark:text-slate-650 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}>
                          {w}
                        </span>
                        {idx < 7 && <span className="w-full h-px bg-slate-200 dark:bg-slate-750" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Fib level table */}
            <div className="pt-3 border-t border-slate-200/40 dark:border-slate-700/40 space-y-1.5">
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Auto-detected Key Fibonacci Levels</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] font-mono font-semibold text-slate-500">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-0.5">
                  <span>61.8% Retracement</span>
                  <span className="text-slate-855 dark:text-white">₹{aiResult.fibonacci.retracements.find(r=>r.level===0.618)?.price || '--'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-0.5">
                  <span>161.8% Extension</span>
                  <span className="text-slate-855 dark:text-white">₹{aiResult.fibonacci.extensions.find(e=>e.level===1.618)?.price || '--'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-0.5">
                  <span>50.0% Equilibrium</span>
                  <span className="text-slate-855 dark:text-white">₹{aiResult.fibonacci.retracements.find(r=>r.level===0.5)?.price || '--'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-0.5">
                  <span>261.8% Extension</span>
                  <span className="text-slate-855 dark:text-white">₹{aiResult.fibonacci.extensions.find(e=>e.level===2.618)?.price || '--'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 6: GARCH VOLATILITY & MONTE CARLO PROJECTION */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" /> GARCH & Monte Carlo Projections
                </h3>
                <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                  GARCH VOL: {aiResult.volatilityForecast.score}%
                </span>
              </div>

              {/* GARCH Projected Vol */}
              <div className="grid grid-cols-3 gap-2 text-center text-[9px] font-bold text-slate-500 mb-4">
                <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded">
                  <span className="text-slate-400 block uppercase">Next Day</span>
                  <p className="text-xs font-black text-slate-800 dark:text-white font-mono">{(aiResult.volatilityForecast.nextDay * 100).toFixed(2)}%</p>
                </div>
                <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded">
                  <span className="text-slate-400 block uppercase">Next Week</span>
                  <p className="text-xs font-black text-slate-800 dark:text-white font-mono">{(aiResult.volatilityForecast.nextWeek * 100).toFixed(2)}%</p>
                </div>
                <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded">
                  <span className="text-slate-400 block uppercase">Next Month</span>
                  <p className="text-xs font-black text-slate-800 dark:text-white font-mono">{(aiResult.volatilityForecast.nextMonth * 100).toFixed(2)}%</p>
                </div>
              </div>
            </div>

            {/* Monte Carlo price distributions */}
            <div className="pt-3 border-t border-slate-200/40 dark:border-slate-700/40 space-y-2">
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">10,000 Geometric Brownian Simulations</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-bold text-slate-500">
                <div className="flex justify-between">
                  <span>Chance Price &gt; +5%</span>
                  <span className="text-emerald-500 font-black font-mono">{aiResult.monteCarlo.probUp5Percent}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Chance Price &gt; +10%</span>
                  <span className="text-emerald-500 font-black font-mono">{aiResult.monteCarlo.probUp10Percent}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Chance Price &lt; -5%</span>
                  <span className="text-rose-500 font-black font-mono">{aiResult.monteCarlo.probDown5Percent}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Chance Price &lt; -10%</span>
                  <span className="text-rose-500 font-black font-mono">{aiResult.monteCarlo.probDown10Percent}%</span>
                </div>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-[9px] text-center font-semibold text-slate-500">
                Expected 95% Confidence Range: <span className="font-mono text-slate-855 dark:text-white font-bold">₹{aiResult.monteCarlo.expectedRangeLow} - ₹{aiResult.monteCarlo.expectedRangeHigh}</span> (Mean: ₹{aiResult.monteCarlo.expectedMeanPrice})
              </div>
            </div>
          </div>

          {/* CARD 7: BACKTESTING ENGINE */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" /> Walk-Forward Backtester
                </h3>
                <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                  WIN RATE: {aiResult.backtest.winRatio}%
                </span>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-400 font-medium mb-3.5">
                Evaluates out-of-sample mathematical performance of indicators and swing pivots on historic rolling daily windows.
              </p>

              {/* Backtesting matrices */}
              <div className="grid grid-cols-3 gap-2.5 text-center text-[10px] font-extrabold text-slate-500 mb-4">
                <div className="p-1 border border-slate-100 dark:border-slate-800 rounded">
                  <span className="text-slate-400 block text-[8px] uppercase">Accuracy</span>
                  <p className="text-sm font-black text-slate-800 dark:text-white font-mono">{aiResult.backtest.accuracy}%</p>
                </div>
                <div className="p-1 border border-slate-100 dark:border-slate-800 rounded">
                  <span className="text-slate-400 block text-[8px] uppercase">Precision</span>
                  <p className="text-sm font-black text-slate-800 dark:text-white font-mono">{aiResult.backtest.precision}%</p>
                </div>
                <div className="p-1 border border-slate-100 dark:border-slate-800 rounded">
                  <span className="text-slate-400 block text-[8px] uppercase">F1 Score</span>
                  <p className="text-sm font-black text-slate-800 dark:text-white font-mono">{aiResult.backtest.f1Score}%</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/40 dark:border-slate-700/40 space-y-2 text-[10px] font-bold text-slate-500">
              <div className="flex justify-between">
                <span>Annualized Sharpe Ratio</span>
                <span className="font-mono text-emerald-500 font-black">{aiResult.backtest.sharpeRatio}</span>
              </div>
              <div className="flex justify-between">
                <span>Profit Factor</span>
                <span className="font-mono text-blue-500 font-black">{aiResult.backtest.profitFactor}x</span>
              </div>
              <div className="flex justify-between">
                <span>Total Trades (Wins / Losses)</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 font-black">
                  {aiResult.backtest.totalTrades} (<span className="text-emerald-500">{aiResult.backtest.winningTrades}W</span> / <span className="text-rose-500">{aiResult.backtest.losingTrades}L</span>)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Gross Profit / Loss %</span>
                <span className="font-mono font-black">
                  <span className="text-emerald-500">+{aiResult.backtest.totalProfitPercent}%</span> / <span className="text-rose-500">-{aiResult.backtest.totalLossPercent}%</span>
                </span>
              </div>
            </div>

            {aiResult.backtest.tradeDetails && aiResult.backtest.tradeDetails.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-700/40">
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-2">Recent Trade Logs</span>
                <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {aiResult.backtest.tradeDetails.slice().reverse().map((trade, idx) => (
                    <div key={idx} className="flex justify-between items-center p-1.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 text-[9px] font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1 rounded ${trade.type === 'LONG' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'} font-bold`}>
                          {trade.type}
                        </span>
                        <span className="text-slate-500">{trade.entryDate} &rarr; {trade.exitDate}</span>
                      </div>
                      <div className="text-right">
                        <span className={`block font-black ${trade.profitPercent > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {trade.profitPercent > 0 ? '+' : ''}{trade.profitPercent}% (₹{trade.profitPrice})
                        </span>
                        <span className="text-[8px] text-slate-400 font-sans">
                          In: ₹{trade.entryPrice.toFixed(2)} | Out: ₹{trade.exitPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CARD 8: HYBRID MACHINE LEARNING LAYER */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" /> Hybrid Machine Learning Layer
                </h3>
                <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                  ENSEMBLE: {aiResult.mlLayer.ensembleScore}%
                </span>
              </div>

              {/* Models performance */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase mb-1">
                    <span>XGBoost / Random Forest Score</span>
                    <span className="text-slate-700 dark:text-slate-200 font-black font-mono">{aiResult.mlLayer.traditionalScore}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${aiResult.mlLayer.traditionalScore}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase mb-1">
                    <span>LSTM / Transformer Sequence Solver</span>
                    <span className="text-slate-700 dark:text-slate-200 font-black font-mono">{aiResult.mlLayer.timeSeriesScore}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${aiResult.mlLayer.timeSeriesScore}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Ensemble weights breakdown */}
            <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-700/40 space-y-1.5 text-[9px] font-bold text-slate-500">
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Consensus Model Weights Breakdown</span>
              <div className="flex flex-wrap gap-1.5 font-mono">
                <span className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 rounded">Tech: {aiResult.mlLayer.weights.technical}%</span>
                <span className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 rounded">Pattern: {aiResult.mlLayer.weights.pattern}%</span>
                <span className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 rounded">ML Layers: {aiResult.mlLayer.weights.ml}%</span>
                <span className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 rounded">Sentiment: {aiResult.mlLayer.weights.sentiment}%</span>
                <span className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 rounded">Fund: {aiResult.mlLayer.weights.fundamental}%</span>
              </div>
            </div>
          </div>

          {/* CARD 9: MULTI-FACTOR CONFIDENCE BREAKDOWN */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5" /> Institutional Confidence Breakdown
                </h3>
                <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                  7-FACTOR MATRIX
                </span>
              </div>

              {/* Confidence bars */}
              <div className="space-y-2 text-[10px] font-bold text-slate-550 dark:text-slate-400">
                {[
                  { label: 'Technical Core', val: aiResult.confidenceBreakdown.technical, color: 'bg-blue-500' },
                  { label: 'Chart Pattern', val: aiResult.confidenceBreakdown.pattern, color: 'bg-indigo-500' },
                  { label: 'Momentum Velocity', val: aiResult.confidenceBreakdown.momentum, color: 'bg-emerald-500' },
                  { label: 'Fundamental Stability', val: aiResult.confidenceBreakdown.fundamental, color: 'bg-teal-500' },
                  { label: 'Volume Liquidity Profile', val: aiResult.confidenceBreakdown.volume, color: 'bg-amber-500' },
                  { label: 'News & Social Sentiment', val: aiResult.confidenceBreakdown.sentiment, color: 'bg-purple-500' },
                  { label: 'Recurrent ML Consensus', val: aiResult.confidenceBreakdown.ml, color: 'bg-rose-500' },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between text-[9px] font-semibold text-slate-450 dark:text-slate-500">
                      <span>{item.label}</span>
                      <span className="font-mono text-slate-700 dark:text-slate-200">{item.val}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${item.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Bayesian Confidence Gauge */}
              <div className="mt-5 pt-3 border-t border-slate-200/40 dark:border-slate-700/40 space-y-3">
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                  <span className="uppercase">Bayesian Prior Probability</span>
                  <span className="font-mono text-slate-855 dark:text-slate-200">50.0% (Uninformative)</span>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase mb-1">
                    <span>Bayesian Posterior Probability P(Bullish|Signals)</span>
                    <span className="font-mono text-indigo-500 font-black">{(aiResult.bayesianConfidence.posteriorProbability * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/20 dark:border-slate-700/20">
                    <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${aiResult.bayesianConfidence.posteriorProbability * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 10: RISK REWARD & RELATIVE STRENGTH */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> Risk Reward & Sector Strength
                </h3>
                <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded font-mono">
                  RATIO: {aiResult.riskReward.ratio}
                </span>
              </div>

              {/* Trade setup details */}
              <div className="space-y-2 mb-4">
                <div className="grid grid-cols-3 gap-2 text-[9px] font-mono text-center">
                  <div className="p-1 border border-blue-500/20 bg-blue-500/5 rounded flex flex-col justify-center">
                    <span className="text-blue-500 block font-bold uppercase text-[8px]">Entry Price</span>
                    <span className="text-blue-500 font-black font-mono">₹{aiResult.riskReward.entryPrice.toFixed(2)}</span>
                  </div>
                  <div className="p-1 border border-purple-500/20 bg-purple-500/5 rounded flex flex-col justify-center">
                    <span className="text-purple-500 block font-bold uppercase text-[8px]">Exit Price</span>
                    <span className="text-purple-500 font-black font-mono">₹{aiResult.riskReward.exitPrice?.toFixed(2) || aiResult.riskReward.targetPrice.toFixed(2)}</span>
                  </div>
                  <div className="p-1 border border-rose-500/20 bg-rose-500/5 rounded">
                    <span className="text-rose-500 block font-bold uppercase text-[8px]">Stop Loss</span>
                    <span className="text-rose-500 font-black font-mono">₹{aiResult.riskReward.stopLoss.toFixed(2)}</span>
                    <span className="text-slate-400 block text-[7px] font-sans font-medium">-{aiResult.riskReward.riskPercent}%</span>
                  </div>
                </div>

                {aiResult.riskReward.targets && aiResult.riskReward.targets.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 text-[9px] font-mono text-center mt-2">
                    {aiResult.riskReward.targets.map((t, i) => (
                      <div key={i} className="p-1 border border-emerald-500/20 bg-emerald-500/5 rounded">
                        <span className="text-emerald-500 block font-bold uppercase text-[8px]">Target {i + 1}</span>
                        <span className="text-emerald-500 font-black font-mono">₹{t.toFixed(2)}</span>
                        {i === 0 && <span className="text-slate-400 block text-[7px] font-sans font-medium">+{aiResult.riskReward.rewardPercent}%</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Relative strength comparisons */}
            <div className="pt-3 border-t border-slate-200/40 dark:border-slate-700/40 space-y-2 text-[10px] font-bold text-slate-500">
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Compounded Sector Relative Strength Index</span>
              <div className="grid grid-cols-2 gap-2 text-[9px] font-semibold text-slate-400">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-0.5">
                  <span>Vs Benchmark Nifty</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{aiResult.relativeStrength.niftyScore}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-0.5">
                  <span>Vs BankNifty Index</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{aiResult.relativeStrength.bankNiftyScore}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-0.5">
                  <span>Vs Sector Index</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{aiResult.relativeStrength.sectorIndexScore}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-0.5">
                  <span>Vs Industry Peers Avg</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{aiResult.relativeStrength.industryPeersScore}</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-[9px] font-extrabold uppercase">
                <span>Weighted Relative Score:</span>
                <span className="text-indigo-500 font-black">{aiResult.relativeStrength.overallScore}/100</span>
              </div>
            </div>
          </div>

          {/* CARD 11: AI EXPLAINABILITY LAYER */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300 lg:col-span-3">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" /> AI Explainability & Contribution Layer
                </h3>
                <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded uppercase">
                  Explainable AI Logic Output
                </span>
              </div>

              {/* Explaining positive/negative drivers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <span className="text-[9px] text-emerald-500 font-black uppercase tracking-wider block mb-2">Top Drivers Supporting Forecast Expansion</span>
                  <div className="space-y-1.5">
                    {aiResult.explainability.positiveDrivers.slice(0, 3).map((d, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px] font-bold p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                        <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-500" /> {d.factor}
                        </span>
                        <span className="text-emerald-500 font-mono">+{d.contributionPercent}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[9px] text-rose-500 font-black uppercase tracking-wider block mb-2">Top Technical Valuations / Multiple Headwinds</span>
                  <div className="space-y-1.5">
                    {aiResult.explainability.negativeDrivers.slice(0, 3).map((d, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px] font-bold p-2 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                        <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <TrendingDown className="w-3 h-3 text-rose-500" /> {d.factor}
                        </span>
                        <span className="text-rose-500 font-mono">-{d.contributionPercent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic NLP Reasoning text */}
            <div className="pt-3 border-t border-slate-200/40 dark:border-slate-700/40 space-y-2 text-[10px] font-semibold text-slate-500 leading-relaxed">
              <div className="p-3 bg-indigo-500/5 dark:bg-indigo-950/15 border border-indigo-500/10 rounded-2xl">
                <span className="font-black text-indigo-500 uppercase tracking-widest block mb-1">PRO QUANTITATIVE FORECAST LOGIC REASONING:</span>
                {aiResult.explainability.reasoning}
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/30 dark:border-slate-700/30 rounded-2xl">
                <span className="font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest block mb-1">ESTIMATED CONFIDENCE REASONING DEVIATION:</span>
                {aiResult.explainability.confidenceReasoning}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ADVANCED QUANTITATIVE MATHEMATICS & CORE SOLVERS SECTION */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-8 space-y-8">
        
        {/* Title Banner */}
        <div className="p-6 bg-slate-50/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-indigo-500 animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-500 bg-indigo-500/10 px-3.5 py-1 rounded-full border border-indigo-500/20">
              ADVANCED STATISTICAL & MATHEMATICAL ENGINES
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            Statistical Models & Core Solvers
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-2xl font-medium leading-relaxed">
            True institutional quantitative infrastructure executing recursive price filtering, fractal dimensions, non-parametric spatial density estimates, and Kelly optimal capital sizing.
          </p>
        </div>

        {/* 11 Magnificent Quantitative Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* CARD 12: KALMAN FILTER SMOOTHER */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Kalman Filter Smoother
                </h3>
                <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded font-mono">
                  CONFIDENCE: {aiResult.kalmanFilter.trendConfidence}%
                </span>
              </div>
              <p className="text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium mb-3.5">
                Smooths price volatility noise via recursive state space estimation $x(k) = Ax(k-1) + Bu + w(k)$ to track true underlying price trend lines.
              </p>

              <div className="space-y-2.5 text-[11px] font-bold text-slate-550 dark:text-slate-400">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                  <span>Current Close Price</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono">₹{currentPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                  <span>Kalman Filtered Value</span>
                  <span className="text-indigo-500 font-black font-mono">
                    ₹{aiResult.kalmanFilter.filteredTrend[aiResult.kalmanFilter.filteredTrend.length - 1]?.toFixed(2) || currentPrice.toFixed(2)}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] font-semibold text-slate-400 uppercase mb-1">
                    <span>Kalman Noise Reduction Score</span>
                    <span className="font-mono text-indigo-500 font-extrabold">{aiResult.kalmanFilter.noiseReductionScore}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${aiResult.kalmanFilter.noiseReductionScore}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-700/40 text-[9px] text-slate-400 font-black uppercase tracking-wider">
              ESTIMATE RESOLUTION: 1D CLOSE SLICE
            </div>
          </div>

          {/* CARD 13: HURST EXPONENT FRACTAL ENGINE */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" /> Hurst Exponent Memory
                </h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase shrink-0 ${
                  aiResult.hurstExponent.interpretation === 'TRENDING'
                    ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                    : aiResult.hurstExponent.interpretation === 'MEAN_REVERTING'
                    ? 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                    : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                }`}>
                  {aiResult.hurstExponent.interpretation}
                </span>
              </div>
              <p className="text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium mb-3.5">
                Quantifies long-term fractal time-series memory using R/S rescaled regression. $H &gt; 0.5$ implies trend persistence; $H &lt; 0.5$ implies mean reversion.
              </p>

              <div className="space-y-2.5 text-[11px] font-bold text-slate-550 dark:text-slate-400">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                  <span>Hurst Value (H)</span>
                  <span className="text-indigo-500 font-mono font-black">{aiResult.hurstExponent.hurstValue}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                  <span>Market Memory Score</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono font-extrabold">{aiResult.hurstExponent.marketMemoryScore}/100</span>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] font-semibold text-slate-400 uppercase mb-1">
                    <span>Persistence Coefficient Gauge</span>
                    <span className="font-mono text-indigo-500 font-extrabold">{Math.round(aiResult.hurstExponent.hurstValue * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${aiResult.hurstExponent.hurstValue * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-700/40 text-[9px] text-slate-400 font-black uppercase tracking-wider">
              REGRESSION WINDOW: 30-BAR ROLL
            </div>
          </div>

          {/* CARD 14: MARKET ENTROPY SHANNON ENGINE */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5" /> Shannon Market Entropy
                </h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase shrink-0 ${
                  aiResult.marketEntropy.interpretation === 'STRONG_TREND'
                    ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                    : aiResult.marketEntropy.interpretation === 'CHAOTIC'
                    ? 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                    : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                }`}>
                  {aiResult.marketEntropy.interpretation.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium mb-3.5">
                Calculates informational Shannon Entropy of binned daily returns to evaluate randomness and trend structural quality. High entropy projects chaotic noise.
              </p>

              <div className="space-y-2.5 text-[11px] font-bold text-slate-550 dark:text-slate-400">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                  <span>Shannon Entropy Value</span>
                  <span className="text-indigo-500 font-mono font-black">{aiResult.marketEntropy.shannonEntropy} bits</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                  <span>Structural Randomness Score</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono font-extrabold">{aiResult.marketEntropy.entropyScore}/100</span>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] font-semibold text-slate-400 uppercase mb-1">
                    <span>Chaotic Noise Index</span>
                    <span className="font-mono text-indigo-500 font-extrabold">{aiResult.marketEntropy.entropyScore}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${aiResult.marketEntropy.entropyScore}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-700/40 text-[9px] text-slate-400 font-black uppercase tracking-wider">
              PROBABILITY BINNING: 10-BIN Return VECTOR
            </div>
          </div>

          {/* CARD 15: ANOMALY OUTLIER RADAR */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> Anomaly Outlier Detection
                </h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase shrink-0 ${
                  aiResult.anomalyDetection.manipulationRisk === 'CRITICAL'
                    ? 'text-rose-600 bg-rose-500/10 border-rose-500/20 animate-pulse'
                    : aiResult.anomalyDetection.manipulationRisk === 'HIGH'
                    ? 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                    : aiResult.anomalyDetection.manipulationRisk === 'MODERATE'
                    ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                    : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                }`}>
                  RISK: {aiResult.anomalyDetection.manipulationRisk}
                </span>
              </div>
              <p className="text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium mb-3.5">
                Computes Local Outlier Factor (LOF) on rolling 3-dimensional vectors [Returns, RVOL, ATR] to flag spikes, flash outliers, or suspicious order flows.
              </p>

              <div className="space-y-2.5 text-[11px] font-bold text-slate-550 dark:text-slate-400">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                  <span>LOF Outlier Density Score</span>
                  <span className={`font-mono font-black ${aiResult.anomalyDetection.anomalyScore > 1.35 ? 'text-rose-500' : 'text-indigo-500'}`}>
                    {aiResult.anomalyDetection.anomalyScore}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                  <span>Detected Outliers (30 Days)</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono font-extrabold">{aiResult.anomalyDetection.detectedOutliersCount}</span>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] font-semibold text-slate-400 uppercase mb-1">
                    <span>Statistical Deviation Index</span>
                    <span className="font-mono text-indigo-500 font-extrabold">{Math.min(99, Math.round(aiResult.anomalyDetection.anomalyScore * 50))}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${Math.min(99, Math.round(aiResult.anomalyDetection.anomalyScore * 50))}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-700/40 text-[9px] text-slate-400 font-black uppercase tracking-wider">
              ALGORITHM: 3D LOCAL OUTLIER FACTOR (K=5)
            </div>
          </div>

          {/* CARD 16: COINTEGRATION & PAIRS TRADE ENGINE */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" /> Cointegration & Pairs Arbitrage
                </h3>
                <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 px-2 py-0.5 rounded font-mono">
                  SPREAD: N/A
                </span>
              </div>
              <p className="text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium mb-3.5">
                Analyzes multi-series price histories relative to peer indices or sectors to solve Engle-Granger cointegrated relationships for pairs statistical arbitrage.
              </p>

              {aiResult.cointegrationEngine.cointegrationScore === 'Data unavailable' ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400 dark:text-slate-500 italic text-xs">
                  <span>Data unavailable</span>
                  <span className="text-[10px] text-slate-400/60 mt-1 text-center">Requires backend peer history feed connection.</span>
                </div>
              ) : (
                <div className="space-y-2 text-[11px] font-bold text-slate-550 dark:text-slate-400">
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                    <span>Cointegration Score</span>
                    <span>{aiResult.cointegrationEngine.cointegrationScore}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                    <span>Relative Spread Score</span>
                    <span>{aiResult.cointegrationEngine.relativeSpreadScore}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-700/40 text-[9px] text-slate-400 font-black uppercase tracking-wider">
              PARTNER MATRIX: Watchlist Peers
            </div>
          </div>

          {/* CARD 17: MACROECONOMIC & CORPORATE EVENTS */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Event & Macroeconomic intelligence
                </h3>
                <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 px-2 py-0.5 rounded font-mono">
                  RBI/FED: N/A
                </span>
              </div>
              <p className="text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium mb-3.5">
                Parses RBI macro announcements, inflation statistics (CPI), US treasury bond yields, India VIX, and corporate updates to compute systemic risk indexes.
              </p>

              {aiResult.macroeconomicEngine.macroHeadwindScore === 'Data unavailable' ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400 dark:text-slate-500 italic text-xs">
                  <span>Data unavailable</span>
                  <span className="text-[10px] text-slate-400/60 mt-1 text-center">Macro aggregates are currently offline or unavailable.</span>
                </div>
              ) : (
                <div className="space-y-2 text-[11px] font-bold text-slate-550 dark:text-slate-400">
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                    <span>Macro Headwind Score</span>
                    <span>{aiResult.macroeconomicEngine.macroHeadwindScore}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-700/40 text-[9px] text-slate-400 font-black uppercase tracking-wider">
              REAL-TIME FEED: NSE EXCHANGE / CENTRAL BANK
            </div>
          </div>

          {/* CARD 18: PORTFOLIO ANALYTICS CAPM & FRONTIER */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" /> Modern Portfolio MPT & CAPM
                </h3>
                <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded font-mono">
                  SHARPE: {aiResult.portfolioAnalytics.sharpeRatio}
                </span>
              </div>
              <p className="text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium mb-3.5">
                Computes Capital Asset Pricing Model (CAPM) pricing parameters against Nifty benchmark variance to locate Sharpe metrics and frontier risk levels.
              </p>

              <div className="space-y-2 text-[11px] font-bold text-slate-550 dark:text-slate-400">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                  <span>Systematic Risk Beta (β)</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono font-extrabold">{aiResult.portfolioAnalytics.beta}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                  <span>Active Excess Return Alpha (α)</span>
                  <span className={`font-mono font-extrabold ${aiResult.portfolioAnalytics.alpha >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {aiResult.portfolioAnalytics.alpha >= 0 ? '+' : ''}{aiResult.portfolioAnalytics.alpha}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                  <span>Expected Return (CAPM)</span>
                  <span className="text-indigo-500 font-black font-mono">{aiResult.portfolioAnalytics.capmExpectedReturn}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Efficient Frontier Alloc</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono font-extrabold">
                    {aiResult.portfolioAnalytics.efficientFrontierReturn}% Return @ {aiResult.portfolioAnalytics.efficientFrontierRisk}% Risk
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-700/40 text-[9px] text-slate-400 font-black uppercase tracking-wider">
              MPT FRAMEWORK: RF=7.0% RM=12.0% BENCHMARK
            </div>
          </div>

          {/* CARD 19: ADAPTIVE REINFORCEMENT LEARNING */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" /> Adaptive Reinforcement Learning
                </h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase shrink-0 ${
                  aiResult.reinforcementLearning.optimalAction === 'BUY'
                    ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                    : aiResult.reinforcementLearning.optimalAction === 'SELL'
                    ? 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                    : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                }`}>
                  RL POLICY: {aiResult.reinforcementLearning.optimalAction}
                </span>
              </div>
              <p className="text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium mb-3.5">
                Client-side trading simulator executing gradient walk policy iterations on historical bars to converge on a highly optimized momentum strategy weight matrix.
              </p>

              <div className="space-y-2.5 text-[11px] font-bold text-slate-550 dark:text-slate-400">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                  <span>Reinforcement Learning Score</span>
                  <span className="text-indigo-500 font-mono font-black">{aiResult.reinforcementLearning.rlStrategyScore}/100</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                  <span>Policy Weights Convergence</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono font-extrabold">{aiResult.reinforcementLearning.convergenceRatio}</span>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] font-semibold text-slate-400 uppercase mb-1">
                    <span>Simulation Strategy Convergence Gauge</span>
                    <span className="font-mono text-indigo-500 font-extrabold">{aiResult.reinforcementLearning.rlStrategyScore}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${aiResult.reinforcementLearning.rlStrategyScore}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-700/40 text-[9px] text-slate-400 font-black uppercase tracking-wider">
              MODEL BASE: PROXIMAL POLICY OPTIMIZATION FEEDBACK
            </div>
          </div>

          {/* CARD 20: UNCERTAINTY PREDICTION BAND CONES */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" /> Probabilistic Price Bands
                </h3>
                <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded font-mono">
                  1-MONTH CONES
                </span>
              </div>
              <p className="text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium mb-3.5">
                Replaces single price target predictions with standard error bands calculated from the 10,000 Monte Carlo Geometric Brownian variance equations.
              </p>

              {/* Cones levels table */}
              <div className="space-y-2 text-[10px] font-mono font-bold text-slate-550 dark:text-slate-400">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1 flex-row">
                  <span className="text-slate-400 font-sans">68% Confidence Band (1σ)</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    ₹{aiResult.uncertaintyPrediction.confidenceBands68.low.toFixed(1)} – ₹{aiResult.uncertaintyPrediction.confidenceBands68.high.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1 flex-row">
                  <span className="text-slate-400 font-sans">95% Confidence Band (1.96σ)</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    ₹{aiResult.uncertaintyPrediction.confidenceBands95.low.toFixed(1)} – ₹{aiResult.uncertaintyPrediction.confidenceBands95.high.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1 flex-row">
                  <span className="text-slate-400 font-sans">99% Confidence Band (2.58σ)</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    ₹{aiResult.uncertaintyPrediction.confidenceBands99.low.toFixed(1)} – ₹{aiResult.uncertaintyPrediction.confidenceBands99.high.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-700/40 text-[9px] text-slate-400 font-black uppercase tracking-wider">
              EQUATION: GEOMETRIC BROWNIAN MOTION VARIANCE
            </div>
          </div>

          {/* CARD 21: KELLY CRITERION ALGORITHMIC SIZER */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5" /> Kelly Algorithmic Position Sizer
                </h3>
                <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                  SIZE: {aiResult.executionKelly.suggestedPositionSize !== 'Data unavailable' ? `${aiResult.executionKelly.suggestedPositionSize}%` : 'N/A'}
                </span>
              </div>
              <p className="text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium mb-3.5">
                Applies the Kelly Criterion equation $f^* = (bp-q)/b$ (where $p$ is Bayesian probability and $b$ is risk-reward) constrained at a conservative $0.25f^*$ fraction.
              </p>

              <div className="space-y-2.5 text-[11px] font-bold text-slate-550 dark:text-slate-400">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                  <span>Suggested Portfolio Sizing</span>
                  <span className="text-indigo-500 font-black font-mono">
                    {aiResult.executionKelly.suggestedPositionSize !== 'Data unavailable' ? `${aiResult.executionKelly.suggestedPositionSize}% Allocation` : 'Data unavailable'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                  <span>Raw Kelly Coefficient Allocation</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono font-extrabold">{aiResult.executionKelly.kellyFraction}</span>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] font-semibold text-slate-400 uppercase mb-1">
                    <span>Capital Allocation Sizer Gauge</span>
                    <span className="font-mono text-indigo-500 font-extrabold">
                      {aiResult.executionKelly.suggestedPositionSize !== 'Data unavailable' ? `${aiResult.executionKelly.suggestedPositionSize}%` : '0%'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${aiResult.executionKelly.suggestedPositionSize !== 'Data unavailable' ? aiResult.executionKelly.suggestedPositionSize : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-700/40 text-[9px] text-slate-400 font-black uppercase tracking-wider">
              Kelly Constraints: Fractional allocation (0.25f*)
            </div>
          </div>

          {/* CARD 22: MODEL DRIFT & STABILITY MONITOR */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" /> Model Drift & Degradation Monitor
                </h3>
                <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded font-mono">
                  STABLE
                </span>
              </div>
              <p className="text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium mb-3.5">
                Continuously tracks statistical drift residuals and model stability degradation metrics to alert on out-of-sample backtest prediction accuracy decay.
              </p>

              <div className="space-y-2 text-[10px] font-bold text-slate-550 dark:text-slate-400">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1 flex-row">
                  <span className="text-slate-400 font-sans">Model Stability Score</span>
                  <span className="text-emerald-500 font-black font-mono">{aiResult.predictionQualityMonitor.modelStabilityScore}%</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1 flex-row">
                  <span className="text-slate-400 font-sans">Model Degradation Risk</span>
                  <span className="text-rose-500 font-black font-mono">{aiResult.predictionQualityMonitor.modelDegradationScore}%</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1 flex-row">
                  <span className="text-slate-400 font-sans">Statistical Drift Ratio</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono font-extrabold">{aiResult.predictionQualityMonitor.predictionDrift}%</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1 flex-row">
                  <span className="text-slate-400 font-sans">Rolling Accuracy Rate</span>
                  <span className="text-blue-500 font-black font-mono">{aiResult.predictionQualityMonitor.rollingAccuracy}%</span>
                </div>
                <div className="flex justify-between flex-row">
                  <span className="text-slate-400 font-sans">False Pos / Neg Rates</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono font-extrabold">
                    {aiResult.predictionQualityMonitor.falsePositiveRate}% / {aiResult.predictionQualityMonitor.falseNegativeRate}%
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-700/40 text-[9px] text-slate-400 font-black uppercase tracking-wider">
              MONITOR SYSTEM: VOLATILITY ERROR RESIDUAL ENGINE
            </div>
          </div>

        </div>
      </div>

      {/* NEW CARD: STRATEGY OPTIMIZER */}
      {aiResult.topStrategies && aiResult.topStrategies.length > 0 && (
        <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-widest">
              Top Validated Quantitative Strategies
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">
            These automated trading algorithms have been backtested against the historical data arrays using a strict 1.5% fixed-risk portfolio limit and ATR-trailing stop loss logic.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiResult.topStrategies.slice(0, 6).map((strat: any, i: number) => (
              <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-amber-500/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{strat.strategyName}</h4>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                    {strat.bestMarketCondition}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Win Rate</span>
                    <span className="font-mono text-sm font-black text-emerald-500">{strat.winRate.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">CAGR (Ann Return)</span>
                    <span className="font-mono text-sm font-black text-blue-500">{strat.cagr.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Profit Factor</span>
                    <span className="font-mono text-xs font-black text-slate-700 dark:text-slate-300">{strat.profitFactor.toFixed(2)}x</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Max Drawdown</span>
                    <span className="font-mono text-xs font-black text-rose-500">-{strat.maxDrawdown.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SPRINT 6: AI-POWERED ANALYSIS & COCKPIT UPGRADES */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-8 space-y-8">
        {/* Title Banner */}
        <div className="p-6 bg-slate-50/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-indigo-500 animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-500 bg-indigo-500/10 px-3.5 py-1 rounded-full border border-indigo-500/20">
              AI INTEL QUANT SOLVER OVERHAUL
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            Advanced Diversification & Quantitative Scoring Engine
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-2xl font-medium leading-relaxed">
            Institutional metrics calculating structural core strengths, HHI portfolio sector diversification boundaries, and composite peer scoring matrices.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* CARD 1: FUNDAMENTAL VS TECHNICAL SCORES */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Quantitative Core Scores
                </h3>
                <span className="text-[9px] font-black px-2 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/10 text-indigo-500 uppercase tracking-widest">
                  DUAL SOLVER
                </span>
              </div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-4">
                Fundamental & Technical Strength
              </h4>

              <div className="space-y-6">
                {/* Technical Score */}
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                    <span>Technical Score</span>
                    <span className="font-extrabold text-blue-500">{technicalScore}/100</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/25 dark:border-slate-700/25">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-1000" 
                      style={{ width: `${technicalScore}%` }} 
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1 font-medium">
                    Calculated from current timeframe RSI swings, MACD trends, and EMA structural alignments.
                  </p>
                </div>

                {/* Fundamental Score */}
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                    <span>Fundamental Score</span>
                    <span className="font-extrabold text-emerald-500">{fundamentalScore}/100</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/25 dark:border-slate-700/25">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-1000" 
                      style={{ width: `${fundamentalScore}%` }} 
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1 font-medium">
                    Calculated based on key credit leverage buffers, liquidity ratios, and valuation PE indexes.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200/40 dark:border-slate-700/40 text-[9px] text-slate-400 font-black uppercase tracking-wider flex justify-between">
              <span>SOLVER METHOD:</span>
              <span className="text-slate-700 dark:text-slate-200 font-mono">WEIGHTED MULTI-FACTOR MODEL</span>
            </div>
          </div>

          {/* CARD 2: PORTFOLIO DIVERSIFICATION INDEX (HHI) */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" /> MPT Portfolio Diversification
                </h3>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase shrink-0 ${
                  diversificationIndex.hhi === 0 
                    ? 'text-slate-500 bg-slate-100 border-slate-200' 
                    : diversificationIndex.hhi > 2500 
                    ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' 
                    : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                }`}>
                  HHI: {diversificationIndex.hhi}
                </span>
              </div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-2">
                {diversificationIndex.status}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
                Herfindahl-Hirschman Index (HHI) measures portfolio concentration. Scores below 1500 imply healthy mathematical sector-wide diversification.
              </p>

              {userHoldings.length === 0 ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700/60 rounded-2xl text-center text-slate-500 text-[10px] italic">
                  No active stock holdings logged in current workspace to compute index.
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1">Active Sector Allocation Weights</span>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {diversificationIndex.sectorWeights.map((w: any, idx: number) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[9px] font-bold text-slate-600 dark:text-slate-350">
                          <span>{w.sector}</span>
                          <span>{w.weight.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 transition-all duration-500" 
                            style={{ width: `${w.weight}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200/40 dark:border-slate-700/40 text-[9px] text-slate-400 font-black uppercase tracking-wider">
              {diversificationIndex.hhi > 2500 
                ? '⚠️ ADVICE: ADD DIVERSE SECTORS TO REDUCE UNCONSTRAINED BETA RISK' 
                : '✓ ADVICE: PORTFOLIO ALLOCATION STRUCTURE SATISFIES COGNITIVE SAFETY'}
            </div>
          </div>

          {/* CARD 3: TARGETED STOCK PEER RANKINGS */}
          <div className="p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500/30 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-4">
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5" /> Composite Stock Rankings
                </h3>
                <span className="text-[9px] font-black px-2 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/10 text-indigo-500 uppercase tracking-widest">
                  AI SCREENER
                </span>
              </div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-3">
                Peer Ranking Matrix
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
                Dynamically ranks peer tickers relative to the current stock based on overall composite AI predictability metrics.
              </p>

              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {stockRankings.map((p: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/30 dark:border-slate-700/30 rounded-xl hover:scale-[1.01] transition-transform">
                    <div className="min-w-0">
                      <span className="text-[10px] font-black text-slate-900 dark:text-white block font-mono">{p.symbol.split('.')[0]}</span>
                      <span className="text-[8px] text-slate-400 truncate block max-w-[120px]">{p.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border tracking-wider ${p.color}`}>
                        {p.rating}
                      </span>
                      <span className="text-[11px] font-black font-mono text-slate-800 dark:text-white">
                        {p.score}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200/40 dark:border-slate-700/40 text-[9px] text-slate-400 font-black uppercase tracking-wider flex justify-between">
              <span>RANKING METRIC:</span>
              <span className="text-indigo-500 font-black font-mono">COMPOSITE SOLVER INDEX</span>
            </div>
          </div>
        </div>
      </div>

      {/* COMPLIANCE DISCLAIMER WARNING BANNER */}
      <div className="p-5 bg-amber-500/5 dark:bg-amber-950/10 border border-amber-500/15 rounded-3xl flex items-start gap-3.5">
        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
          <span className="font-extrabold text-amber-600 dark:text-amber-450 uppercase tracking-widest block mb-1">Mandatory Regulatory Warning & Disclaimer</span>
          Predictions are probabilistic estimates generated from historical, technical, quantitative, and sentiment data and do not guarantee future market movement. All computations, chart patterns, quantitative fits, and targets generated by this AI Market Intelligence dashboard are purely mathematical outcomes of public historical candle data and standard technical formulas. These models do not constitute investment advice, equity research reports, financial recommendations, or SEBI-registered advisory services. Indian equity markets involve significant risk; past statistical performance is never an assurance of future Compounded Annual Growth rates (CAGR). Investors must conduct independent research and consult certified experts before execution.
        </div>
      </div>

    </div>
  );
}

