import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { InsightsService } from './insights.service';

@ApiTags('insights')
@ApiBearerAuth()
@Controller({ path: 'insights', version: '1' })
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.insights.summary(user.id);
  }
}
