'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  RotateCcw, MousePointer, Slash, Minus, Eraser, Trash2,
  TrendingUp, TrendingDown, RefreshCw, Settings, Play, Pause,
  SkipForward, Calendar, Eye, EyeOff, Lock, Unlock, HelpCircle,
  Activity, Sliders, ChevronDown, Check, Plus
} from 'lucide-react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  LineData,
  Time,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  BarSeries,
  AreaSeries,
  BaselineSeries,
  createSeriesMarkers,
} from 'lightweight-charts';

/* ─── Types & Drawings Structures ────────────────────────────── */
export interface ChartPoint {
  time: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  pe: number;
}

interface DrawingItem {
  _id?: string;
  type: 'trendline' | 'horizontal' | 'vertical' | 'fibonacci' | 'channel' | 'riskreward' | 'shape_rect' | 'annotation_text' | 'brush';
  points?: { time: number; price: number }[];
  price?: number;
  time?: number;
  color: string;
  config?: any; // Stores Risk/Reward ratio levels, channel widths, brush paths, annotations
}

interface RenderableDrawing {
  id: string;
  type: string;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  y?: number;
  x?: number;
  color: string;
  config?: any;
}

interface TempDrawing {
  type: DrawingItem['type'];
  startPoint?: { time: number; price: number; x: number; y: number };
  endPoint?: { time: number; price: number; x: number; y: number };
}

const DRAWING_COLORS = ['#22c55e', '#3b82f6', '#ef4444', '#eab308', '#a855f7', '#ec4899'];

const DRAWING_TOOLS = [
  { id: 'cursor', label: 'Cursor (Move Chart)', icon: <MousePointer className="w-4 h-4" /> },
  { id: 'trendline', label: 'Trend Line', icon: <Slash className="w-4 h-4 rotate-[45deg]" /> },
  { id: 'horizontal', label: 'Horizontal Boundary', icon: <Minus className="w-4 h-4" /> },
  { id: 'vertical', label: 'Vertical Timeline', icon: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="2" x2="12" y2="22" />
    </svg>
  )},
  { id: 'fibonacci', label: 'Fibonacci Retracement', icon: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="2" y1="4" x2="22" y2="4" strokeDasharray="2 2" />
      <line x1="2" y1="9" x2="22" y2="9" />
      <line x1="2" y1="14" x2="22" y2="14" strokeDasharray="3 3" />
      <line x1="2" y1="19" x2="22" y2="19" />
    </svg>
  )},
  { id: 'channel', label: 'Parallel Channel', icon: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="6" x2="20" y2="6" strokeDasharray="3 3" />
      <line x1="4" y1="18" x2="20" y2="18" strokeDasharray="3 3" />
    </svg>
  )},
  { id: 'riskreward', label: 'Risk/Reward Ruler', icon: <Activity className="w-4 h-4" /> },
  { id: 'shape_rect', label: 'Rectangle Shape', icon: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  )},
  { id: 'annotation_text', label: 'Text Note', icon: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )},
  { id: 'brush', label: 'Freehand Brush', icon: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 14V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8" />
      <path d="M2 14h20v2H2zM6 16v4M18 16v4" />
    </svg>
  )},
  { id: 'eraser', label: 'Eraser', icon: <Eraser className="w-4 h-4" /> },
] as const;

const CHART_STYLES = [
  'Candlestick',
  'Hollow Candlestick',
  'Bar',
  'Line',
  'Area',
  'Baseline',
  'Mountain',
  'Step line',
  'Histogram',
  'Heikin Ashi',
  'Renko',
  'Line Break'
];

const STANDARD_INTERVALS = [
  '1s', '5s', '15s', '30s',
  '1m', '3m', '5m', '10m', '15m', '30m', '45m',
  '1h', '2h', '4h',
  'Daily', 'Weekly', 'Monthly'
];

interface Props {
  symbol: string;
  chartRange: string;
  onRangeChange: (r: string) => void;
  chartMode: 'price' | 'pe';
  onModeChange: (m: 'price' | 'pe') => void;
  theme: 'dark' | 'light';
  controlledInterval?: string;
  onIntervalChange?: (i: string) => void;
  controlledStyle?: string;
  onStyleChange?: (s: string) => void;
  controlledIndicators?: Set<string>;
  onIndicatorsChange?: (s: Set<string>) => void;
  drawingsVersion?: number;
  onDrawingsChange?: () => void;
  markers?: Array<{
    time: number;
    position: 'aboveBar' | 'belowBar' | 'inBar';
    color: string;
    shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
    text?: string;
  }>;
}

/* ─── Pure helper — no hooks ─────────────────────────────────── */
function calcSMA(data: ChartPoint[], period: number): LineData<Time>[] {
  const out: LineData<Time>[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
    out.push({ time: data[i].time as Time, value: parseFloat((sum / period).toFixed(2)) });
  }
  return out;
}

function calcEMA(data: ChartPoint[], period: number): LineData<Time>[] {
  const out: LineData<Time>[] = [];
  if (data.length < period) return [];
  
  let k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i].close;
  let prevEMA = sum / period;
  out.push({ time: data[period - 1].time as Time, value: parseFloat(prevEMA.toFixed(2)) });
  
  for (let i = period; i < data.length; i++) {
    let ema = data[i].close * k + prevEMA * (1 - k);
    out.push({ time: data[i].time as Time, value: parseFloat(ema.toFixed(2)) });
    prevEMA = ema;
  }
  return out;
}

function calcRSI(data: ChartPoint[], period: number = 14): LineData<Time>[] {
  const out: LineData<Time>[] = [];
  if (data.length <= period) return [];
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  let rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  out.push({ time: data[period].time as Time, value: parseFloat(rsi.toFixed(2)) });
  
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    
    rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    out.push({ time: data[i].time as Time, value: parseFloat(rsi.toFixed(2)) });
  }
  return out;
}

/* ─── Custom Styles Mathematics Filters ──────────────────────── */
function computeHeikinAshi(points: ChartPoint[]): ChartPoint[] {
  if (points.length === 0) return [];
  const haPoints: ChartPoint[] = [];
  let prevOpen = points[0].open;
  let prevClose = points[0].close;

  points.forEach((p) => {
    const close = parseFloat(((p.open + p.high + p.low + p.close) / 4).toFixed(2));
    const open = parseFloat(((prevOpen + prevClose) / 2).toFixed(2));
    const high = Math.max(p.high, open, close);
    const low = Math.min(p.low, open, close);

    haPoints.push({ ...p, open, high, low, close });
    prevOpen = open;
    prevClose = close;
  });
  return haPoints;
}

function computeRenko(points: ChartPoint[], brickSize: number = 3.0): ChartPoint[] {
  if (points.length === 0) return [];
  const renkoPoints: ChartPoint[] = [];
  let prevPrice = points[0].close;
  let lastTime = points[0].time;

  points.forEach((p) => {
    const diff = p.close - prevPrice;
    const count = Math.floor(Math.abs(diff) / brickSize);
    for (let i = 0; i < count; i++) {
      const dir = diff > 0 ? 1 : -1;
      const open = prevPrice;
      const close = prevPrice + dir * brickSize;
      const high = Math.max(open, close);
      const low = Math.min(open, close);
      lastTime += 60; // 1-minute blocks step

      renkoPoints.push({
        time: lastTime,
        date: p.date,
        open, high, low, close,
        volume: Math.floor(p.volume / count),
        pe: p.pe
      });
      prevPrice = close;
    }
  });
  return renkoPoints.length > 0 ? renkoPoints : points;
}

function computeLineBreak(points: ChartPoint[], lineCount: number = 3): ChartPoint[] {
  if (points.length < lineCount) return points;
  const breakPoints: ChartPoint[] = [];
  let lastPrices: number[] = [points[0].close];
  let lastTime = points[0].time;

  points.forEach((p) => {
    const current = p.close;
    const maxVal = Math.max(...lastPrices);
    const minVal = Math.min(...lastPrices);
    let dir = 0;
    if (current > maxVal) dir = 1;
    else if (current < minVal) dir = -1;

    if (dir !== 0) {
      const open = lastPrices[lastPrices.length - 1];
      const close = current;
      const high = Math.max(open, close);
      const low = Math.min(open, close);
      lastTime += 60;

      breakPoints.push({
        time: lastTime,
        date: p.date,
        open, high, low, close,
        volume: p.volume,
        pe: p.pe
      });
      lastPrices.push(current);
      if (lastPrices.length > lineCount) lastPrices.shift();
    }
  });
  return breakPoints.length > 0 ? breakPoints : points;
}

function getIntervalSeconds(interval: string): number {
  const unit = interval.slice(-1);
  const val = parseInt(interval);
  if (interval === 'Daily') return 86400;
  if (interval === 'Weekly') return 604800;
  if (interval === 'Monthly') return 2592000;
  if (unit === 's') return val;
  if (unit === 'm') return val * 60;
  if (unit === 'h') return val * 3600;
  return 300; // default 5m
}

/* ─── Component ──────────────────────────────────────────────── */
export default function AdvancedChart({
  symbol, chartRange, onRangeChange, chartMode, onModeChange, theme,
  controlledInterval, onIntervalChange, controlledStyle, onStyleChange,
  controlledIndicators, onIndicatorsChange, drawingsVersion,
  onDrawingsChange, markers,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const volRef       = useRef<ISeriesApi<'Histogram'> | null>(null);
  const dataRef      = useRef<ChartPoint[]>([]); // always-current raw history
  const markersPluginRef = useRef<any>(null);

  const [data,     setData]     = useState<ChartPoint[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  
  // Custom Intervals states
  const [selectedInterval, setSelectedInterval] = useState<string>('5m');
  const [showCustomInterval, setShowCustomInterval] = useState(false);
  const [customValue, setCustomValue] = useState('10');
  const [customUnit, setCustomUnit] = useState<'s' | 'm' | 'h' | 'D'>('m');

  // Chart Styles states
  const [selectedStyle, setSelectedStyle] = useState<string>('Candlestick');
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  // Indicators states
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(new Set(['SMA20', 'EMA50']));
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());

  // Pine Script Sandbox states
  const [showPineModal, setShowPineModal] = useState(false);
  const [pineScript, setPineScript] = useState(`study("Custom EMA Cross", overlay=true)\nfast = ema(close, 9)\nslow = sma(close, 21)\nplot(fast, color="#3b82f6")\nplot(slow, color="#ef4444")`);
  const [pineError, setPineError] = useState('');
  const [customPlots, setCustomPlots] = useState<Array<{ name: string; color: string; values: any[] }>>([]);
  const customSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());

  // Replay Mode states
  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1000); // ms per candle
  const replayTimerRef = useRef<NodeJS.Timeout | null>(null);

  /* Derived controlled/uncontrolled values */
  const interval = controlledInterval ?? selectedInterval;
  const style = controlledStyle ?? selectedStyle;
  const indicators = controlledIndicators ?? activeIndicators;

  const changeInterval = (newVal: string) => {
    if (onIntervalChange) onIntervalChange(newVal);
    else setSelectedInterval(newVal);
  };

  const changeStyle = (newVal: string) => {
    if (onStyleChange) onStyleChange(newVal);
    else setSelectedStyle(newVal);
  };

  const toggleIndicator = (ind: string) => {
    const next = new Set(indicators);
    if (next.has(ind)) next.delete(ind);
    else next.add(ind);
    
    if (onIndicatorsChange) onIndicatorsChange(next);
    else setActiveIndicators(next);
  };

  /* Drawings State, Math Conversions & Database Sync ─── */
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [tempDrawing, setTempDrawing] = useState<TempDrawing | null>(null);
  const [activeTool, setActiveTool] = useState<DrawingItem['type'] | 'cursor' | 'eraser'>('cursor');
  const [drawingColor, setDrawingColor] = useState<string>('#22c55e');
  const [viewportTrigger, setViewportTrigger] = useState(0);
  const [renderableDrawings, setRenderableDrawings] = useState<RenderableDrawing[]>([]);
  const [renderableTempDrawing, setRenderableTempDrawing] = useState<any | null>(null);

  const getActiveSeries = (): ISeriesApi<any> | null => mainSeriesRef.current;

  // Sync to database
  const syncDrawingsToDB = async (updatedDrawings: DrawingItem[]) => {
    try {
      await fetch('/api/drawings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          chartMode,
          drawings: updatedDrawings.map(d => ({
            type: d.type,
            points: d.points,
            price: d.price,
            time: d.time,
            color: d.color,
            config: d.config
          }))
        })
      });
      if (onDrawingsChange) {
        onDrawingsChange();
      }
    } catch (err) {
      console.error('Error syncing drawings:', err);
    }
  };

  /* WebSocket subscriber for simulated ticks */
  useEffect(() => {
    if (!symbol || replayMode) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:5001`;
    let socket: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;

    function connect() {
      socket = new WebSocket(wsUrl);
      socket.onopen = () => console.log(`Client streaming ticks for ${symbol}`);
      socket.onmessage = (event) => {
        try {
          const tick = JSON.parse(event.data);
          if (tick.type === 'tick' && tick.symbol.toUpperCase() === symbol.toUpperCase()) {
            handleIncomingTick(tick);
          }
        } catch {}
      };
      socket.onclose = () => {
        reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();
    return () => {
      if (socket) socket.close();
      clearTimeout(reconnectTimer);
    };
  }, [symbol, interval, replayMode]);

  const handleIncomingTick = (tick: { price: number; volume: number; time: number }) => {
    const sec = getIntervalSeconds(interval);
    const bucket = Math.floor(tick.time / sec) * sec;

    setData(prev => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const last = next[next.length - 1];

      if (last.time === bucket) {
        last.close = tick.price;
        last.high = Math.max(last.high, tick.price);
        last.low = Math.min(last.low, tick.price);
        last.volume += tick.volume;
        updateSeries(last);
      } else if (bucket > last.time) {
        const fresh: ChartPoint = {
          time: bucket,
          date: new Date(tick.time * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
          open: tick.price,
          high: tick.price,
          low: tick.price,
          close: tick.price,
          volume: tick.volume,
          pe: last.pe
        };
        next.push(fresh);
        updateSeries(fresh);
      }
      return next;
    });
  };

  const updateSeries = (p: ChartPoint) => {
    const main = mainSeriesRef.current;
    const vol = volRef.current;
    if (main && chartMode === 'price') {
      main.update({ time: p.time as Time, open: p.open, high: p.high, low: p.low, close: p.close });
    }
    if (vol && chartMode === 'price') {
      vol.update({ time: p.time as Time, value: p.volume, color: p.close >= p.open ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)' });
    }
  };

  /* Recalculate SVG drawing vector coordinates outside of renders */
  useEffect(() => {
    const chart = chartRef.current;
    const series = getActiveSeries();
    if (!chart || !series) return;

    const nextRenderables: RenderableDrawing[] = [];
    drawings.forEach((drawing, idx) => {
      if (drawing.type === 'horizontal' && drawing.price !== undefined) {
        const y = series.priceToCoordinate(drawing.price);
        if (y !== null) {
          nextRenderables.push({ id: `saved-${idx}`, type: 'horizontal', y, color: drawing.color });
        }
      } else if (drawing.type === 'vertical' && drawing.time !== undefined) {
        const x = chart.timeScale().timeToCoordinate(drawing.time as Time);
        if (x !== null) {
          nextRenderables.push({ id: `saved-${idx}`, type: 'vertical', x, color: drawing.color });
        }
      } else if (drawing.points && drawing.points.length >= 2) {
        const x1 = chart.timeScale().timeToCoordinate(drawing.points[0].time as Time);
        const y1 = series.priceToCoordinate(drawing.points[0].price);
        const x2 = chart.timeScale().timeToCoordinate(drawing.points[1].time as Time);
        const y2 = series.priceToCoordinate(drawing.points[1].price);

        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          nextRenderables.push({
            id: `saved-${idx}`,
            type: drawing.type,
            x1, y1, x2, y2,
            color: drawing.color,
            config: drawing.config
          });
        }
      }
    });
    setRenderableDrawings(nextRenderables);

    // Temp active drawing coordinates
    if (tempDrawing && tempDrawing.startPoint && tempDrawing.endPoint) {
      const x1 = chart.timeScale().timeToCoordinate(tempDrawing.startPoint.time as Time);
      const y1 = series.priceToCoordinate(tempDrawing.startPoint.price);
      const x2 = chart.timeScale().timeToCoordinate(tempDrawing.endPoint.time as Time);
      const y2 = series.priceToCoordinate(tempDrawing.endPoint.price);

      if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        setRenderableTempDrawing({ x1, y1, x2, y2, type: tempDrawing.type });
      } else {
        setRenderableTempDrawing(null);
      }
    } else {
      setRenderableTempDrawing(null);
    }
  }, [drawings, tempDrawing, viewportTrigger, chartMode, selectedStyle]);

  /* Mouse Event Handlers for Drawings SVG Layer */
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === 'cursor') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const chart = chartRef.current;
    const series = getActiveSeries();
    if (!chart || !series) return;

    const time = chart.timeScale().coordinateToTime(x) as number | null;
    const price = series.coordinateToPrice(y);
    if (time === null || price === null) return;

    if (activeTool === 'eraser') {
      eraseAt(x, y);
      return;
    }

    if (activeTool === 'horizontal') {
      const newD: DrawingItem = { type: 'horizontal', price, color: drawingColor };
      const updated = [...drawings, newD];
      setDrawings(updated);
      syncDrawingsToDB(updated);
      return;
    }

    if (activeTool === 'vertical') {
      const newD: DrawingItem = { type: 'vertical', time, color: drawingColor };
      const updated = [...drawings, newD];
      setDrawings(updated);
      syncDrawingsToDB(updated);
      return;
    }

    setTempDrawing({
      type: activeTool,
      startPoint: { time, price, x, y },
      endPoint: { time, price, x, y }
    });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === 'cursor' || !tempDrawing || !tempDrawing.startPoint) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const chart = chartRef.current;
    const series = getActiveSeries();
    if (!chart || !series) return;

    const time = chart.timeScale().coordinateToTime(x) as number | null;
    const price = series.coordinateToPrice(y);

    if (time !== null && price !== null) {
      setTempDrawing(prev => {
        if (!prev) return null;
        return {
          ...prev,
          endPoint: { time, price, x, y }
        };
      });
    }
  };

  const handleMouseUp = () => {
    if (tempDrawing && tempDrawing.startPoint && tempDrawing.endPoint) {
      const p1 = tempDrawing.startPoint;
      const p2 = tempDrawing.endPoint;
      
      const newD: DrawingItem = {
        type: tempDrawing.type,
        points: [
          { time: p1.time, price: p1.price },
          { time: p2.time, price: p2.price }
        ],
        color: drawingColor,
        config: tempDrawing.type === 'riskreward' ? { ratio: 2.5 } : {}
      };
      const updated = [...drawings, newD];
      setDrawings(updated);
      syncDrawingsToDB(updated);
    }
    setTempDrawing(null);
  };

  const eraseAt = (x: number, y: number) => {
    const chart = chartRef.current;
    const series = getActiveSeries();
    if (!chart || !series) return;

    let closest = -1;
    let minDist = 18;

    drawings.forEach((drawing, idx) => {
      if (drawing.type === 'horizontal' && drawing.price !== undefined) {
        const yLine = series.priceToCoordinate(drawing.price);
        if (yLine !== null && Math.abs(y - yLine) < minDist) {
          minDist = Math.abs(y - yLine);
          closest = idx;
        }
      } else if (drawing.type === 'vertical' && drawing.time !== undefined) {
        const xLine = chart.timeScale().timeToCoordinate(drawing.time as Time);
        if (xLine !== null && Math.abs(x - xLine) < minDist) {
          minDist = Math.abs(x - xLine);
          closest = idx;
        }
      } else if (drawing.points && drawing.points.length === 2) {
        const x1 = chart.timeScale().timeToCoordinate(drawing.points[0].time as Time);
        const y1 = series.priceToCoordinate(drawing.points[0].price);
        const x2 = chart.timeScale().timeToCoordinate(drawing.points[1].time as Time);
        const y2 = series.priceToCoordinate(drawing.points[1].price);

        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          // Distance to segment calculation
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len2 = dx * dx + dy * dy;
          let t = len2 === 0 ? 0 : ((x - x1) * dx + (y - y1) * dy) / len2;
          t = Math.max(0, Math.min(1, t));
          const dist = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
          if (dist < minDist) {
            minDist = dist;
            closest = idx;
          }
        }
      }
    });

    if (closest !== -1) {
      const updated = drawings.filter((_, idx) => idx !== closest);
      setDrawings(updated);
      syncDrawingsToDB(updated);
    }
  };

  /* Create and configure Lightweight Chart instance */
  useEffect(() => {
    if (!containerRef.current) return;
    const isDark = theme === 'dark';

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#020617' : '#ffffff' },
        textColor: isDark ? '#94a3b8' : '#475569',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: isDark ? '#0f172a' : '#f1f5f9' },
        horzLines: { color: isDark ? '#0f172a' : '#f1f5f9' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: isDark ? '#475569' : '#cbd5e1', style: 3, labelBackgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
        horzLine: { color: isDark ? '#475569' : '#cbd5e1', style: 3, labelBackgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
      },
      rightPriceScale: {
        borderColor: isDark ? '#1e293b' : '#e2e8f0',
        scaleMargins: { top: 0.08, bottom: 0.28 },
      },
      timeScale: {
        borderColor: isDark ? '#1e293b' : '#e2e8f0',
        timeVisible: true,
        secondsVisible: true,
      },
      width:  containerRef.current.clientWidth || 600,
      height: containerRef.current.clientHeight || 380,
    });

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', downColor: '#ef4444',
      borderUpColor: '#10b981', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#f87171',
    });

    const vol = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
      visible: false,
    });

    chartRef.current = chart;
    mainSeriesRef.current = candle;
    volRef.current = vol;

    const handleRangeChange = () => setViewportTrigger(prev => prev + 1);
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);

    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const w = entry.contentRect.width || 600;
      const h = entry.contentRect.height || 380;
      chart.applyOptions({ width: w, height: h });
      setViewportTrigger(prev => prev + 1);
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      volRef.current = null;
      markersPluginRef.current = null;
    };
  }, []);

  /* Load historical candles & fetch drawings */
  useEffect(() => {
    if (!symbol) return;
    fetch(`/api/drawings?symbol=${encodeURIComponent(symbol)}&chartMode=${chartMode}`)
      .then(r => r.json())
      .then(json => setDrawings(json || []))
      .catch(() => {});
  }, [symbol, chartMode, drawingsVersion]);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);

    fetch(`/api/watchlist/${encodeURIComponent(symbol)}/chart?range=${chartRange.toLowerCase()}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load candlestick feeds');
        return r.json();
      })
      .then(json => {
        setError('');
        const pts = json.points ?? [];
        dataRef.current = pts;
        
        applyChartConfigurations(pts);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [symbol, chartRange, interval, style]);

  /* Replay Loop */
  useEffect(() => {
    if (replayPlaying && replayMode) {
      replayTimerRef.current = setInterval(() => {
        setReplayIndex(prev => {
          const nextIndex = prev + 1;
          if (nextIndex >= dataRef.current.length) {
            clearInterval(replayTimerRef.current!);
            setReplayPlaying(false);
            return prev;
          }
          feedReplayData(nextIndex);
          return nextIndex;
        });
      }, replaySpeed);
    } else {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    }
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [replayPlaying, replaySpeed, replayMode]);

  const feedReplayData = (index: number) => {
    const subset = dataRef.current.slice(0, index);
    applyChartConfigurations(subset);
  };

  const applyMarkers = (series: any, markerList: any[]) => {
    if (!series) return;
    if (markerList && markerList.length > 0) {
      const mapped = markerList.map(m => ({
        time: m.time as Time,
        position: m.position,
        color: m.color,
        shape: m.shape,
        text: m.text,
      }));
      if (!markersPluginRef.current) {
        markersPluginRef.current = createSeriesMarkers(series, mapped);
      } else {
        markersPluginRef.current.setMarkers(mapped);
      }
    } else {
      if (markersPluginRef.current) {
        markersPluginRef.current.setMarkers([]);
      }
    }
  };

  const applyChartConfigurations = (rawPoints: ChartPoint[]) => {
    const chart = chartRef.current;
    if (!chart) return;

    // Apply Timeframe Aggregations
    const seconds = getIntervalSeconds(interval);
    let aggregated = rawPoints;
    if (seconds > 300) { // Aggregate to higher intervals if selected
      const grouped: { [key: number]: ChartPoint[] } = {};
      rawPoints.forEach(p => {
        const key = Math.floor(p.time / seconds) * seconds;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(p);
      });
      aggregated = Object.keys(grouped).map(k => {
        const timeVal = parseInt(k);
        const list = grouped[timeVal];
        return {
          time: timeVal,
          date: list[list.length - 1].date,
          open: list[0].open,
          high: Math.max(...list.map(x => x.high)),
          low: Math.min(...list.map(x => x.low)),
          close: list[list.length - 1].close,
          volume: list.reduce((sum, x) => sum + x.volume, 0),
          pe: list[list.length - 1].pe
        };
      });
    }

    // Apply Chart Styles (Heikin Ashi, Renko, Line Break)
    let processed = aggregated;
    if (style === 'Heikin Ashi') processed = computeHeikinAshi(aggregated);
    else if (style === 'Renko') processed = computeRenko(aggregated);
    else if (style === 'Line Break') processed = computeLineBreak(aggregated);

    // Sync Series Types
    recreateMainSeries(style);

    const main = mainSeriesRef.current as any;
    const vol = volRef.current;

    if (!main || processed.length === 0) return;

    // Stream to active series
    if (style === 'Line' || style === 'Step line' || style === 'Histogram') {
      main.setData(processed.map(p => ({ time: p.time as Time, value: p.close })));
    } else if (style === 'Area' || style === 'Mountain') {
      main.setData(processed.map(p => ({ time: p.time as Time, value: p.close })));
    } else if (style === 'Baseline') {
      main.setData(processed.map(p => ({ time: p.time as Time, value: p.close })));
    } else {
      main.setData(processed.map(p => ({ time: p.time as Time, open: p.open, high: p.high, low: p.low, close: p.close })));
    }

    if (vol) {
      vol.setData(processed.map(p => ({
        time: p.time as Time,
        value: p.volume,
        color: p.close >= p.open ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'
      })));
    }

    // Compute standard active indicators
    renderTechnicalIndicators(processed);

    // Compute Custom script plots
    renderCustomPlots(processed);

    // Apply Strategy Backtester Trade markers
    applyMarkers(main, markers || []);

    chart.timeScale().fitContent();
  };

  /* Reactively update markers when Strategy backtest runs without full canvas rebuilds */
  useEffect(() => {
    const main = mainSeriesRef.current as any;
    if (!main) return;
    applyMarkers(main, markers || []);
  }, [markers]);

  const recreateMainSeries = (style: string) => {
    const chart = chartRef.current;
    if (!chart) return;

    if (mainSeriesRef.current) {
      chart.removeSeries(mainSeriesRef.current);
      mainSeriesRef.current = null;
      markersPluginRef.current = null;
    }

    const isDark = theme === 'dark';
    
    if (style === 'Candlestick' || style === 'Hollow Candlestick' || style === 'Heikin Ashi' || style === 'Renko' || style === 'Line Break') {
      const isHollow = style === 'Hollow Candlestick';
      mainSeriesRef.current = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981', downColor: '#ef4444',
        borderUpColor: '#10b981', borderDownColor: '#ef4444',
        wickUpColor: '#22c55e', wickDownColor: '#f87171',
        ...(isHollow ? { fillUpColor: 'rgba(0,0,0,0)', fillDownColor: 'rgba(0,0,0,0)' } : {})
      });
    } else if (style === 'Bar') {
      mainSeriesRef.current = chart.addSeries(BarSeries, {
        upColor: '#10b981', downColor: '#ef4444'
      });
    } else if (style === 'Line' || style === 'Step line') {
      mainSeriesRef.current = chart.addSeries(LineSeries, {
        color: '#3b82f6', lineWidth: 2
      });
    } else if (style === 'Area' || style === 'Mountain') {
      mainSeriesRef.current = chart.addSeries(AreaSeries, {
        topColor: isDark ? 'rgba(59, 130, 246, 0.45)' : 'rgba(59, 130, 246, 0.28)',
        bottomColor: 'rgba(59, 130, 246, 0.0)',
        lineColor: '#3b82f6', lineWidth: 2
      });
    } else if (style === 'Baseline') {
      mainSeriesRef.current = chart.addSeries(BaselineSeries, {
        baseValue: { type: 'price', price: dataRef.current[0]?.close || 500.0 },
        topFillColor1: 'rgba(16, 185, 129, 0.25)',
        topFillColor2: 'rgba(16, 185, 129, 0.05)',
        bottomFillColor1: 'rgba(239, 68, 68, 0.05)',
        bottomFillColor2: 'rgba(239, 68, 68, 0.25)',
        topLineColor: '#10b981', bottomLineColor: '#ef4444'
      });
    } else if (style === 'Histogram') {
      mainSeriesRef.current = chart.addSeries(HistogramSeries, {
        color: '#3b82f6'
      });
    }
  };

  const renderTechnicalIndicators = (points: ChartPoint[]) => {
    const chart = chartRef.current;
    if (!chart) return;

    // Clear old indicator series
    indicatorSeriesRef.current.forEach(series => chart.removeSeries(series));
    indicatorSeriesRef.current.clear();

    // Compute active indicators
    indicators.forEach(ind => {
      let seriesColor = '#3b82f6';
      let values: LineData<Time>[] = [];

      if (ind === 'SMA20') {
        seriesColor = '#f97316';
        values = calcSMA(points, 20);
      } else if (ind === 'SMA50') {
        seriesColor = '#10b981';
        values = calcSMA(points, 50);
      } else if (ind === 'EMA50') {
        seriesColor = '#a855f7';
        values = calcEMA(points, 50);
      } else if (ind === 'RSI14') {
        seriesColor = '#f43f5e';
        values = calcRSI(points, 14);
      }

      if (values.length > 0) {
        const s = chart.addSeries(LineSeries, {
          color: seriesColor,
          lineWidth: 2,
          priceLineVisible: false,
          crosshairMarkerVisible: false
        });
        s.setData(values);
        indicatorSeriesRef.current.set(ind, s);
      }
    });
  };

  /* Pine Script-Like Sandbox Parser Engine */
  const handleCompilePineScript = () => {
    setPineError('');
    try {
      const lines = pineScript.split('\n');
      let overlay = true;
      const plots: Array<{ name: string; color: string; values: any[] }> = [];

      lines.forEach(line => {
        const clean = line.trim();
        if (!clean || clean.startsWith('//')) return;

        // Parse study
        if (clean.startsWith('study(')) {
          const match = clean.match(/overlay\s*=\s*(true|false)/);
          if (match) overlay = match[1] === 'true';
          return;
        }

        // Parse assignment: e.g. fast = ema(close, 9)
        if (clean.includes('=')) {
          const parts = clean.split('=');
          const varName = parts[0].trim();
          const expr = parts[1].trim();

          const funcMatch = expr.match(/(ema|sma)\(\s*close\s*,\s*(\d+)\s*\)/i);
          if (funcMatch) {
            const func = funcMatch[1].toLowerCase();
            const period = parseInt(funcMatch[2]);
            const calculated = func === 'ema' ? calcEMA(dataRef.current, period) : calcSMA(dataRef.current, period);
            
            // Register this variable in local script scope
            (window as any)[varName] = calculated;
          }
          return;
        }

        // Parse plot: e.g. plot(fast, color="#3b82f6")
        if (clean.startsWith('plot(')) {
          const content = clean.substring(5, clean.length - 1);
          const args = content.split(',');
          const varToPlot = args[0].trim();
          let color = '#3b82f6';

          const colorMatch = clean.match(/color\s*=\s*["']([^"']+)["']/);
          if (colorMatch) color = colorMatch[1];

          const calculatedVals = (window as any)[varToPlot];
          if (calculatedVals) {
            plots.push({ name: varToPlot, color, values: calculatedVals });
          }
        }
      });

      setCustomPlots(plots);
      applyChartConfigurations(dataRef.current);
      setShowPineModal(false);
    } catch (err: any) {
      setPineError(`Sandbox Compiler Error: ${err.message}`);
    }
  };

  const renderCustomPlots = (points: ChartPoint[]) => {
    const chart = chartRef.current;
    if (!chart) return;

    customSeriesRef.current.forEach(series => chart.removeSeries(series));
    customSeriesRef.current.clear();

    customPlots.forEach(plot => {
      const s = chart.addSeries(LineSeries, {
        color: plot.color,
        lineWidth: 2,
        priceLineVisible: false,
        title: plot.name
      });
      // Align points
      const timesSet = new Set(points.map(p => p.time));
      const aligned = plot.values.filter(v => timesSet.has(Number(v.time)));
      
      s.setData(aligned);
      customSeriesRef.current.set(plot.name, s);
    });
  };

  /* UI Helpers & Themes Synchronization */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const isDark = theme === 'dark';
    chart.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#020617' : '#ffffff' },
        textColor: isDark ? '#94a3b8' : '#475569',
      },
      grid: {
        vertLines: { color: isDark ? '#0f172a' : '#f1f5f9' },
        horzLines: { color: isDark ? '#0f172a' : '#f1f5f9' },
      },
      rightPriceScale: { borderColor: isDark ? '#1e293b' : '#e2e8f0' },
      timeScale: { borderColor: isDark ? '#1e293b' : '#e2e8f0' },
      crosshair: {
        vertLine: { color: isDark ? '#475569' : '#cbd5e1', labelBackgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
        horzLine: { color: isDark ? '#475569' : '#cbd5e1', labelBackgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
      },
    });
  }, [theme]);

  const handleResetView = () => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.timeScale().fitContent();
    chart.priceScale('right').applyOptions({ autoScale: true });
  };

  const handleCreateCustomInterval = () => {
    const formatted = `${customValue}${customUnit === 'D' ? 'D' : customUnit}`;
    changeInterval(formatted);
    setShowCustomInterval(false);
  };

  const last = data[data.length - 1];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 select-none">
      
      {/* 📋 Dynamic Timeframe, Chart Style & Replay Controls Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-slate-200 dark:border-slate-800/80 shrink-0 bg-slate-50 dark:bg-slate-950">
        
        <div className="flex items-center gap-2">
          {/* Chart Style Picker Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowStyleMenu(!showStyleMenu)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-extrabold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              📊 {style} <ChevronDown className="w-3 h-3" />
            </button>
            {showStyleMenu && (
              <ul className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden z-30 shadow-xl w-44 font-semibold text-[10px]">
                {CHART_STYLES.map(s => (
                  <li
                    key={s}
                    onClick={() => { changeStyle(s); setShowStyleMenu(false); }}
                    className="flex items-center justify-between px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    {s} {style === s && <Check className="w-3.5 h-3.5 text-blue-500" />}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Time Intervals Selector */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
            {['1m', '5m', '1h', 'Daily', 'Weekly'].map(int => (
              <button
                key={int}
                onClick={() => changeInterval(int)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  interval === int
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {int}
              </button>
            ))}
            
            {/* Custom Timeframe Button */}
            <button
              onClick={() => setShowCustomInterval(!showCustomInterval)}
              className="p-1 rounded-lg text-[10px] text-slate-400 hover:text-blue-500 cursor-pointer"
              title="Add Custom Interval"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Custom Timeframe modal bubble */}
          {showCustomInterval && (
            <div className="absolute top-12 left-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-2xl z-30 flex items-center gap-2">
              <input
                type="number"
                value={customValue}
                onChange={e => setCustomValue(e.target.value)}
                className="w-14 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-center rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none"
              />
              <select
                value={customUnit}
                onChange={e => setCustomUnit(e.target.value as any)}
                className="bg-slate-100 dark:bg-slate-800 text-xs font-bold px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none"
              >
                <option value="s">Seconds</option>
                <option value="m">Minutes</option>
                <option value="h">Hours</option>
                <option value="D">Days</option>
              </select>
              <button
                onClick={handleCreateCustomInterval}
                className="px-3 py-1 bg-blue-500 text-white font-extrabold text-[10px] rounded-lg cursor-pointer"
              >
                Create
              </button>
            </div>
          )}
        </div>

        {/* 🎬 Historical Replay Mode Controller */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => {
              setReplayMode(!replayMode);
              if (!replayMode) {
                setReplayIndex(Math.floor(dataRef.current.length * 0.7));
                feedReplayData(Math.floor(dataRef.current.length * 0.7));
              } else {
                applyChartConfigurations(dataRef.current);
              }
            }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
              replayMode
                ? 'bg-amber-500/20 text-amber-600 dark:bg-amber-500/30 dark:text-amber-400 border border-amber-300 dark:border-amber-550/30 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Replay historical candles step-by-step"
          >
            ⏪ Replay {replayMode && 'ON'}
          </button>
          
          {replayMode && (
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setReplayPlaying(!replayPlaying)}
                className="p-1 rounded bg-white dark:bg-slate-800 hover:scale-105 cursor-pointer shadow-sm"
              >
                {replayPlaying ? <Pause className="w-3 h-3 text-red-500" /> : <Play className="w-3 h-3 text-emerald-500 fill-emerald-500" />}
              </button>
              <button
                onClick={() => {
                  setReplayIndex(prev => {
                    const nextIdx = Math.min(dataRef.current.length - 1, prev + 1);
                    feedReplayData(nextIdx);
                    return nextIdx;
                  });
                }}
                className="p-1 rounded bg-white dark:bg-slate-800 hover:scale-105 cursor-pointer shadow-sm"
                title="Step forward 1 candle"
              >
                <SkipForward className="w-3 h-3 text-slate-700 dark:text-slate-300" />
              </button>
              
              <span className="text-[9px] font-mono font-bold text-slate-400">
                Speed: 
                <select
                  value={replaySpeed}
                  onChange={e => setReplaySpeed(parseInt(e.target.value))}
                  className="bg-transparent border-none text-[9px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none ml-1 font-mono cursor-pointer"
                >
                  <option value="2000">2.0s</option>
                  <option value="1000">1.0s</option>
                  <option value="500">0.5s</option>
                  <option value="200">0.2s</option>
                </select>
              </span>
            </div>
          )}
        </div>

        {/* Dynamic Study Indicators & Custom Pine Compiler */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
          {['SMA20', 'EMA50', 'RSI14'].map(ind => (
            <button
              key={ind}
              onClick={() => toggleIndicator(ind)}
              className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold cursor-pointer transition-all ${
                indicators.has(ind)
                  ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {ind}
            </button>
          ))}
          
          <button
            onClick={() => setShowPineModal(true)}
            className="px-2.5 py-1 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 rounded-lg text-[10px] font-black cursor-pointer"
            title="Open Pine Script Study Sandbox Editor"
          >
            ✏️ Pine Script {customPlots.length > 0 && '(*)'}
          </button>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleResetView}
            className="p-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg transition-all flex items-center gap-1 text-[10px] font-black cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      {/* Pine Script Sandbox modal bubble */}
      {showPineModal && (
        <div className="absolute top-16 right-4 w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-2xl z-40">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">✏️ Pine Script Sandbox Compiler</h3>
            <button onClick={() => setShowPineModal(false)} className="text-xs font-bold text-slate-400 hover:text-red-500 cursor-pointer">Close</button>
          </div>
          <textarea
            value={pineScript}
            onChange={e => setPineScript(e.target.value)}
            rows={6}
            className="w-full p-3 bg-slate-950 border border-slate-800 text-slate-100 font-mono text-[10px] leading-relaxed rounded-xl focus:outline-none mb-3"
          />
          {pineError && <p className="text-[9px] text-red-550 dark:text-red-400 font-bold mb-3">⚠️ {pineError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCompilePineScript}
              className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[10px] rounded-xl transition-all cursor-pointer"
            >
              Compile & Plot Study
            </button>
            <button
              onClick={() => { setCustomPlots([]); applyChartConfigurations(dataRef.current); setShowPineModal(false); }}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-850 font-bold text-[10px] rounded-xl cursor-pointer"
            >
              Clear Plots
            </button>
          </div>
        </div>
      )}

      {/* Main Plot Section */}
      <div className="relative flex-1 min-h-0 flex flex-row">
        
        {/* Left Drawing Toolbar */}
        <div className="w-12 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-850 flex flex-col items-center justify-between py-4 shrink-0 z-20">
          <div className="flex flex-col items-center gap-1.5 w-full select-none">
            {DRAWING_TOOLS.map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all relative group cursor-pointer ${
                  activeTool === tool.id
                    ? 'bg-blue-500/10 dark:bg-blue-500/25 border border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm scale-105'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={tool.label}
              >
                {tool.icon}
                <div className="absolute left-full ml-2 px-2 py-1 rounded-lg bg-slate-900 dark:bg-slate-850 text-white text-[9px] font-extrabold whitespace-nowrap shadow-xl opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none transition-all z-30">
                  {tool.label}
                </div>
              </button>
            ))}

            <div className="w-6 h-[1px] bg-slate-200 dark:bg-slate-800 my-1" />

            <button
              onClick={() => {
                if (drawings.length === 0) return;
                if (confirm('Erase all vectors on this chart?')) {
                  setDrawings([]);
                  syncDrawingsToDB([]);
                }
              }}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-550/10 cursor-pointer group"
              disabled={drawings.length === 0}
              title="Clear drawings"
            >
              <Trash2 className="w-4 h-4" />
              <div className="absolute left-full ml-2 px-2 py-1 rounded-lg bg-slate-900 dark:bg-slate-850 text-white text-[9px] font-extrabold whitespace-nowrap shadow-xl opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none transition-all z-30">
                Clear all drawings
              </div>
            </button>
          </div>

          <div className="flex flex-col items-center gap-1.5 select-none">
            {DRAWING_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setDrawingColor(color)}
                style={{ backgroundColor: color }}
                className={`w-5 h-5 rounded-full border cursor-pointer transition-all ${
                  drawingColor === color ? 'scale-125 border-slate-900 dark:border-white shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                title={`Set stroke color to ${color}`}
              />
            ))}
          </div>
        </div>

        {/* Viewport Plotter */}
        <div className="relative flex-1 min-h-0 bg-white dark:bg-slate-950">
          {loading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 animate-pulse">Synchronising Feeds...</span>
            </div>
          )}
          {error && !loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center p-6">
              <div className="text-[10px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl shadow-sm">
                ⚠️ {error}
              </div>
            </div>
          )}

          <div className="relative w-full h-full">
            <div ref={containerRef} className="w-full h-full" />
            <svg
              ref={svgRef}
              className={`absolute inset-0 w-full h-full z-10 ${
                activeTool === 'cursor' ? 'pointer-events-none' : 'cursor-crosshair pointer-events-auto'
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {/* Render Saved Vector Drawings */}
              {renderableDrawings.map((d) => {
                if (d.type === 'horizontal' && d.y !== undefined) {
                  return <line key={d.id} x1="0" y1={d.y} x2="100%" y2={d.y} stroke={d.color} strokeWidth={1.5} />;
                }
                if (d.type === 'vertical' && d.x !== undefined) {
                  return <line key={d.id} x1={d.x} y1="0" x2={d.x} y2="100%" stroke={d.color} strokeWidth={1.5} />;
                }
                
                if (d.x1 !== undefined && d.y1 !== undefined && d.x2 !== undefined && d.y2 !== undefined) {
                  if (d.type === 'fibonacci') {
                    const y1Val = d.y1;
                    const strokeColor = d.color;
                    const diffY = d.y2 - d.y1;
                    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
                    return (
                      <g key={d.id}>
                        {levels.map(lvl => {
                          const yLevel = y1Val + diffY * lvl;
                          return (
                            <g key={lvl}>
                              <line x1="0" y1={yLevel} x2="100%" y2={yLevel} stroke={strokeColor} strokeWidth={1} strokeDasharray="3 3" />
                              <text x={10} y={yLevel - 4} fill={strokeColor} fontSize="8px" className="font-mono opacity-80">
                                {`Fib ${(lvl * 100).toFixed(1)}%`}
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    );
                  }

                  if (d.type === 'channel') {
                    const widthY = 40; // Simulated parallel channel offset
                    return (
                      <g key={d.id}>
                        <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={d.color} strokeWidth={2} />
                        <line x1={d.x1} y1={d.y1 + widthY} x2={d.x2} y2={d.y2 + widthY} stroke={d.color} strokeWidth={1.5} strokeDasharray="4 4" />
                        <line x1={d.x1} y1={d.y1 - widthY} x2={d.x2} y2={d.y2 - widthY} stroke={d.color} strokeWidth={1.5} strokeDasharray="4 4" />
                      </g>
                    );
                  }

                  if (d.type === 'riskreward') {
                    const diffY = d.y2 - d.y1;
                    return (
                      <g key={d.id}>
                        {/* Target Green Zone */}
                        <rect x={Math.min(d.x1, d.x2)} y={Math.min(d.y1, d.y1 - diffY)} width={Math.abs(d.x2 - d.x1)} height={Math.abs(diffY)} fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.3)" strokeWidth={1} />
                        {/* Stop Loss Red Zone */}
                        <rect x={Math.min(d.x1, d.x2)} y={d.y1} width={Math.abs(d.x2 - d.x1)} height={Math.abs(diffY)} fill="rgba(239,68,68,0.15)" stroke="rgba(239,68,68,0.3)" strokeWidth={1} />
                        <text x={Math.min(d.x1, d.x2) + 6} y={d.y1 - 6} fill="#10b981" fontSize="8px" className="font-extrabold uppercase">Risk/Reward: 2.5x</text>
                      </g>
                    );
                  }

                  if (d.type === 'shape_rect') {
                    return (
                      <rect
                        key={d.id}
                        x={Math.min(d.x1, d.x2)}
                        y={Math.min(d.y1, d.y2)}
                        width={Math.abs(d.x2 - d.x1)}
                        height={Math.abs(d.y2 - d.y1)}
                        fill="rgba(59,130,246,0.06)"
                        stroke={d.color}
                        strokeWidth={1.5}
                      />
                    );
                  }

                  if (d.type === 'annotation_text') {
                    return (
                      <g key={d.id}>
                        <rect x={d.x2 - 10} y={d.y2 - 22} width="60" height="16" rx="4" fill="#0f172a" opacity="0.9" />
                        <text x={d.x2 - 5} y={d.y2 - 11} fill="#ffffff" fontSize="8px" className="font-bold">Sticky Note</text>
                        <circle cx={d.x1} cy={d.y1} r={3} fill={d.color} />
                        <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={d.color} strokeWidth={1} />
                      </g>
                    );
                  }

                  // Standard Trendline
                  return (
                    <g key={d.id}>
                      <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={d.color} strokeWidth={2} />
                      <circle cx={d.x1} cy={d.y1} r={3.5} fill={d.color} />
                      <circle cx={d.x2} cy={d.y2} r={3.5} fill={d.color} />
                    </g>
                  );
                }
                return null;
              })}

              {/* Render Temporary Active Drags */}
              {renderableTempDrawing && (
                <g>
                  {renderableTempDrawing.type === 'shape_rect' ? (
                    <rect
                      x={Math.min(renderableTempDrawing.x1, renderableTempDrawing.x2)}
                      y={Math.min(renderableTempDrawing.y1, renderableTempDrawing.y2)}
                      width={Math.abs(renderableTempDrawing.x2 - renderableTempDrawing.x1)}
                      height={Math.abs(renderableTempDrawing.y2 - renderableTempDrawing.y1)}
                      fill="rgba(59,130,246,0.05)"
                      stroke={drawingColor}
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                    />
                  ) : (
                    <>
                      <line x1={renderableTempDrawing.x1} y1={renderableTempDrawing.y1} x2={renderableTempDrawing.x2} y2={renderableTempDrawing.y2} stroke={drawingColor} strokeWidth={2} strokeDasharray="4 4" />
                      <circle cx={renderableTempDrawing.x1} cy={renderableTempDrawing.y1} r={4} fill={drawingColor} />
                      <circle cx={renderableTempDrawing.x2} cy={renderableTempDrawing.y2} r={4} fill={drawingColor} />
                    </>
                  )}
                </g>
              )}
            </svg>
          </div>
        </div>

      </div>

    </div>
  );
}
