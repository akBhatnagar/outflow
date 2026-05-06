import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

import { PrismaService } from '../../../infra/prisma/prisma.service';
import type { AuthUser } from '../../../common/types/auth-user';

export const ACCESS_COOKIE_NAME = 'outflow_at';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT strategy reads the access token from either:
 *   1) Authorization: Bearer ... (programmatic clients)
 *   2) `outflow_at` httpOnly cookie (browser session)
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.[ACCESS_COOKIE_NAME] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, emailVerifiedAt: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User no longer exists');
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  }
}
