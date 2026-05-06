import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'production'
          ? [
              { level: 'warn', emit: 'event' },
              { level: 'error', emit: 'event' },
            ]
          : [
              { level: 'query', emit: 'event' },
              { level: 'warn', emit: 'event' },
              { level: 'error', emit: 'event' },
            ],
    });
  }

  async onModuleInit() {
    await this.$connect();

    if (process.env.NODE_ENV !== 'production') {
      // @ts-expect-error: Prisma's typed events on the client require a stricter generic
      this.$on('query', (e: Prisma.QueryEvent) => {
        if (e.duration > 250) {
          this.logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
        }
      });
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
