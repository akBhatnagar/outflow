import { Injectable, Logger } from '@nestjs/common';
import { AuthTokenPurpose } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Single-use token issuer for email verification + password reset.
 *
 * The cleartext token is what we put in the email link; only its sha256
 * hash hits the database. When a token is presented we look up the hash,
 * check it's not expired or consumed, and then mark it consumed atomically.
 */
@Injectable()
export class AuthTokenService {
  private readonly logger = new Logger(AuthTokenService.name);
  private static readonly TOKEN_BYTES = 32;

  constructor(private readonly prisma: PrismaService) {}

  /** Issue a token; returns the cleartext that must be sent over email. */
  async issue(args: {
    userId: string;
    purpose: AuthTokenPurpose;
    ttlMs: number;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<string> {
    const cleartext = randomBytes(AuthTokenService.TOKEN_BYTES).toString('base64url');
    await this.prisma.authToken.create({
      data: {
        userId: args.userId,
        purpose: args.purpose,
        tokenHash: this.hash(cleartext),
        expiresAt: new Date(Date.now() + args.ttlMs),
        ip: args.ip ?? null,
        userAgent: args.userAgent?.slice(0, 200) ?? null,
      },
    });
    return cleartext;
  }

  /**
   * Consume a token if it's still valid.
   * Returns null when invalid/expired/already-used. Atomic via updateMany filter.
   */
  async consume(cleartext: string, purpose: AuthTokenPurpose): Promise<{ userId: string } | null> {
    const tokenHash = this.hash(cleartext);
    const now = new Date();
    const result = await this.prisma.authToken.updateMany({
      where: {
        tokenHash,
        purpose,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
    if (result.count === 0) return null;

    const token = await this.prisma.authToken.findUnique({
      where: { tokenHash },
      select: { userId: true },
    });
    return token ? { userId: token.userId } : null;
  }

  /** Best-effort revocation of all outstanding tokens for a user/purpose. */
  async revokeAll(userId: string, purpose: AuthTokenPurpose): Promise<void> {
    await this.prisma.authToken.updateMany({
      where: { userId, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
