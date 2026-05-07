/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuthTokenPurpose } from '@prisma/client';

import { AuthTokenService } from './auth-token.service';
import type { PrismaService } from '../prisma/prisma.service';

interface FakeRow {
  id: string;
  userId: string;
  purpose: AuthTokenPurpose;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
  ip: string | null;
  userAgent: string | null;
}

function makeFakePrisma() {
  const rows = new Map<string, FakeRow>();
  let n = 0;
  const fake = {
    authToken: {
      create: async ({ data }: any) => {
        const row: FakeRow = {
          id: `t_${++n}`,
          userId: data.userId,
          purpose: data.purpose,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          consumedAt: null,
          createdAt: new Date(),
          ip: data.ip ?? null,
          userAgent: data.userAgent ?? null,
        };
        rows.set(data.tokenHash, row);
        return row;
      },
      findUnique: async ({ where }: any) => rows.get(where.tokenHash) ?? null,
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const r of rows.values()) {
          const matches =
            r.tokenHash === where.tokenHash &&
            r.purpose === where.purpose &&
            r.consumedAt === where.consumedAt &&
            (!where.expiresAt?.gt || r.expiresAt > where.expiresAt.gt) &&
            (!where.userId || r.userId === where.userId);
          if (matches) {
            Object.assign(r, data);
            count++;
          }
        }
        return { count };
      },
    },
  };
  return { fake: fake as unknown as PrismaService, rows };
}

describe('AuthTokenService', () => {
  it('issues a token, consumes it once, and rejects reuse', async () => {
    const prisma = makeFakePrisma();
    const svc = new AuthTokenService(prisma.fake);

    const cleartext = await svc.issue({
      userId: 'u1',
      purpose: AuthTokenPurpose.EMAIL_VERIFY,
      ttlMs: 60_000,
    });

    const first = await svc.consume(cleartext, AuthTokenPurpose.EMAIL_VERIFY);
    expect(first?.userId).toBe('u1');

    const second = await svc.consume(cleartext, AuthTokenPurpose.EMAIL_VERIFY);
    expect(second).toBeNull();
  });

  it('rejects an expired token', async () => {
    const prisma = makeFakePrisma();
    const svc = new AuthTokenService(prisma.fake);

    const cleartext = await svc.issue({
      userId: 'u1',
      purpose: AuthTokenPurpose.PASSWORD_RESET,
      ttlMs: 1,
    });
    await new Promise((r) => setTimeout(r, 10));
    const result = await svc.consume(cleartext, AuthTokenPurpose.PASSWORD_RESET);
    expect(result).toBeNull();
  });

  it('rejects a wrong-purpose consume', async () => {
    const prisma = makeFakePrisma();
    const svc = new AuthTokenService(prisma.fake);

    const cleartext = await svc.issue({
      userId: 'u1',
      purpose: AuthTokenPurpose.EMAIL_VERIFY,
      ttlMs: 60_000,
    });
    const result = await svc.consume(cleartext, AuthTokenPurpose.PASSWORD_RESET);
    expect(result).toBeNull();
  });
});
