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

import { AuthService, IssuedTokens } from './auth.service';
import { ACCESS_COOKIE_NAME } from './strategies/jwt.strategy';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';

const REFRESH_COOKIE_NAME = 'outflow_rt';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ type: AuthResponseDto })
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
