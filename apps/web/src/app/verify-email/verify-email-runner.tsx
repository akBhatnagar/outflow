'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { apiErrorMessage, clientFetch } from '@/lib/client/api';

type State = { kind: 'verifying' } | { kind: 'success' } | { kind: 'error'; message: string };

export function VerifyEmailRunner({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: 'verifying' });
  // StrictMode in dev mounts effects twice — guard so we don't double-consume.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      try {
        await clientFetch('/api/v1/auth/verify-email/confirm', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });
        setState({ kind: 'success' });
      } catch (err) {
        setState({
          kind: 'error',
          message: apiErrorMessage(err, 'Verification link is invalid or expired'),
        });
      }
    })();
  }, [token]);

  if (state.kind === 'verifying') {
    return <p className="text-muted-foreground text-sm">Verifying…</p>;
  }

  if (state.kind === 'success') {
    return (
      <div className="space-y-4">
        <div className="bg-muted/40 text-muted-foreground space-y-2 rounded-lg border p-4 text-sm">
          <p className="text-foreground font-medium">Email verified.</p>
          <p>You can close this tab or jump back into the app.</p>
        </div>
        <Link href="/dashboard" className="text-primary text-sm underline-offset-4 hover:underline">
          Go to dashboard →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-destructive text-sm">{state.message}</p>
      <Link href="/login" className="text-primary text-sm underline-offset-4 hover:underline">
        Sign in to request a new link →
      </Link>
    </div>
  );
}
