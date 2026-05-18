'use client';

import React, { useEffect, useRef, useState } from 'react';
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

/* ─── Types ──────────────────────────────────────────────────── */
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

interface Props {
  symbol: string;
  chartRange: string;
  onRangeChange: (r: string) => void;
  chartMode: 'price' | 'pe';
  onModeChange: (m: 'price' | 'pe') => void;
}

/* ─── Constants ──────────────────────────────────────────────── */
const MA_LIST = [
  { period: 9,   color: '#ffffff', label: 'MA9'   },
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
  symbol, chartRange, onRangeChange, chartMode, onModeChange,
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

  /* ── 1. Create chart once ──────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#020617' },
        textColor: '#94a3b8',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#0f172a' },
        horzLines: { color: '#0f172a' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#475569', width: 1, style: 3, labelBackgroundColor: '#1e293b' },
        horzLine: { color: '#475569', width: 1, style: 3, labelBackgroundColor: '#1e293b' },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: { top: 0.08, bottom: 0.28 },
      },
      timeScale: {
        borderColor: '#1e293b',
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

    const ro = new ResizeObserver(([e]) => {
      if (!e) return;
      const w = e.contentRect.width || 600;
      const h = e.contentRect.height || 350;
      chartRef.current?.applyOptions({ width: w, height: h });
    });
    ro.observe(containerRef.current);

    // Self-correcting layout timeout to fix potential dynamic flexbox race conditions
    const timer = setTimeout(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth || 600,
          height: containerRef.current.clientHeight || 350,
        });
      }
    }, 100);

    // Capture ref value so cleanup uses the same Map instance
    const maRefsMap = maRefs.current;
    return () => {
      clearTimeout(timer);
      ro.disconnect();
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

    // All setState calls are inside async callbacks — not synchronous in the effect body
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);   // activeMA intentionally excluded — handled by effect below

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

  /* ── UI helpers ──────────────────────────────────────────── */
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
    <div className="flex flex-col h-full bg-slate-950 select-none">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-slate-800/80 shrink-0">

        {/* Chart-type toggle */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          {(['price', 'pe'] as const).map(m => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                chartMode === m
                  ? m === 'price'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {m === 'price' ? '🕯 Candles' : '📊 P/E Ratio'}
            </button>
          ))}
        </div>

        {/* MA toggles (price mode only) */}
        {chartMode === 'price' && (
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none max-w-full pb-1">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mr-1 shrink-0">MA</span>
            {MA_LIST.map(({ period, color, label }) => (
              <button
                key={period}
                onClick={() => toggleMA(period)}
                style={activeMA.has(period) ? { backgroundColor: color + '25', borderColor: color, color } : {}}
                className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold border transition-all shrink-0 touch-manipulation ${
                  activeMA.has(period) ? '' : 'border-slate-700 text-slate-500 hover:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Range buttons */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl gap-0.5 overflow-x-auto scrollbar-none max-w-full">
          {RANGES.map(rng => (
            <button
              key={rng}
              onClick={() => onRangeChange(rng)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 touch-manipulation ${
                chartRange === rng ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {rng}
            </button>
          ))}
        </div>
      </div>

      {/* Price bar */}
      {last && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-1.5 border-b border-slate-800/40 shrink-0">
          <span className="text-sm font-black text-white">₹{last.close.toLocaleString('en-IN')}</span>
          <span className={`text-xs font-bold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
            {up ? '+' : ''}{delta.toFixed(2)}&nbsp;({up ? '+' : ''}{pct.toFixed(2)}%)
          </span>
          <span className="text-[10px] text-slate-500">{chartRange} change</span>
          <span className="ml-auto text-[10px] text-slate-600 font-mono hidden sm:block">
            O&nbsp;<span className="text-slate-400">{last.open}</span>
            &nbsp;H&nbsp;<span className="text-emerald-500">{last.high}</span>
            &nbsp;L&nbsp;<span className="text-red-500">{last.low}</span>
            &nbsp;C&nbsp;<span className="text-white font-bold">{last.close}</span>
          </span>
        </div>
      )}

      {/* Chart canvas */}
      <div className="relative flex-1 min-h-0">
        {loading && (
          <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Loading Market Data…</span>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <div className="text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-5 py-3 rounded-xl">
              ⚠ {error}
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* MA legend */}
      {chartMode === 'price' && (
        <div className="flex flex-wrap items-center gap-5 px-4 py-2 border-t border-slate-800/60 shrink-0">
          {MA_LIST.filter(m => activeMA.has(m.period) && data.length >= m.period).map(({ period, color, label }) => {
            const maData = calcSMA(data, period);
            const val    = maData[maData.length - 1]?.value;
            return (
              <div key={period} className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 rounded inline-block" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-bold text-slate-500">{label}</span>
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
