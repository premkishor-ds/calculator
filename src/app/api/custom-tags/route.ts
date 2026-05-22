import { NextResponse } from 'next/server';

import { getServerBackendApiUrl } from '@/lib/backend-config';

const BACKEND = getServerBackendApiUrl();

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/custom-tags`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
