import { NextRequest, NextResponse } from 'next/server';
import { yahooFinance } from '@/lib/yahoo-finance';

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get('q')?.trim();
  if (!q || q.length < 1) return NextResponse.json([]);

  try {
    const result = await yahooFinance.search(q, { newsCount: 0, quotesCount: 8 });
    const quotes = (result.quotes ?? [])
      .filter((r: any) => r.quoteType === 'EQUITY' && r.symbol)
      .map((r: any) => ({
        symbol: r.symbol as string,
        name: (r.shortname || r.longname || r.symbol) as string,
        exchange: (r.exchDisp || r.exchange || '') as string,
      }));
    return NextResponse.json(quotes);
  } catch {
    return NextResponse.json([]);
  }
}

