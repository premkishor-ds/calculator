'use client';

import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, MousePointer, Slash, Minus, Eraser, Trash2 } from 'lucide-react';
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
  type: 'trendline' | 'horizontal' | 'vertical';
  points?: { time: number; price: number }[];
  price?: number;
  time?: number;
  color: string;
}

interface RenderableDrawing {
  id: string;
  type: 'trendline' | 'horizontal' | 'vertical';
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  y?: number;
  x?: number;
  color: string;
}

interface TempDrawing {
  type: 'trendline' | 'horizontal' | 'vertical';
  startPoint?: { time: number; price: number; x: number; y: number };
  endPoint?: { time: number; price: number; x: number; y: number };
}

const DRAWING_COLORS = ['#22c55e', '#3b82f6', '#ef4444', '#eab308', '#a855f7'];

const DRAWING_TOOLS = [
  { id: 'cursor', label: 'Cursor (Move Chart)', icon: <MousePointer className="w-4 h-4" /> },
  { id: 'trendline', label: 'Trend Line', icon: <Slash className="w-4 h-4 rotate-[45deg]" /> },
  { id: 'horizontal', label: 'Horizontal Support/Resistance', icon: <Minus className="w-4 h-4" /> },
  { id: 'vertical', label: 'Vertical Timeline', icon: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="2" x2="12" y2="22" />
    </svg>
  )},
  { id: 'eraser', label: 'Eraser (Delete Line)', icon: <Eraser className="w-4 h-4" /> },
] as const;

interface Props {
  symbol: string;
  chartRange: string;
  onRangeChange: (r: string) => void;
  chartMode: 'price' | 'pe';
  onModeChange: (m: 'price' | 'pe') => void;
  theme: 'dark' | 'light';
}

/* ─── Constants ──────────────────────────────────────────────── */
const MA_LIST = [
  { period: 9,   color: '#6366f1', label: 'MA9'   },
  { period: 20,  color: '#f97316', label: 'MA20'  },
  { period: 50,  color: '#22c55e', label: 'MA50'  },
  { period: 100, color: '#ef4444', label: 'MA100' },
  { period: 200, color: '#3b82f6', label: 'MA200' },
] as const;

const RANGES = ['1D', '1W', '1M', '1Y', '5Y', 'MAX'] as const;

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

/* ─── Component ──────────────────────────────────────────────── */
export default function AdvancedChart({
  symbol, chartRange, onRangeChange, chartMode, onModeChange, theme,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const candleRef    = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const peLineRef    = useRef<ISeriesApi<'Line'> | null>(null);
  const volRef       = useRef<ISeriesApi<'Histogram'> | null>(null);
  const maRefs       = useRef<Map<number, ISeriesApi<'Line'>>>(new Map());
  const dataRef      = useRef<ChartPoint[]>([]);   // always-current data copy

  const [data,     setData]     = useState<ChartPoint[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [activeMA, setActiveMA] = useState<Set<number>>(new Set([20, 50]));

  /* ── Drawings State, Math Conversions & Database Sync ─── */
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [tempDrawing, setTempDrawing] = useState<TempDrawing | null>(null);
  const [activeTool, setActiveTool] = useState<'cursor' | 'trendline' | 'horizontal' | 'vertical' | 'eraser'>('cursor');
  const [drawingColor, setDrawingColor] = useState<string>('#22c55e');
  const [viewportTrigger, setViewportTrigger] = useState(0);

  const [renderableDrawings, setRenderableDrawings] = useState<RenderableDrawing[]>([]);
  const [renderableTempDrawing, setRenderableTempDrawing] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  const getActiveSeries = (): ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null => {
    return chartMode === 'price' ? candleRef.current : peLineRef.current;
  };

  const getDistanceToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  };

  /* Fetch drawings when symbol/mode changes */
  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;

    fetch(`/api/drawings?symbol=${encodeURIComponent(symbol)}&chartMode=${chartMode}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch drawings');
        return r.json();
      })
      .then(json => {
        if (!cancelled) {
          setDrawings(json || []);
        }
      })
      .catch(err => {
        console.error('Error loading drawings:', err);
      });

    return () => { cancelled = true; };
  }, [symbol, chartMode]);

  /* Sync drawings to DB */
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
            color: d.color
          }))
        })
      });
    } catch (err) {
      console.error('Error syncing drawings to DB:', err);
    }
  };

  /* Recalculate pixel coordinates outside of render phase to respect React rules of refs */
  useEffect(() => {
    const chart = chartRef.current;
    const series = getActiveSeries();
    if (!chart || !series) return;

    // Recalculate saved drawings
    const nextRenderables: RenderableDrawing[] = [];
    drawings.forEach((drawing, idx) => {
      if (drawing.type === 'horizontal' && drawing.price !== undefined) {
        const y = series.priceToCoordinate(drawing.price);
        if (y !== null) {
          nextRenderables.push({
            id: `saved-${idx}`,
            type: 'horizontal',
            y,
            color: drawing.color,
          });
        }
      } else if (drawing.type === 'vertical' && drawing.time !== undefined) {
        const x = chart.timeScale().timeToCoordinate(drawing.time as Time);
        if (x !== null) {
          nextRenderables.push({
            id: `saved-${idx}`,
            type: 'vertical',
            x,
            color: drawing.color,
          });
        }
      } else if (drawing.type === 'trendline' && drawing.points && drawing.points.length === 2) {
        const x1 = chart.timeScale().timeToCoordinate(drawing.points[0].time as Time);
        const y1 = series.priceToCoordinate(drawing.points[0].price);
        const x2 = chart.timeScale().timeToCoordinate(drawing.points[1].time as Time);
        const y2 = series.priceToCoordinate(drawing.points[1].price);

        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          nextRenderables.push({
            id: `saved-${idx}`,
            type: 'trendline',
            x1,
            y1,
            x2,
            y2,
            color: drawing.color,
          });
        }
      }
    });
    setRenderableDrawings(nextRenderables);

    // Recalculate temp drawing
    if (tempDrawing && tempDrawing.type === 'trendline' && tempDrawing.startPoint && tempDrawing.endPoint) {
      const x1 = chart.timeScale().timeToCoordinate(tempDrawing.startPoint.time as Time);
      const y1 = series.priceToCoordinate(tempDrawing.startPoint.price);
      const x2 = chart.timeScale().timeToCoordinate(tempDrawing.endPoint.time as Time);
      const y2 = series.priceToCoordinate(tempDrawing.endPoint.price);

      if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        setRenderableTempDrawing({ x1, y1, x2, y2 });
      } else {
        setRenderableTempDrawing(null);
      }
    } else {
      setRenderableTempDrawing(null);
    }
  }, [drawings, tempDrawing, viewportTrigger, chartMode]);

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

    if (activeTool === 'trendline') {
      setTempDrawing({
        type: 'trendline',
        startPoint: { time, price, x, y },
        endPoint: { time, price, x, y }
      });
    } else if (activeTool === 'horizontal') {
      const newDrawing: DrawingItem = {
        type: 'horizontal',
        price,
        color: drawingColor
      };
      const updated = [...drawings, newDrawing];
      setDrawings(updated);
      syncDrawingsToDB(updated);
    } else if (activeTool === 'vertical') {
      const newDrawing: DrawingItem = {
        type: 'vertical',
        time,
        color: drawingColor
      };
      const updated = [...drawings, newDrawing];
      setDrawings(updated);
      syncDrawingsToDB(updated);
    } else if (activeTool === 'eraser') {
      eraseAt(x, y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === 'cursor') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'trendline' && tempDrawing && tempDrawing.startPoint) {
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
    }
  };

  const handleMouseUp = () => {
    if (activeTool === 'trendline' && tempDrawing && tempDrawing.startPoint && tempDrawing.endPoint) {
      const p1 = tempDrawing.startPoint;
      const p2 = tempDrawing.endPoint;
      if (p1.time !== p2.time || Math.abs(p1.price - p2.price) > 0.001) {
        const newDrawing: DrawingItem = {
          type: 'trendline',
          points: [
            { time: p1.time, price: p1.price },
            { time: p2.time, price: p2.price }
          ],
          color: drawingColor
        };
        const updated = [...drawings, newDrawing];
        setDrawings(updated);
        syncDrawingsToDB(updated);
      }
    }
    setTempDrawing(null);
  };

  const eraseAt = (x: number, y: number) => {
    const chart = chartRef.current;
    const series = getActiveSeries();
    if (!chart || !series) return;

    let closestIndex = -1;
    let minDistance = 12;

    drawings.forEach((drawing, idx) => {
      if (drawing.type === 'horizontal' && drawing.price !== undefined) {
        const yLine = series.priceToCoordinate(drawing.price);
        if (yLine !== null) {
          const dist = Math.abs(y - yLine);
          if (dist < minDistance) {
            minDistance = dist;
            closestIndex = idx;
          }
        }
      } else if (drawing.type === 'vertical' && drawing.time !== undefined) {
        const xLine = chart.timeScale().timeToCoordinate(drawing.time as Time);
        if (xLine !== null) {
          const dist = Math.abs(x - xLine);
          if (dist < minDistance) {
            minDistance = dist;
            closestIndex = idx;
          }
        }
      } else if (drawing.type === 'trendline' && drawing.points && drawing.points.length === 2) {
        const x1 = chart.timeScale().timeToCoordinate(drawing.points[0].time as Time);
        const y1 = series.priceToCoordinate(drawing.points[0].price);
        const x2 = chart.timeScale().timeToCoordinate(drawing.points[1].time as Time);
        const y2 = series.priceToCoordinate(drawing.points[1].price);

        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          const dist = getDistanceToSegment(x, y, x1, y1, x2, y2);
          if (dist < minDistance) {
            minDistance = dist;
            closestIndex = idx;
          }
        }
      }
    });

    if (closestIndex !== -1) {
      const updated = drawings.filter((_, idx) => idx !== closestIndex);
      setDrawings(updated);
      syncDrawingsToDB(updated);
    }
  };

  /* ── 1. Create chart once ──────────────────────────────────── */
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
        vertLine: { color: isDark ? '#475569' : '#cbd5e1', width: 1, style: 3, labelBackgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
        horzLine: { color: isDark ? '#475569' : '#cbd5e1', width: 1, style: 3, labelBackgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
      },
      rightPriceScale: {
        borderColor: isDark ? '#1e293b' : '#e2e8f0',
        scaleMargins: { top: 0.08, bottom: 0.28 },
      },
      timeScale: {
        borderColor: isDark ? '#1e293b' : '#e2e8f0',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
      },
      width:  containerRef.current.clientWidth || 600,
      height: containerRef.current.clientHeight || 350,
    });

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', downColor: '#ef4444',
      borderUpColor: '#10b981', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#f87171',
    });

    const peLine = chart.addSeries(LineSeries, {
      color: '#a855f7', lineWidth: 2,
      priceLineVisible: false, lastValueVisible: true,
      title: 'P/E', visible: false,
    });

    const vol = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
      visible: false,
    });

    chartRef.current  = chart;
    candleRef.current = candle;
    peLineRef.current = peLine;
    volRef.current    = vol;

    const handleRangeChange = () => {
      setViewportTrigger(prev => prev + 1);
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);

    const ro = new ResizeObserver(([e]) => {
      if (!e) return;
      const w = e.contentRect.width || 600;
      const h = e.contentRect.height || 350;
      chartRef.current?.applyOptions({ width: w, height: h });
      setViewportTrigger(prev => prev + 1);
    });
    ro.observe(containerRef.current);

    const timer = setTimeout(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth || 600,
          height: containerRef.current.clientHeight || 350,
        });
        setViewportTrigger(prev => prev + 1);
      }
    }, 100);

    const maRefsMap = maRefs.current;
    return () => {
      clearTimeout(timer);
      ro.disconnect();
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      chart.remove();
      chartRef.current  = null;
      candleRef.current = null;
      peLineRef.current = null;
      volRef.current    = null;
      maRefsMap.clear();
    };
  }, []);

  /* ── 2. Fetch data when symbol/range changes ─────────────── */
  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;

    fetch(`/api/watchlist/${encodeURIComponent(symbol)}/chart?range=${chartRange.toLowerCase()}`)
      .then(r => {
        if (!cancelled) setLoading(true);
        if (!r.ok) throw new Error('Failed to fetch chart data');
        return r.json();
      })
      .then(json => {
        if (!cancelled) {
          setError('');
          setData(json.points ?? []);
          setLoading(false);
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Chart load error');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [symbol, chartRange]);

  /* ── Helper: sync MA series with chart (no hooks inside) ─── */
  const syncMAs = (pts: ChartPoint[], activePeriods: Set<number>) => {
    const chart = chartRef.current;
    if (!chart) return;
    MA_LIST.forEach(({ period, color, label }) => {
      const existing = maRefs.current.get(period);
      if (activePeriods.has(period)) {
        const maData = calcSMA(pts, period);
        if (existing) {
          existing.setData(maData);
        } else if (pts.length >= period) {
          const s = chart.addSeries(LineSeries, {
            color, lineWidth: 1,
            priceLineVisible: false, lastValueVisible: false,
            crosshairMarkerVisible: false, title: label,
          });
          s.setData(maData);
          maRefs.current.set(period, s);
        }
      } else {
        if (existing) {
          chart.removeSeries(existing);
          maRefs.current.delete(period);
        }
      }
    });
  };

  /* ── 3. Push data to chart series ────────────────────────── */
  useEffect(() => {
    const chart  = chartRef.current;
    const candle = candleRef.current;
    const vol    = volRef.current;
    const peLine = peLineRef.current;
    if (!chart || !candle || !vol || !peLine || data.length === 0) return;

    dataRef.current = data;

    candle.setData(data.map(p => ({
      time: p.time as Time, open: p.open, high: p.high, low: p.low, close: p.close,
    } as CandlestickData<Time>)));

    vol.setData(data.map(p => ({
      time: p.time as Time, value: p.volume,
      color: p.close >= p.open ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)',
    } as HistogramData<Time>)));

    const peData: LineData<Time>[] = data
      .filter(p => p.pe > 0)
      .map(p => ({ time: p.time as Time, value: p.pe }));
    peLine.setData(peData);

    syncMAs(data, activeMA);
    chart.timeScale().fitContent();
  }, [data]);

  /* ── 4. Update MA visibility when toggles change ─────────── */
  useEffect(() => {
    if (dataRef.current.length > 0) syncMAs(dataRef.current, activeMA);
  }, [activeMA]);

  /* ── 5. Toggle Price vs PE mode ──────────────────────────── */
  useEffect(() => {
    const isPrice = chartMode === 'price';
    candleRef.current?.applyOptions({ visible: isPrice });
    volRef.current?.applyOptions({ visible: isPrice });
    peLineRef.current?.applyOptions({ visible: !isPrice });
    maRefs.current.forEach(s => s.applyOptions({ visible: isPrice }));
  }, [chartMode]);

  /* ── 6. Dynamically apply Theme Options to Chart ─────────── */
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
      rightPriceScale: {
        borderColor: isDark ? '#1e293b' : '#e2e8f0',
      },
      timeScale: {
        borderColor: isDark ? '#1e293b' : '#e2e8f0',
      },
      crosshair: {
        vertLine: { color: isDark ? '#475569' : '#cbd5e1', labelBackgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
        horzLine: { color: isDark ? '#475569' : '#cbd5e1', labelBackgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
      },
    });
  }, [theme]);

  /* ── UI helpers ──────────────────────────────────────────── */
  const handleResetView = () => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.timeScale().fitContent();
    chart.priceScale('right').applyOptions({ autoScale: true });
  };

  const toggleMA = (period: number) =>
    setActiveMA(prev => {
      const next = new Set(prev);
      if (next.has(period)) { next.delete(period); } else { next.add(period); }
      return next;
    });

  const last  = data[data.length - 1];
  const first = data[0];
  const delta = last && first ? last.close - first.close : 0;
  const pct   = first?.close > 0 ? (delta / first.close) * 100 : 0;
  const up    = delta >= 0;

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 select-none">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-slate-200 dark:border-slate-800/80 shrink-0 bg-slate-50 dark:bg-slate-950">

        {/* Chart-type toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
          {(['price', 'pe'] as const).map(m => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                chartMode === m
                  ? m === 'price'
                    ? 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 shadow-sm'
                    : 'bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 shadow-sm'
                  : 'text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {m === 'price' ? '🕯 Candles' : '📊 P/E Ratio'}
            </button>
          ))}
        </div>

        {/* MA toggles (price mode only) */}
        {chartMode === 'price' && (
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none max-w-full pb-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mr-1 shrink-0">MA</span>
            {MA_LIST.map(({ period, color, label }) => (
              <button
                key={period}
                onClick={() => toggleMA(period)}
                style={activeMA.has(period) ? { backgroundColor: color + '25', borderColor: color, color } : {}}
                className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold border transition-all shrink-0 touch-manipulation ${
                  activeMA.has(period) ? '' : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Range and Reset buttons */}
        <div className="flex items-center gap-2 max-w-full">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl gap-0.5 overflow-x-auto scrollbar-none max-w-full">
            {RANGES.map(rng => (
              <button
                key={rng}
                onClick={() => onRangeChange(rng)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 touch-manipulation ${
                  chartRange === rng ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm font-extrabold border border-slate-200 dark:border-slate-600' : 'text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {rng}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleResetView}
            className="p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-white rounded-xl transition-all flex items-center justify-center gap-1.5 text-[11px] font-bold shrink-0 touch-manipulation hover:scale-105 active:scale-[0.98] cursor-pointer"
            title="Reset Zoom & Auto-Scale Price"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Price bar */}
      {last && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-1.5 border-b border-slate-100 dark:border-slate-800/40 shrink-0 bg-white dark:bg-slate-950">
          <span className="text-sm font-black text-slate-900 dark:text-white">₹{last.close.toLocaleString('en-IN')}</span>
          <span className={`text-xs font-bold ${up ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            {up ? '+' : ''}{delta.toFixed(2)}&nbsp;({up ? '+' : ''}{pct.toFixed(2)}%)
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{chartRange} change</span>
          <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-600 font-mono hidden sm:block">
            O&nbsp;<span className="text-slate-600 dark:text-slate-400">{last.open}</span>
            &nbsp;H&nbsp;<span className="text-emerald-500 dark:text-emerald-500">{last.high}</span>
            &nbsp;L&nbsp;<span className="text-red-500 dark:text-red-500">{last.low}</span>
            &nbsp;C&nbsp;<span className="text-slate-900 dark:text-white font-bold">{last.close}</span>
          </span>
        </div>
      )}

      {/* Chart Canvas & Left Vertical Toolbar */}
      <div className="relative flex-1 min-h-0 bg-white dark:bg-slate-950 flex flex-row">
        
        {/* Vertical Drawing Toolbar */}
        <div className="w-12 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center justify-between py-4 shrink-0 z-10 select-none">
          <div className="flex flex-col items-center gap-1.5 w-full">
            {DRAWING_TOOLS.map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all relative group cursor-pointer ${
                  activeTool === tool.id
                    ? 'bg-blue-500/10 dark:bg-blue-500/25 border border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm scale-105'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={tool.label}
              >
                {tool.icon}
                <div className="absolute left-full ml-2 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-bold whitespace-nowrap shadow-xl opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none transition-all z-20">
                  {tool.label}
                </div>
              </button>
            ))}

            <div className="w-6 h-[1px] bg-slate-200 dark:bg-slate-800 my-2" />

            {/* Clear All Button */}
            <button
              onClick={() => {
                if (drawings.length === 0) return;
                if (confirm('Clear all drawings on this chart?')) {
                  setDrawings([]);
                  syncDrawingsToDB([]);
                }
              }}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all relative group cursor-pointer text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 ${
                drawings.length === 0 ? 'opacity-40 cursor-not-allowed' : ''
              }`}
              disabled={drawings.length === 0}
              title="Clear All Drawings"
            >
              <Trash2 className="w-4 h-4" />
              <div className="absolute left-full ml-2 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-bold whitespace-nowrap shadow-xl opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none transition-all z-20">
                Clear All Drawings
              </div>
            </button>
          </div>

          {/* Color palette selections at the bottom */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-[1px] bg-slate-200 dark:bg-slate-800 mb-1" />
            {DRAWING_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setDrawingColor(color)}
                className={`w-5 h-5 rounded-full transition-all flex items-center justify-center border cursor-pointer ${
                  drawingColor === color
                    ? 'scale-125 border-slate-900 dark:border-white shadow-md'
                    : 'border-transparent opacity-60 hover:opacity-100 hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
                title={`Set Line Color to ${color}`}
              />
            ))}
          </div>
        </div>

        {/* Chart Viewport container */}
        <div className="relative flex-1 min-h-0">
          {loading && (
            <div className="absolute inset-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest animate-pulse">Loading Market Data…</span>
            </div>
          )}
          {error && !loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="text-xs text-red-500 dark:text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-5 py-3 rounded-xl">
                ⚠ {error}
              </div>
            </div>
          )}

          {/* Interactive Chart & SVG Canvas wrapper */}
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
              {/* Existing saved drawings */}
              {renderableDrawings.map((drawing) => {
                if (drawing.type === 'horizontal' && drawing.y !== undefined) {
                  return (
                    <line
                      key={drawing.id}
                      x1={0}
                      y1={drawing.y}
                      x2="100%"
                      y2={drawing.y}
                      stroke={drawing.color}
                      strokeWidth={2}
                      className="transition-all duration-75"
                    />
                  );
                }

                if (drawing.type === 'vertical' && drawing.x !== undefined) {
                  return (
                    <line
                      key={drawing.id}
                      x1={drawing.x}
                      y1={0}
                      x2={drawing.x}
                      y2="100%"
                      stroke={drawing.color}
                      strokeWidth={2}
                      className="transition-all duration-75"
                    />
                  );
                }

                if (drawing.type === 'trendline' && drawing.x1 !== undefined && drawing.y1 !== undefined && drawing.x2 !== undefined && drawing.y2 !== undefined) {
                  return (
                    <g key={drawing.id}>
                      <line
                        x1={drawing.x1}
                        y1={drawing.y1}
                        x2={drawing.x2}
                        y2={drawing.y2}
                        stroke={drawing.color}
                        strokeWidth={2}
                      />
                      <circle cx={drawing.x1} cy={drawing.y1} r={3.5} fill={drawing.color} className="shadow-sm" />
                      <circle cx={drawing.x2} cy={drawing.y2} r={3.5} fill={drawing.color} className="shadow-sm" />
                    </g>
                  );
                }

                return null;
              })}

              {/* Temporary active drawing */}
              {renderableTempDrawing && (
                <g>
                  <line
                    x1={renderableTempDrawing.x1}
                    y1={renderableTempDrawing.y1}
                    x2={renderableTempDrawing.x2}
                    y2={renderableTempDrawing.y2}
                    stroke={drawingColor}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                  <circle cx={renderableTempDrawing.x1} cy={renderableTempDrawing.y1} r={4} fill={drawingColor} />
                  <circle cx={renderableTempDrawing.x2} cy={renderableTempDrawing.y2} r={4} fill={drawingColor} />
                </g>
              )}
            </svg>
          </div>
        </div>

      </div>

      {/* MA legend */}
      {chartMode === 'price' && (
        <div className="flex flex-wrap items-center gap-5 px-4 py-2 border-t border-slate-100 dark:border-slate-800/60 shrink-0 bg-slate-50 dark:bg-slate-950">
          {MA_LIST.filter(m => activeMA.has(m.period) && data.length >= m.period).map(({ period, color, label }) => {
            const maData = calcSMA(data, period);
            const val    = maData[maData.length - 1]?.value;
            return (
              <div key={period} className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 rounded inline-block" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{label}</span>
                {val !== undefined && (
                  <span className="text-[10px] font-black" style={{ color }}>₹{val.toFixed(0)}</span>
                )}
              </div>
            );
          })}
          <span className="ml-auto text-[10px] text-slate-700">Powered by TradingView Lightweight Charts™</span>
        </div>
      )}
    </div>
  );
}
