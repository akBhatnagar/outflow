'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button, Input, Label } from '@outflow/ui';

import { apiErrorMessage, clientFetch } from '@/lib/client/api';

const Schema = z
  .object({
    password: z.string().min(12, 'Password must be at least 12 characters'),
    confirm: z.string().min(12),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });
type Values = z.infer<typeof Schema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const [serverErr, setServerErr] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: { password: '', confirm: '' },
  });

  async function onSubmit(values: Values) {
    setServerErr(null);
    try {
      await clientFetch('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password: values.password }),
      });
      setDone(true);
    } catch (err) {
      setServerErr(apiErrorMessage(err, 'Could not reset password'));
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <div className="bg-muted/40 text-muted-foreground space-y-2 rounded-lg border p-4 text-sm">
          <p className="text-foreground font-medium">Password updated.</p>
          <p>For safety, every other session has been signed out.</p>
        </div>
        <Link href="/login" className="text-primary text-sm underline-offset-4 hover:underline">
          Sign in with the new password →
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...form.register('password')}
        />
        {form.formState.errors.password && (
          <p className="text-destructive text-xs">{form.formState.errors.password.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          {...form.register('confirm')}
        />
        {form.formState.errors.confirm && (
          <p className="text-destructive text-xs">{form.formState.errors.confirm.message}</p>
        )}
      </div>
      {serverErr && <p className="text-destructive text-sm">{serverErr}</p>}
      <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
        {form.formState.isSubmitting ? 'Updating…' : 'Update password'}
      </Button>
    </form>
  );
}
