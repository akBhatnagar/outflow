import { Injectable } from '@nestjs/common';
import { Cadence, SubscriptionStatus } from '@prisma/client';

import { PrismaService } from '../../infra/prisma/prisma.service';

export interface SubscriptionSummary {
  totals: {
    activeCount: number;
    monthlyCents: number;
    yearlyCents: number;
    currency: string;
  };
  upcomingCharges: {
    id: string;
    displayName: string;
    amountCents: number;
    currency: string;
    nextChargeDate: Date | null;
    cadence: Cadence;
  }[];
  byCategory: {
    categorySlug: string | null;
    categoryName: string | null;
    monthlyCents: number;
    count: number;
  }[];
}

@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Quick "spend snapshot" used by the dashboard.
   * All math is in user's `currencyPref`; mixed-currency totals stay un-normalized for v1.
   */
  async summary(userId: string): Promise<SubscriptionSummary> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currencyPref: true },
    });
    const currency = user?.currencyPref ?? 'USD';

    const subs = await this.prisma.subscription.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      },
      include: { category: true },
    });

    let monthlyCents = 0;
    let yearlyCents = 0;
    const byCategoryMap = new Map<
      string,
      {
        categorySlug: string | null;
        categoryName: string | null;
        monthlyCents: number;
        count: number;
      }
    >();

    for (const s of subs) {
      const monthly = monthlyAmountCents(s.amountCents, s.cadence, s.customDays ?? null);
      monthlyCents += monthly;
      yearlyCents += monthly * 12;
      const key = s.category?.slug ?? '__none__';
      const existing = byCategoryMap.get(key) ?? {
        categorySlug: s.category?.slug ?? null,
        categoryName: s.category?.name ?? null,
        monthlyCents: 0,
        count: 0,
      };
      existing.monthlyCents += monthly;
      existing.count += 1;
      byCategoryMap.set(key, existing);
    }

    const upcoming = subs
      .filter((s) => s.nextChargeDate)
      .sort((a, b) => a.nextChargeDate!.getTime() - b.nextChargeDate!.getTime())
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        displayName: s.displayName,
        amountCents: s.amountCents,
        currency: s.currency,
        nextChargeDate: s.nextChargeDate,
        cadence: s.cadence,
      }));

    return {
      totals: {
        activeCount: subs.length,
        monthlyCents,
        yearlyCents,
        currency,
      },
      upcomingCharges: upcoming,
      byCategory: Array.from(byCategoryMap.values()).sort(
        (a, b) => b.monthlyCents - a.monthlyCents,
      ),
    };
  }
}

/** Convert any cadence to a normalized monthly cost for summary math. */
export function monthlyAmountCents(
  amountCents: number,
  cadence: Cadence,
  customDays: number | null,
): number {
  switch (cadence) {
    case Cadence.WEEKLY:
      return Math.round((amountCents * 52) / 12);
    case Cadence.MONTHLY:
      return amountCents;
    case Cadence.QUARTERLY:
      return Math.round(amountCents / 3);
    case Cadence.YEARLY:
      return Math.round(amountCents / 12);
    case Cadence.CUSTOM_DAYS:
      if (!customDays || customDays <= 0) return 0;
      return Math.round((amountCents * (365 / 12)) / customDays);
    default:
      return amountCents;
  }
}
