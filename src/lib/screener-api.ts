import { ActiveFilters } from '@/components/screener/FilterSidebar';
import { getBackendApiUrl } from '@/lib/backend-config';


async function fetchWithRetry(url: string, init?: RequestInit, retries = 2): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok || res.status < 500) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    if (i < retries) await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  throw lastErr;
}

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
  params.set('limit', '2000');

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
  const BACKEND_API_URL = getBackendApiUrl();
  const res = await fetchWithRetry(`${BACKEND_API_URL}/screener/meta`);
  if (!res.ok) throw new Error('Failed to load screener metadata');
  return res.json();
}

export async function fetchScreenerStocks(filters: ActiveFilters, exchange: string) {
  const BACKEND_API_URL = getBackendApiUrl();
  const params = filtersToSearchParams(filters, exchange);
  const res = await fetchWithRetry(`${BACKEND_API_URL}/screener?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load screener data');
  return res.json();
}

export async function triggerScreenerSync(force = false) {
  const BACKEND_API_URL = getBackendApiUrl();
  const res = await fetchWithRetry(`${BACKEND_API_URL}/screener/sync?force=${force}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Sync failed');
  }
  return res.json();
}

