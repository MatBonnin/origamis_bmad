import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { OnboardingStateDto, UpdateOnboardingStepDto } from './dto';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyOnboarding(userId: string): Promise<OnboardingStateDto> {
    await this.assertUserExists(userId);
    const onboarding = await this.ensureOnboarding(userId);

    return {
      step: onboarding.step,
      answers: onboarding.answers_json as Record<string, unknown>,
      completed: Boolean(onboarding.completed_at),
    };
  }

  async updateStep(
    userId: string,
    dto: UpdateOnboardingStepDto,
  ): Promise<{ step: number; answers: Record<string, unknown> }> {
    await this.assertUserExists(userId);
    const current = await this.ensureOnboarding(userId);
    const mergedAnswers = {
      ...(current.answers_json as Record<string, unknown>),
      ...dto.answers,
    };

    const onboarding = await this.prisma.onboarding.update({
      where: { user_id: userId },
      data: {
        step: dto.step,
        answers_json: mergedAnswers as Prisma.InputJsonValue,
      },
    });

    return {
      step: onboarding.step,
      answers: onboarding.answers_json as Record<string, unknown>,
    };
  }

  async complete(userId: string): Promise<{ completed: true }> {
    await this.assertUserExists(userId);
    await this.ensureOnboarding(userId);

    await this.prisma.onboarding.update({
      where: { user_id: userId },
      data: {
        step: 4,
        completed_at: new Date(),
      },
    });

    return { completed: true };
  }

  private async ensureOnboarding(userId: string) {
    const existing = await this.prisma.onboarding.findUnique({
      where: { user_id: userId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.onboarding.create({
      data: {
        user_id: userId,
        step: 1,
        answers_json: {},
      },
    });
  }

  private async assertUserExists(userId: string): Promise<void> {
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouve',
      });
    }
  }
}
