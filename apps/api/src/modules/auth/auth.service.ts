import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomBytes, createHash, randomUUID } from 'node:crypto';

import { PrismaService } from '../../infra/prisma/prisma.service';
import type { AccessTokenPayload } from './strategies/jwt.strategy';

const REFRESH_TOKEN_BYTES = 48;

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  accessTokenExpiresAt: Date;
}

export interface SignupInput {
  email: string;
  password: string;
  name?: string;
  ip?: string;
  userAgent?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ---- Public flows ----

  async signup(input: SignupInput) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException('An account with that email already exists');
    }

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        billingAccount: { create: {} },
      },
      select: { id: true, email: true, name: true, emailVerifiedAt: true },
    });

    const tokens = await this.issueNewTokenFamily(user.id, user.email, input);
    return { user, tokens };
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
        passwordHash: true,
        deletedAt: true,
      },
    });

    // Always run a hash compare (against a dummy hash if needed) to keep timing constant.
    const ok = user
      ? await argon2.verify(user.passwordHash, input.password)
      : await this.dummyVerify(input.password);

    if (!user || user.deletedAt || !ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.issueNewTokenFamily(user.id, user.email, input);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerifiedAt: user.emailVerifiedAt,
      },
      tokens,
    };
  }

  /**
   * Refresh-token rotation with reuse detection.
   * If a previously-revoked token is presented we revoke the entire family —
   * that's our signal that someone replayed a stolen token.
   */
  async refresh(refreshToken: string, ip?: string, userAgent?: string) {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, deletedAt: true } } },
    });

    if (!stored || !stored.user || stored.user.deletedAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }
    if (stored.revokedAt) {
      // Reuse detected — burn the whole family.
      this.logger.warn({ familyId: stored.familyId }, 'Refresh token reuse detected');
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Rotate: revoke current, issue new in same family.
    const tokens = await this.rotateTokenInFamily(
      stored.userId,
      stored.user.email,
      stored.id,
      stored.familyId,
      { ip, userAgent },
    );

    return { tokens };
  }

  /**
   * Revoke a specific refresh token (and so end the session that owns it).
   */
  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    const tokenHash = this.hashRefreshToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ---- Internals ----

  private async issueNewTokenFamily(
    userId: string,
    email: string,
    ctx: { ip?: string; userAgent?: string },
  ): Promise<IssuedTokens> {
    const familyId = randomUUID();
    return this.issueRefresh(userId, email, familyId, ctx);
  }

  private async rotateTokenInFamily(
    userId: string,
    email: string,
    previousId: string,
    familyId: string,
    ctx: { ip?: string; userAgent?: string },
  ): Promise<IssuedTokens> {
    const tokens = await this.issueRefresh(userId, email, familyId, ctx);
    await this.prisma.refreshToken.update({
      where: { id: previousId },
      data: {
        revokedAt: new Date(),
        replacedBy: tokens.refreshToken.slice(0, 12), // store a non-secret marker for debugging
      },
    });
    return tokens;
  }

  private async issueRefresh(
    userId: string,
    email: string,
    familyId: string,
    ctx: { ip?: string; userAgent?: string },
  ): Promise<IssuedTokens> {
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const refreshExpiresInDays = 30;
    const refreshTokenExpiresAt = new Date(Date.now() + refreshExpiresInDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: this.hashRefreshToken(refreshToken),
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent?.slice(0, 200) ?? null,
        expiresAt: refreshTokenExpiresAt,
      },
    });

    const accessTtlSec = this.parseTtlSeconds(this.config.get<string>('JWT_ACCESS_TTL') ?? '15m');
    const payload: AccessTokenPayload = { sub: userId, email };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: accessTtlSec,
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
    const accessTokenExpiresAt = new Date(Date.now() + accessTtlSec * 1000);

    return { accessToken, refreshToken, refreshTokenExpiresAt, accessTokenExpiresAt };
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Constant-time-ish dummy compare to avoid timing oracle on missing users. */
  private async dummyVerify(password: string): Promise<boolean> {
    const dummy = '$argon2id$v=19$m=65536,t=3,p=4$YQ$YQ'; // intentionally invalid
    try {
      return await argon2.verify(dummy, password);
    } catch {
      return false;
    }
  }

  private parseTtlSeconds(input: string): number {
    const m = /^(\d+)([smhd])$/.exec(input.trim());
    if (!m) return 900;
    const n = Number(m[1]);
    const unit = m[2];
    const mult = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
    return n * mult;
  }
}
