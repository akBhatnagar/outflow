'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@outflow/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@outflow/ui/dialog';
import { Input } from '@outflow/ui/input';
import { Label } from '@outflow/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@outflow/ui/select';
import {
  CreateSubscriptionSchema,
  type Cadence,
  type Category,
  type CreateSubscriptionInput,
  type Subscription,
} from '@outflow/contracts';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  editing: Subscription | null;
  onSave: (values: CreateSubscriptionInput) => Promise<void>;
}

interface FormValues {
  displayName: string;
  amount: string;
  currency: string;
  cadence: Cadence;
  customDays?: number;
  categorySlug?: string;
  nextChargeDate?: string;
  trialEndsAt?: string;
  notes?: string;
}

const CADENCES: Array<{ value: Cadence; label: string }> = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'CUSTOM_DAYS', label: 'Custom (days)' },
];

export function SubscriptionDialog({ open, onOpenChange, categories, editing, onSave }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      displayName: '',
      amount: '',
      currency: 'USD',
      cadence: 'MONTHLY',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        displayName: editing?.displayName ?? '',
        amount: editing ? (editing.amountCents / 100).toString() : '',
        currency: editing?.currency ?? 'USD',
        cadence: editing?.cadence ?? 'MONTHLY',
        customDays: editing?.customDays ?? undefined,
        categorySlug: editing?.category?.slug ?? '',
        nextChargeDate: editing?.nextChargeDate
          ? new Date(editing.nextChargeDate).toISOString().slice(0, 10)
          : '',
        trialEndsAt: editing?.trialEndsAt
          ? new Date(editing.trialEndsAt).toISOString().slice(0, 10)
          : '',
        notes: editing?.notes ?? '',
      });
    }
  }, [open, editing, reset]);

  const cadence = watch('cadence');

  const onSubmit = handleSubmit(async (values) => {
    const cents = Math.round(Number(values.amount) * 100);
    const candidate: Record<string, unknown> = {
      displayName: values.displayName.trim(),
      amountCents: cents,
      currency: values.currency.toUpperCase(),
      cadence: values.cadence,
      customDays: values.cadence === 'CUSTOM_DAYS' ? Number(values.customDays) : undefined,
      categorySlug: values.categorySlug || undefined,
      nextChargeDate: values.nextChargeDate || undefined,
      trialEndsAt: values.trialEndsAt || undefined,
      notes: values.notes || undefined,
    };
    const parsed = CreateSubscriptionSchema.safeParse(candidate);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      alert(first ? `${first.path.join('.')}: ${first.message}` : 'Invalid input');
      return;
    }

    setSubmitting(true);
    try {
      await onSave(parsed.data);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit subscription' : 'Add subscription'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Update the details below.' : 'Track a recurring charge in your dashboard.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Name</Label>
            <Input
              id="displayName"
              placeholder="e.g. Netflix Premium"
              {...register('displayName', { required: true, maxLength: 100 })}
            />
            {errors.displayName && <p className="text-destructive text-xs">A name is required.</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="9.99"
                {...register('amount', { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" maxLength={3} {...register('currency', { required: true })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cadence</Label>
              <Select value={cadence} onValueChange={(v) => setValue('cadence', v as Cadence)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CADENCES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {cadence === 'CUSTOM_DAYS' ? (
              <div className="space-y-2">
                <Label htmlFor="customDays">Every (days)</Label>
                <Input
                  id="customDays"
                  type="number"
                  min={1}
                  max={3650}
                  {...register('customDays', { valueAsNumber: true })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="categorySlug">Category</Label>
                <Select
                  value={watch('categorySlug') ?? ''}
                  onValueChange={(v) => setValue('categorySlug', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a category…" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="nextChargeDate">Next charge</Label>
              <Input id="nextChargeDate" type="date" {...register('nextChargeDate')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trialEndsAt">Trial ends (optional)</Label>
              <Input id="trialEndsAt" type="date" {...register('trialEndsAt')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" maxLength={500} {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Add subscription'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
