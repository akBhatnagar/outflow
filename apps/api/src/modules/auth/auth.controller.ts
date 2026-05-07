import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { Audit } from '../audit/audit.decorator';

import { AuthService, IssuedTokens } from './auth.service';
import { ACCESS_COOKIE_NAME } from './strategies/jwt.strategy';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import { ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto } from './dto/password.dto';

const REFRESH_COOKIE_NAME = 'outflow_rt';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ type: AuthResponseDto })
  @Audit({ action: 'user.signup', resourceType: 'user', resourceIdFrom: 'user.id' })
  async signup(
    @Body() body: SignupDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { user, tokens } = await this.auth.signup({
      email: body.email,
      password: body.password,
      name: body.name,
      ip: this.clientIp(req),
      userAgent: req.headers['user-agent'],
    });
    this.setAuthCookies(res, tokens);
    return { user };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  @Audit({ action: 'user.login', resourceType: 'user', resourceIdFrom: 'user.id' })
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { user, tokens } = await this.auth.login({
      email: body.email,
      password: body.password,
      ip: this.clientIp(req),
      userAgent: req.headers['user-agent'],
    });
    this.setAuthCookies(res, tokens);
    return { user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    const { tokens } = await this.auth.refresh(
      refreshToken,
      this.clientIp(req),
      req.headers['user-agent'],
    );
    this.setAuthCookies(res, tokens);
    return { ok: true };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'user.logout', resourceType: 'user' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE_NAME]);
    this.clearAuthCookies(res);
    return { ok: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({ type: AuthUserDto })
  me(@CurrentUser() user: AuthUser): AuthUserDto {
    return user;
  }

  // ---- Email verification ----

  @Post('verify-email/send')
  @HttpCode(HttpStatus.OK)
  async sendVerifyEmail(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ): Promise<{ ok: true; alreadyVerified: boolean }> {
    const result = await this.auth.resendVerificationEmail(
      user.id,
      this.clientIp(req),
      req.headers['user-agent'],
    );
    return { ok: true, alreadyVerified: result.alreadyVerified };
  }

  @Public()
  @Post('verify-email/confirm')
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'user.email_verified', resourceType: 'user' })
  async confirmVerifyEmail(@Body() body: VerifyEmailDto): Promise<{ ok: true }> {
    return this.auth.confirmEmailVerification(body.token);
  }

  // ---- Password reset ----

  /**
   * Always returns 200 even if the email is unknown. This prevents account
   * enumeration: an attacker can't tell from the response whether an email
   * is registered or not.
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() body: ForgotPasswordDto,
    @Req() req: Request,
  ): Promise<{ ok: true }> {
    await this.auth.sendForgotPasswordEmail(
      body.email,
      this.clientIp(req),
      req.headers['user-agent'],
    );
    return { ok: true };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'user.password_reset', resourceType: 'user' })
  async resetPassword(
    @Body() body: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    await this.auth.resetPassword(body.token, body.password);
    // Reset invalidates every session — clear cookies on the requesting browser too.
    this.clearAuthCookies(res);
    return { ok: true };
  }

  // ---- helpers ----

  private setAuthCookies(res: Response, tokens: IssuedTokens) {
    const isProd = process.env.NODE_ENV === 'production';
    const common = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
    };
    res.cookie(ACCESS_COOKIE_NAME, tokens.accessToken, {
      ...common,
      expires: tokens.accessTokenExpiresAt,
    });
    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
      ...common,
      expires: tokens.refreshTokenExpiresAt,
    });
  }

  private clearAuthCookies(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    const common = { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/' };
    res.clearCookie(ACCESS_COOKIE_NAME, common);
    res.clearCookie(REFRESH_COOKIE_NAME, common);
  }

  private clientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim();
    return req.ip;
  }
}
