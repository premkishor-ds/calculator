import { NextRequest, NextResponse } from 'next/server';

import { getServerBackendApiUrl } from '@/lib/backend-config';

const BACKEND = getServerBackendApiUrl();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const chartMode = searchParams.get('chartMode');

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol query parameter is required' }, { status: 400 });
    }

    let url = `${BACKEND}/drawings?symbol=${encodeURIComponent(symbol)}`;
    if (chartMode) {
      url += `&chartMode=${encodeURIComponent(chartMode)}`;
    }

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Backend error: ${res.statusText}`);
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('GET /api/drawings proxy error:', error);
    return NextResponse.json({ error: 'Failed to retrieve drawings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND}/drawings/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Backend error: ${res.statusText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('POST /api/drawings proxy error:', error);
    return NextResponse.json({ error: 'Failed to synchronize drawings' }, { status: 500 });
  }
}
