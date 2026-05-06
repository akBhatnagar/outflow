export function formatMoney(cents: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

export function formatRelativeDate(date: Date | string | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  const ms = d.getTime() - Date.now();
  const days = Math.round(ms / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days > 0 && days < 30) return `in ${days} days`;
  if (days < 0 && days > -30) return `${Math.abs(days)} days ago`;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const CADENCE_LABEL: Record<string, string> = {
  WEEKLY: '/wk',
  MONTHLY: '/mo',
  QUARTERLY: '/qtr',
  YEARLY: '/yr',
  CUSTOM_DAYS: '',
};

export function cadenceSuffix(cadence: string): string {
  return CADENCE_LABEL[cadence] ?? '';
}
