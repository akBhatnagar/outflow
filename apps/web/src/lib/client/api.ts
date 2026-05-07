// Browser-side fetch wrapper. Always sends cookies (`credentials: 'include'`)
// so the API can read the httpOnly access token.
//
// When `NEXT_PUBLIC_API_URL` is set at **build** time (e.g. CI or a custom
// domain split), we call that origin directly. When it is unset — the usual
// production Docker build — we use same-origin relative URLs (`/api/v1/...`)
// so the browser hits whatever host served the HTML (nginx proxies `/api/` to
// Nest). This avoids baking `http://localhost:4000` into the bundle, which
// breaks HTTPS sites with "Failed to fetch" / mixed-content errors.
//
// Local `pnpm dev` relies on `next.config.mjs` rewrites to forward `/api/*`
// to the API on port 4000.
function clientApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (raw && raw.trim().length > 0) return raw.replace(/\/$/, '');
  return '';
}

const CLIENT_API_ORIGIN = clientApiOrigin();

function joinClientUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return CLIENT_API_ORIGIN ? `${CLIENT_API_ORIGIN}${path}` : path;
}

interface ApiError extends Error {
  status?: number;
  body?: unknown;
}

let refreshInFlight: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const res = await fetch(joinClientUrl('/api/v1/auth/refresh'), {
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

  const url = joinClientUrl(path);
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
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return 'Could not reach the server. Check your connection and that the API is running.';
  }
  const e = err as ApiError;
  const body = e?.body as { detail?: string; message?: string } | undefined;
  return body?.detail ?? body?.message ?? e?.message ?? fallback;
}
