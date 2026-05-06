import { ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListSubscriptionsQueryDto {
  @ApiPropertyOptional({ enum: SubscriptionStatus, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(SubscriptionStatus, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  status?: SubscriptionStatus[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({ description: 'Substring to match in displayName' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;
}
