import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { AuditInterceptor } from './audit.interceptor';

/**
 * Audit module is global so any controller can drop @Audit(...) without
 * importing extra plumbing. The interceptor is wired through APP_INTERCEPTOR
 * so it sees every handler in the app.
 */
@Module({
  controllers: [AuditLogController],
  providers: [
    AuditLogService,
    AuditInterceptor,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditLogService],
})
export class AuditModule {}
