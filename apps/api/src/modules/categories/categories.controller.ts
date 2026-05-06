import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../infra/prisma/prisma.service';

@ApiTags('categories')
@ApiBearerAuth()
@Controller({ path: 'categories', version: '1' })
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.category.findMany({
      orderBy: [{ sortKey: 'asc' }, { name: 'asc' }],
    });
  }
}
