// Server-side API helper. Forwards the user's cookies so RSC fetches stay authenticated.
//
// We *intentionally* keep this file `server-only` — it imports next/headers, which is
// not available in client components. For client-side mutations, see lib/client/api.ts.

import 'server-only';
import { cookies } from 'next/headers';

const API_BASE =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface FetchJsonOptions extends RequestInit {
  forwardCookies?: boolean;
}

export async function apiFetch<T>(path: string, options: FetchJsonOptions = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  if (!headers.has('Content-Type') && options.body && typeof options.body !== 'string') {
    headers.set('Content-Type', 'application/json');
  } else if (
    !headers.has('Content-Type') &&
    typeof options.body === 'string' &&
    options.body.trim().startsWith('{')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.forwardCookies !== false) {
    const cookieJar = await cookies();
    const cookieHeader = cookieJar
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');
    if (cookieHeader) headers.set('cookie', cookieHeader);
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { detail: text };
    }
    const error = new Error(`API ${res.status}`) as Error & { status?: number; body?: unknown };
    error.status = res.status;
    error.body = parsed;
    throw error;
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
