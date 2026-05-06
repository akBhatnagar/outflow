import { ApiProperty } from '@nestjs/swagger';
import { Cadence, SubscriptionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'Netflix Premium' })
  @IsString()
  @MaxLength(100)
  displayName!: string;

  @ApiProperty({ example: 'streaming-video', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  categorySlug?: string;

  @ApiProperty({ example: 'USD' })
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be a 3-letter ISO code (e.g. USD, EUR, INR)' })
  currency = 'USD';

  @ApiProperty({ description: 'Amount in smallest currency unit (cents)', example: 1599 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  amountCents!: number;

  @ApiProperty({ enum: Cadence, default: Cadence.MONTHLY })
  @IsOptional()
  @IsEnum(Cadence)
  cadence: Cadence = Cadence.MONTHLY;

  @ApiProperty({ required: false, description: 'Required when cadence = CUSTOM_DAYS' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  customDays?: number;

  @ApiProperty({ required: false, type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextChargeDate?: Date;

  @ApiProperty({ required: false, type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  trialEndsAt?: Date;

  @ApiProperty({ enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus = SubscriptionStatus.ACTIVE;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
