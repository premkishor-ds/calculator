/** Fetch backend API with retries (helps Render cold starts). */
export async function fetchBackend(
  path: string,
  init?: RequestInit,
  retries = 2
): Promise<Response> {
  const { getBackendApiUrl } = await import('@/lib/backend-config');
  const base = getBackendApiUrl();
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;

  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok || res.status < 500) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    if (i < retries) await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
  }
  throw lastErr;
}
