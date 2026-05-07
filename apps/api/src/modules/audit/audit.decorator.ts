import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'outflow:audit';

export interface AuditMetadata {
  action: string;
  resourceType: string;
  /**
   * Optional dotted path into the response body that yields the resource id
   * (e.g. "id" or "subscription.id"). When omitted we fall back to route param `:id`.
   */
  resourceIdFrom?: string;
}

/**
 * Mark a controller route as audited. The {@link AuditInterceptor} will pick
 * it up and append a row to `audit_logs` after a successful response.
 *
 * @example
 *   @Audit({ action: 'subscription.create', resourceType: 'subscription' })
 *   create(...) { ... }
 */
export const Audit = (meta: AuditMetadata): MethodDecorator => SetMetadata(AUDIT_KEY, meta);
