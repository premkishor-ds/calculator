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
import { DEFAULT_SYMBOLS } from '@/utils/symbols';
import { buildAllTags, DEFAULT_CUSTOM_TAGS, CUSTOM_TAG_IDS, type TagDef, type CustomTagRaw } from '@/utils/tags';
import { getBackendApiUrl, getBackendWsUrl } from '@/lib/backend-config';

/* Dynamically import the chart so it's client-only (no SSR) */
const AdvancedChart = dynamic(() => import('@/components/AdvancedChart'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-950 min-h-[300px]">
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

interface VirtualOrder {
  _id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  price: number;
  quantity: number;
  status: 'pending' | 'filled' | 'cancelled';
  createdAt?: string;
  filledAt?: string;
}

interface VirtualPosition {
  _id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  averagePrice: number;
  quantity: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  realizedPnL?: number;
}

interface ActiveAlert {
  _id: string;
  symbol: string;
  condition: 'price_above' | 'price_below' | 'price_crosses';
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

const BACKEND_API_URL = getBackendApiUrl();
const WS_URL = getBackendWsUrl();

const SECTORS_MAP: Record<string, string> = {
  'E2E.NS': 'Tech',
  'AURIONPRO.NS': 'Tech',
  'COFORGE.NS': 'Tech',
  'NETWEB.NS': 'Tech',
  'VOLTAMP.NS': 'Power/Engineering',
  'TDPOWERSYS.NS': 'Power/Engineering',
  'TARIL.NS': 'Power/Engineering',
  'PRECWIRE.NS': 'Power/Engineering',
  'KIRLOSENG.NS': 'Power/Engineering',
  'KEI.NS': 'Power/Engineering',
  'APARINDS.NS': 'Power/Engineering',
  'GVT&D.NS': 'Power/Engineering',
  'CGPOWER.NS': 'Power/Engineering',
  'KRN.NS': 'Power/Engineering',
  'MAZDOCK.NS': 'Defense',
  'ZENTEC.NS': 'Defense',
  'GRSE.NS': 'Defense',
  'PARAS.NS': 'Defense',
  'ASTRAMICRO.NS': 'Defense',
  'DATAPATTNS.NS': 'Defense',
  'MTARTECH.NS': 'Defense',
  'IDEAFORGE.NS': 'Defense',
  'HSCL.NS': 'FMCG/Chemicals',
  'HFCL.NS': 'FMCG/Chemicals',
  'BECTORFOOD.NS': 'FMCG/Chemicals',
  'AEROFLEX.NS': 'FMCG/Chemicals',
  'SHILCTECH.NS': 'Healthcare',
  'APOLLO.NS': 'Healthcare'
};

function TradingTerminalInner() {
  /* ── Core Theme & Workspace States ────────────────────────── */
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [watchlistStocks, setWatchlistStocks] = useState<StockQuote[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  
  // Floating Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

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
    symbol: i === 0 ? 'VOLTAMP.NS' : (DEFAULT_SYMBOLS[i % DEFAULT_SYMBOLS.length] || 'VOLTAMP.NS'),
    interval: '5m',
    style: 'Candlestick',
    indicators: new Set(['SMA20', 'EMA50']),
    drawingsVersion: 0,
    markers: []
  })));

  const searchParams = useSearchParams();
  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const paramSym = new URLSearchParams(window.location.search).get('symbol');
      if (paramSym) return paramSym;
    }
    return 'VOLTAMP.NS';
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

  /* ── Alerts & Sidebar Panel States ────────────────────────── */
  const [showAlertsSidebar, setShowAlertsSidebar] = useState(false);
  const [alertsList, setAlertsList] = useState<ActiveAlert[]>([]);
  const [newAlertCondition, setNewAlertCondition] = useState<ActiveAlert['condition']>('price_above');
  const [newAlertValue, setNewAlertValue] = useState('');

  /* ── Workspace templates States ──────────────────────────── */
  const [savedTemplates, setSavedTemplates] = useState<WorkspaceTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);

  /* ── Paper Trading Panel States ──────────────────────────── */
  const [virtualBalance, setVirtualBalance] = useState(1000000);
  const [positions, setPositions] = useState<VirtualPosition[]>([]);
  const [orders, setOrders] = useState<VirtualOrder[]>([]);
  const [orderTicket, setOrderTicket] = useState<{
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    price: string;
    quantity: string;
  }>({
    side: 'buy',
    type: 'market',
    price: '',
    quantity: '10'
  });

  // Calculate live portfolio equity
  const totalEquity = useMemo(() => {
    const cash = virtualBalance;
    const positionsPnL = positions.reduce((acc, pos) => {
      const livePrice = livePrices[pos.symbol] || pos.averagePrice;
      const factor = pos.side === 'buy' ? 1 : -1;
      return acc + (livePrice - pos.averagePrice) * pos.quantity * factor;
    }, 0);
    return cash + positionsPnL;
  }, [virtualBalance, positions, livePrices]);

  /* ── Watchlist Screener States ────────────────────────────── */
  const [screenerSortField, setScreenerSortField] = useState<'symbol' | 'price' | 'changePercent' | 'sma20' | 'sma50' | 'rsi14'>('symbol');
  const [screenerSortDirection, setScreenerSortDirection] = useState<'asc' | 'desc'>('asc');

  /* ── Backtester States ────────────────────────────────────── */
  const [strategyType, setStrategyType] = useState<'emacross' | 'rsi'>('emacross');
  const [backtestRunning, setBacktestRunning] = useState(false);
  const [backtestResults, setBacktestResults] = useState<{
    netProfit: number;
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    trades: any[];
  } | null>(null);

  /* ── AI Pattern Scanner States ───────────────────────────── */
  const [aiPatterns, setAiPatterns] = useState<Array<{
    timeStr: string;
    pattern: string;
    sentiment: 'Bullish' | 'Bearish' | 'Neutral';
    reliability: 'High' | 'Medium' | 'Low';
    close: number;
  }>>([]);
  const [aiScanning, setAiScanning] = useState(false);

  /* ── Socket Connection & Simulated Feeds ──────────────────── */
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Initialise WebSocket connection
    const socket = new WebSocket(WS_URL);
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
        } else if (msg.type === 'portfolio_update') {
          setVirtualBalance(msg.balance);
          fetchPositionsAndOrders();
        } else if (msg.type === 'order_filled') {
          showToast(`Order filled for ${msg.order.quantity} shares of ${msg.order.symbol.split('.')[0]}!`, 'success');
          setVirtualBalance(msg.balance);
          fetchPositionsAndOrders();
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

  /* ── Fetch Helper Methods ────────────────────────────────── */
  const fetchPositionsAndOrders = useCallback(async () => {
    try {
      const posRes = await fetch(`${BACKEND_API_URL}/trading/positions`);
      if (posRes.ok) {
        const data = await posRes.json();
        setPositions(data);
      }
      const ordRes = await fetch(`${BACKEND_API_URL}/trading/orders`);
      if (ordRes.ok) {
        const data = await ordRes.json();
        setOrders(data);
      }
    } catch {}
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_API_URL}/alerts`);
      if (res.ok) {
        const data = await res.json();
        setAlertsList(data);
      }
    } catch {}
  }, []);

  const fetchWorkspaceLayouts = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_API_URL}/workspace/layouts`);
      if (res.ok) {
        const data = await res.json();
        setSavedTemplates(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchPositionsAndOrders();
    fetchAlerts();
    fetchWorkspaceLayouts();
  }, [fetchPositionsAndOrders, fetchAlerts, fetchWorkspaceLayouts]);

  /* ── Paper Trading Submissions ────────────────────────────── */
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyVal = parseInt(orderTicket.quantity);
    if (!selectedSymbol || isNaN(qtyVal) || qtyVal <= 0) {
      showToast('Please enter a valid stock quantity', 'error');
      return;
    }
    const orderData = {
      symbol: selectedSymbol,
      side: orderTicket.side,
      type: orderTicket.type,
      quantity: qtyVal,
      price: orderTicket.type === 'limit' ? parseFloat(orderTicket.price) : 0
    };

    try {
      const res = await fetch(`${BACKEND_API_URL}/trading/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (res.ok) {
        const data = await res.json();
        setVirtualBalance(data.balance);
        showToast(
          orderTicket.type === 'market' 
            ? `Successfully filled market order for ${qtyVal} shares!`
            : `Working limit order placed for ${qtyVal} shares!`,
          'success'
        );
        fetchPositionsAndOrders();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to execute virtual order', 'error');
      }
    } catch {
      showToast('Virtual execution ledger offline', 'error');
    }
  };

  const handleCancelOrder = async (id: string) => {
    try {
      const res = await fetch(`${BACKEND_API_URL}/trading/orders/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Limit order cancelled successfully', 'info');
        fetchPositionsAndOrders();
      }
    } catch {}
  };

  const handleResetPortfolio = async () => {
    if (!window.confirm('Reset virtual portfolio to ₹1,000,000 cash ledger?')) return;
    try {
      const res = await fetch(`${BACKEND_API_URL}/trading/portfolio/reset`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setVirtualBalance(data.balance);
        setPositions([]);
        setOrders([]);
        showToast('Virtual ledger reset successfully!', 'success');
      }
    } catch {}
  };

  /* ── Alerts Side Panel Submissions ────────────────────────── */
  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newAlertValue);
    if (!selectedSymbol || isNaN(val) || val <= 0) {
      showToast('Please enter a valid price crossing trigger value', 'error');
      return;
    }
    try {
      const res = await fetch(`${BACKEND_API_URL}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      }
    } catch {
      showToast('Failed to create alert', 'error');
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      const res = await fetch(`${BACKEND_API_URL}/alerts/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Alert deleted', 'info');
        fetchAlerts();
      }
    } catch {}
  };

  /* ── Cloud Workspace Templates ───────────────────────────── */
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
      const res = await fetch(`${BACKEND_API_URL}/workspace/layouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          symbol: 'VOLTAMP.NS',
          interval: '5m',
          style: 'Candlestick',
          indicators: new Set(['SMA20', 'EMA50']),
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
      const res = await fetch(`${BACKEND_API_URL}/workspace/layouts/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Layout template deleted', 'info');
        fetchWorkspaceLayouts();
      }
    } catch {}
  };

  /* ── Screener Calculations on active watchlist ────────────── */
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

  /* ── Strategy Backtest Loop ───────────────────────────────── */
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

  /* ── Candlestick AI Scanner ────────────────────────────────── */
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
            pattern: '⚖️ Doji Line',
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

  /* ── Tabbed Bottom Drawer Selector State ──────────────────── */
  const [dockTab, setDockTab] = useState<'paper' | 'screener' | 'heatmap' | 'options' | 'backtest' | 'ai'>('paper');

  /* ── Keyboard Hotkeys Handlers ────────────────────────────── */
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

  /* ── Static tags filtering logic ────────────────────────── */
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
  const [deepLoading, setDeepLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'technicals' | 'fundamentals' | 'profile' | 'proscons' | 'strategy'>('technicals');

  const [sidebarMode, setSidebarMode] = useState<'watchlist' | 'fundamentals'>('watchlist');
  const [sidebarSize, setSidebarSize] = useState<'normal' | 'wide'>('normal');
  const [sidebarActiveTab, setSidebarActiveTab] = useState<'overview' | 'dcf' | 'financials' | 'news'>('overview');
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
      const res = await fetch(`${BACKEND_API_URL}/watchlists`);
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

        const backendRes = await fetch(`${BACKEND_API_URL}/stocks?watchlist=${encodeURIComponent(selectedWatchlist)}`);
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
          const fallbackSymbols = DEFAULT_SYMBOLS;
          const res = await fetch(`/api/watchlist?symbols=${encodeURIComponent(fallbackSymbols.join(','))}`);
          if (res.ok) {
            const data = await res.json();
            const fallbackData = data.map((s: LiveStock) => ({
              ...s,
              isFavourite: false,
              tags: [] as string[]
            }));
            setWatchlistStocks(fallbackData);
            if (!urlSymbolHonouredRef.current) {
              const def = fallbackData.find((s: StockQuote) => s.symbol === selectedSymbol) || fallbackData[0];
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
          const backendRes = await fetch(`${BACKEND_API_URL}/stocks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
          const backendPostRes = await fetch(`${BACKEND_API_URL}/stocks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
    const next = current.includes(tagId) ? current.filter(t => t !== tagId) : [...current, tagId];
    setWatchlistStocks(prev => prev.map(s => s.symbol === sym ? { ...s, tags: next } : s));
    if (!apiFailed) {
      try {
        await fetch(`${BACKEND_API_URL}/stocks/${encodeURIComponent(sym)}?watchlist=${encodeURIComponent(selectedWatchlist)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
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
        const res = await fetch(`${BACKEND_API_URL}/stocks/${encodeURIComponent(symbolToToggle)}?watchlist=${encodeURIComponent(selectedWatchlist)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
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
        const res = await fetch(`${BACKEND_API_URL}/stocks/${encodeURIComponent(symbolToDelete)}?watchlist=${encodeURIComponent(selectedWatchlist)}`, {
          method: 'DELETE'
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

  const filteredWatchlist = useMemo(() => {
    return watchlistStocks.filter(s => {
      const matchesSearch = s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = activeTagFilter === 'all' ? true : (s.tags ?? []).includes(activeTagFilter);
      return matchesSearch && matchesTag;
    });
  }, [watchlistStocks, searchQuery, activeTagFilter]);

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
    <div className="min-h-dvh lg:h-dvh lg:overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans" onClick={() => setTagPopoverSym(null)}>
      
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850 shadow-sm shrink-0 z-40">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link href="/watchlist" className="group p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white touch-manipulation shrink-0">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/" className="flex items-center gap-2 min-w-0 group/logo">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent font-extrabold text-lg sm:text-xl tracking-tight truncate">
                VISION TERMINAL
              </span>
            </Link>
            <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 dark:text-blue-400 text-[10px] font-extrabold rounded-full tracking-wide shrink-0">
              GRID
            </span>
          </div>
        </div>

        {/* Global symbol search */}
        <form onSubmit={handleSearch} className="relative w-full sm:w-auto sm:flex-1 sm:max-w-xs order-last sm:order-none basis-full sm:basis-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search ticker (e.g. INFY, TATAMOTORS)…"
            value={terminalSearch}
            onChange={e => setTerminalSearch(e.target.value)}
            disabled={terminalSearching}
            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-500/50 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none transition-all"
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

        <div className="flex items-center gap-2">
          {/* Active Alerts Trigger Button */}
          <button
            type="button"
            onClick={() => setShowAlertsSidebar(prev => !prev)}
            className={`p-2 rounded-xl border transition-all flex items-center justify-center relative shrink-0 ${
              showAlertsSidebar 
                ? 'bg-blue-550 border-blue-500 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Toggle active triggers alerts ledger"
          >
            <Bell className={`w-4 h-4 ${alertsList.some(a => !a.isTriggered) ? 'animate-bounce' : ''}`} />
            {alertsList.some(a => !a.isTriggered) && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
            )}
          </button>

          {/* Theme switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center shrink-0"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>
          
          <button
            type="button"
            onClick={() => { setShowAddModal(true); setAddModalError(''); setAddSymbolInput(''); }}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-blue-550 hover:bg-blue-650 text-white text-[10px] font-extrabold rounded-xl transition-all shadow-md shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> ADD
          </button>
        </div>
      </header>

      {/* ── Main Viewport Panel Grid & Drawer ─────────────────── */}
      <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 lg:overflow-hidden min-h-0">
        
        {/* LEFT VIEWPORT CANVAS & bottom docking drawer */}
        <section className="lg:col-span-9 flex flex-col min-h-[50dvh] lg:min-h-0 lg:overflow-hidden bg-slate-50 dark:bg-slate-900/40">
          
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
                            ✕
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
          <div className="flex-1 min-h-0 relative">
            <div className={`grid gap-2 p-2 w-full h-full bg-slate-100 dark:bg-slate-900/60 overflow-y-auto ${
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
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Dock Drawer (Height: 320px) */}
          <div className="h-[320px] bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-850 flex flex-col shrink-0 overflow-hidden shadow-2xl z-30 select-none">
            
            {/* Drawer Tab Headers */}
            <div className="flex items-center justify-between px-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850 shrink-0 overflow-x-auto scrollbar-none gap-2 py-1">
              <div className="flex items-center gap-1 min-w-0">
                {[
                  { id: 'paper', label: '💼 Paper Trading' },
                  { id: 'screener', label: '🔍 Screener' },
                  { id: 'heatmap', label: '🌡️ Heatmap' },
                  { id: 'options', label: '🔗 Strike Option Chain' },
                  { id: 'backtest', label: '🧪 Strategy Tester' },
                  { id: 'ai', label: '🤖 AI Pattern Scanner' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDockTab(tab.id as any)}
                    className={`px-3.5 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shrink-0 ${
                      dockTab === tab.id
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-blue-500/20 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Spot indicator */}
              {selectedStock && (
                <div className="hidden md:flex items-center gap-2 text-[10px] font-extrabold uppercase shrink-0">
                  <span className="text-slate-400">Spot Ticker:</span>
                  <span className="text-slate-850 dark:text-slate-200">{selectedStock.symbol.replace('.NS','')}</span>
                  <span className="font-mono text-blue-550 dark:text-blue-400 font-black">₹{(livePrices[selectedStock.symbol] || selectedStock.price).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Drawer Content Viewport */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30 dark:bg-slate-950/20 min-h-0 text-slate-850 dark:text-slate-200">
              
              {/* TAB 1: PAPER TRADING */}
              {dockTab === 'paper' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full min-h-0">
                  
                  {/* Draggable ticket form on left */}
                  <form onSubmit={handlePlaceOrder} className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-4 rounded-xl shadow-md flex flex-col gap-3">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/50 pb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Virtual Ticket</span>
                      <span className="text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">{selectedSymbol.replace('.NS','')}</span>
                    </div>

                    {/* Side Select */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setOrderTicket(prev => ({ ...prev, side: 'buy' }))}
                        className={`flex-1 py-1.5 text-[10px] font-black rounded-lg uppercase transition-all ${
                          orderTicket.side === 'buy'
                            ? 'bg-emerald-500 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-750'
                        }`}
                      >
                        BUY
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderTicket(prev => ({ ...prev, side: 'sell' }))}
                        className={`flex-1 py-1.5 text-[10px] font-black rounded-lg uppercase transition-all ${
                          orderTicket.side === 'sell'
                            ? 'bg-rose-500 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-750'
                        }`}
                      >
                        SELL
                      </button>
                    </div>

                    {/* Type Select */}
                    <div className="flex gap-2 text-[10px] font-extrabold">
                      <label className="flex-1 flex items-center justify-center gap-1.5 p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer">
                        <input type="radio" checked={orderTicket.type === 'market'} onChange={() => setOrderTicket(prev => ({ ...prev, type: 'market' }))} className="accent-blue-500" />
                        Market
                      </label>
                      <label className="flex-1 flex items-center justify-center gap-1.5 p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer">
                        <input type="radio" checked={orderTicket.type === 'limit'} onChange={() => setOrderTicket(prev => ({ ...prev, type: 'limit' }))} className="accent-blue-500" />
                        Limit
                      </label>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                      <div>
                        <label className="text-[9px] text-slate-450 block mb-1">Quantity</label>
                        <input
                          type="number"
                          value={orderTicket.quantity}
                          onChange={e => setOrderTicket(prev => ({ ...prev, quantity: e.target.value }))}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-805 rounded-lg font-bold"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-450 block mb-1">Limit Price (₹)</label>
                        <input
                          type="number"
                          step="0.05"
                          value={orderTicket.type === 'market' ? (livePrices[selectedSymbol] || selectedStock?.price || 0) : orderTicket.price}
                          disabled={orderTicket.type === 'market'}
                          onChange={e => setOrderTicket(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="Price..."
                          className="w-full px-2.5 py-1.5 bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-805 rounded-lg disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900 font-bold"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className={`w-full py-2 rounded-xl text-xs font-black uppercase text-white shadow-md transition-all ${
                        orderTicket.side === 'buy' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                      }`}
                    >
                      EXECUTE PAPER ORDER
                    </button>
                  </form>

                  {/* Portfolio status & Holdings ledger in center / right */}
                  <div className="lg:col-span-8 flex flex-col gap-3 min-h-0">
                    <div className="grid grid-cols-3 gap-3 text-xs shrink-0 select-none">
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3 rounded-xl shadow-sm text-center">
                        <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-1">VIRTUAL CASH BALANCE</span>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-150 font-mono">₹{virtualBalance.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3 rounded-xl shadow-sm text-center">
                        <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-1">TOTAL ACCOUNT EQUITY</span>
                        <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">₹{totalEquity.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3 rounded-xl shadow-sm text-center flex flex-col justify-center items-center">
                        <button
                          type="button"
                          onClick={handleResetPortfolio}
                          className="px-4 py-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                        >
                          Reset Ledger
                        </button>
                      </div>
                    </div>

                    {/* Positions holdings table */}
                    <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl overflow-hidden flex flex-col min-h-0 shadow-sm">
                      <div className="bg-slate-50 dark:bg-slate-900/60 px-4 py-2 border-b border-slate-100 dark:border-slate-800 text-[9px] font-black uppercase tracking-widest shrink-0">
                        Active Holdings Ledger
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 min-h-0 text-[10px]">
                        {positions.length === 0 ? (
                          <span className="text-slate-400 block text-center py-6 font-semibold">No open virtual holdings. Place an order on the left ticket!</span>
                        ) : (
                          <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-black">
                                <th className="py-1 px-2">Ticker</th>
                                <th className="py-1 px-2">Side</th>
                                <th className="py-1 px-2 text-right">Quantity</th>
                                <th className="py-1 px-2 text-right">Avg Price</th>
                                <th className="py-1 px-2 text-right">Live Price</th>
                                <th className="py-1 px-2 text-right">Unrealized P&L</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-bold font-mono">
                              {positions.map(pos => {
                                const live = livePrices[pos.symbol] || pos.averagePrice;
                                const pnl = (live - pos.averagePrice) * pos.quantity * (pos.side === 'buy' ? 1 : -1);
                                return (
                                  <tr key={pos._id || pos.symbol} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                                    <td className="py-2 px-2 text-slate-800 dark:text-slate-100 font-sans font-black">{pos.symbol.replace('.NS','')}</td>
                                    <td className="py-2 px-2">
                                      <span className={`px-1.5 py-0.2 text-[8px] rounded uppercase ${pos.side === 'buy' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>{pos.side}</span>
                                    </td>
                                    <td className="py-2 px-2 text-right">{pos.quantity}</td>
                                    <td className="py-2 px-2 text-right">₹{pos.averagePrice.toFixed(2)}</td>
                                    <td className="py-2 px-2 text-right">₹{live.toFixed(2)}</td>
                                    <td className={`py-2 px-2 text-right font-black ${pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-455'}`}>
                                      ₹{pnl.toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: WATCHLIST SCREENER */}
              {dockTab === 'screener' && (
                <div className="flex flex-col h-full min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden shadow-md">
                  <div className="bg-slate-50/80 dark:bg-slate-900/80 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest shrink-0 flex justify-between items-center">
                    <span>Watchlist Technical Screener Panel</span>
                    <span className="text-slate-400">Click headers to sort values</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 text-[10px] min-h-0">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-slate-150 dark:border-slate-805 text-slate-400 font-black">
                          <th className="py-1 px-3 cursor-pointer select-none" onClick={() => toggleScreenerSort('symbol')}>Symbol {screenerSortField === 'symbol' ? (screenerSortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                          <th className="py-1 px-3 text-right cursor-pointer select-none" onClick={() => toggleScreenerSort('price')}>Price {screenerSortField === 'price' ? (screenerSortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                          <th className="py-1 px-3 text-right cursor-pointer select-none" onClick={() => toggleScreenerSort('changePercent')}>Change% {screenerSortField === 'changePercent' ? (screenerSortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                          <th className="py-1 px-3 text-right cursor-pointer select-none" onClick={() => toggleScreenerSort('sma20')}>SMA 20 {screenerSortField === 'sma20' ? (screenerSortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                          <th className="py-1 px-3 text-right cursor-pointer select-none" onClick={() => toggleScreenerSort('sma50')}>SMA 50 {screenerSortField === 'sma50' ? (screenerSortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                          <th className="py-1 px-3 text-right cursor-pointer select-none" onClick={() => toggleScreenerSort('rsi14')}>RSI (14) {screenerSortField === 'rsi14' ? (screenerSortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold font-mono">
                        {sortedScreenerData.map(stock => {
                          const isBullish = stock.rsi14 >= 60;
                          const isBearish = stock.rsi14 <= 40;
                          return (
                            <tr
                              key={stock.symbol}
                              onClick={() => selectSymbolRoot(stock.symbol)}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/35 cursor-pointer"
                            >
                              <td className="py-2.5 px-3 font-sans text-slate-800 dark:text-slate-100 font-black">{stock.symbol.replace('.NS','')}</td>
                              <td className="py-2.5 px-3 text-right">₹{stock.price.toFixed(2)}</td>
                              <td className={`py-2.5 px-3 text-right ${stock.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-455'}`}>
                                {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                              </td>
                              <td className="py-2.5 px-3 text-right">₹{stock.sma20.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right">₹{stock.sma50.toFixed(2)}</td>
                              <td className={`py-2.5 px-3 text-right font-black ${
                                isBullish ? 'text-emerald-500' : isBearish ? 'text-rose-500' : 'text-slate-700 dark:text-slate-350'
                              }`}>
                                {stock.rsi14.toFixed(1)} {isBullish ? '🐂' : isBearish ? '🐻' : ''}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: SECTOR HEATMAP */}
              {dockTab === 'heatmap' && (
                <div className="flex flex-col h-full min-h-0 space-y-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Watchlist Heatmap Map by Sectors</div>
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 min-h-0 overflow-y-auto">
                    {['Power/Engineering', 'Tech', 'Defense', 'FMCG/Chemicals', 'Healthcare'].map(sector => {
                      const sectorStocks = watchlistStocks.filter(s => SECTORS_MAP[s.symbol] === sector);
                      return (
                        <div key={sector} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3 rounded-xl flex flex-col gap-2 shadow-sm min-w-[130px]">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block border-b border-slate-100 dark:border-slate-800 pb-1 truncate">{sector}</span>
                          <div className="flex-1 grid grid-cols-2 gap-1.5 min-h-0 overflow-y-auto">
                            {sectorStocks.map(s => {
                              const pos = s.changePercent >= 0;
                              const intensity = Math.min(90, Math.max(15, Math.abs(s.changePercent) * 20));
                              // Beautiful green vs red gradients representing daily moves
                              const bgStyle = pos 
                                ? { backgroundColor: `rgba(16, 185, 129, ${intensity / 100})` }
                                : { backgroundColor: `rgba(239, 68, 68, ${intensity / 100})` };
                              return (
                                <div
                                  key={s.symbol}
                                  onClick={() => selectSymbolRoot(s.symbol)}
                                  style={bgStyle}
                                  className="h-10 rounded-lg flex flex-col justify-center items-center cursor-pointer transition-transform hover:scale-105 border border-black/10 select-none"
                                  title={`${s.name}: ${s.changePercent}%`}
                                >
                                  <span className="text-[9px] font-black text-white drop-shadow-sm">{s.symbol.replace('.NS','')}</span>
                                  <span className="text-[8px] text-white/80 font-mono font-bold drop-shadow-sm">{s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(1)}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: STRIKE OPTION CHAIN */}
              {dockTab === 'options' && (
                <div className="flex flex-col h-full min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden shadow-md">
                  <div className="bg-slate-50/80 dark:bg-slate-900/80 px-4 py-2.5 border-b border-slate-100 dark:border-slate-850 text-[10px] font-black uppercase tracking-widest shrink-0 flex justify-between items-center">
                    <span>Active simulated derivatives strike chain: {selectedSymbol.replace('.NS','')}</span>
                    <span className="text-slate-400">Spot price center: ₹{(livePrices[selectedSymbol] || selectedStock?.price || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 text-[10px] min-h-0">
                    <table className="w-full text-center border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-slate-150 dark:border-slate-800/80 text-slate-400 font-black">
                          <th className="py-1 px-2 text-emerald-500 font-extrabold uppercase" colSpan={3}>CALL Option (CE)</th>
                          <th className="py-1 px-2 font-black border-x border-slate-100 dark:border-slate-800">Strike</th>
                          <th className="py-1 px-2 text-rose-500 font-extrabold uppercase" colSpan={3}>PUT Option (PE)</th>
                        </tr>
                        <tr className="border-b border-slate-100 dark:border-slate-805 text-slate-400 text-[8px] font-black">
                          <th className="py-1 px-2 text-right">OI (contracts)</th>
                          <th className="py-1 px-2 text-right">Bid</th>
                          <th className="py-1 px-2 text-right">Ask</th>
                          <th className="py-1 px-2 border-x border-slate-100 dark:border-slate-800 font-sans">Price</th>
                          <th className="py-1 px-2 text-right">Bid</th>
                          <th className="py-1 px-2 text-right">Ask</th>
                          <th className="py-1 px-2 text-right">OI (contracts)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-bold font-mono">
                        {(() => {
                          const spot = livePrices[selectedSymbol] || selectedStock?.price || 500;
                          const strikesCount = 7;
                          const step = spot > 5000 ? 100 : spot > 1000 ? 50 : spot > 200 ? 10 : 5;
                          const baseStrike = Math.round(spot / step) * step;
                          
                          return Array.from({ length: strikesCount }).map((_, i) => {
                            const offset = i - 3;
                            const strike = baseStrike + offset * step;
                            const ceBid = Math.max(0.5, (spot - strike) * 0.12 + 15 + Math.sin(strike + spot) * 5);
                            const peBid = Math.max(0.5, (strike - spot) * 0.12 + 15 + Math.cos(strike + spot) * 5);
                            
                            const inCE = spot >= strike;
                            const inPE = spot <= strike;

                            return (
                              <tr key={strike} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                                <td className="py-2 px-2 text-right text-slate-400 font-medium">{Math.floor((strike * 31) % 1500) + 120}k</td>
                                <td className={`py-2 px-2 text-right ${inCE ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' : ''}`}>₹{ceBid.toFixed(2)}</td>
                                <td className={`py-2 px-2 text-right ${inCE ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' : ''}`}>₹{(ceBid + 0.35).toFixed(2)}</td>
                                <td className="py-2 px-2 border-x border-slate-105 dark:border-slate-800 font-sans text-slate-800 dark:text-white font-extrabold text-[10px] bg-slate-50/50 dark:bg-slate-900/40">₹{strike}</td>
                                <td className={`py-2 px-2 text-right ${inPE ? 'bg-rose-500/5 text-rose-500 dark:text-rose-455' : ''}`}>₹{peBid.toFixed(2)}</td>
                                <td className={`py-2 px-2 text-right ${inPE ? 'bg-rose-500/5 text-rose-500 dark:text-rose-455' : ''}`}>₹{(peBid + 0.35).toFixed(2)}</td>
                                <td className="py-2 px-2 text-right text-slate-400 font-medium">{Math.floor((strike * 23) % 1500) + 95}k</td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: STRATEGY TESTER */}
              {dockTab === 'backtest' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full min-h-0">
                  
                  {/* Selector options */}
                  <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-4 rounded-xl shadow-md flex flex-col gap-3 justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-3">Backtester options</span>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[9px] text-slate-450 block mb-1 font-bold">Select Active Strategy</label>
                          <select
                            value={strategyType}
                            onChange={e => setStrategyType(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-lg text-[10px] font-extrabold"
                          >
                            <option value="emacross">EMA Crossover (9 vs 21 Period)</option>
                            <option value="rsi">RSI Oversold/Overbought (30 vs 70)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-450 block mb-1 font-bold">Trading Terminal Grid Destination</label>
                          <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-850 px-3 py-1.5 rounded-lg block">
                            Slot #{activeGridIndex + 1}: {selectedSymbol.split('.')[0]}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={backtestRunning}
                      onClick={handleRunBacktest}
                      className="w-full py-2 bg-gradient-to-r from-blue-500 to-indigo-650 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      {backtestRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      RUN STRATEGY BACKTEST
                    </button>
                  </div>

                  {/* Results cards */}
                  <div className="lg:col-span-8 flex flex-col gap-3 min-h-0 overflow-y-auto">
                    {backtestResults ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs shrink-0 select-none">
                        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-3 rounded-xl shadow-sm text-center">
                          <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-1">NET PROFIT / LOSS</span>
                          <span className={`text-base font-black font-mono block ${backtestResults.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {backtestResults.netProfit >= 0 ? '+' : ''}{backtestResults.netProfit}%
                          </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-3 rounded-xl shadow-sm text-center">
                          <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-1">TRADES EXECUTED</span>
                          <span className="text-base font-black text-slate-800 dark:text-slate-150 font-mono block">{backtestResults.totalTrades}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-3 rounded-xl shadow-sm text-center">
                          <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-1">WINNING RATE</span>
                          <span className="text-base font-black text-indigo-500 dark:text-indigo-400 font-mono block">{backtestResults.winRate}%</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-3 rounded-xl shadow-sm text-center">
                          <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-1">PROFIT FACTOR</span>
                          <span className={`text-base font-black font-mono block ${backtestResults.profitFactor >= 1.5 ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-350'}`}>
                            {backtestResults.profitFactor}x
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col justify-center items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-8">
                        <Scale className="w-8 h-8 text-slate-400 animate-pulse mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-455">Backtest calculations uncomputed</span>
                        <p className="text-[9px] text-slate-400 mt-1 max-w-[280px] text-center leading-relaxed font-semibold">
                          Click "Run Strategy Backtest" to evaluate performance on 1-year historical candles and overlay buy/sell markers.
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 6: AI PATTERN SCANNER */}
              {dockTab === 'ai' && (
                <div className="flex flex-col h-full min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden shadow-md">
                  <div className="bg-slate-50/80 dark:bg-slate-900/80 px-4 py-2.5 border-b border-slate-100 dark:border-slate-850 text-[10px] font-black uppercase tracking-widest shrink-0 flex justify-between items-center">
                    <span>Interactive candlestick scanner model: {selectedSymbol.replace('.NS','')}</span>
                    <button
                      onClick={handleScanPatterns}
                      disabled={aiScanning}
                      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {aiScanning ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Scan Candles'}
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 text-[10px] min-h-0">
                    {aiPatterns.length === 0 ? (
                      <div className="flex flex-col justify-center items-center py-6">
                        <Sparkles className="w-8 h-8 text-blue-500 animate-pulse mb-2" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Scanner Idle</span>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-black">
                            <th className="py-1 px-3">Date/Time</th>
                            <th className="py-1 px-3">Candle Pattern Formation</th>
                            <th className="py-1 px-3">Stance Sentiment</th>
                            <th className="py-1 px-3">Model Reliability</th>
                            <th className="py-1 px-3 text-right">Close Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-bold font-mono">
                          {aiPatterns.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                              <td className="py-2 px-3 font-sans text-slate-400 font-semibold">{p.timeStr}</td>
                              <td className="py-2 px-3 text-slate-800 dark:text-white font-black">{p.pattern}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.2 text-[8px] rounded uppercase ${
                                  p.sentiment === 'Bullish' ? 'bg-emerald-500/10 text-emerald-500' :
                                  p.sentiment === 'Bearish' ? 'bg-rose-500/10 text-rose-500' :
                                  'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                }`}>
                                  {p.sentiment}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-450">{p.reliability}</td>
                              <td className="py-2 px-3 text-right">₹{p.close.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

        </section>

        {/* RIGHT WATCHLIST & FUNDAMENTALS SIDEBAR PANEL */}
        <section className="lg:col-span-3 bg-white dark:bg-slate-950 flex flex-col overflow-hidden max-h-[45dvh] lg:max-h-none lg:min-h-0 safe-bottom border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-850 shadow-xl transition-all duration-300">
          
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
            <>
              <div className="p-4 border-b border-slate-100 dark:border-slate-850 shrink-0">
                
                {/* Watchlists Switcher panel */}
                <div className="mb-4 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-150 dark:border-slate-800/80">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[9px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">Active Workspace</label>
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newWatchlistName.trim()) return;
                        setWlError('');
                        try {
                          const res = await fetch(`${BACKEND_API_URL}/watchlists`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: newWatchlistName.trim() })
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setWatchlists(prev => [...prev, data]);
                            setSelectedWatchlist(data.name);
                            setNewWatchlistName('');
                          } else {
                            const err = await res.json();
                            setWlError(err.error || 'Error');
                          }
                        } catch {
                          setWlError('Error');
                        }
                      }} 
                      className="flex gap-1 items-center"
                    >
                      <input
                        type="text"
                        placeholder="+ New..."
                        value={newWatchlistName}
                        onChange={e => { setNewWatchlistName(e.target.value); setWlError(''); }}
                        className="w-16 px-1.5 py-0.5 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-[9px] font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none animate-fade-in"
                      />
                    </form>
                  </div>

                  {wlError && <p className="text-[8px] text-red-500 font-extrabold mb-1">{wlError}</p>}

                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto scrollbar-thin">
                    {watchlists.map(wl => {
                      const active = selectedWatchlist === wl.name;
                      return (
                        <div
                          key={wl.name}
                          onClick={() => { setSelectedWatchlist(wl.name); setActiveTagFilter('all'); }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold border transition-all cursor-pointer select-none ${
                            active
                              ? 'bg-blue-500/10 border-blue-500/30 text-blue-655 dark:text-blue-400 font-black shadow-sm'
                              : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-500 hover:border-slate-300 dark:hover:border-slate-800'
                          }`}
                        >
                          <span className="truncate max-w-[80px]">{wl.name === 'default' ? '🏛️ Institutional' : wl.name}</span>
                          {!wl.isDefault && wl.name !== 'default' && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!window.confirm(`Delete watchlist "${wl.name}"?`)) return;
                                try {
                                  const res = await fetch(`${BACKEND_API_URL}/watchlists/${encodeURIComponent(wl.name)}`, { method: 'DELETE' });
                                  if (res.ok) {
                                    setWatchlists(prev => prev.filter(w => w.name !== wl.name));
                                    if (selectedWatchlist === wl.name) setSelectedWatchlist('default');
                                  }
                                } catch {}
                              }}
                              className="text-slate-400 hover:text-red-500 transition-colors ml-0.5 shrink-0"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <h2 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2 select-none">
                  <Layers className="w-3.5 h-3.5 text-blue-500" /> Watchlist List
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(true); setAddModalError(''); setAddSymbolInput(''); }}
                    className="ml-auto flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-455 text-[9px] font-extrabold rounded-lg hover:bg-blue-500/20 transition-all"
                  >
                    <Plus className="w-2.5 h-2.5" /> ADD
                  </button>
                </h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    id="watchlist-filter-input"
                    type="text"
                    placeholder="Filter stocks (Press Space)…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-500/50 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none transition-all"
                  />
                </div>

                {/* Tag Filters */}
                <div className="mt-3 flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTagFilter('all')}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border transition-all ${
                      activeTagFilter === 'all'
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white border-slate-300 dark:border-slate-600 shadow-sm'
                        : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-850 hover:border-slate-400 dark:hover:border-slate-600'
                    }`}
                  >
                    All ({watchlistStocks.length})
                  </button>
                  {allTags.map((tag: TagDef) => {
                    const count = watchlistStocks.filter(s => (s.tags ?? []).includes(tag.id)).length;
                    if (count === 0 && activeTagFilter !== tag.id) return null;
                    const isCustom = CUSTOM_TAG_IDS.includes(tag.id as typeof CUSTOM_TAG_IDS[number]);
                    const raw = isCustom ? customTagRaw.find(t => t.tagId === tag.id) : null;
                    return (
                      <div key={tag.id} className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setActiveTagFilter(activeTagFilter === tag.id ? 'all' : tag.id)}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border transition-all ${
                            activeTagFilter === tag.id ? 'opacity-100' : 'opacity-60 hover:opacity-90'
                          } ${
                            !raw
                              ? (activeTagFilter === tag.id
                                  ? tag.color
                                  : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-850 hover:border-slate-400 dark:hover:border-slate-600')
                              : ''
                          }`}
                          style={raw ? {
                            backgroundColor: raw.color + '25',
                            color: raw.color,
                            borderColor: raw.color + '60',
                          } : {}}
                        >
                          {tag.label} {count > 0 && `(${count})`}
                        </button>
                        {isCustom && (
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); const r = customTagRaw.find(t => t.tagId === tag.id)!; setEditingTag(r); setEditLabel(r.label); setEditColor(r.color); }}
                            className="text-slate-400 hover:text-slate-650 transition-colors text-[9px] leading-none"
                          >✎</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scrollable list items */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900/60 min-h-0">
                {watchlistLoading ? (
                  <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-900/60 animate-pulse">
                    {[...Array(5)].map((_, idx) => (
                      <div key={idx} className="px-4 py-3 flex items-center justify-between gap-3 border-l-4 border-transparent">
                        <div className="flex-1">
                          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-16 mb-1.5" />
                          <div className="h-2.5 bg-slate-100 dark:bg-slate-900 rounded-md w-24" />
                        </div>
                        <div className="text-right">
                          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-12 ml-auto mb-1.5" />
                          <div className="h-2.5 bg-slate-100 dark:bg-slate-900 rounded-md w-10 ml-auto" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredWatchlist.length > 0 ? (
                  filteredWatchlist.map(stock => {
                    const active = stock.symbol === selectedSymbol;
                    const positive = stock.changePercent >= 0;
                    return (
                      <div
                        key={stock.symbol}
                        onClick={() => selectSymbolRoot(stock.symbol)}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-all border-l-4 touch-manipulation cursor-pointer group/item ${
                          active ? 'bg-slate-50 dark:bg-slate-900 border-blue-550 dark:border-blue-500 shadow-sm' : 'hover:bg-slate-100/50 dark:hover:bg-slate-905 border-transparent'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-black ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-100'}`}>
                              {stock.symbol.split('.')[0]}
                            </span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-600 font-bold">{stock.symbol.split('.')[1]}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate max-w-[130px] mt-0.5">
                            {stock.name}
                          </p>
                          {/* Tag pills */}
                          {(stock.tags ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-0.5 mt-1">
                              {(stock.tags ?? []).map(tid => {
                                const td = tagMap[tid];
                                if (!td) return null;
                                return td.custom ? (
                                  <span key={tid} className="px-1.5 py-0 rounded-full text-[8px] font-extrabold border"
                                    style={{ backgroundColor: td.dot + '25', color: td.dot, borderColor: td.dot + '60' }}>
                                    {td.label}
                                  </span>
                                ) : (
                                  <span key={tid} className={`px-1.5 py-0 rounded-full text-[8px] font-extrabold border ${td.color}`}>
                                    {td.label}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-black text-slate-900 dark:text-white font-mono">₹{(livePrices[stock.symbol] || stock.price).toFixed(0)}</div>
                            <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded mt-0.5 ${
                              positive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-500 dark:text-red-400'
                            }`}>
                              {positive ? '+' : ''}{stock.changePercent.toFixed(1)}%
                            </span>
                          </div>
                          
                          {/* Hover Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity relative">
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); setTagPopoverSym(tagPopoverSym === stock.symbol ? null : stock.symbol); }}
                              className="p-1 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-550 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15 transition-all"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteStock(stock.symbol, e)}
                              className="p-1 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-550 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>

                            {/* Tags list popover */}
                            {tagPopoverSym === stock.symbol && (
                              <div
                                className="absolute right-0 top-7 z-50 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2"
                                onClick={e => e.stopPropagation()}
                              >
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Assign Tag</p>
                                <div className="flex flex-col gap-0.5">
                                  {allTags.map((tag: TagDef) => {
                                    const isActive = (stock.tags ?? []).includes(tag.id);
                                    return tag.custom ? (
                                      <button
                                        key={tag.id}
                                        type="button"
                                        onClick={e => handleToggleTag(stock.symbol, tag.id, e)}
                                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-bold text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all"
                                        style={isActive ? { backgroundColor: tag.dot + '20', color: tag.dot } : {}}
                                      >
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isActive ? tag.dot : '#64748b' }} />
                                        {tag.label}
                                        {isActive && <span className="ml-auto text-[8px]">✓</span>}
                                      </button>
                                    ) : (
                                      <button
                                        key={tag.id}
                                        type="button"
                                        onClick={e => handleToggleTag(stock.symbol, tag.id, e)}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-bold text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all ${isActive ? tag.color : ''}`}
                                      >
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isActive ? tag.dot : '#64748b' }} />
                                        {tag.label}
                                        {isActive && <span className="ml-auto text-[8px]">✓</span>}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs font-semibold">No matching watchlist stocks found.</div>
                )}
              </div>
            </>
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
                      { id: 'news', label: '📰 News & Peers' }
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
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 block truncate">{deepData?.profile?.sector || '—'}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/80">
                          <span className="text-slate-400 font-extrabold uppercase block tracking-wider text-[8px] mb-0.5">Industry</span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 block truncate">{deepData?.profile?.industry || '—'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/80">
                          <span className="text-slate-400 font-extrabold uppercase block tracking-wider text-[8px] mb-0.5">P/E Ratio</span>
                          <span className="font-extrabold text-slate-850 dark:text-slate-205 block font-mono">{selectedStock.pe > 0 ? selectedStock.pe.toFixed(1) : '—'}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/80">
                          <span className="text-slate-400 font-extrabold uppercase block tracking-wider text-[8px] mb-0.5">ROE</span>
                          <span className="font-extrabold text-slate-850 dark:text-slate-205 block font-mono">{deepData?.ratios?.roe ? `${deepData.ratios.roe.toFixed(1)}%` : '—'}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/80">
                          <span className="text-slate-400 font-extrabold uppercase block tracking-wider text-[8px] mb-0.5">Debt/Equity</span>
                          <span className="font-extrabold text-slate-850 dark:text-slate-205 block font-mono">{deepData?.ratios?.debtToEquity !== undefined ? (deepData.ratios.debtToEquity / 100).toFixed(2) : '—'}</span>
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
                            <span className="font-mono">₹{deepData.ratios.fiftyTwoWeekLow.toFixed(0)} - ₹{deepData.ratios.fiftyTwoWeekHigh.toFixed(0)}</span>
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
                          {impliedGrowth !== undefined ? `${impliedGrowth.toFixed(2)}%` : '—'}
                        </span>
                        <p className="text-[9px] text-slate-400 mt-2 leading-relaxed font-semibold">
                          To justify spot price <span className="font-extrabold font-mono">₹{selectedStock.price}</span>, this enterprise must compound EPS at <span className="font-extrabold text-blue-600 dark:text-blue-400 font-mono">{impliedGrowth.toFixed(2)}%</span> annually.
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
                                      <td className="py-1.5 px-2 text-right">₹{(r.revenue / 10000000).toFixed(1)}Cr</td>
                                      <td className="py-1.5 px-2 text-right text-emerald-600">₹{(r.netIncome / 10000000).toFixed(1)}Cr</td>
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
                                      <td className="py-1.5 px-2 text-right">₹{(r.revenue / 10000000).toFixed(1)}Cr</td>
                                      <td className="py-1.5 px-2 text-right text-emerald-600">₹{(r.netIncome / 10000000).toFixed(1)}Cr</td>
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
                                      <td className="py-1.5 px-2 text-right">₹{(r.totalAssets / 10000000).toFixed(1)}Cr</td>
                                      <td className="py-1.5 px-2 text-right text-indigo-500">₹{(r.equity / 10000000).toFixed(1)}Cr</td>
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
                        <span className="text-[8px] font-black text-slate-450 uppercase block mb-1.5">Comparable Competitors</span>
                        <div className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-slate-900/60 font-bold">
                          {deepData?.peers?.slice(0, 3).map((p: PeerItem) => (
                            <div key={p.symbol} className="py-1.5 flex items-center justify-between gap-2">
                              <div>
                                <span className="text-slate-800 dark:text-slate-100 block">{p.symbol.replace('.NS','')}</span>
                              </div>
                              <div className="text-right font-mono">
                                <span className="block text-slate-700 dark:text-slate-300">₹{p.price.toFixed(0)}</span>
                                <span className="text-[7.5px] text-slate-400 block">P/E: {p.pe > 0 ? p.pe.toFixed(1) : '—'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      </main>

      {/* ── Active Alerts Sidebar slider drawer ────────────────── */}
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
                  <option value="price_crosses">Price Crosses (≒)</option>
                </select>
              </div>
            </div>
            <div className="text-[10px] font-bold">
              <label className="text-[9px] text-slate-455 block mb-1">Target Price (₹)</label>
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
                      {alert.condition === 'price_above' ? 'Crossing Above' : alert.condition === 'price_below' ? 'Crossing Below' : 'Crossing Target'} @ ₹{alert.value.toFixed(2)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAlert(alert._id)}
                    className="p-1 hover:bg-rose-500/10 hover:text-red-500 text-slate-400 rounded-lg transition-colors cursor-pointer"
                    title="Delete trigger alert"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Add Stock modal dialog ────────────────────────────── */}
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
                placeholder="Tag name…"
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
                  {editSaving ? 'Saving…' : 'Save'}
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

export default function TradingTerminalPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-dvh bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Initialising Terminal…</span>
        </div>
      </div>
    }>
      <TradingTerminalInner />
    </React.Suspense>
  );
}
