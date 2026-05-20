import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://calculatorbackend-ul8h.onrender.com/api' : 'http://localhost:5001/api');

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
