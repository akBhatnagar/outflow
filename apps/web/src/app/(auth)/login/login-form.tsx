'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useState } from 'react';

import { Button } from '@outflow/ui/button';
import { Input } from '@outflow/ui/input';
import { Label } from '@outflow/ui/label';
import { LoginSchema, type LoginInput } from '@outflow/contracts';

import { apiErrorMessage, clientFetch } from '@/lib/client/api';

export function LoginForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await clientFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      toast.success('Logged in');
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Invalid email or password'));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" required {...register('email')} />
        {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          {...register('password')}
        />
        {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Log in'}
      </Button>
    </form>
  );
}
