'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useState } from 'react';

import { Button } from '@outflow/ui/button';
import { Input } from '@outflow/ui/input';
import { Label } from '@outflow/ui/label';
import { SignupSchema, type SignupInput } from '@outflow/contracts';

import { apiErrorMessage, clientFetch } from '@/lib/client/api';

export function SignupForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({ resolver: zodResolver(SignupSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await clientFetch('/api/v1/auth/signup', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      toast.success('Welcome to Outflow!');
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create account'));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name (optional)</Label>
        <Input id="name" autoComplete="name" {...register('name')} />
        {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" required {...register('email')} />
        {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          {...register('password')}
        />
        <p className="text-muted-foreground text-xs">12 characters or more.</p>
        {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-muted-foreground text-center text-xs">
        By continuing you agree to our future Terms and Privacy Policy.
      </p>
    </form>
  );
}
