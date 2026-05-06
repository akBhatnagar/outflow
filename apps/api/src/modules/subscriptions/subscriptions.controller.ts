import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SubscriptionStatus } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ListSubscriptionsQueryDto } from './dto/list-subscriptions.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller({ path: 'subscriptions', version: '1' })
export class SubscriptionsController {
  constructor(private readonly subs: SubscriptionsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListSubscriptionsQueryDto) {
    return this.subs.list(user.id, query);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSubscriptionDto) {
    return this.subs.create(user.id, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.subs.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.subs.update(user.id, id, dto);
  }

  @Patch(':id/status')
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('status') status: SubscriptionStatus,
  ) {
    return this.subs.setStatus(user.id, id, status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.subs.remove(user.id, id);
  }
}
