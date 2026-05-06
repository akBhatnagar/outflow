import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cadence, Prisma, SubscriptionStatus } from '@prisma/client';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ListSubscriptionsQueryDto } from './dto/list-subscriptions.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: ListSubscriptionsQueryDto) {
    const where: Prisma.SubscriptionWhereInput = {
      userId,
      deletedAt: null,
      ...(query.status?.length ? { status: { in: query.status } } : {}),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.search ? { displayName: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    return this.prisma.subscription.findMany({
      where,
      include: { category: true },
      orderBy: [{ status: 'asc' }, { nextChargeDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(userId: string, dto: CreateSubscriptionDto) {
    if (dto.cadence === Cadence.CUSTOM_DAYS && !dto.customDays) {
      throw new BadRequestException('customDays is required when cadence = CUSTOM_DAYS');
    }

    const categoryId = dto.categorySlug
      ? ((
          await this.prisma.category.findUnique({
            where: { slug: dto.categorySlug },
            select: { id: true },
          })
        )?.id ?? null)
      : null;

    return this.prisma.subscription.create({
      data: {
        userId,
        displayName: dto.displayName,
        categoryId,
        currency: dto.currency,
        amountCents: dto.amountCents,
        cadence: dto.cadence,
        customDays: dto.customDays,
        nextChargeDate: dto.nextChargeDate,
        trialEndsAt: dto.trialEndsAt,
        status: dto.status,
        notes: dto.notes,
      },
      include: { category: true },
    });
  }

  async findOne(userId: string, id: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, userId, deletedAt: null },
      include: { category: true },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  async update(userId: string, id: string, dto: UpdateSubscriptionDto) {
    await this.findOne(userId, id);

    let categoryId: string | null | undefined;
    if (dto.categorySlug !== undefined) {
      categoryId = dto.categorySlug
        ? ((
            await this.prisma.category.findUnique({
              where: { slug: dto.categorySlug },
              select: { id: true },
            })
          )?.id ?? null)
        : null;
    }

    return this.prisma.subscription.update({
      where: { id },
      data: {
        displayName: dto.displayName,
        currency: dto.currency,
        amountCents: dto.amountCents,
        cadence: dto.cadence,
        customDays: dto.customDays,
        nextChargeDate: dto.nextChargeDate,
        trialEndsAt: dto.trialEndsAt,
        status: dto.status,
        notes: dto.notes,
        ...(categoryId !== undefined ? { categoryId } : {}),
      },
      include: { category: true },
    });
  }

  async setStatus(userId: string, id: string, status: SubscriptionStatus) {
    await this.findOne(userId, id);
    return this.prisma.subscription.update({
      where: { id },
      data: { status },
      include: { category: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.subscription.update({
      where: { id },
      data: { deletedAt: new Date(), status: SubscriptionStatus.CANCELLED },
    });
    return { ok: true };
  }
}
