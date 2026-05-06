// Shared contract surface between API (NestJS) and Web (Next.js).
// Define Zod schemas here and infer types from them — single source of truth.

import { z } from 'zod';

// ---- Health ----
export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  uptime: z.number().nonnegative(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// ---- Auth ----
export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  name: z.string().min(1).max(100).optional(),
});
export type SignupInput = z.infer<typeof SignupSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  emailVerifiedAt: z.coerce.date().nullable(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthResponseSchema = z.object({ user: AuthUserSchema });
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// ---- Categories ----
export const CategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  sortKey: z.number(),
});
export type Category = z.infer<typeof CategorySchema>;

// ---- Subscriptions ----
export const CadenceSchema = z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM_DAYS']);
export type Cadence = z.infer<typeof CadenceSchema>;

export const SubscriptionStatusSchema = z.enum(['ACTIVE', 'PAUSED', 'CANCELLED', 'TRIAL']);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionSourceSchema = z.enum(['MANUAL', 'CSV', 'EMAIL_PARSER', 'EMAIL_LLM']);
export type SubscriptionSource = z.infer<typeof SubscriptionSourceSchema>;

export const CreateSubscriptionSchema = z
  .object({
    displayName: z.string().min(1).max(100),
    categorySlug: z.string().max(80).optional().nullable(),
    currency: z.string().length(3).default('USD'),
    amountCents: z.coerce.number().int().min(1).max(100_000_000),
    cadence: CadenceSchema.default('MONTHLY'),
    customDays: z.coerce.number().int().min(1).max(3650).optional(),
    nextChargeDate: z.coerce.date().optional().nullable(),
    trialEndsAt: z.coerce.date().optional().nullable(),
    status: SubscriptionStatusSchema.default('ACTIVE'),
    notes: z.string().max(500).optional().nullable(),
  })
  .refine((v) => v.cadence !== 'CUSTOM_DAYS' || v.customDays !== undefined, {
    message: 'customDays is required when cadence is CUSTOM_DAYS',
    path: ['customDays'],
  });
export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;

export const SubscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  categoryId: z.string().nullable(),
  vendorSlug: z.string().nullable(),
  displayName: z.string(),
  currency: z.string(),
  amountCents: z.number(),
  cadence: CadenceSchema,
  customDays: z.number().nullable(),
  nextChargeDate: z.coerce.date().nullable(),
  trialEndsAt: z.coerce.date().nullable(),
  status: SubscriptionStatusSchema,
  source: SubscriptionSourceSchema,
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  category: CategorySchema.nullable().optional(),
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

// ---- Insights ----
export const InsightsSummarySchema = z.object({
  totals: z.object({
    activeCount: z.number(),
    monthlyCents: z.number(),
    yearlyCents: z.number(),
    currency: z.string(),
  }),
  upcomingCharges: z.array(
    z.object({
      id: z.string(),
      displayName: z.string(),
      amountCents: z.number(),
      currency: z.string(),
      nextChargeDate: z.coerce.date().nullable(),
      cadence: CadenceSchema,
    }),
  ),
  byCategory: z.array(
    z.object({
      categorySlug: z.string().nullable(),
      categoryName: z.string().nullable(),
      monthlyCents: z.number(),
      count: z.number(),
    }),
  ),
});
export type InsightsSummary = z.infer<typeof InsightsSummarySchema>;
