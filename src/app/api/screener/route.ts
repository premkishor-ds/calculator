import { NextRequest, NextResponse } from 'next/server';

import { getServerBackendApiUrl } from '@/lib/backend-config';

const BACKEND = process.env.SCREENER_BACKEND_URL || getServerBackendApiUrl();

/** Proxy screener requests to Express + MongoDB backend */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const target = new URL(`${BACKEND}/screener`);
  url.searchParams.forEach((v, k) => target.searchParams.set(k, v));

  if (url.searchParams.get('action') === 'universe') {
    const metaUrl = new URL(`${BACKEND}/screener/meta`);
    try {
      const res = await fetch(metaUrl.toString(), { cache: 'no-store' });
      const data = await res.json();
      return NextResponse.json(
        {
          exchange: url.searchParams.get('exchange') || 'all',
          universeSize: data.savedCount ?? data.universeSize ?? 0,
          nseCount: data.nseCount ?? 0,
          bseCount: data.bseCount ?? 0,
        },
        { status: res.status }
      );
    } catch {
      return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
    }
  }

  try {
    const res = await fetch(target.toString(), { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }
}
