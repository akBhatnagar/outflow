'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button, Input, Label } from '@outflow/ui';

import { apiErrorMessage, clientFetch } from '@/lib/client/api';

const Schema = z.object({ email: z.string().email('Enter a valid email') });
type Values = z.infer<typeof Schema>;

export function ForgotPasswordForm() {
  const [done, setDone] = useState(false);
  const [serverErr, setServerErr] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: Values) {
    setServerErr(null);
    try {
      await clientFetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setDone(true);
    } catch (err) {
      setServerErr(apiErrorMessage(err, 'Could not send reset email'));
    }
  }

  if (done) {
    return (
      <div className="bg-muted/40 text-muted-foreground space-y-2 rounded-lg border p-4 text-sm">
        <p className="text-foreground font-medium">Check your inbox.</p>
        <p>
          If we have an account with that email, a reset link is on its way. The link expires in 1
          hour.
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
        {form.formState.errors.email && (
          <p className="text-destructive text-xs">{form.formState.errors.email.message}</p>
        )}
      </div>
      {serverErr && <p className="text-destructive text-sm">{serverErr}</p>}
      <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
        {form.formState.isSubmitting ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  );
}
