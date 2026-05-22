import { ActiveFilters } from '@/components/screener/FilterSidebar';

const BACKEND_API_URL =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? 'https://calculatorbackend-ul8h.onrender.com/api'
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

/** Maps FilterSidebar field ids to backend query param prefixes */
const FILTER_PARAM_KEYS: Record<string, string> = {
  pe: 'pe',
  forwardPe: 'pe',
  pb: 'pb',
  divYield: 'divYield',
  roe: 'roe',
  roa: 'roa',
  revenueGrowth: 'revenueGrowth',
  profitGrowth: 'profitGrowth',
  salesGrowth: 'salesGrowth',
  promoterHolding: 'promoterHolding',
  changePercent: 'changePercent',
  marketCap: 'marketCap',
  price: 'price',
};

export function filtersToSearchParams(
  filters: ActiveFilters,
  exchange: string
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('exchange', exchange);
  params.set('limit', '10000');

  for (const [id, val] of Object.entries(filters)) {
    if (!val) continue;
    const prefix = FILTER_PARAM_KEYS[id];
    if (!prefix) continue;
    if (val.min !== undefined) params.set(`${prefix}Min`, String(val.min));
    if (val.max !== undefined) params.set(`${prefix}Max`, String(val.max));
  }

  return params;
}

export async function fetchScreenerMeta() {
  const res = await fetch(`${BACKEND_API_URL}/screener/meta`);
  if (!res.ok) throw new Error('Failed to load screener metadata');
  return res.json();
}

export async function fetchScreenerStocks(filters: ActiveFilters, exchange: string) {
  const params = filtersToSearchParams(filters, exchange);
  const res = await fetch(`${BACKEND_API_URL}/screener?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load screener data');
  return res.json();
}

export async function triggerScreenerSync(force = false) {
  const res = await fetch(`${BACKEND_API_URL}/screener/sync?force=${force}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Sync failed');
  }
  return res.json();
}

export { BACKEND_API_URL };
