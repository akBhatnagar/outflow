import type { Category, Subscription } from '@outflow/contracts';
import { apiFetch } from '@/lib/server/api';
import { SubscriptionsView } from './subscriptions-view';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Subscriptions' };

export default async function SubscriptionsPage() {
  const [subscriptions, categories] = await Promise.all([
    apiFetch<Subscription[]>('/api/v1/subscriptions'),
    apiFetch<Category[]>('/api/v1/categories'),
  ]);
  return <SubscriptionsView initialSubscriptions={subscriptions} categories={categories} />;
}
