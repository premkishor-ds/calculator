"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Trash2,
  Plus,
  Star,
  Sun,
  Moon,
  Scale,
  PieChart,
  AlertTriangle,
  CheckCircle,
  FileText,
  ExternalLink,
  Newspaper,
  Grid,
  Save,
  Bell,
  Percent,
  Activity,
  Play,
  Pause,
  Sliders,
  X,
  Check,
  ChevronDown,
  Lock,
  Unlock
} from 'lucide-react';
import { DEFAULT_SYMBOLS, DEFAULT_SEEDS } from '@/utils/symbols';
import { buildAllTags, DEFAULT_CUSTOM_TAGS, CUSTOM_TAG_IDS, type TagDef, type CustomTagRaw } from '@/utils/tags';
import { getBackendApiUrl, getBackendWsUrl } from '@/lib/backend-config';
import AIMarketIntelligence from '@/components/AIMarketIntelligence';
import Backtester from '@/components/Backtester';
import WatchlistSidebar from '@/components/watchlist/WatchlistSidebar';
import OptionsStrategyBuilder from '@/components/OptionsStrategyBuilder';
/* Dynamically import the chart so it's client-only (no SSR) */
const AdvancedChart = dynamic(() => import('@/components/AdvancedChart'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-950 min-h-[300px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Initialising Chart Engine...</span>
      </div>
    </div>
  ),
});

const Navigation = dynamic(() => import('@/components/Navigation').then(mod => mod.Navigation), {
  ssr: false
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
  isFavourite?: boolean;
  tags?: string[];
  _id?: string;
}

interface BackendStock {
  symbol: string;
  name: string;
  isFavourite?: boolean;
  tags?: string[];
  _id?: string;
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

interface QuarterlyItem {
  date: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
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

interface BalanceSheetItem {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  cash: number;
  debt: number;
  workingCapital: number;
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

interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  date: string;
}


interface ActiveAlert {
  _id: string;
  symbol: string;
  condition: 'price_above' | 'price_below' | 'price_crosses' | 'volume_spike' | 'rsi_above' | 'rsi_below';
  value: number;
  isActive: boolean;
  isTriggered: boolean;
  createdAt: string;
  triggeredAt?: string;
}

interface WorkspaceTemplate {
  _id: string;
  name: string;
  layout: {
    gridLayout: 1 | 2 | 4 | 6 | 8;
    gridConfigs: Array<{
      symbol: string;
      interval: string;
      style: string;
      indicators: string[];
      drawingsVersion: number;
    }>;
  };
  updatedAt: string;
}

// Lazy getter â€” evaluated client-side so localhost/prod resolution works correctly after hydration
function getApiUrl() { return getBackendApiUrl(); }

const getHeaders = (withJson = true) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return {
    ...(withJson ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// Evaluated lazily client-side to avoid SSR picking wrong URL
function getWsUrl() {
  if (typeof window !== 'undefined') return getBackendWsUrl();
  return '';
}

// SECTORS_MAP is now imported centrally from '@/utils/symbols'

export default function TradingTerminalInner() {
  /* ── Core Theme & Workspace States ──────────────────────── */
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [watchlistStocks, setWatchlistStocks] = useState<StockQuote[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  
  // Floating Toast State — useRef tracks timer to prevent stacking multiple timers
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const [mobileViewTab, setMobileViewTab] = useState<'chart' | 'list'>('chart');

  // Sync state selectors
  const [gridLayout, setGridLayout] = useState<1 | 2 | 4 | 6 | 8>(1);
  const [activeGridIndex, setActiveGridIndex] = useState<number>(0);
  const [syncSymbol, setSyncSymbol] = useState(true);
  const [syncTimeframe, setSyncTimeframe] = useState(true);
  const [syncDrawings, setSyncDrawings] = useState(true);
  const [syncIndicators, setSyncIndicators] = useState(true);
  const [syncStyle, setSyncStyle] = useState(true);

  // 8 Grid cells configurations
  const [gridConfigs, setGridConfigs] = useState<Array<{
    symbol: string;
    interval: string;
    style: string;
    indicators: Set<string>;
    drawingsVersion: number;
    markers: any[];
  }>>(() => Array(8).fill(null).map((_, i) => ({
    symbol: i === 0 ? '' : (DEFAULT_SYMBOLS[i % DEFAULT_SYMBOLS.length] || ''),
    interval: 'Daily',
    style: 'Candlestick',
    indicators: new Set(['EMA9', 'EMA20', 'EMA50', 'EMA100', 'EMA200']),
    drawingsVersion: 0,
    markers: []
  })));

  const searchParams = useSearchParams();
  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
      const paramSym = searchParams?.get('symbol');
      if (paramSym) return paramSym;
      return '';
    });

  // Track whether the URL param symbol has been honoured already
  const urlSymbolHonouredRef = useRef(false);

  // Watch for active grid cell changes to align root symbol selection
  useEffect(() => {
    const activeSymbol = gridConfigs[activeGridIndex]?.symbol;
    if (activeSymbol && activeSymbol !== selectedSymbol) {
      setSelectedSymbol(activeSymbol);
    }
  }, [activeGridIndex, gridConfigs]);

  // Sync root watchlist selection to active cell configurations
  const selectSymbolRoot = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
    setGridConfigs(prev => prev.map((cfg, i) => {
      const shouldUpdate = i === activeGridIndex || syncSymbol;
      if (shouldUpdate) {
        return { ...cfg, symbol };
      }
      return cfg;
    }));
  }, [activeGridIndex, syncSymbol]);

  // Core configuration controllers
  const handleGridConfigChange = (idx: number, field: string, value: any) => {
    setGridConfigs(prev => prev.map((cfg, i) => {
      const shouldUpdate = i === idx || 
        (field === 'symbol' && syncSymbol) ||
        (field === 'interval' && syncTimeframe) ||
        (field === 'style' && syncStyle) ||
        (field === 'indicators' && syncIndicators);
      
      if (shouldUpdate) {
        return { ...cfg, [field]: value };
      }
      return cfg;
    }));
  };

  const handleGridDrawingsChange = (idx: number) => {
    if (syncDrawings) {
      setGridConfigs(prev => prev.map((cfg, i) => {
        if (i !== idx && cfg.symbol === gridConfigs[idx].symbol) {
          return { ...cfg, drawingsVersion: cfg.drawingsVersion + 1 };
        }
        return cfg;
      }));
    }
  };

  /* â”€â”€ Alerts & Sidebar Panel States â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const [showAlertsSidebar, setShowAlertsSidebar] = useState(false);
  const [alertsList, setAlertsList] = useState<ActiveAlert[]>([]);
  const [newAlertCondition, setNewAlertCondition] = useState<ActiveAlert['condition']>('price_above');
  const [newAlertValue, setNewAlertValue] = useState('');

  /* â”€â”€ Workspace templates States â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const [savedTemplates, setSavedTemplates] = useState<WorkspaceTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);


  /* â”€â”€ Watchlist Screener States â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const [screenerSortField, setScreenerSortField] = useState<'symbol' | 'price' | 'changePercent' | 'sma20' | 'sma50' | 'rsi14'>('symbol');
  const [screenerSortDirection, setScreenerSortDirection] = useState<'asc' | 'desc'>('asc');

  /* â”€â”€ Backtester States â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const [strategyType, setStrategyType] = useState<'emacross' | 'rsi'>('emacross');
  const [backtestRunning, setBacktestRunning] = useState(false);
  const [backtestResults, setBacktestResults] = useState<{
    netProfit: number;
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    trades: any[];
  } | null>(null);

  /* â”€â”€ AI Pattern Scanner States â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const [aiPatterns, setAiPatterns] = useState<Array<{
    timeStr: string;
    pattern: string;
    sentiment: 'Bullish' | 'Bearish' | 'Neutral';
    reliability: 'High' | 'Medium' | 'Low';
    close: number;
  }>>([]);
  const [aiScanning, setAiScanning] = useState(false);

  /* â”€â”€ Socket Connection & Simulated Feeds â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = getWsUrl();
    if (!wsUrl) return;
    // Initialise WebSocket connection
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log('Terminal connected to backend stream WebSocket');
    };

    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'tick') {
          // Update live ticks dictionary
          setLivePrices(prev => ({
            ...prev,
            [msg.symbol]: msg.price
          }));
          
          // Live watchlist metrics update
          setWatchlistStocks(prev => prev.map(s => {
            if (s.symbol === msg.symbol) {
              return {
                ...s,
                price: msg.price,
                change: msg.change,
                changePercent: msg.changePercent
              };
            }
            return s;
          }));

        } else if (msg.type === 'alert_triggered') {
          showToast(`ALERT TRIGGERED: ${msg.alert.symbol.split('.')[0]} crosses price point ${msg.alert.value}!`, 'info');
          fetchAlerts();
        }
      } catch (err) {
        console.error('Socket parse error:', err);
      }
    };

    socket.onclose = () => {
      console.log('Stream socket disconnected');
    };

    return () => {
      socket.close();
    };
  }, [showToast]);

  /* â”€â”€ Fetch Helper Methods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/alerts`, {
        headers: getHeaders(false)
      });
      if (res.ok) {
        const data = await res.json();
        setAlertsList(data);
      }
    } catch {}
  }, []);

  const fetchWorkspaceLayouts = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/workspace/layouts`, {
        headers: getHeaders(false)
      });
      if (res.ok) {
        const data = await res.json();
        setSavedTemplates(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchAlerts();
    fetchWorkspaceLayouts();
  }, [fetchAlerts, fetchWorkspaceLayouts]);


  /* â”€â”€ Alerts Side Panel Submissions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newAlertValue);
    if (!selectedSymbol || isNaN(val) || val <= 0) {
      showToast('Please enter a valid price crossing trigger value', 'error');
      return;
    }
    try {
      const res = await fetch(`${getApiUrl()}/alerts`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({
          symbol: selectedSymbol,
          condition: newAlertCondition,
          value: val
        })
      });
      if (res.ok) {
        showToast('Active price trigger alert created!', 'success');
        setNewAlertValue('');
        fetchAlerts();
      } else {
        const data = await res.json().catch(() => null);
        showToast(data?.error || 'Failed to create alert', 'error');
      }
    } catch {
      showToast('Failed to create alert', 'error');
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/alerts/${id}`, {
        method: 'DELETE',
        headers: getHeaders(false)
      });
      if (res.ok) {
        showToast('Alert deleted', 'info');
        fetchAlerts();
      }
    } catch {}
  };

  /* â”€â”€ Cloud Workspace Templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleSaveWorkspaceLayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTemplateName.trim();
    if (!name) return;
    
    // Custom set-to-array serialization
    const serializedConfigs = gridConfigs.map(c => ({
      symbol: c.symbol,
      interval: c.interval,
      style: c.style,
      indicators: Array.from(c.indicators),
      drawingsVersion: c.drawingsVersion
    }));

    try {
      const res = await fetch(`${getApiUrl()}/workspace/layouts`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({
          name,
          layout: {
            gridLayout,
            gridConfigs: serializedConfigs
          }
        })
      });
      if (res.ok) {
        showToast(`Workspace template '${name}' saved to cloud!`, 'success');
        setNewTemplateName('');
        setShowTemplatesDropdown(false);
        fetchWorkspaceLayouts();
      }
    } catch {
      showToast('Templates storage offline', 'error');
    }
  };

  const handleLoadWorkspaceLayout = async (tmpl: WorkspaceTemplate) => {
    try {
      setGridLayout(tmpl.layout.gridLayout);
      
      // Convert arrays back to sets during deserialization
      const restoredConfigs = tmpl.layout.gridConfigs.map(c => ({
        symbol: c.symbol,
        interval: c.interval,
        style: c.style,
        indicators: new Set(c.indicators),
        drawingsVersion: c.drawingsVersion,
        markers: []
      }));

      // Pad remaining cell configurations if needed
      while (restoredConfigs.length < 8) {
        restoredConfigs.push({
          symbol: '',
          interval: '5m',
          style: 'Candlestick',
          indicators: new Set(['EMA9', 'EMA20', 'EMA50', 'EMA100', 'EMA200']),
          drawingsVersion: 0,
          markers: []
        });
      }

      setGridConfigs(restoredConfigs);
      setActiveGridIndex(0);
      showToast(`Loaded layout '${tmpl.name}'!`, 'success');
      setShowTemplatesDropdown(false);
    } catch {
      showToast('Error loading custom workspace layout', 'error');
    }
  };

  const handleDeleteWorkspaceLayout = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete workspace template '${name}'?`)) return;
    try {
      const res = await fetch(`${getApiUrl()}/workspace/layouts/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: getHeaders(false)
      });
      if (res.ok) {
        showToast('Layout template deleted', 'info');
        fetchWorkspaceLayouts();
      }
    } catch {}
  };

  /* â”€â”€ Screener Calculations on active watchlist â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const watchlistScreenerData = useMemo(() => {
    return watchlistStocks.map(stock => {
      // Deterministic indicators computed on-the-fly from daily price
      const rsi14 = Math.min(95, Math.max(8, 35 + (stock.changePercent * 6) + (Math.sin(stock.price) * 12)));
      const sma20 = stock.price * (1 - 0.003 * stock.changePercent);
      const sma50 = stock.price * (1 - 0.009 * stock.changePercent);
      return {
        ...stock,
        rsi14,
        sma20,
        sma50
      };
    });
  }, [watchlistStocks]);

  const sortedScreenerData = useMemo(() => {
    const list = [...watchlistScreenerData];
    list.sort((a: any, b: any) => {
      let valA = a[screenerSortField];
      let valB = b[screenerSortField];
      
      if (typeof valA === 'string') {
        return screenerSortDirection === 'asc' 
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return screenerSortDirection === 'asc' ? valA - valB : valB - valA;
    });
    return list;
  }, [watchlistScreenerData, screenerSortField, screenerSortDirection]);

  const toggleScreenerSort = (field: typeof screenerSortField) => {
    if (screenerSortField === field) {
      setScreenerSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setScreenerSortField(field);
      setScreenerSortDirection('asc');
    }
  };

  /* â”€â”€ Strategy Backtest Loop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleRunBacktest = async () => {
    if (!selectedSymbol) return;
    try {
      setBacktestRunning(true);
      setBacktestResults(null);

      // Fetch 1-year historical candles
      const res = await fetch(`/api/watchlist/${encodeURIComponent(selectedSymbol)}/chart?range=1y`);
      if (!res.ok) throw new Error('Failed to load strategy test history');
      const json = await res.json();
      const points = json.points || [];

      if (points.length < 50) {
        showToast('Insufficient candle history for rolling backtests', 'error');
        setBacktestRunning(false);
        return;
      }

      // Executes rolling signals
      let balance = 100000;
      let holdings = 0;
      let totalTrades = 0;
      let winningTrades = 0;
      let grossProfit = 0;
      let grossLoss = 0;
      const trades: any[] = [];
      const markers: any[] = [];

      if (strategyType === 'emacross') {
        // Calculate dynamic EMAs
        const emaFast: number[] = [];
        const emaSlow: number[] = [];
        let kFast = 2 / 10;
        let kSlow = 2 / 22;
        let sumFast = 0, sumSlow = 0;
        
        for (let i = 0; i < points.length; i++) {
          if (i < 9) sumFast += points[i].close;
          if (i < 21) sumSlow += points[i].close;

          if (i === 8) emaFast.push(sumFast / 9);
          else if (i > 8) emaFast.push(points[i].close * kFast + emaFast[emaFast.length - 1] * (1 - kFast));
          else emaFast.push(points[i].close);

          if (i === 20) emaSlow.push(sumSlow / 21);
          else if (i > 20) emaSlow.push(points[i].close * kSlow + emaSlow[emaSlow.length - 1] * (1 - kSlow));
          else emaSlow.push(points[i].close);
        }

        // Simulating crossovers
        for (let i = 22; i < points.length; i++) {
          const prevFast = emaFast[i - 1];
          const prevSlow = emaSlow[i - 1];
          const currFast = emaFast[i];
          const currSlow = emaSlow[i];

          // Gold Cross (BUY)
          if (prevFast <= prevSlow && currFast > currSlow && holdings === 0) {
            holdings = balance / points[i].close;
            balance = 0;
            totalTrades++;
            trades.push({ type: 'BUY', price: points[i].close, time: points[i].time, date: points[i].date });
            markers.push({
              time: points[i].time,
              position: 'belowBar',
              color: '#10b981',
              shape: 'arrowUp',
              text: 'BUY'
            });
          }
          // Death Cross (SELL)
          else if (prevFast >= prevSlow && currFast < currSlow && holdings > 0) {
            const proceeds = holdings * points[i].close;
            const entryPrice = trades[trades.length - 1].price;
            const diff = proceeds - (entryPrice * holdings);
            if (diff >= 0) {
              winningTrades++;
              grossProfit += diff;
            } else {
              grossLoss += Math.abs(diff);
            }
            balance = proceeds;
            holdings = 0;
            trades.push({ type: 'SELL', price: points[i].close, time: points[i].time, date: points[i].date });
            markers.push({
              time: points[i].time,
              position: 'aboveBar',
              color: '#ef4444',
              shape: 'arrowDown',
              text: 'SELL'
            });
          }
        }
      } else {
        // RSI Oversold backtest
        const rsiList: number[] = [];
        let gains = 0, losses = 0;
        
        for (let i = 1; i <= 14; i++) {
          const d = points[i].close - points[i - 1].close;
          if (d > 0) gains += d;
          else losses -= d;
        }
        let avgGain = gains / 14;
        let avgLoss = losses / 14;
        
        for (let i = 15; i < points.length; i++) {
          const d = points[i].close - points[i - 1].close;
          const g = d > 0 ? d : 0;
          const l = d < 0 ? -d : 0;
          avgGain = (avgGain * 13 + g) / 14;
          avgLoss = (avgLoss * 13 + l) / 14;
          const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
          rsiList.push(rsi);
        }

        for (let i = 16; i < points.length; i++) {
          const rsi = rsiList[i - 15];
          if (rsi < 30 && holdings === 0) {
            holdings = balance / points[i].close;
            balance = 0;
            totalTrades++;
            trades.push({ type: 'BUY', price: points[i].close, time: points[i].time, date: points[i].date });
            markers.push({
              time: points[i].time,
              position: 'belowBar',
              color: '#10b981',
              shape: 'arrowUp',
              text: 'BUY'
            });
          } else if (rsi > 70 && holdings > 0) {
            const proceeds = holdings * points[i].close;
            const entryPrice = trades[trades.length - 1].price;
            const diff = proceeds - (entryPrice * holdings);
            if (diff >= 0) {
              winningTrades++;
              grossProfit += diff;
            } else {
              grossLoss += Math.abs(diff);
            }
            balance = proceeds;
            holdings = 0;
            trades.push({ type: 'SELL', price: points[i].close, time: points[i].time, date: points[i].date });
            markers.push({
              time: points[i].time,
              position: 'aboveBar',
              color: '#ef4444',
              shape: 'arrowDown',
              text: 'SELL'
            });
          }
        }
      }

      // Close pending trades at spot price
      if (holdings > 0) {
        const finalPrice = points[points.length - 1].close;
        const entryPrice = trades[trades.length - 1].price;
        const diff = (holdings * finalPrice) - (entryPrice * holdings);
        if (diff >= 0) {
          winningTrades++;
          grossProfit += diff;
        } else {
          grossLoss += Math.abs(diff);
        }
        balance = holdings * finalPrice;
      }

      const profitPercent = ((balance - 100000) / 100000) * 100;
      const factor = grossLoss === 0 ? grossProfit : parseFloat((grossProfit / grossLoss).toFixed(2));
      const wRate = totalTrades === 0 ? 0 : parseFloat(((winningTrades / totalTrades) * 100).toFixed(1));

      setBacktestResults({
        netProfit: parseFloat(profitPercent.toFixed(2)),
        totalTrades,
        winRate: wRate,
        profitFactor: factor,
        trades
      });

      // Instantly inject generated anchor markers into the active cell chart configuration
      setGridConfigs(prev => prev.map((cfg, i) => {
        if (i === activeGridIndex) {
          return { ...cfg, markers };
        }
        return cfg;
      }));

      showToast('Backtest executed. Markers overlayed onto active grid cell!', 'success');
    } catch {
      showToast('Failed to run backtester', 'error');
    } finally {
      setBacktestRunning(false);
    }
  };

  /* â”€â”€ Candlestick AI Scanner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleScanPatterns = async () => {
    if (!selectedSymbol) return;
    try {
      setAiScanning(true);
      setAiPatterns([]);

      const res = await fetch(`/api/watchlist/${encodeURIComponent(selectedSymbol)}/chart?range=1m`);
      if (!res.ok) throw new Error('Scan offline');
      const json = await res.json();
      const points = json.points || [];

      if (points.length < 5) {
        showToast('Insufficient candle bars to analyze patterns', 'error');
        setAiScanning(false);
        return;
      }

      const found: typeof aiPatterns = [];
      for (let i = 2; i < points.length; i++) {
        const p = points[i];
        const prev = points[i - 1];
        const body = Math.abs(p.close - p.open);
        const range = p.high - p.low;
        const prevBody = Math.abs(prev.close - prev.open);

        // Doji Formations
        if (body <= 0.06 * range && range > 0) {
          found.push({
            timeStr: p.date,
            pattern: 'âš–ï¸ Doji Line',
            sentiment: 'Neutral',
            reliability: 'Low',
            close: p.close
          });
        }
        // Hammer patterns
        else if (range > 0 && (p.low < Math.min(p.open, p.close)) && 
                 (Math.min(p.open, p.close) - p.low >= 1.8 * body) &&
                 (p.high - Math.max(p.open, p.close) <= 0.15 * body)) {
          found.push({
            timeStr: p.date,
            pattern: '🔨 Bullish Hammer',
            sentiment: 'Bullish',
            reliability: 'Medium',
            close: p.close
          });
        }
        // Engulfing patterns
        else if (p.close > p.open && prev.close < prev.open && p.open <= prev.close && p.close >= prev.open) {
          found.push({
            timeStr: p.date,
            pattern: '🟢 Bullish Engulfing',
            sentiment: 'Bullish',
            reliability: 'High',
            close: p.close
          });
        } else if (p.close < p.open && prev.close > prev.open && p.open >= prev.close && p.close <= prev.open) {
          found.push({
            timeStr: p.date,
            pattern: '🔴 Bearish Engulfing',
            sentiment: 'Bearish',
            reliability: 'High',
            close: p.close
          });
        }
      }

      setAiPatterns(found.reverse().slice(0, 8));
      showToast(`AI Scanner completed: Found ${found.length} candlestick formations!`, 'success');
    } catch {
      showToast('AI Pattern models offline', 'error');
    } finally {
      setAiScanning(false);
    }
  };

  /* â”€â”€ Tabbed Bottom Drawer Selector State (Removed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

  /* â”€â”€ Keyboard Hotkeys Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement?.tagName;
      if (activeElement === 'INPUT' || activeElement === 'TEXTAREA') return;

      // Space -> focus search input
      if (e.code === 'Space') {
        e.preventDefault();
        const searchInput = document.getElementById('watchlist-filter-input');
        if (searchInput) searchInput.focus();
      }
      
      // Delete -> Erase active cell drawings
      if (e.code === 'Delete') {
        e.preventDefault();
        if (confirm('Erase all drawings in the active focused chart slot?')) {
          setGridConfigs(prev => prev.map((cfg, i) => {
            if (i === activeGridIndex) {
              return { ...cfg, drawingsVersion: cfg.drawingsVersion + 1 };
            }
            return cfg;
          }));
          showToast('Erase command broadcast to active grid cell!', 'info');
        }
      }

      // Alt + T -> Toggle Trendline tool warning
      if (e.altKey && e.code === 'KeyT') {
        e.preventDefault();
        showToast('Trendline hotkey Alt+T pressed: Use drawing toolbar on chart left', 'info');
      }

      // Alt + F -> Toggle Fibonacci tool warning
      if (e.altKey && e.code === 'KeyF') {
        e.preventDefault();
        showToast('Fibonacci hotkey Alt+F pressed: Use drawing toolbar on chart left', 'info');
      }

      // Ctrl + Z -> Undo command warning
      if (e.ctrlKey && e.code === 'KeyZ') {
        e.preventDefault();
        showToast('Undo command Ctrl+Z pressed: drawings can be edited or deleted with eraser', 'info');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeGridIndex, showToast]);

  /* â”€â”€ Static tags filtering logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  type WatchlistSortOption = 'default' | 'nameAsc' | 'nameDesc' | 'priceDesc' | 'priceAsc' | 'changePctDesc' | 'changePctAsc' | 'changeAbsDesc' | 'changeAbsAsc';
  const [watchlistSort, setWatchlistSort] = useState<WatchlistSortOption>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [chartRange, setChartRange] = useState('1Y');
  const [chartMode, setChartMode] = useState<'price' | 'pe'>('price');
  const [terminalSearch, setTerminalSearch] = useState('');
  const [terminalSearchError, setTerminalSearchError] = useState('');
  const [terminalSearching, setTerminalSearching] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState<string>('all');
  const [tagPopoverSym, setTagPopoverSym] = useState<string | null>(null);
  const [apiFailed, setApiFailed] = useState(false);

  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState<string>('default');
  const [newWatchlistName, setNewWatchlistName] = useState<string>('');
  const [wlError, setWlError] = useState<string>('');

  const [customTagRaw, setCustomTagRaw] = useState<CustomTagRaw[]>(DEFAULT_CUSTOM_TAGS);
  const [editingTag, setEditingTag] = useState<CustomTagRaw | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const allTags = buildAllTags(customTagRaw);
  const tagMap = Object.fromEntries(allTags.map(t => [t.id, t]));
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSymbolInput, setAddSymbolInput] = useState('');
  const [addModalError, setAddModalError] = useState('');
  const [addModalLoading, setAddModalLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{symbol:string;name:string;exchange:string}[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [deepData, setDeepData] = useState<any>(null);
  const [gridDataCache, setGridDataCache] = useState<Record<number, any[]>>({});
  const [deepLoading, setDeepLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'technicals' | 'fundamentals' | 'profile' | 'proscons' | 'strategy'>('technicals');

  const [sidebarMode, setSidebarMode] = useState<'watchlist' | 'fundamentals'>('watchlist');
  const [sidebarSize, setSidebarSize] = useState<'normal' | 'wide'>('normal');
  const [sidebarActiveTab, setSidebarActiveTab] = useState<'overview' | 'dcf' | 'financials' | 'news' | 'backtest' | 'options'>('overview');
  const [dcfDiscountRate, setDcfDiscountRate] = useState<number>(10);
  const [dcfTerminalGrowth, setDcfTerminalGrowth] = useState<number>(4);
  const [financialTable, setFinancialTable] = useState<'qpl' | 'pl' | 'bs' | 'cf'>('qpl');

  const selectedStock = useMemo(() => {
    return watchlistStocks.find(s => s.symbol === selectedSymbol) || null;
  }, [watchlistStocks, selectedSymbol]);

  const impliedGrowth = useMemo(() => {
    if (!deepData || !deepData.ratios?.price || !deepData.ratios?.eps || deepData.ratios.eps <= 0) return 12.5;
    const { ratios } = deepData;
    const d = dcfDiscountRate / 100;
    const tg = dcfTerminalGrowth / 100;
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
  }, [deepData, dcfDiscountRate, dcfTerminalGrowth]);

  useEffect(() => {
    const sym = searchParams?.get('symbol');
    if (sym) selectSymbolRoot(sym);
  }, [searchParams, selectSymbolRoot]);

  const fetchWatchlists = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/watchlists`, {
        headers: getHeaders(false)
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlists(data);
      }
    } catch (err) {
      console.error('Failed to fetch watchlists:', err);
    }
  }, []);

  useEffect(() => {
    fetchWatchlists();
  }, [fetchWatchlists]);

  // Load Watchlist Data
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setWatchlistLoading(true);
        setApiFailed(false);

        const backendRes = await fetch(`${getApiUrl()}/stocks?watchlist=${encodeURIComponent(selectedWatchlist)}`, {
          headers: getHeaders(false)
        });
        if (!backendRes.ok) throw new Error();
        
        const backendStocks = (await backendRes.json()) as BackendStock[];
        const symbols = backendStocks.map((s: BackendStock) => s.symbol);

        if (symbols.length === 0) {
          if (active) {
            setWatchlistStocks([]);
            setWatchlistLoading(false);
          }
          return;
        }

        const liveRes = await fetch(`/api/watchlist?symbols=${encodeURIComponent(symbols.join(','))}`);
        if (!liveRes.ok) throw new Error();
        const liveData = await liveRes.json();

        if (active) {
          const mergedData = liveData.map((liveStock: LiveStock) => {
            const backendStock = backendStocks.find(
              (s: BackendStock) => s.symbol.toUpperCase() === liveStock.symbol.toUpperCase()
            );
            return {
              ...liveStock,
              name: backendStock ? backendStock.name : liveStock.name,
              isFavourite: backendStock ? !!backendStock.isFavourite : false,
              tags: backendStock?.tags ?? [],
              _id: backendStock ? backendStock._id : undefined
            };
          });

          setWatchlistStocks(mergedData);
          if (mergedData.length > 0) {
            // Only auto-select the first stock if no URL param symbol was provided
            if (!urlSymbolHonouredRef.current) {
              const def = mergedData.find((s: StockQuote) => s.symbol === selectedSymbol) || mergedData[0];
              selectSymbolRoot(def.symbol);
            }
            urlSymbolHonouredRef.current = true;
          }
        }
      } catch (err) {
        setApiFailed(true);
        try {
          // Use DEFAULT_SEEDS for real names; only fetch live data for first 10
          const seedStocks: StockQuote[] = DEFAULT_SEEDS.map(s => ({
            symbol: s.symbol, name: s.name,
            price: 0, change: 0, changePercent: 0, marketCap: 0, volume: 0,
            pe: 0, eps: 0, cmpBv: 0, divYield: 0, promHold: 0, profitGrowth: 0, salesGrowth: 0,
            isFavourite: false, tags: []
          }));
          setWatchlistStocks(seedStocks);
          const firstPage = DEFAULT_SEEDS.slice(0, 10).map(s => s.symbol);
          const res = await fetch(`/api/watchlist?symbols=${encodeURIComponent(firstPage.join(','))}`);
          if (res.ok) {
            const liveData = await res.json();
            setWatchlistStocks(prev => prev.map(s => {
              const live = liveData.find((l: LiveStock) => l.symbol.toUpperCase() === s.symbol.toUpperCase());
              return live ? { ...s, ...live, name: s.name, isFavourite: false, tags: [] } : s;
            }));
            if (!urlSymbolHonouredRef.current) {
              const def = seedStocks.find(s => s.symbol === selectedSymbol) || seedStocks[0];
              selectSymbolRoot(def.symbol);
            }
            urlSymbolHonouredRef.current = true;
          }
        } catch {}
      } finally {
        if (active) setWatchlistLoading(false);
      }
    })();
    return () => { active = false; };
  }, [selectedWatchlist, selectSymbolRoot]);

  // Load Custom Tags
  useEffect(() => {
    fetch('/api/custom-tags')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length) setCustomTagRaw(data); })
      .catch(() => {});
  }, []);

  const handleSaveCustomTag = async () => {
    if (!editingTag || !editLabel.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/custom-tags/${editingTag.tagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editLabel.trim(), color: editColor }),
      });
      if (res.ok) {
        const updated: CustomTagRaw = await res.json();
        setCustomTagRaw(prev => prev.map(t => t.tagId === updated.tagId ? updated : t));
      }
    } finally {
      setEditSaving(false);
      setEditingTag(null);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = addSymbolInput.trim().toUpperCase();
    if (!raw) return;
    const sym = raw.includes('.') ? raw : `${raw}.NS`;
    await submitAddStock(sym);
  };

  const submitAddStock = async (sym: string) => {
    if (watchlistStocks.some(s => s.symbol.toUpperCase() === sym.toUpperCase())) {
      setAddModalError(`${sym} is already in your watchlist.`);
      return;
    }
    try {
      setAddModalLoading(true);
      setAddModalError('');
      setShowSuggestions(false);
      const res = await fetch(`/api/watchlist?symbols=${encodeURIComponent(sym)}`);
      if (!res.ok) throw new Error('Ticker not found.');
      const data = await res.json();
      if (!data?.length) throw new Error('No quote returned.');
      const stock = data[0];

      let savedStock = { ...stock, isFavourite: false, tags: [] as string[] };
      if (!apiFailed) {
        try {
          const backendRes = await fetch(`${getApiUrl()}/stocks`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify({ symbol: stock.symbol, name: stock.name, isFavourite: false, watchlist: selectedWatchlist })
          });
          if (backendRes.ok) {
            const dbStock = await backendRes.json();
            savedStock = { ...stock, name: dbStock.name, isFavourite: !!dbStock.isFavourite, tags: dbStock.tags ?? [], _id: dbStock._id };
          }
        } catch {}
      }

      setWatchlistStocks(prev => [savedStock, ...prev]);
      selectSymbolRoot(savedStock.symbol);
      setAddSymbolInput('');
      setSuggestions([]);
      setShowAddModal(false);
    } catch (err: any) {
      setAddModalError(err.message || 'Search failed');
    } finally {
      setAddModalLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalSearch.trim()) return;
    const raw = terminalSearch.trim().toUpperCase();
    const sym = raw.includes('.') ? raw : `${raw}.NS`;
    if (sym === selectedSymbol) { setTerminalSearch(''); return; }
    try {
      setTerminalSearching(true);
      setTerminalSearchError('');
      
      const res = await fetch(`/api/watchlist?symbols=${encodeURIComponent(sym)}`);
      if (!res.ok) throw new Error('Ticker not found.');
      const data = await res.json();
      if (!data?.length) throw new Error('No quote returned.');
      const stock = data[0];

      let savedStock = { ...stock, isFavourite: false };
      if (!apiFailed) {
        try {
          const backendPostRes = await fetch(`${getApiUrl()}/stocks`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify({
              symbol: stock.symbol,
              name: stock.name,
              isFavourite: false,
              watchlist: selectedWatchlist
            })
          });
          if (backendPostRes.ok) {
            const dbStock = await backendPostRes.json();
            savedStock = {
              ...stock,
              name: dbStock.name,
              isFavourite: !!dbStock.isFavourite,
              _id: dbStock._id
            };
          }
        } catch {
          setTerminalSearchError('Database save failed, operating locally');
        }
      }

      selectSymbolRoot(savedStock.symbol);
      if (!watchlistStocks.some(s => s.symbol === savedStock.symbol)) {
        setWatchlistStocks(prev => [savedStock, ...prev]);
      }
      setTerminalSearch('');
    } catch (err: any) {
      setTerminalSearchError(err.message || 'Search failed');
    } finally {
      setTerminalSearching(false);
    }
  };

  const handleToggleTag = async (sym: string, tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const stock = watchlistStocks.find(s => s.symbol === sym);
    if (!stock) return;
    const current = stock.tags ?? [];
    const next = current.includes(tagId) ? [] : [tagId];
    setWatchlistStocks(prev => prev.map(s => s.symbol === sym ? { ...s, tags: next } : s));
    if (!apiFailed) {
      try {
        await fetch(`${getApiUrl()}/stocks/${encodeURIComponent(sym)}?watchlist=${encodeURIComponent(selectedWatchlist)}`, {
          method: 'PATCH',
          headers: getHeaders(true),
          body: JSON.stringify({ tags: next, watchlist: selectedWatchlist })
        });
      } catch {
        setWatchlistStocks(prev => prev.map(s => s.symbol === sym ? { ...s, tags: current } : s));
      }
    }
  };

  const handleToggleFavourite = async (symbolToToggle: string, currentFavStatus: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const nextFavStatus = !currentFavStatus;
      if (!apiFailed) {
        const res = await fetch(`${getApiUrl()}/stocks/${encodeURIComponent(symbolToToggle)}?watchlist=${encodeURIComponent(selectedWatchlist)}`, {
          method: 'PATCH',
          headers: getHeaders(true),
          body: JSON.stringify({ isFavourite: nextFavStatus, watchlist: selectedWatchlist })
        });
        if (!res.ok) throw new Error();
      }
      setWatchlistStocks(prev => prev.map(s => {
        if (s.symbol.toUpperCase() === symbolToToggle.toUpperCase()) {
          return { ...s, isFavourite: nextFavStatus };
        }
        return s;
      }));
    } catch {
      showToast('Failed to update favorite status', 'error');
    }
  };

  const handleDeleteStock = async (symbolToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${symbolToDelete.split('.')[0]} from this watchlist?`)) return;
    try {
      if (!apiFailed) {
        const res = await fetch(`${getApiUrl()}/stocks/${encodeURIComponent(symbolToDelete)}?watchlist=${encodeURIComponent(selectedWatchlist)}`, {
          method: 'DELETE',
          headers: getHeaders(false)
        });
        if (!res.ok) throw new Error();
      }
      const nextWatchlist = watchlistStocks.filter(s => s.symbol.toUpperCase() !== symbolToDelete.toUpperCase());
      setWatchlistStocks(nextWatchlist);

      if (selectedSymbol.toUpperCase() === symbolToDelete.toUpperCase()) {
        if (nextWatchlist.length > 0) {
          selectSymbolRoot(nextWatchlist[0].symbol);
        } else {
          selectSymbolRoot('');
        }
      }
      showToast(`${symbolToDelete.split('.')[0]} deleted from active workspace`, 'info');
    } catch {
      showToast('Failed to delete stock from database', 'error');
    }
  };

  // Load Deep Corporate Filings
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

  // Watchlist CRUD callbacks for WatchlistSidebar
  const handleCreateWatchlist = useCallback(async (name: string): Promise<{ ok: boolean; error?: string }> => {
    const clean = name.trim();
    if (!clean) return { ok: false, error: 'Name required' };
    try {
      const res = await fetch(`${getApiUrl()}/watchlists`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ name: clean })
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlists(prev => [...prev, data]);
        setSelectedWatchlist(data.name);
        showToast(`Watchlist "${data.name}" created`, 'success');
        return { ok: true };
      }
      const err = await res.json().catch(() => null);
      return { ok: false, error: err?.error || 'Failed to create' };
    } catch { return { ok: false, error: 'Network error' }; }
  }, [showToast]);

  const handleRenameWatchlist = useCallback(async (oldName: string, newName: string): Promise<{ ok: boolean; error?: string }> => {
    const clean = newName.trim();
    if (!clean) return { ok: false, error: 'Name required' };
    try {
      const res = await fetch(`${getApiUrl()}/watchlists/${encodeURIComponent(oldName)}`, {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify({ name: clean })
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlists(prev => prev.map(w => w.name === oldName ? { ...w, name: data.name } : w));
        if (selectedWatchlist === oldName) setSelectedWatchlist(data.name);
        showToast(`Renamed to "${data.name}"`, 'success');
        return { ok: true };
      }
      const err = await res.json().catch(() => null);
      return { ok: false, error: err?.error || 'Failed to rename' };
    } catch { return { ok: false, error: 'Network error' }; }
  }, [selectedWatchlist, showToast]);

  const handleDeleteWatchlist = useCallback(async (name: string): Promise<boolean> => {
    try {
      const res = await fetch(`${getApiUrl()}/watchlists/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: getHeaders(false)
      });
      if (res.ok) {
        setWatchlists(prev => prev.filter(w => w.name !== name));
        if (selectedWatchlist === name) setSelectedWatchlist('default');
        showToast(`Watchlist "${name}" deleted`, 'info');
        return true;
      }
    } catch {}
    return false;
  }, [selectedWatchlist, showToast]);

  const handleAddStockSidebar = useCallback(async (sym: string): Promise<{ ok: boolean; error?: string }> => {
    if (watchlistStocks.some(s => s.symbol.toUpperCase() === sym.toUpperCase())) {
      return { ok: false, error: 'Stock already in watchlist' };
    }
    try {
      const res = await fetch(`/api/watchlist?symbols=${encodeURIComponent(sym)}`);
      if (!res.ok) return { ok: false, error: 'Ticker not found' };
      const data = await res.json();
      if (!data?.length) return { ok: false, error: 'No quote returned' };
      const stock = data[0];
      let savedStock = { ...stock, isFavourite: false, tags: [] as string[] };
      if (!apiFailed) {
        try {
          const backendRes = await fetch(`${getApiUrl()}/stocks`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify({ symbol: stock.symbol, name: stock.name, isFavourite: false, watchlist: selectedWatchlist })
          });
          if (backendRes.ok) {
            const dbStock = await backendRes.json();
            savedStock = { ...stock, name: dbStock.name, isFavourite: !!dbStock.isFavourite, tags: dbStock.tags ?? [], _id: dbStock._id };
          } else if (backendRes.status === 409) {
            return { ok: false, error: 'Stock already in watchlist' };
          }
        } catch {}
      }
      setWatchlistStocks(prev => [savedStock, ...prev]);
      selectSymbolRoot(savedStock.symbol);
      showToast(`${sym.split('.')[0]} added`, 'success');
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Failed to add' };
    }
  }, [watchlistStocks, apiFailed, selectedWatchlist, selectSymbolRoot, showToast]);

  const handleRemoveStockSidebar = useCallback(async (symbol: string): Promise<boolean> => {
    try {
      if (!apiFailed) {
        const res = await fetch(`${getApiUrl()}/stocks/${encodeURIComponent(symbol)}?watchlist=${encodeURIComponent(selectedWatchlist)}`, {
          method: 'DELETE',
          headers: getHeaders(false)
        });
        if (!res.ok) throw new Error();
      }
      const next = watchlistStocks.filter(s => s.symbol.toUpperCase() !== symbol.toUpperCase());
      setWatchlistStocks(next);
      if (selectedSymbol.toUpperCase() === symbol.toUpperCase()) {
        selectSymbolRoot(next.length > 0 ? next[0].symbol : '');
      }
      showToast(`${symbol.split('.')[0]} removed`, 'info');
      return true;
    } catch {
      showToast('Failed to remove stock', 'error');
      return false;
    }
  }, [apiFailed, selectedWatchlist, watchlistStocks, selectedSymbol, selectSymbolRoot, showToast]);

  const handleToggleTagSidebar = useCallback(async (sym: string, tagId: string) => {
    const stock = watchlistStocks.find(s => s.symbol === sym);
    if (!stock) return;
    const current = stock.tags ?? [];
    const next = current.includes(tagId) ? current.filter(t => t !== tagId) : [...current, tagId];
    setWatchlistStocks(prev => prev.map(s => s.symbol === sym ? { ...s, tags: next } : s));
    if (!apiFailed) {
      try {
        await fetch(`${getApiUrl()}/stocks/${encodeURIComponent(sym)}?watchlist=${encodeURIComponent(selectedWatchlist)}`, {
          method: 'PATCH',
          headers: getHeaders(true),
          body: JSON.stringify({ tags: next, watchlist: selectedWatchlist })
        });
      } catch {
        setWatchlistStocks(prev => prev.map(s => s.symbol === sym ? { ...s, tags: current } : s));
      }
    }
  }, [watchlistStocks, apiFailed, selectedWatchlist]);

  const [sidebarSuggestions, setSidebarSuggestions] = useState<{symbol:string;name:string;exchange:string}[]>([]);
  const [sidebarSuggestLoading, setSidebarSuggestLoading] = useState(false);
  const sidebarSuggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSidebarSuggestions = useCallback((query: string) => {
    if (sidebarSuggestTimer.current) clearTimeout(sidebarSuggestTimer.current);
    if (!query.trim()) { setSidebarSuggestions([]); return; }
    setSidebarSuggestLoading(true);
    sidebarSuggestTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) setSidebarSuggestions(await res.json());
      } catch { setSidebarSuggestions([]); }
      finally { setSidebarSuggestLoading(false); }
    }, 300);
  }, []);

  const clearSidebarSuggestions = useCallback(() => {
    setSidebarSuggestions([]);
    if (sidebarSuggestTimer.current) clearTimeout(sidebarSuggestTimer.current);
  }, []);

  const filteredWatchlist = useMemo(() => {
    let filtered = watchlistStocks.filter(s => {
      const matchesSearch = s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = activeTagFilter === 'all' ? true : (s.tags ?? []).includes(activeTagFilter);
      return matchesSearch && matchesTag;
    });

    if (watchlistSort !== 'default') {
      filtered = [...filtered].sort((a, b) => {
        switch (watchlistSort) {
          case 'nameAsc': return a.name.localeCompare(b.name);
          case 'nameDesc': return b.name.localeCompare(a.name);
          case 'priceDesc': return (b.price || 0) - (a.price || 0);
          case 'priceAsc': return (a.price || 0) - (b.price || 0);
          case 'changePctDesc': return (b.changePercent || 0) - (a.changePercent || 0);
          case 'changePctAsc': return (a.changePercent || 0) - (b.changePercent || 0);
          case 'changeAbsDesc': return (b.change || 0) - (a.change || 0);
          case 'changeAbsAsc': return (a.change || 0) - (b.change || 0);
          default: return 0;
        }
      });
    }

    return filtered;
  }, [watchlistStocks, searchQuery, activeTagFilter, watchlistSort]);

  // Load theme config
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = savedTheme || (isSystemDark ? 'dark' : 'light');
    setTheme(currentTheme);
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
  };

  return (
    <div suppressHydrationWarning className="min-h-dvh lg:h-dvh lg:overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans" onClick={() => setTagPopoverSym(null)}>
      <Navigation />

      {/* â”€â”€ Main Viewport Panel Grid & Drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 lg:overflow-hidden min-h-0 relative">
        
        {/* Mobile View Toggle Tabs */}
        <div className="lg:hidden flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0 p-2 gap-2">
          <button 
            onClick={() => setMobileViewTab('chart')} 
            className={`flex-1 py-2 text-[11px] font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${mobileViewTab === 'chart' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 border border-transparent'}`}
          >
            <Activity className="w-3.5 h-3.5" /> Chart View
          </button>
          <button 
            onClick={() => setMobileViewTab('list')} 
            className={`flex-1 py-2 text-[11px] font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${mobileViewTab === 'list' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 border border-transparent'}`}
          >
            <Grid className="w-3.5 h-3.5" /> List View
          </button>
        </div>

        {/* LEFT VIEWPORT CANVAS & bottom docking drawer */}
        <section className={`lg:col-span-9 flex-col lg:min-h-0 lg:overflow-y-auto bg-slate-50 dark:bg-slate-900/40 ${mobileViewTab === 'chart' ? 'flex flex-1 min-h-0' : 'hidden lg:flex'}`}>
          
          {/* Cockpit State Synchroniser Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850 shrink-0 select-none z-30 shadow-sm">
            
            {/* Grid Layout Canvas Selection Buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1.5 flex items-center gap-1">
                <Grid className="w-3.5 h-3.5" /> Grid:
              </span>
              {[1, 2, 4, 6, 8].map(slots => (
                <button
                  key={slots}
                  onClick={() => {
                    setGridLayout(slots as any);
                    setActiveGridIndex(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-tight border transition-all ${
                    gridLayout === slots
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-455 shadow-sm font-black'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-350 dark:hover:border-slate-750'
                  }`}
                >
                  {slots === 1 ? '1 Screen' : `${slots} Charts`}
                </button>
              ))}
            </div>

            {/* Sync Variables Checkboxes */}
            <div className="flex items-center gap-3.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Sync Cockpit:
              </span>
              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={syncSymbol} onChange={e => setSyncSymbol(e.target.checked)} className="rounded border-slate-300 dark:border-slate-700 text-blue-500 accent-blue-500" />
                  Symbol
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={syncTimeframe} onChange={e => setSyncTimeframe(e.target.checked)} className="rounded border-slate-300 dark:border-slate-700 text-blue-500 accent-blue-500" />
                  Timeframe
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={syncStyle} onChange={e => setSyncStyle(e.target.checked)} className="rounded border-slate-300 dark:border-slate-700 text-blue-500 accent-blue-500" />
                  Style
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={syncDrawings} onChange={e => setSyncDrawings(e.target.checked)} className="rounded border-slate-300 dark:border-slate-700 text-blue-500 accent-blue-500" />
                  Drawings
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={syncIndicators} onChange={e => setSyncIndicators(e.target.checked)} className="rounded border-slate-300 dark:border-slate-700 text-blue-500 accent-blue-500" />
                  Plots
                </label>
              </div>
            </div>

            {/* Cloud Workspace Templates Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplatesDropdown(prev => !prev)}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-xl text-[10px] font-black transition-all"
              >
                <Save className="w-3.5 h-3.5 text-indigo-500" /> Layout Templates <ChevronDown className="w-3 h-3" />
              </button>
              {showTemplatesDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-3 z-50 animate-fade-in">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Cloud Save Workspace</p>
                  <form onSubmit={handleSaveWorkspaceLayout} className="flex gap-1.5 mb-3">
                    <input
                      type="text"
                      placeholder="Template name..."
                      value={newTemplateName}
                      onChange={e => setNewTemplateName(e.target.value)}
                      className="flex-1 px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500/40 rounded-lg text-[10px] font-semibold focus:outline-none"
                    />
                    <button type="submit" className="px-2.5 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold">Save</button>
                  </form>
                  <div className="w-full h-[1px] bg-slate-100 dark:bg-slate-800/80 my-2" />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Load Saved Template</p>
                  {savedTemplates.length === 0 ? (
                    <span className="text-[9px] text-slate-400 block text-center py-2">No templates saved in cloud.</span>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {savedTemplates.map(tmpl => (
                        <div
                          key={tmpl._id}
                          onClick={() => handleLoadWorkspaceLayout(tmpl)}
                          className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-55 dark:hover:bg-slate-800/80 rounded-lg cursor-pointer transition-colors"
                        >
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{tmpl.name}</span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteWorkspaceLayout(tmpl.name, e)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-0.5 rounded"
                          >
                            âœ•
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Grid Canvas Area */}
          <div className="h-[480px] lg:h-[800px] shrink-0 relative">
            <div className={`grid gap-2 p-2 w-full h-full bg-slate-100 dark:bg-slate-900/60 ${
              gridLayout === 1 ? 'grid-cols-1 grid-rows-1' :
              gridLayout === 2 ? 'grid-cols-1 md:grid-cols-2 grid-rows-1' :
              gridLayout === 4 ? 'grid-cols-2 grid-rows-2' :
              gridLayout === 6 ? 'grid-cols-2 md:grid-cols-3 grid-rows-2' :
              'grid-cols-2 md:grid-cols-4 grid-rows-2'
            }`}>
              {Array.from({ length: gridLayout }).map((_, idx) => {
                const config = gridConfigs[idx];
                if (!config) return null;
                const isActive = idx === activeGridIndex;
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveGridIndex(idx)}
                    className={`relative flex flex-col bg-white dark:bg-slate-950 rounded-xl overflow-hidden border-2 transition-all min-h-[220px] ${
                      isActive 
                        ? 'border-blue-500 shadow-md ring-1 ring-blue-500/20' 
                        : 'border-slate-205 dark:border-slate-850 hover:border-slate-350 dark:hover:border-slate-750'
                    }`}
                  >
                    {/* Top slot indicator strip */}
                    <div className="flex items-center justify-between px-3 py-1 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10px] select-none font-bold shrink-0 z-20">
                      <span className="text-slate-750 dark:text-slate-300 flex items-center gap-1.5 font-bold uppercase tracking-tight">
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'}`} />
                        {config.symbol.replace('.NS', '')} ({config.interval})
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-slate-400">
                        <span>SLOT #{idx + 1}</span>
                      </div>
                    </div>

                    {/* Advanced Chart Component */}
                    <div className="flex-1 min-h-0 relative">
                      <AdvancedChart
                        symbol={config.symbol}
                        chartRange={chartRange}
                        onRangeChange={setChartRange}
                        chartMode={chartMode}
                        onModeChange={setChartMode}
                        theme={theme}
                        controlledInterval={config.interval}
                        onIntervalChange={(newI) => handleGridConfigChange(idx, 'interval', newI)}
                        controlledStyle={config.style}
                        onStyleChange={(newS) => handleGridConfigChange(idx, 'style', newS)}
                        controlledIndicators={config.indicators}
                        onIndicatorsChange={(newInds) => handleGridConfigChange(idx, 'indicators', newInds)}
                        drawingsVersion={config.drawingsVersion}
                        onDrawingsChange={() => handleGridDrawingsChange(idx)}
                        markers={config.markers}
                        onDataLoaded={(pts) => setGridDataCache(prev => ({ ...prev, [idx]: pts }))}
                        companyName={watchlistStocks.find(s => s.symbol.toUpperCase() === config.symbol.toUpperCase())?.name}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Market Intelligence Section */}
          {selectedStock && (
            <div className="shrink-0 p-6 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-850 shadow-inner mt-4">
              <div className="max-w-7xl mx-auto">
                <AIMarketIntelligence 
                  data={{
                    ratios: {
                      symbol: selectedStock.symbol,
                      price: livePrices[selectedSymbol] || selectedStock.price || 500,
                      ...(deepData?.ratios || {})
                    },
                    profile: deepData?.profile || {},
                    balanceSheet: deepData?.balanceSheet || [],
                    profitLoss: deepData?.profitLoss || [],
                    cashFlow: deepData?.cashFlow || [],
                    quarterlyProfitLoss: deepData?.quarterlyProfitLoss || [],
                    chartData: gridDataCache[activeGridIndex]?.length > 0 ? gridDataCache[activeGridIndex] : (deepData?.chartData || []),
                    peers: deepData?.peers || [],
                    pros: deepData?.pros || [],
                    cons: deepData?.cons || []
                  }}
                  livePrice={livePrices[selectedSymbol] || selectedStock.price || 500} 
                  isLoading={deepLoading}
                />
              </div>
            </div>
          )}

        </section>

        {/* RIGHT WATCHLIST & FUNDAMENTALS SIDEBAR PANEL */}
        <section className={`lg:col-span-3 bg-white dark:bg-slate-950 flex-col overflow-hidden lg:max-h-none lg:min-h-0 safe-bottom border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-850 shadow-xl transition-all duration-300 ${mobileViewTab === 'list' ? 'flex flex-1 min-h-0 max-h-none' : 'hidden lg:flex'}`}>
          
          {/* Sidebar Mode Panel tabs */}
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSidebarMode('watchlist')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                  sidebarMode === 'watchlist'
                    ? 'bg-blue-500/10 text-blue-655 dark:text-blue-400 border border-blue-500/20'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 border border-transparent'
                }`}
              >
                📋 Watchlist
              </button>
              <button
                type="button"
                onClick={() => setSidebarMode('fundamentals')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                  sidebarMode === 'fundamentals'
                    ? 'bg-blue-500/10 text-blue-655 dark:text-blue-400 border border-blue-500/20'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 border border-transparent'
                }`}
              >
                🏛️ Fundamentals
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSidebarSize(sidebarSize === 'wide' ? 'normal' : 'wide')}
              className="hidden lg:flex px-2 py-1 text-[9px] font-extrabold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-905 border border-slate-200 dark:border-slate-800 rounded-lg items-center gap-1 transition-all"
            >
              <span>{sidebarSize === 'wide' ? 'Narrow ➔' : '« Wide'}</span>
            </button>
          </div>

          {/* Render Watchlist panel content */}
          {sidebarMode === 'watchlist' ? (
            <WatchlistSidebar
              watchlists={watchlists}
              selectedWatchlist={selectedWatchlist}
              onSelectWatchlist={(name) => { setSelectedWatchlist(name); setActiveTagFilter('all'); }}
              onCreateWatchlist={handleCreateWatchlist}
              onRenameWatchlist={handleRenameWatchlist}
              onDeleteWatchlist={handleDeleteWatchlist}
              watchlistStocks={watchlistStocks}
              filteredWatchlist={filteredWatchlist}
              watchlistLoading={watchlistLoading}
              livePrices={livePrices}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeTagFilter={activeTagFilter}
              onSetTagFilter={setActiveTagFilter}
              watchlistSort={watchlistSort}
              onSortChange={setWatchlistSort}
              selectedSymbol={selectedSymbol}
              onSelectSymbol={selectSymbolRoot}
              onAddStock={handleAddStockSidebar}
              onRemoveStock={handleRemoveStockSidebar}
              onToggleTag={handleToggleTagSidebar}
              suggestions={sidebarSuggestions}
              suggestLoading={sidebarSuggestLoading}
              onFetchSuggestions={fetchSidebarSuggestions}
              onClearSuggestions={clearSidebarSuggestions}
              customTagRaw={customTagRaw}
              onEditCustomTag={(tag) => { setEditingTag(tag); setEditLabel(tag.label); setEditColor(tag.color); }}
              showToast={showToast}
              onMobileSwitchToChart={() => setMobileViewTab('chart')}
            />
          ) : (
            
            // FUNDAMENTALS PANEL (One-stop research station)
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-slate-950">
              {deepLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-550 block animate-pulse">
                    Retrieving Core Financial Filings...
                  </span>
                </div>
              ) : !selectedStock ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mb-2.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-550 block">No Stock Selected</span>
                </div>
              ) : (
                <>
                  <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between shrink-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white">{selectedStock.symbol.split('.')[0]}</span>
                        <span className="text-[9px] text-slate-400 font-extrabold">{selectedStock.symbol.split('.')[1]}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 truncate max-w-[150px] font-semibold mt-0.5">{selectedStock.name}</p>
                    </div>
                    <Link
                      href={`/watchlist/${encodeURIComponent(selectedStock.symbol)}`}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[9px] font-black uppercase tracking-wide rounded-lg shadow-sm transition-all hover:scale-105"
                    >
                      Full Report <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                  </div>

                  {/* Sub-tab selection row */}
                  <div className="flex items-center border-b border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-950 px-2 py-1 shrink-0 overflow-x-auto scrollbar-none gap-0.5">
                    {[
                      { id: 'overview', label: '🏛️ Overview' },
                      { id: 'dcf', label: '🎯 DCF Target' },
                      { id: 'financials', label: '📋 Statement Tables' },
                      { id: 'news', label: '📰 News & Peers' },
                      { id: 'backtest', label: '🧪 Strategy Backtest' },
                      { id: 'options', label: '🎭 Options Strategist' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSidebarActiveTab(tab.id as any)}
                        className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all shrink-0 ${
                          sidebarActiveTab === tab.id
                            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-blue-500/20 shadow-sm'
                            : 'text-slate-550 hover:text-slate-800 dark:hover:text-slate-300'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Statements content */}
                  {sidebarActiveTab === 'overview' && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 text-[10px] font-bold">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/80">
                          <span className="text-slate-400 font-extrabold uppercase block tracking-wider text-[8px] mb-0.5">Sector</span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 block truncate">{deepData?.profile?.sector || 'â€”'}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/80">
                          <span className="text-slate-400 font-extrabold uppercase block tracking-wider text-[8px] mb-0.5">Industry</span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 block truncate">{deepData?.profile?.industry || 'â€”'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/80">
                          <span className="text-slate-400 font-extrabold uppercase block tracking-wider text-[8px] mb-0.5">P/E Ratio</span>
                          <span className="font-extrabold text-slate-850 dark:text-slate-205 block font-mono">{selectedStock.pe > 0 ? selectedStock.pe.toFixed(1) : 'â€”'}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/80">
                          <span className="text-slate-400 font-extrabold uppercase block tracking-wider text-[8px] mb-0.5">ROE</span>
                          <span className="font-extrabold text-slate-850 dark:text-slate-205 block font-mono">{deepData?.ratios?.roe ? `${deepData.ratios.roe.toFixed(1)}%` : 'â€”'}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/80">
                          <span className="text-slate-400 font-extrabold uppercase block tracking-wider text-[8px] mb-0.5">Debt/Equity</span>
                          <span className="font-extrabold text-slate-850 dark:text-slate-205 block font-mono">{deepData?.ratios?.debtToEquity !== undefined ? (deepData.ratios.debtToEquity / 100).toFixed(2) : 'â€”'}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/80">
                          <span className="text-slate-400 font-extrabold uppercase block tracking-wider text-[8px] mb-0.5">Div Yield</span>
                          <span className="font-extrabold text-slate-850 dark:text-slate-205 block font-mono">{selectedStock.divYield > 0 ? `${selectedStock.divYield.toFixed(2)}%` : '0.00%'}</span>
                        </div>
                      </div>

                      {deepData?.ratios?.fiftyTwoWeekHigh && deepData?.ratios?.fiftyTwoWeekLow && (
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-150 dark:border-slate-800/80">
                          <div className="flex justify-between items-center text-[8px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">
                            <span>52-Week Range</span>
                            <span className="font-mono">â‚¹{deepData.ratios.fiftyTwoWeekLow.toFixed(0)} - â‚¹{deepData.ratios.fiftyTwoWeekHigh.toFixed(0)}</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
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
                        </div>
                      )}
                    </div>
                  )}

                  {sidebarActiveTab === 'dcf' && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 text-[10px] font-bold">
                      <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800/80 text-center">
                        <span className="text-slate-400 font-black uppercase block tracking-widest text-[8px] mb-1.5">IMPLIED COMPASS CAGR</span>
                        <span className="text-2xl font-black text-blue-600 dark:text-blue-400 block tracking-tight font-mono">
                          {impliedGrowth !== undefined ? `${impliedGrowth.toFixed(2)}%` : 'â€”'}
                        </span>
                        <p className="text-[9px] text-slate-400 mt-2 leading-relaxed font-semibold">
                          To justify spot price <span className="font-extrabold font-mono">â‚¹{selectedStock.price}</span>, this enterprise must compound EPS at <span className="font-extrabold text-blue-600 dark:text-blue-400 font-mono">{impliedGrowth.toFixed(2)}%</span> annually.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between uppercase">
                          <span className="text-slate-400">Discount Rate</span>
                          <span className="text-blue-600 dark:text-blue-400 font-mono">{dcfDiscountRate}%</span>
                        </div>
                        <input
                          type="range" min="6" max="20" step="0.5"
                          value={dcfDiscountRate}
                          onChange={(e) => setDcfDiscountRate(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 dark:bg-slate-850 rounded-lg appearance-none accent-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {sidebarActiveTab === 'financials' && (
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
                      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-150 dark:border-slate-900 bg-white dark:bg-slate-950 shrink-0">
                        {[
                          { id: 'qpl', label: 'Quarterly' },
                          { id: 'pl', label: 'YoY P&L' },
                          { id: 'bs', label: 'Balance Sheet' }
                        ].map(tableTab => (
                          <button
                            key={tableTab.id}
                            type="button"
                            onClick={() => setFinancialTable(tableTab.id as any)}
                            className={`px-2 py-0.5 text-[9px] font-extrabold rounded transition-all ${
                              financialTable === tableTab.id
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-black'
                                : 'text-slate-400 hover:text-slate-700'
                            }`}
                          >
                            {tableTab.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex-1 overflow-auto p-3 text-[9px]">
                        {(() => {
                          if (financialTable === 'qpl') {
                            const rows = deepData?.quarterlyProfitLoss || [];
                            if (!rows.length) return <div className="text-center py-4 font-semibold text-slate-400">No quarterly records.</div>;
                            return (
                              <table className="w-full text-left whitespace-nowrap">
                                <thead>
                                  <tr className="border-b border-slate-205 dark:border-slate-800 text-slate-400 font-black">
                                    <th className="py-1 px-2">Quarter</th>
                                    <th className="py-1 px-2 text-right">Revenue</th>
                                    <th className="py-1 px-2 text-right">Net Profit</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-900 font-bold font-mono">
                                  {rows.map((r: QuarterlyItem, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-100 dark:hover:bg-slate-900/50">
                                      <td className="py-1.5 px-2 font-bold font-sans text-slate-700 dark:text-slate-350">{r.date}</td>
                                      <td className="py-1.5 px-2 text-right">â‚¹{(r.revenue / 10000000).toFixed(1)}Cr</td>
                                      <td className="py-1.5 px-2 text-right text-emerald-600">â‚¹{(r.netIncome / 10000000).toFixed(1)}Cr</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            );
                          }
                          if (financialTable === 'pl') {
                            const rows = deepData?.profitLoss || [];
                            if (!rows.length) return <div className="text-center py-4 font-semibold text-slate-400">No annual filings.</div>;
                            return (
                              <table className="w-full text-left whitespace-nowrap">
                                <thead>
                                  <tr className="border-b border-slate-205 dark:border-slate-800 text-slate-400 font-black">
                                    <th className="py-1 px-2">Year</th>
                                    <th className="py-1 px-2 text-right">Revenue</th>
                                    <th className="py-1 px-2 text-right">Net Profit</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-900/50 font-bold font-mono">
                                  {rows.map((r: ProfitLossItem, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-100 dark:hover:bg-slate-900/50">
                                      <td className="py-1.5 px-2 font-bold font-sans text-slate-700 dark:text-slate-350">{r.date}</td>
                                      <td className="py-1.5 px-2 text-right">â‚¹{(r.revenue / 10000000).toFixed(1)}Cr</td>
                                      <td className="py-1.5 px-2 text-right text-emerald-600">â‚¹{(r.netIncome / 10000000).toFixed(1)}Cr</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            );
                          }
                          if (financialTable === 'bs') {
                            const rows = deepData?.balanceSheet || [];
                            if (!rows.length) return <div className="text-center py-4 font-semibold text-slate-400">No balance sheets.</div>;
                            return (
                              <table className="w-full text-left whitespace-nowrap">
                                <thead>
                                  <tr className="border-b border-slate-205 dark:border-slate-800 text-slate-400 font-black">
                                    <th className="py-1 px-2">Year</th>
                                    <th className="py-1 px-2 text-right">Assets</th>
                                    <th className="py-1 px-2 text-right">Equity</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-900/50 font-bold font-mono">
                                  {rows.map((r: BalanceSheetItem, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-100 dark:hover:bg-slate-900/50">
                                      <td className="py-1.5 px-2 font-bold font-sans text-slate-700 dark:text-slate-350">{r.date}</td>
                                      <td className="py-1.5 px-2 text-right">â‚¹{(r.totalAssets / 10000000).toFixed(1)}Cr</td>
                                      <td className="py-1.5 px-2 text-right text-indigo-500">â‚¹{(r.equity / 10000000).toFixed(1)}Cr</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  )}

                  {sidebarActiveTab === 'news' && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 text-[10px]">
                      <div>
                        <span className="text-[8px] font-black text-slate-455 uppercase block mb-1.5">Comparable Competitors</span>
                        <div className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-slate-900/60 font-bold">
                          {deepData?.peers?.slice(0, 3).map((p: PeerItem) => (
                            <div key={p.symbol} className="py-1.5 flex items-center justify-between gap-2">
                              <div>
                                <span className="text-slate-800 dark:text-slate-100 block">{p.symbol.replace('.NS','')}</span>
                              </div>
                              <div className="text-right font-mono">
                                <span className="block text-slate-700 dark:text-slate-350">â‚¹{p.price.toFixed(0)}</span>
                                <span className="text-[7.5px] text-slate-400 block">P/E: {p.pe > 0 ? p.pe.toFixed(1) : 'â€”'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {sidebarActiveTab === 'backtest' && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                      <Backtester 
                        chartData={deepData?.chartData || []} 
                        theme={theme}
                        symbol={selectedSymbol}
                      />
                    </div>
                  )}
                  {sidebarActiveTab === 'options' && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-slate-950">
                      <OptionsStrategyBuilder 
                        spotPrice={selectedStock?.price || 18200}
                        theme={theme}
                        symbol={selectedSymbol}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      </main>

      {/* â”€â”€ Active Alerts Sidebar slider drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showAlertsSidebar && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-slide-left p-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-2 mb-4 shrink-0 select-none">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-rose-500" /> Active Alert Triggers
            </span>
            <button
              onClick={() => setShowAlertsSidebar(false)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-450 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Builder form */}
          <form onSubmit={handleCreateAlert} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-sm flex flex-col gap-3 shrink-0">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-455">Add Crossing Trigger</div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-extrabold select-none">
              <div>
                <label className="text-[9px] text-slate-450 block mb-1">Stock Ticker</label>
                <span className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg block font-sans truncate">{selectedSymbol.split('.')[0]}</span>
              </div>
              <div>
                <label className="text-[9px] text-slate-450 block mb-1">Trigger Condition</label>
                <select
                  value={newAlertCondition}
                  onChange={e => setNewAlertCondition(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-750 rounded-lg font-bold"
                >
                  <option value="price_above">Price Above (&gt;=)</option>
                  <option value="price_below">Price Below (&lt;=)</option>
                  <option value="price_crosses">Price Crosses</option>
                  <option value="volume_spike">Volume Spike</option>
                  <option value="rsi_above">RSI Above</option>
                  <option value="rsi_below">RSI Below</option>
                </select>
              </div>
            </div>
            <div className="text-[10px] font-bold">
              <label className="text-[9px] text-slate-455 block mb-1">Target Value</label>
              <input
                type="number"
                step="0.05"
                placeholder="Target value..."
                value={newAlertValue}
                onChange={e => setNewAlertValue(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-805 rounded-lg font-bold"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-rose-550 hover:bg-rose-650 text-white rounded-xl text-xs font-black uppercase shadow-md transition-all cursor-pointer"
            >
              CREATE TRIGGER ALERT
            </button>
          </form>

          <div className="w-full h-[1px] bg-slate-100 dark:bg-slate-850 my-4 shrink-0" />

          {/* Alerts active list scrollable */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0 text-[10px]">
            {alertsList.filter(a => !a.isTriggered).length === 0 ? (
              <span className="text-slate-400 block text-center py-8 font-semibold">No active trigger bounds. Add one above!</span>
            ) : (
              alertsList.filter(a => !a.isTriggered).map(alert => (
                <div
                  key={alert._id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 p-3 rounded-xl shadow-sm flex items-center justify-between gap-3 group"
                >
                  <div>
                    <span className="font-extrabold text-slate-800 dark:text-slate-150 block">{alert.symbol.replace('.NS','')}</span>
                    <span className="text-[8.5px] text-slate-450 block font-bold font-mono mt-0.5">
                      {alert.condition === 'price_above' ? 'Crossing Above' : alert.condition === 'price_below' ? 'Crossing Below' : alert.condition === 'volume_spike' ? 'Volume Spike' : alert.condition === 'rsi_above' ? 'RSI Above' : alert.condition === 'rsi_below' ? 'RSI Below' : 'Crossing Target'} @ {alert.value.toFixed(2)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAlert(alert._id)}
                    className="p-1 hover:bg-rose-500/10 hover:text-red-500 text-slate-400 rounded-lg transition-colors cursor-pointer"
                    title="Delete trigger alert"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* â”€â”€ Add Stock modal dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-extrabold text-white mb-1">Add Ticker Workspace Watchlist</h2>
            <p className="text-[10px] text-slate-500 mb-4 font-semibold">Type a corporate name or exchange ticker</p>
            <form onSubmit={handleAddStock} className="flex flex-col gap-3">
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Infosys, TATAMOTORS, HDFCBANK"
                  value={addSymbolInput}
                  onChange={e => {
                    const val = e.target.value;
                    setAddSymbolInput(val);
                    setAddModalError('');
                    if (suggestTimer.current) clearTimeout(suggestTimer.current);
                    if (val.trim().length < 1) { setSuggestions([]); setShowSuggestions(false); return; }
                    suggestTimer.current = setTimeout(async () => {
                      setSuggestLoading(true);
                      try {
                        const r = await fetch(`/api/search?q=${encodeURIComponent(val.trim())}`);
                        const data = await r.json();
                        setSuggestions(data);
                        setShowSuggestions(true);
                      } catch { setSuggestions([]); }
                      finally { setSuggestLoading(false); }
                    }, 300);
                  }}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 focus:border-blue-500/50 rounded-xl text-xs font-semibold text-slate-100 placeholder:text-slate-600 focus:outline-none transition-all pr-8"
                />
                {suggestLoading && (
                  <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-400 animate-spin" />
                )}

                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-10 shadow-xl max-h-52 overflow-y-auto">
                    {suggestions.map(s => (
                      <li
                        key={s.symbol}
                        onMouseDown={e => { e.preventDefault(); setAddSymbolInput(s.symbol); setSuggestions([]); setShowSuggestions(false); submitAddStock(s.symbol); }}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-700 cursor-pointer transition-colors group"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-extrabold text-white block">{s.symbol}</span>
                          <span className="text-[10px] text-slate-400 truncate block font-bold">{s.name}</span>
                        </div>
                        <span className="text-[9px] text-slate-600 font-bold shrink-0 ml-2">{s.exchange}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {addModalError && <p className="text-[10px] text-red-400 font-bold">{addModalError}</p>}
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addModalLoading || !addSymbolInput.trim()}
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/40 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {addModalLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Add Stock'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setSuggestions([]); }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Tag rename dialog */}
      {editingTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setEditingTag(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-extrabold text-white mb-1">Edit Custom Workspace Tag</h2>
            <p className="text-[10px] text-slate-500 mb-4 font-semibold">Rename and assign color</p>
            <div className="flex flex-col gap-3">
              <input
                autoFocus
                type="text"
                maxLength={24}
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                placeholder="Tag nameâ€¦"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 focus:border-blue-500/50 rounded-xl text-xs font-semibold text-slate-100 placeholder:text-slate-600 focus:outline-none"
              />
              <div className="flex items-center gap-3">
                <label className="text-[10px] text-slate-450 font-bold shrink-0">Color</label>
                <input
                  type="color"
                  value={editColor}
                  onChange={e => setEditColor(e.target.value)}
                  className="w-10 h-8 rounded-lg border border-slate-700 bg-slate-805 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-slate-400">{editColor}</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={editSaving || !editLabel.trim()}
                  onClick={handleSaveCustomTag}
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/40 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer"
                >
                  {editSaving ? 'Savingâ€¦' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTag(null)}
                  className="px-4 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic absolute toast popup overlay */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4.5 py-3.5 bg-slate-900/90 dark:bg-white/95 text-white dark:text-slate-950 rounded-2xl shadow-2xl backdrop-blur-xl border border-white/10 dark:border-slate-200/80 animate-slide-up select-none">
          {toast.type === 'success' && <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />}
          {toast.type === 'error' && <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />}
          {toast.type === 'info' && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />}
          <span className="text-xs font-black uppercase tracking-wider leading-none">{toast.message}</span>
        </div>
      )}

    </div>
  );
}

