import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../infra/prisma/prisma.service';

export interface AuditWriteArgs {
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Append-only audit log writer.
 * The interceptor handles HTTP plumbing; this service stays unaware of req/res.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async write(args: AuditWriteArgs): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: args.userId ?? null,
          action: args.action,
          resourceType: args.resourceType,
          resourceId: args.resourceId ?? null,
          ip: args.ip ?? null,
          userAgent: args.userAgent?.slice(0, 200) ?? null,
          metadata: (args.metadata ?? undefined) as never,
        },
      });
    } catch (err) {
      // Audit failures must never break the request.
      this.logger.error({ err, args }, 'audit write failed');
    }
  }
}
