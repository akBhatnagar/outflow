import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../types/auth-user';

/**
 * Resolves to the request's authenticated user.
 * Populated by JwtStrategy.validate() — returns `null` if route is `@Public()`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | null => {
    const req = ctx.switchToHttp().getRequest();
    return req.user ?? null;
  },
);
