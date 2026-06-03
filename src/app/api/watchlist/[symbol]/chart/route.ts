import { NextRequest, NextResponse } from 'next/server';

import { yahooFinance } from '@/lib/yahoo-finance';

// Server-side cache: key = `${symbol}:${interval}`, TTL varies by interval
const chartCache = new Map<string, { data: any; ts: number }>();

function getCacheTTL(interval: string): number {
  // Intraday data expires faster; daily+ can be cached longer
  if (['1m', '2m', '5m'].includes(interval)) return 2 * 60 * 1000;       // 2 min
  if (['15m', '30m', '45m', '60m', '90m'].includes(interval)) return 5 * 60 * 1000; // 5 min
  return 15 * 60 * 1000; // 15 min for daily/weekly/monthly
}

/**
 * Maps a UI interval string to:
 *  - yahooInterval: the Yahoo Finance chart interval
 *  - period1: how far back to fetch
 *  - isIntraday: whether timestamps include time
 */
function resolveIntervalConfig(uiInterval: string): {
  yahooInterval: '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m' | '1d' | '1wk' | '1mo';
  period1: Date;
  isIntraday: boolean;
} {
  const now = new Date();

  const daysAgo = (d: number) => { const dt = new Date(now); dt.setDate(dt.getDate() - d); return dt; };
  const yearsAgo = (y: number) => { const dt = new Date(now); dt.setFullYear(dt.getFullYear() - y); return dt; };

  switch (uiInterval) {
    case '1m':     return { yahooInterval: '1m',  period1: daysAgo(7),    isIntraday: true };
    case '3m':     return { yahooInterval: '1m',  period1: daysAgo(7),    isIntraday: true };
    case '5m':     return { yahooInterval: '5m',  period1: daysAgo(59),   isIntraday: true };
    case '15m':    return { yahooInterval: '15m', period1: daysAgo(59),   isIntraday: true };
    case '30m':    return { yahooInterval: '30m', period1: daysAgo(59),   isIntraday: true };
    case '45m':    return { yahooInterval: '15m', period1: daysAgo(59),   isIntraday: true };
    case '1h':     return { yahooInterval: '60m', period1: daysAgo(729),  isIntraday: true };
    case '2h':     return { yahooInterval: '60m', period1: daysAgo(729),  isIntraday: true };
    case '4h':     return { yahooInterval: '60m', period1: daysAgo(729),  isIntraday: true };
    case 'Daily':  return { yahooInterval: '1d',  period1: yearsAgo(20),  isIntraday: false };
    case 'Weekly': return { yahooInterval: '1wk', period1: yearsAgo(20),  isIntraday: false };
    case 'Monthly':return { yahooInterval: '1mo', period1: yearsAgo(20),  isIntraday: false };
    case 'Yearly': return { yahooInterval: '1mo', period1: yearsAgo(30),  isIntraday: false };
    // Legacy range-based fallbacks
    case '1d':     return { yahooInterval: '5m',  period1: daysAgo(1),    isIntraday: true };
    case '1w':     return { yahooInterval: '15m', period1: daysAgo(7),    isIntraday: true };
    case '1y':     return { yahooInterval: '1d',  period1: yearsAgo(1),   isIntraday: false };
    case '5y':     return { yahooInterval: '1wk', period1: yearsAgo(5),   isIntraday: false };
    case 'max':    return { yahooInterval: '1mo', period1: new Date('2000-01-01'), isIntraday: false };
    default:       return { yahooInterval: '1d',  period1: yearsAgo(1),   isIntraday: false };
  }
}

function formatDate(d: Date, isIntraday: boolean): string {
  if (isNaN(d.getTime())) return '';
  if (isIntraday) {
    const day = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day} ${time}`;
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function aggregatePoints<T extends {
  time: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  pe: number;
}>(points: T[], uiInterval: string, isIntraday: boolean): T[] {
  const bucketMinutes: Record<string, number> = {
    '3m': 3,
    '10m': 10,
    '45m': 45,
    '2h': 120,
    '4h': 240,
  };
  const minutes = bucketMinutes[uiInterval];
  if (!minutes || points.length === 0) return points;

  const buckets = new Map<number, T[]>();
  for (const point of points) {
    const bucketTime = Math.floor(point.time / (minutes * 60)) * minutes * 60;
    const existing = buckets.get(bucketTime) || [];
    existing.push(point);
    buckets.set(bucketTime, existing);
  }

  return Array.from(buckets.entries())
    .map(([bucketTime, group]) => {
      const first = group[0];
      const last = group[group.length - 1];
      const bucketDate = new Date(bucketTime * 1000);
      return {
        ...last,
        time: bucketTime,
        date: formatDate(bucketDate, isIntraday),
        open: first.open,
        high: Number(Math.max(...group.map((item) => item.high)).toFixed(2)),
        low: Number(Math.min(...group.map((item) => item.low)).toFixed(2)),
        close: last.close,
        volume: group.reduce((sum, item) => sum + item.volume, 0),
        pe: last.pe,
      };
    })
    .sort((a, b) => a.time - b.time);
}

function generateProceduralMockChartPoints(symbol: string, uiInterval: string) {
  const upperSymbol = symbol.toUpperCase();
  const seed = upperSymbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const { isIntraday } = resolveIntervalConfig(uiInterval);
  
  const basePrice = 50 + (seed % 1950);
  const vol = Math.floor(50000 + (seed % 950000));
  const pe = 12 + (seed % 35);
  const eps = Number((basePrice / pe).toFixed(2));
  
  const points = [];
  const now = new Date();
  
  let count = 60;
  let intervalDaysStep = 6;
  if (uiInterval === '1d' || isIntraday) {
    count = 40;
    intervalDaysStep = 0.1;
  } else if (uiInterval === 'Weekly') {
    count = 100;
    intervalDaysStep = 7;
  } else if (uiInterval === 'Monthly') {
    count = 150;
    intervalDaysStep = 30;
  }
  
  let currentPrice = basePrice * 0.85;
  for (let i = count; i >= 0; i--) {
    const date = new Date(now);
    if (isIntraday) {
      date.setMinutes(now.getMinutes() - i * 15);
    } else {
      date.setDate(now.getDate() - i * intervalDaysStep);
    }
    
    const randChange = -1.5 + ((seed * i) % 310) / 100;
    currentPrice = currentPrice * (1 + randChange / 100);
    
    if (currentPrice > basePrice * 1.35) currentPrice = basePrice * 1.30;
    if (currentPrice < basePrice * 0.65) currentPrice = basePrice * 0.70;
    
    const close = Number(currentPrice.toFixed(2));
    const open = Number((close * (0.99 + ((seed * i) % 21) / 1000)).toFixed(2));
    const high = Number((Math.max(open, close) * (1.002 + ((seed * i) % 15) / 1000)).toFixed(2));
    const low = Number((Math.min(open, close) * (0.998 - ((seed * i) % 15) / 1000)).toFixed(2));
    
    points.push({
      time: Math.floor(date.getTime() / 1000),
      date: formatDate(date, isIntraday),
      open,
      high,
      low,
      close,
      volume: Math.floor(vol * (0.5 + ((seed + i) % 100) / 100)),
      pe: eps > 0 ? Number((close / eps).toFixed(2)) : 0,
    });
  }
  
  if (points.length > 0) {
    points[points.length - 1].close = basePrice;
  }
  
  const maxVol = points.length > 0 ? Math.max(...points.map((q) => q.volume || 0)) : 1;
  return { interval: uiInterval, maxVolume: maxVol, points };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    // Accept both `interval` (new) and `range` (legacy) params
    const uiInterval = searchParams.get('interval') || searchParams.get('range') || 'Daily';

    const cacheKey = `${symbol.toUpperCase()}:${uiInterval}`;
    const cached = chartCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < getCacheTTL(uiInterval)) {
      return NextResponse.json(cached.data);
    }

    const { yahooInterval, period1, isIntraday } = resolveIntervalConfig(uiInterval);

    const needsHistoricalEps = !isIntraday;
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    const epsPeriod1 = `${tenYearsAgo.getFullYear()}-01-01`;

    const promises: any[] = [
      yahooFinance.chart(symbol, { period1, interval: yahooInterval }),
      yahooFinance.quoteSummary(symbol, { modules: ['defaultKeyStatistics'] }),
    ];
    if (needsHistoricalEps) {
      promises.push(
        yahooFinance.fundamentalsTimeSeries(symbol, { period1: epsPeriod1, module: 'financials', type: 'annual' })
      );
    }

    const results = await Promise.allSettled(promises);
    const chartRes = results[0];
    const statsRes = results[1];
    const financialsRes = needsHistoricalEps ? results[2] : null;

    if (chartRes.status === 'rejected') {
      const mockChartData = generateProceduralMockChartPoints(symbol, uiInterval);
      return NextResponse.json(mockChartData);
    }

    const chartQuotes: any[] = (chartRes.value as any).quotes || [];

    let currentEps = 0;
    if (statsRes.status === 'fulfilled' && statsRes.value) {
      const stats = (statsRes.value as any).defaultKeyStatistics || {};
      currentEps = stats.trailingEps || stats.forwardEps || 0;
    }

    let sortedFinancials: { date: Date; eps: number }[] = [];
    if (financialsRes && financialsRes.status === 'fulfilled' && Array.isArray(financialsRes.value)) {
      sortedFinancials = (financialsRes.value as any[])
        .map((f) => ({ date: new Date(f.date), eps: f.basicEPS || f.dilutedEPS || 0 }))
        .filter((f) => !isNaN(f.date.getTime()))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    const rawPoints = chartQuotes
      .filter((q) => q.close != null)
      .map((q) => {
        const qDate = new Date(q.date);
        let activeEps = currentEps;
        if (needsHistoricalEps && sortedFinancials.length > 0) {
          for (let i = sortedFinancials.length - 1; i >= 0; i--) {
            if (sortedFinancials[i].date <= qDate) { activeEps = sortedFinancials[i].eps; break; }
          }
        }
        const close = Number(q.close.toFixed(2));
        const open  = Number((q.open  || q.close).toFixed(2));
        const high  = Number((q.high  || q.close).toFixed(2));
        const low   = Number((q.low   || q.close).toFixed(2));
        return {
          time: Math.floor(qDate.getTime() / 1000),
          date: formatDate(qDate, isIntraday),
          open, high, low, close,
          volume: q.volume || 0,
          pe: activeEps > 0 ? Number((close / activeEps).toFixed(2)) : 0,
        };
      })
      .filter((p, idx, arr) => arr.findLastIndex((x) => x.time === p.time) === idx)
      .sort((a, b) => a.time - b.time);

    const points = aggregatePoints(rawPoints, uiInterval, isIntraday);
    const maxVol = points.length > 0 ? Math.max(...points.map((q) => q.volume || 0)) : 1;

    const responseData = { interval: uiInterval, maxVolume: maxVol, points };
    chartCache.set(cacheKey, { data: responseData, ts: Date.now() });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Failed to fetch detailed chart data:', error);
    return NextResponse.json({ error: 'Failed to fetch detailed chart data' }, { status: 500 });
  }
}
