import { NextRequest, NextResponse } from 'next/server';

import { getServerBackendApiUrl } from '@/lib/backend-config';

const BACKEND = getServerBackendApiUrl();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const { tagId } = await params;
    const body = await request.json();
    const res = await fetch(`${BACKEND}/custom-tags/${tagId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to update custom tag' }, { status: 500 });
  }
}
