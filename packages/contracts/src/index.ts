// Shared contract surface between API (NestJS) and Web (Next.js).
// Define Zod schemas here and infer types from them — single source of truth.

import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  uptime: z.number().nonnegative(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const VersionResponseSchema = z.object({
  version: z.string(),
  commit: z.string(),
  env: z.string(),
});
export type VersionResponse = z.infer<typeof VersionResponseSchema>;
