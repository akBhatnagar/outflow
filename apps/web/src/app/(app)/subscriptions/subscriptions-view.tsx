'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@outflow/ui/badge';
import { Button } from '@outflow/ui/button';
import { Card, CardContent } from '@outflow/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@outflow/ui/dropdown-menu';
import type {
  Category,
  CreateSubscriptionInput,
  Subscription,
  SubscriptionStatus,
} from '@outflow/contracts';

import { apiErrorMessage, clientFetch } from '@/lib/client/api';
import { cadenceSuffix, formatMoney, formatRelativeDate } from '@/lib/format';
import { SubscriptionDialog } from './subscription-dialog';

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Active',
  TRIAL: 'Trial',
  PAUSED: 'Paused',
  CANCELLED: 'Cancelled',
};
const STATUS_VARIANT: Record<SubscriptionStatus, Parameters<typeof Badge>[0]['variant']> = {
  ACTIVE: 'success',
  TRIAL: 'warning',
  PAUSED: 'muted',
  CANCELLED: 'destructive',
};

interface Props {
  initialSubscriptions: Subscription[];
  categories: Category[];
}

export function SubscriptionsView({ initialSubscriptions, categories }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);

  const { data: subscriptions = initialSubscriptions, isFetching } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => clientFetch<Subscription[]>('/api/v1/subscriptions'),
    initialData: initialSubscriptions,
  });

  async function handleSave(values: CreateSubscriptionInput) {
    try {
      if (editing) {
        await clientFetch(`/api/v1/subscriptions/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(values),
        });
        toast.success('Subscription updated');
      } else {
        await clientFetch('/api/v1/subscriptions', {
          method: 'POST',
          body: JSON.stringify(values),
        });
        toast.success('Subscription added');
      }
      setDialogOpen(false);
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save subscription'));
      throw err;
    }
  }

  async function handleStatus(sub: Subscription, status: SubscriptionStatus) {
    try {
      await clientFetch(`/api/v1/subscriptions/${sub.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success(`Marked as ${STATUS_LABEL[status]}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update status'));
    }
  }

  async function handleDelete(sub: Subscription) {
    if (!confirm(`Delete "${sub.displayName}"? This cannot be undone.`)) return;
    try {
      await clientFetch(`/api/v1/subscriptions/${sub.id}`, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Subscription deleted');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not delete subscription'));
    }
  }

  const active = subscriptions.filter((s) => s.status === 'ACTIVE' || s.status === 'TRIAL');
  const inactive = subscriptions.filter((s) => s.status === 'PAUSED' || s.status === 'CANCELLED');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground text-sm">
            {subscriptions.length} total · {active.length} active{isFetching ? ' · syncing…' : ''}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Add subscription
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <h2 className="text-lg font-semibold">No subscriptions yet</h2>
            <p className="text-muted-foreground text-sm">
              Click <span className="text-foreground font-medium">Add subscription</span> to start
              tracking your monthly burn.
            </p>
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" /> Add your first one
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <SubscriptionList
            title="Active"
            subscriptions={active}
            onEdit={(s) => {
              setEditing(s);
              setDialogOpen(true);
            }}
            onSetStatus={handleStatus}
            onDelete={handleDelete}
          />
          {inactive.length > 0 && (
            <SubscriptionList
              title="Paused & cancelled"
              subscriptions={inactive}
              onEdit={(s) => {
                setEditing(s);
                setDialogOpen(true);
              }}
              onSetStatus={handleStatus}
              onDelete={handleDelete}
            />
          )}
        </>
      )}

      <SubscriptionDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        categories={categories}
        editing={editing}
        onSave={handleSave}
      />
    </div>
  );
}

function SubscriptionList({
  title,
  subscriptions,
  onEdit,
  onSetStatus,
  onDelete,
}: {
  title: string;
  subscriptions: Subscription[];
  onEdit: (s: Subscription) => void;
  onSetStatus: (s: Subscription, status: SubscriptionStatus) => void;
  onDelete: (s: Subscription) => void;
}) {
  return (
    <section>
      <h2 className="text-muted-foreground mb-3 text-sm font-semibold">{title}</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {subscriptions.map((s) => (
          <Card key={s.id} className="hover:border-primary/30 hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center gap-2">
                    <h3 className="truncate font-medium">{s.displayName}</h3>
                    <Badge variant={STATUS_VARIANT[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {s.category?.name ?? 'Uncategorised'}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Actions">
                      <span aria-hidden>⋯</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onEdit(s)}>Edit</DropdownMenuItem>
                    {s.status !== 'ACTIVE' && (
                      <DropdownMenuItem onSelect={() => onSetStatus(s, 'ACTIVE')}>
                        Mark active
                      </DropdownMenuItem>
                    )}
                    {s.status !== 'PAUSED' && (
                      <DropdownMenuItem onSelect={() => onSetStatus(s, 'PAUSED')}>
                        Pause
                      </DropdownMenuItem>
                    )}
                    {s.status !== 'CANCELLED' && (
                      <DropdownMenuItem onSelect={() => onSetStatus(s, 'CANCELLED')}>
                        Mark cancelled
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => onDelete(s)} className="text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="text-2xl font-semibold tabular-nums">
                    {formatMoney(s.amountCents, s.currency)}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {cadenceSuffix(s.cadence) || s.cadence}
                  </p>
                </div>
                <div className="text-muted-foreground text-right text-xs">
                  {s.nextChargeDate ? (
                    <>
                      <div>Next charge</div>
                      <div className="text-foreground">{formatRelativeDate(s.nextChargeDate)}</div>
                    </>
                  ) : s.trialEndsAt ? (
                    <>
                      <div>Trial ends</div>
                      <div className="text-amber-500">{formatRelativeDate(s.trialEndsAt)}</div>
                    </>
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
