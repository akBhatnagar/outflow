import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/prisma/prisma.service';

@ApiTags('audit')
@ApiBearerAuth()
@Controller({ path: 'audit-logs', version: '1' })
export class AuditLogController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists the caller's own audit log. Paginated by `cursor` (the id of the last
   * row from the previous page). Returns at most `limit` rows (default 50).
   */
  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('cursor') cursor: string | undefined,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const rows = await this.prisma.auditLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: safeLimit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > safeLimit;
    const items = hasMore ? rows.slice(0, safeLimit) : rows;
    return {
      items: items.map((r) => ({
        id: r.id,
        action: r.action,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        ip: r.ip,
        userAgent: r.userAgent,
        metadata: r.metadata,
        createdAt: r.createdAt,
      })),
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    };
  }
}
