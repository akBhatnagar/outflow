import { Cadence } from '@prisma/client';
import { monthlyAmountCents } from './insights.service';

describe('monthlyAmountCents', () => {
  it('passes monthly through unchanged', () => {
    expect(monthlyAmountCents(999, Cadence.MONTHLY, null)).toBe(999);
  });
  it('amortises yearly to monthly', () => {
    expect(monthlyAmountCents(12_000, Cadence.YEARLY, null)).toBe(1_000);
  });
  it('amortises quarterly to monthly', () => {
    expect(monthlyAmountCents(300, Cadence.QUARTERLY, null)).toBe(100);
  });
  it('amortises weekly using 52/12 weeks per month', () => {
    expect(monthlyAmountCents(100, Cadence.WEEKLY, null)).toBe(Math.round((100 * 52) / 12));
  });
  it('handles custom days', () => {
    // every 10 days = (365/12)/10 ≈ 3.04 charges per month
    expect(monthlyAmountCents(100, Cadence.CUSTOM_DAYS, 10)).toBe(304);
  });
  it('returns 0 for invalid custom_days', () => {
    expect(monthlyAmountCents(100, Cadence.CUSTOM_DAYS, null)).toBe(0);
    expect(monthlyAmountCents(100, Cadence.CUSTOM_DAYS, 0)).toBe(0);
  });
});
