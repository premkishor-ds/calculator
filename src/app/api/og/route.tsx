import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { SITE_URL } from '@/lib/backend-config';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'Stock';
  const name = searchParams.get('name') || symbol;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 64,
          background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e3a5f 100%)',
          color: '#f8fafc',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.75, marginBottom: 12 }}>Vision Wealth</div>
        <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1 }}>{name}</div>
        <div style={{ fontSize: 36, marginTop: 16, color: '#38bdf8' }}>{symbol}</div>
        <div style={{ fontSize: 22, marginTop: 32, opacity: 0.7 }}>
          Live fundamentals · Technicals · AI insights
        </div>
        <div style={{ fontSize: 18, marginTop: 'auto', opacity: 0.5 }}>
          {SITE_URL.replace('https://', '')}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
