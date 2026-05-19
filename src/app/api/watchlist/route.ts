import { NextRequest, NextResponse } from 'next/server';
import { yahooFinance } from '@/lib/yahoo-finance';

import { WATCHLIST_SYMBOLS } from '../../../utils/symbols';
export { WATCHLIST_SYMBOLS };

interface CacheEntry {
  data: any;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');

    let targetSymbols = WATCHLIST_SYMBOLS;
    if (symbolsParam) {
      targetSymbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (targetSymbols.length === 0) {
      return NextResponse.json([]);
    }

    // Generate unique cache key based on requested symbols
    const cacheKey = targetSymbols.sort().join(',');
    const cached = memoryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json(cached.data);
    }

    const quotes = await Promise.all(
      targetSymbols.map(async (rawSymbol) => {
        try {
          const trimmed = rawSymbol.trim();
          const symbol = (trimmed.includes('.') ? trimmed : `${trimmed}.NS`).toUpperCase();
          return await yahooFinance.quoteSummary(symbol, {
            modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'financialData']
          });
        } catch {
          return null;
        }
      })
    );
    
    // Filter out any null responses (failed to fetch)
    const validQuotes = quotes.filter(quote => quote !== null);
    
    if (validQuotes.length === 0) {
      return NextResponse.json([], { status: 200 }); // Return empty array instead of 502 for failed single additions
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stockData = validQuotes.map((qs: any) => {
      const price = qs.price || {};
      const summary = qs.summaryDetail || {};
      const stats = qs.defaultKeyStatistics || {};
      const financial = qs.financialData || {};
      
      const regularPrice = price.regularMarketPrice || 0;
      const bv = stats.bookValue || 0;
      const cmpBv = bv > 0 ? Number((regularPrice / bv).toFixed(2)) : 0;
      const rawDivYield = summary.dividendYield || 0;
      const promHold = (stats.heldPercentInsiders || 0) * 100;
      
      // Get earnings / revenue growth
      const profitGrowth = (financial.earningsGrowth || stats.earningsQuarterlyGrowth || 0) * 100;
      const salesGrowth = (financial.revenueGrowth || 0) * 100;
      
      return {
        symbol: price.symbol || '',
        name: price.shortName || price.longName || '',
        price: regularPrice,
        change: price.regularMarketChange || 0,
        changePercent: (price.regularMarketChangePercent || 0) * 100,
        marketCap: price.marketCap || 0,
        volume: price.regularMarketVolume || 0,
        pe: summary.trailingPE || summary.forwardPE || stats.forwardPE || 0,
        eps: stats.trailingEps || stats.forwardEps || 0,
        cmpBv,
        divYield: Number((rawDivYield * 100).toFixed(2)),
        promHold: Number(promHold.toFixed(2)),
        profitGrowth: Number(profitGrowth.toFixed(2)),
        salesGrowth: Number(salesGrowth.toFixed(2)),
      };
    });

    // Save to local memory cache before returning
    memoryCache.set(cacheKey, { data: stockData, timestamp: Date.now() });

    return NextResponse.json(stockData);
  } catch (error) {
    console.error('Failed to fetch stock data:', error);
    return NextResponse.json({ error: 'Failed to fetch live stock data' }, { status: 500 });
  }
}
