export type IndiaExchange = 'nse' | 'bse' | 'all';

export interface ListedSymbol {
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE';
  series?: string;
}

const NSE_CSV_URL = 'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv';
const BSE_CSV_URL =
  'https://raw.githubusercontent.com/kanwalpreet18/canslimTechnical/master/DATA/bseSymbols.csv';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; VisionWealth/1.0)',
  Accept: 'text/csv,text/plain,*/*',
};

interface UniverseCache {
  symbols: ListedSymbol[];
  fetchedAt: number;
}

const universeCache = new Map<string, UniverseCache>();
const UNIVERSE_CACHE_MS = 6 * 60 * 60 * 1000; // 6 hours

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export async function fetchNseSymbols(): Promise<ListedSymbol[]> {
  const res = await fetch(NSE_CSV_URL, { headers: FETCH_HEADERS, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`NSE symbol list failed (${res.status})`);

  const lines = (await res.text()).trim().split(/\r?\n/).slice(1);
  const symbols: ListedSymbol[] = [];

  for (const line of lines) {
    if (!line) continue;
    const cols = parseCsvLine(line);
    const ticker = cols[0]?.trim().toUpperCase();
    const name = cols[1]?.trim();
    const series = cols[2]?.trim();
    if (!ticker || !name) continue;
    symbols.push({
      symbol: `${ticker}.NS`,
      name,
      exchange: 'NSE',
      series,
    });
  }

  return symbols;
}

export async function fetchBseSymbols(): Promise<ListedSymbol[]> {
  const res = await fetch(BSE_CSV_URL, { headers: FETCH_HEADERS, next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`BSE symbol list failed (${res.status})`);

  const lines = (await res.text()).trim().split(/\r?\n/).slice(1);
  const symbols: ListedSymbol[] = [];

  for (const line of lines) {
    if (!line) continue;
    const cols = parseCsvLine(line);
    const status = cols[3]?.trim();
    if (status && status.toLowerCase() !== 'active') continue;
    const ticker = cols[1]?.trim().toUpperCase();
    const name = cols[2]?.trim();
    if (!ticker || !name) continue;
    symbols.push({
      symbol: `${ticker}.BO`,
      name,
      exchange: 'BSE',
    });
  }

  return symbols;
}

export async function getIndiaSymbolUniverse(
  exchange: IndiaExchange = 'all'
): Promise<ListedSymbol[]> {
  const cacheKey = exchange;
  const cached = universeCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < UNIVERSE_CACHE_MS) {
    return cached.symbols;
  }

  const [nse, bse] = await Promise.all([
    exchange === 'bse' ? Promise.resolve([]) : fetchNseSymbols(),
    exchange === 'nse' ? Promise.resolve([]) : fetchBseSymbols(),
  ]);

  let symbols: ListedSymbol[];
  if (exchange === 'nse') symbols = nse;
  else if (exchange === 'bse') symbols = bse;
  else {
    const seen = new Set<string>();
    symbols = [];
    for (const s of [...nse, ...bse]) {
      if (seen.has(s.symbol)) continue;
      seen.add(s.symbol);
      symbols.push(s);
    }
  }

  universeCache.set(cacheKey, { symbols, fetchedAt: Date.now() });
  return symbols;
}

export function getYahooTickers(universe: ListedSymbol[]): string[] {
  return universe.map((s) => s.symbol);
}
