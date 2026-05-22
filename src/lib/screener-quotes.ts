import { yahooFinance } from '@/lib/yahoo-finance';

export const QUOTE_BATCH_SIZE = 500;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapQuoteToRow(quote: any, nameFallback = '') {
  const price = quote.regularMarketPrice ?? 0;
  const bookValue = quote.bookValue ?? 0;
  const cmpBv =
    quote.priceToBook != null && quote.priceToBook > 0
      ? Number(quote.priceToBook.toFixed(2))
      : bookValue > 0
        ? Number((price / bookValue).toFixed(2))
        : 0;
  const rawDivYield = quote.dividendYield ?? quote.trailingAnnualDividendYield ?? 0;

  return {
    symbol: quote.symbol ?? '',
    name: quote.shortName || quote.longName || nameFallback || quote.symbol || '',
    price,
    change: quote.regularMarketChange ?? 0,
    changePercent: (quote.regularMarketChangePercent ?? 0) * 100,
    marketCap: quote.marketCap ?? 0,
    pe: quote.trailingPE ?? quote.forwardPE ?? 0,
    eps: quote.epsTrailingTwelveMonths ?? quote.epsForward ?? 0,
    cmpBv,
    divYield: Number((rawDivYield * 100).toFixed(2)),
    promHold: 0,
    profitGrowth: 0,
    salesGrowth: 0,
    roe: undefined as number | undefined,
    roa: undefined as number | undefined,
  };
}

export async function fetchQuoteBatch(
  tickers: string[],
  nameBySymbol?: Map<string, string>
) {
  if (tickers.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quotes: any[] = await yahooFinance.quote(tickers, { return: 'array' });
  const rows: ReturnType<typeof mapQuoteToRow>[] = [];

  for (const quote of quotes) {
    if (!quote?.symbol || quote.quoteType === 'NONE') continue;
    if (!quote.symbol.endsWith('.NS') && !quote.symbol.endsWith('.BO')) continue;
    rows.push(mapQuoteToRow(quote, nameBySymbol?.get(quote.symbol) ?? ''));
  }

  return rows;
}
