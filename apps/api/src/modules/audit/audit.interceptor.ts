import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';

import type { AuthUser } from '../../common/types/auth-user';

import { AuditLogService } from './audit-log.service';
import { AUDIT_KEY, AuditMetadata } from './audit.decorator';

/**
 * Writes a row to `audit_logs` after a successful response when the handler
 * is decorated with `@Audit(...)`. Errors during audit never reach the user.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditLogService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMetadata | undefined>(AUDIT_KEY, ctx.getHandler());
    if (!meta) return next.handle();

    const http = ctx.switchToHttp();
    const req = http.getRequest<Request & { user?: AuthUser }>();
    const ip = this.clientIp(req);
    const userAgent = req.headers['user-agent'];
    const userId = req.user?.id ?? null;
    const paramId =
      typeof req.params?.id === 'string' ? req.params.id : (req.params?.id as string | undefined);

    return next.handle().pipe(
      tap((body: unknown) => {
        const resolvedId = this.resolveResourceId(meta.resourceIdFrom, body, paramId);
        void this.audit.write({
          userId,
          action: meta.action,
          resourceType: meta.resourceType,
          resourceId: resolvedId,
          ip,
          userAgent,
          metadata: this.safeMetadata(req),
        });
      }),
    );
  }

  private resolveResourceId(
    path: string | undefined,
    body: unknown,
    fallback: string | undefined,
  ): string | null {
    if (!path) return fallback ?? null;
    const parts = path.split('.');
    let cur: unknown = body;
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        return fallback ?? null;
      }
    }
    return typeof cur === 'string' ? cur : (fallback ?? null);
  }

  private clientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim();
    return req.ip;
  }

  private safeMetadata(req: Request): Record<string, unknown> {
    return {
      method: req.method,
      path: req.path,
      query: req.query && Object.keys(req.query).length ? req.query : undefined,
    };
  }
}
