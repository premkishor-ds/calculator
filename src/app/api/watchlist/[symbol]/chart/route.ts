/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

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
    const range = searchParams.get('range') || '1y';

    // Map query range to Yahoo Finance period1 and interval parameters
    let period1Date: Date;
    let interval: '5m' | '15m' | '1d' | '1wk' | '1mo' = '1d';

    switch (range.toLowerCase()) {
      case '1d':
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        period1Date = oneDayAgo;
        interval = '5m';
        break;
      case '1w':
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        period1Date = oneWeekAgo;
        interval = '15m';
        break;
      case '1m':
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        period1Date = oneMonthAgo;
        interval = '1d';
        break;
      case '1y':
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        period1Date = oneYearAgo;
        interval = '1d';
        break;
      case '5y':
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        period1Date = fiveYearsAgo;
        interval = '1wk';
        break;
      case 'max':
        period1Date = new Date('2000-01-01');
        interval = '1mo';
        break;
      default:
        const defOneYearAgo = new Date();
        defOneYearAgo.setFullYear(defOneYearAgo.getFullYear() - 1);
        period1Date = defOneYearAgo;
        interval = '1d';
    }

    const config = {
      period1: period1Date,
      interval
    };

    const needsHistoricalEps = ['5y', 'max'].includes(range.toLowerCase());

    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    const period1 = `${tenYearsAgo.getFullYear()}-01-01`;

    // Fetch resources in parallel
    const promises = [
      yahooFinance.chart(symbol, config),
      yahooFinance.quoteSummary(symbol, { modules: ['defaultKeyStatistics'] })
    ] as any[];

    if (needsHistoricalEps) {
      promises.push(
        yahooFinance.fundamentalsTimeSeries(symbol, {
          period1,
          module: 'financials',
          type: 'annual'
        })
      );
    }

    const results = await Promise.allSettled(promises);

    const chartRes = results[0];
    const statsRes = results[1];
    const financialsRes = needsHistoricalEps ? results[2] : null;

    if (chartRes.status === 'rejected') {
      return NextResponse.json({ error: `Failed to fetch chart data for ${symbol}` }, { status: 502 });
    }

    const chartDataRaw = chartRes.value;
    const chartQuotes = chartDataRaw.quotes || [];

    // Get current EPS for baseline fallback
    let currentEps = 0;
    if (statsRes.status === 'fulfilled' && statsRes.value) {
      const stats = statsRes.value.defaultKeyStatistics || {};
      currentEps = stats.trailingEps || stats.forwardEps || 0;
    }

    // Set up chronological annual financials for historical EPS matching
    let sortedFinancials: { date: Date; eps: number }[] = [];
    if (financialsRes && financialsRes.status === 'fulfilled' && Array.isArray(financialsRes.value)) {
      sortedFinancials = financialsRes.value
        .map((f: any) => ({
          date: new Date(f.date),
          eps: f.basicEPS || f.dilutedEPS || 0
        }))
        .filter((f: any) => !isNaN(f.date.getTime()))
        .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
    }

    // Format point date based on the selected range
    const formatPointDate = (dateVal: Date, r: string) => {
      try {
        const dObj = new Date(dateVal);
        if (isNaN(dObj.getTime())) return '';

        const rLower = r.toLowerCase();
        if (rLower === '1d') {
          return dObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        if (rLower === '1w') {
          const day = dObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          const time = dObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
          return `${day} ${time}`;
        }
        if (rLower === '1m' || rLower === '1y') {
          return dObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        }
        return dObj.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      } catch {
        return '';
      }
    };

    // Calculate maximum volume for overlay scaling
    const maxVol = chartQuotes.length > 0 ? Math.max(...chartQuotes.map((q: any) => q.volume || 0)) : 1;

    // Map chart points to price, calculated P/E and volume
    const points = chartQuotes
      .filter((q: any) => q.close !== undefined && q.close !== null)
      .map((q: any) => {
        const qDate = new Date(q.date);
        let activeEps = currentEps;

        // If historical P/E is requested for 5y/max, find the matching fiscal period's EPS
        if (needsHistoricalEps && sortedFinancials.length > 0) {
          for (let i = sortedFinancials.length - 1; i >= 0; i--) {
            if (sortedFinancials[i].date <= qDate) {
              activeEps = sortedFinancials[i].eps;
              break;
            }
          }
        }

        const peVal = activeEps > 0 ? Number((q.close / activeEps).toFixed(2)) : 0;

        return {
          date: formatPointDate(qDate, range),
          close: Number(q.close.toFixed(2)),
          volume: q.volume || 0,
          pe: peVal
        };
      });

    return NextResponse.json({
      range,
      maxVolume: maxVol,
      points
    });

  } catch (error) {
    console.error('Failed to fetch detailed chart data:', error);
    return NextResponse.json({ error: 'Failed to fetch detailed chart data' }, { status: 500 });
  }
}
