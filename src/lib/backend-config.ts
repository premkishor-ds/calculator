/** Shared backend API + WebSocket URLs for browser and server. */

const PROD_API = 'https://calculatorbackend-ul8h.onrender.com/api';
const PROD_WS = 'wss://calculatorbackend-ul8h.onrender.com';
const LOCAL_API = 'http://localhost:5001/api';
const LOCAL_WS = 'ws://localhost:5001';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://worth-calculator.netlify.app';

function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.') ||
    !hostname.includes('.')
  );
}

/** Browser: production host → Render; localhost → env or local. */
export function getBackendApiUrl(): string {
  if (typeof window !== 'undefined') {
    const isLocal = isLocalHost(window.location.hostname);
    if (isLocal) {
      const baseApi = process.env.NEXT_PUBLIC_API_URL || LOCAL_API;
      if (baseApi.includes('localhost') && window.location.hostname !== 'localhost') {
        return baseApi.replace('localhost', window.location.hostname);
      }
      return baseApi;
    }
    return PROD_API;
  }
  return process.env.NEXT_PUBLIC_API_URL || PROD_API;
}

export function getBackendWsUrl(): string {
  if (typeof window !== 'undefined') {
    const isLocal = isLocalHost(window.location.hostname);
    if (isLocal) {
      if (window.location.hostname !== 'localhost') {
        return `ws://${window.location.hostname}:5001`;
      }
      return LOCAL_WS;
    }
    return PROD_WS;
  }
  const api = process.env.NEXT_PUBLIC_API_URL || PROD_API;
  return api.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
}

/** Server-side BFF proxies (Netlify/Node). */
export function getServerBackendApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || PROD_API;
}
