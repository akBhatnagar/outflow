// Browser-side fetch wrapper. Always sends cookies (`credentials: 'include'`)
// so the API can read the httpOnly access token.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface ApiError extends Error {
  status?: number;
  body?: unknown;
}

let refreshInFlight: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Refresh failed');
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function clientFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const exec = () => fetch(url, { ...init, headers, credentials: 'include' });

  let res = await exec();
  if (res.status === 401 && !path.includes('/auth/')) {
    try {
      await refreshSession();
      res = await exec();
    } catch {
      /* fall through with original 401 */
    }
  }

  if (!res.ok) {
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = { detail: text };
    }
    const err: ApiError = Object.assign(new Error(`API ${res.status}`), {
      status: res.status,
      body,
    });
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const e = err as ApiError;
  const body = e?.body as { detail?: string; message?: string } | undefined;
  return body?.detail ?? body?.message ?? e?.message ?? fallback;
}
