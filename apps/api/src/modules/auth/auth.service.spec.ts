/* eslint-disable @typescript-eslint/no-explicit-any -- test fakes use loose Prisma shape */
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import type { AuthTokenService } from '../../infra/auth-tokens/auth-token.service';
import type { HibpService } from '../../infra/hibp/hibp.service';
import type { MailService } from '../../infra/mail/mail.service';
import type { PrismaService } from '../../infra/prisma/prisma.service';

interface FakeUserRow {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  emailVerifiedAt: Date | null;
  deletedAt: Date | null;
  failedLoginCount: number;
  lockedUntil: Date | null;
  passwordChangedAt: Date;
}

interface FakeRefreshTokenRow {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  ip: string | null;
  userAgent: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedBy: string | null;
  createdAt: Date;
}

/** Tiny in-memory Prisma double covering only the methods AuthService touches. */
function makeFakePrisma() {
  const users = new Map<string, FakeUserRow>();
  const refreshTokens = new Map<string, FakeRefreshTokenRow>();
  let counter = 0;
  const nextId = () => `id_${++counter}`;

  const fake = {
    user: {
      findUnique: async ({ where }: any) => {
        const found = where.id
          ? users.get(where.id)
          : where.email
            ? Array.from(users.values()).find((u) => u.email === where.email)
            : null;
        return found ?? null;
      },
      create: async ({ data }: any) => {
        const id = nextId();
        const row: FakeUserRow = {
          id,
          email: data.email,
          passwordHash: data.passwordHash,
          name: data.name ?? null,
          emailVerifiedAt: null,
          deletedAt: null,
          failedLoginCount: 0,
          lockedUntil: null,
          passwordChangedAt: new Date(Date.now() - 1000), // older than any later refresh token
        };
        users.set(id, row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = users.get(where.id);
        if (!row) throw new Error('user not found');
        Object.assign(row, data);
        return row;
      },
    },
    refreshToken: {
      create: async ({ data }: any) => {
        const id = nextId();
        const row: FakeRefreshTokenRow = {
          id,
          userId: data.userId,
          tokenHash: data.tokenHash,
          familyId: data.familyId,
          ip: data.ip ?? null,
          userAgent: data.userAgent ?? null,
          expiresAt: data.expiresAt,
          revokedAt: null,
          replacedBy: null,
          createdAt: new Date(),
        };
        refreshTokens.set(id, row);
        return row;
      },
      findUnique: async ({ where }: any) => {
        const row = Array.from(refreshTokens.values()).find((t) => t.tokenHash === where.tokenHash);
        if (!row) return null;
        const user = users.get(row.userId);
        return { ...row, user };
      },
      update: async ({ where, data }: any) => {
        const row = refreshTokens.get(where.id);
        if (!row) throw new Error('refresh token not found');
        Object.assign(row, data);
        return row;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const row of refreshTokens.values()) {
          if (
            (where.familyId ? row.familyId === where.familyId : true) &&
            (where.tokenHash ? row.tokenHash === where.tokenHash : true) &&
            (where.userId ? row.userId === where.userId : true) &&
            (where.revokedAt === null ? row.revokedAt === null : true)
          ) {
            Object.assign(row, data);
            count++;
          }
        }
        return { count };
      },
    },
  };

  return { fake: fake as unknown as PrismaService, _refresh: refreshTokens, _users: users };
}

const noopAuthTokens: AuthTokenService = {
  issue: async () => 'fake-token',
  consume: async () => null,
  revokeAll: async () => undefined,
} as unknown as AuthTokenService;

const noopMail: MailService = {
  sendVerifyEmail: async () => undefined,
  sendResetPasswordEmail: async () => undefined,
  send: async () => undefined,
} as unknown as MailService;

const noopHibp: HibpService = {
  breachCount: async () => 0,
  assertNotBreached: async () => undefined,
} as unknown as HibpService;

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makeFakePrisma>;

  beforeEach(() => {
    prisma = makeFakePrisma();
    const config = {
      get: (k: string) =>
        ({
          JWT_ACCESS_SECRET: 'test-access',
          JWT_ACCESS_TTL: '15m',
        })[k] as string | undefined,
      getOrThrow: (k: string) =>
        ({
          JWT_ACCESS_SECRET: 'test-access',
        })[k] ??
        (() => {
          throw new Error(`missing ${k}`);
        })(),
    } as ConfigService;

    const jwt = new JwtService({ secret: 'test-access' });
    service = new AuthService(prisma.fake, jwt, config, noopAuthTokens, noopMail, noopHibp);
  });

  it('signup creates user and issues a token pair', async () => {
    const { user, tokens } = await service.signup({
      email: 'jane@example.com',
      password: 'a-very-long-password-1',
    });
    expect(user.email).toBe('jane@example.com');
    expect(tokens.accessToken.length).toBeGreaterThan(20);
    expect(tokens.refreshToken.length).toBeGreaterThan(20);
  });

  it('signup fails on duplicate email', async () => {
    await service.signup({ email: 'a@b.co', password: 'a-very-long-password-1' });
    await expect(
      service.signup({ email: 'a@b.co', password: 'a-very-long-password-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('login rejects wrong password without leaking which is wrong', async () => {
    await service.signup({ email: 'a@b.co', password: 'right-password-1234' });
    await expect(
      service.login({ email: 'a@b.co', password: 'wrong-password-XYZ7' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.login({ email: 'nope@nowhere', password: 'whatever-1234' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refresh rotates the token in the same family', async () => {
    const { tokens: t1 } = await service.signup({
      email: 'a@b.co',
      password: 'right-password-1234',
    });
    const { tokens: t2 } = await service.refresh(t1.refreshToken);
    expect(t2.refreshToken).not.toBe(t1.refreshToken);

    await expect(service.refresh(t1.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.refresh(t2.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logout revokes a refresh token', async () => {
    const { tokens } = await service.signup({
      email: 'a@b.co',
      password: 'right-password-1234',
    });
    await service.logout(tokens.refreshToken);
    await expect(service.refresh(tokens.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('locks an account after too many failed login attempts', async () => {
    await service.signup({ email: 'a@b.co', password: 'right-password-1234' });
    for (let i = 0; i < 10; i++) {
      await expect(
        service.login({ email: 'a@b.co', password: 'wrong-password-XYZ7' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
    // Even the correct password is now refused while the lock is active.
    await expect(
      service.login({ email: 'a@b.co', password: 'right-password-1234' }),
    ).rejects.toMatchObject({ message: expect.stringMatching(/Too many failed attempts/) });
  });

  it('clears failed-attempt counter on a successful login', async () => {
    await service.signup({ email: 'a@b.co', password: 'right-password-1234' });
    await expect(
      service.login({ email: 'a@b.co', password: 'wrong-password-XYZ7' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await service.login({ email: 'a@b.co', password: 'right-password-1234' });
    const row = Array.from(prisma._users.values()).find((u) => u.email === 'a@b.co');
    expect(row?.failedLoginCount).toBe(0);
    expect(row?.lockedUntil).toBeNull();
  });
});
