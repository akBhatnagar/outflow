'use client';

import { Mail, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@outflow/ui';

import { apiErrorMessage, clientFetch } from '@/lib/client/api';

export function UnverifiedEmailBanner({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'dismissed' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (state === 'dismissed') return null;

  async function resend() {
    setState('sending');
    setErrorMsg(null);
    try {
      await clientFetch('/api/v1/auth/verify-email/send', { method: 'POST' });
      setState('sent');
    } catch (err) {
      setState('error');
      setErrorMsg(apiErrorMessage(err, 'Could not send the verification email'));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
      <Mail className="size-4 shrink-0" />
      <p className="min-w-0 flex-1">
        {state === 'sent' ? (
          <>
            We sent a fresh verification link to <strong className="break-all">{email}</strong>.
          </>
        ) : state === 'error' ? (
          errorMsg
        ) : (
          <>
            Verify <strong className="break-all">{email}</strong> to keep your account secure and
            recoverable.
          </>
        )}
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={resend}
          disabled={state === 'sending' || state === 'sent'}
          className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100"
        >
          {state === 'sending' ? 'Sending…' : state === 'sent' ? 'Sent ✓' : 'Resend email'}
        </Button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setState('dismissed')}
          className="rounded-md p-1 hover:bg-amber-100 dark:hover:bg-amber-900/40"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
