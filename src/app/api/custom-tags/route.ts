import { NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://calculatorbackend-ul8h.onrender.com/api' : 'http://localhost:5001/api');

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/custom-tags`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
