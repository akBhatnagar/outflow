import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';

import { Public } from '../common/decorators/public.decorator';

/**
 * Liveness, readiness, version probes.
 *
 * - VERSION_NEUTRAL keeps these at `/health/*` instead of `/v1/health/*` so
 *   ops tools (load balancers, uptime monitors, k8s probes) don't have to
 *   know about API versioning.
 * - @Public bypasses the global JwtAuthGuard so probes can hit them without
 *   credentials.
 * - The global prefix `/api` is already excluded for `health` and `health/*`
 *   in main.ts.
 */
@ApiTags('health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
@Public()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @Get('live')
  live() {
    return { status: 'ok', uptime: process.uptime() };
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 256 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 512 * 1024 * 1024),
    ]);
  }

  @Get('version')
  version() {
    return {
      version: process.env.npm_package_version ?? '0.0.1',
      commit: process.env.GIT_COMMIT ?? 'dev',
      env: process.env.NODE_ENV ?? 'development',
    };
  }
}
