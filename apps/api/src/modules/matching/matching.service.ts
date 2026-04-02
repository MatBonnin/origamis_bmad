import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';

interface RecommendationFilters {
  domains?: string[];
  maxPrice?: number;
  minRating?: number;
}

export interface MentorRecommendation {
  mentorId: string;
  firstName: string;
  lastName: string;
  domain: string;
  expertiseTags: string[];
  hourlyRate: number | null;
  rating: number;
  score: number;
  isRecommended: boolean;
  signals: string[];
  cta: 'Voir le mentor' | 'Envoyer un message';
}

export interface RecommendationMetadata {
  scoring_signals: string[];
  applied_filters: RecommendationFilters;
  next_cursor: string | null;
}

interface RecommendationResult {
  mentors: MentorRecommendation[];
  metadata: RecommendationMetadata;
}

interface CachedRecommendations {
  mentors: MentorRecommendation[];
  generatedAt: string;
}

const RECOMMENDATION_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecommendations(
    userId: string,
    options: {
      cursor?: string;
      limit?: number;
      filters?: RecommendationFilters;
    },
  ): Promise<RecommendationResult> {
    await this.assertUserExists(userId);

    const limit = Math.max(
      1,
      Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT),
    );
    const filters = options.filters ?? {};
    const offset = this.decodeCursor(options.cursor);
    const cacheKey = this.buildCacheKey(filters);

    const cached = await this.getValidCache(userId, cacheKey);
    const fullRecommendations =
      cached?.mentors ??
      (await this.buildAndCacheRecommendations(userId, filters, cacheKey));

    const page = fullRecommendations.slice(offset, offset + limit);
    const nextOffset = offset + limit;
    const nextCursor =
      nextOffset < fullRecommendations.length
        ? this.encodeCursor(nextOffset)
        : null;

    const scoringSignals = this.collectScoringSignals(page);

    return {
      mentors: page,
      metadata: {
        scoring_signals: scoringSignals,
        applied_filters: filters,
        next_cursor: nextCursor,
      },
    };
  }

  async invalidateUserRecommendations(userId: string): Promise<void> {
    await this.prisma.recommendation_cache.deleteMany({
      where: { user_id: userId },
    });
  }

  private async buildAndCacheRecommendations(
    userId: string,
    filters: RecommendationFilters,
    cacheKey: string,
  ): Promise<MentorRecommendation[]> {
    const userContext = await this.getUserContext(userId);

    const mentors = await this.prisma.mentor_profiles.findMany({
      where: { is_validated: true, is_publish_ready: true },
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
        availability: true,
        visibility: {
          select: { status: true },
        },
        validation_checks: {
          select: { status: true },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    const interactions = await this.prisma.mentor_interactions.findMany({
      where: { student_user_id: userId },
      select: {
        mentor_user_id: true,
        interaction_count: true,
      },
    });
    const interactionMap = new Map(
      interactions.map((item) => [item.mentor_user_id, item.interaction_count]),
    );

    const scored = mentors
      .filter((mentor) => {
        const validationStatus =
          mentor.validation_checks?.[0]?.status ??
          (mentor.is_validated ? 'validated' : 'pending_review');
        const visibility = mentor.visibility?.status ?? 'visible';
        return (
          mentor.availability?.is_available &&
          validationStatus === 'validated' &&
          visibility !== 'hidden'
        );
      })
      .map((mentor) => {
        const interactionCount = interactionMap.get(mentor.user_id) ?? 0;
        return this.scoreMentor(mentor, userContext, interactionCount);
      })
      .filter((mentor) => this.matchesFilters(mentor, filters))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.rating !== a.rating) return b.rating - a.rating;
        return a.mentorId.localeCompare(b.mentorId);
      });

    const payload: CachedRecommendations = {
      mentors: scored,
      generatedAt: new Date().toISOString(),
    };

    await this.prisma.recommendation_cache.upsert({
      where: {
        user_id_cache_key: {
          user_id: userId,
          cache_key: cacheKey,
        },
      },
      create: {
        user_id: userId,
        cache_key: cacheKey,
        payload_json: payload as unknown as Prisma.InputJsonValue,
        expires_at: new Date(Date.now() + RECOMMENDATION_CACHE_TTL_MS),
      },
      update: {
        payload_json: payload as unknown as Prisma.InputJsonValue,
        expires_at: new Date(Date.now() + RECOMMENDATION_CACHE_TTL_MS),
      },
    });

    return scored;
  }

  private async getValidCache(
    userId: string,
    cacheKey: string,
  ): Promise<CachedRecommendations | null> {
    const now = new Date();
    const cached = await this.prisma.recommendation_cache.findUnique({
      where: {
        user_id_cache_key: {
          user_id: userId,
          cache_key: cacheKey,
        },
      },
    });

    if (!cached || cached.expires_at <= now) {
      return null;
    }

    return cached.payload_json as unknown as CachedRecommendations;
  }

  private scoreMentor(
    mentor: {
      user_id: string;
      domain: string;
      expertise_tags: string[];
      supported_levels: string[];
      hourly_rate: number | null;
      rating_avg: number | null;
      user: {
        first_name: string;
        last_name: string;
      };
    },
    userContext: {
      preferredDomain: string | null;
      preferredObjectives: string[];
      preferredLevel: string | null;
      budgetMax: number | null;
    },
    interactionCount: number,
  ): MentorRecommendation {
    let score = 0;
    const signals: string[] = [];

    if (
      userContext.preferredDomain &&
      mentor.domain === userContext.preferredDomain
    ) {
      score += 30;
      signals.push('domain_match');
    }

    const objectivesOverlap = mentor.expertise_tags.filter((tag) =>
      userContext.preferredObjectives.includes(tag),
    ).length;
    if (objectivesOverlap > 0) {
      score += Math.min(25, objectivesOverlap * 8);
      signals.push('objectives_overlap');
    }

    if (
      userContext.preferredLevel &&
      mentor.supported_levels.includes(userContext.preferredLevel)
    ) {
      score += 20;
      signals.push('level_match');
    }

    if (
      userContext.budgetMax !== null &&
      mentor.hourly_rate !== null &&
      mentor.hourly_rate <= userContext.budgetMax
    ) {
      score += 10;
      signals.push('budget_fit');
    }

    if (interactionCount > 0) {
      score += Math.min(10, interactionCount * 2);
      signals.push('interaction_history');
    }

    const rating = mentor.rating_avg ?? 0;
    score += Math.round(rating * 4);
    if (rating > 0) {
      signals.push('mentor_rating');
    }

    return {
      mentorId: mentor.user_id,
      firstName: mentor.user.first_name,
      lastName: mentor.user.last_name,
      domain: mentor.domain,
      expertiseTags: mentor.expertise_tags,
      hourlyRate: mentor.hourly_rate,
      rating,
      score,
      isRecommended: true,
      signals,
      cta: interactionCount > 0 ? 'Envoyer un message' : 'Voir le mentor',
    };
  }

  private async getUserContext(userId: string): Promise<{
    preferredDomain: string | null;
    preferredObjectives: string[];
    preferredLevel: string | null;
    budgetMax: number | null;
  }> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        objectives: true,
        level: true,
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouve',
      });
    }

    const onboarding = await this.prisma.onboarding.findUnique({
      where: { user_id: userId },
      select: { answers_json: true },
    });
    const needs = await this.prisma.user_needs.findUnique({
      where: { user_id: userId },
      select: { needs_json: true },
    });
    const intents = await this.prisma.user_intents.findUnique({
      where: { user_id: userId },
    });

    const onboardingAnswers = onboarding?.answers_json as
      | Record<string, unknown>
      | undefined;
    const needsData = needs?.needs_json as Record<string, unknown> | undefined;

    const onboardingObjectives = Array.isArray(onboardingAnswers?.objectives)
      ? onboardingAnswers.objectives.filter(
          (item): item is string => typeof item === 'string',
        )
      : [];
    const needsObjectives = Array.isArray(needsData?.objectives)
      ? needsData.objectives.filter(
          (item): item is string => typeof item === 'string',
        )
      : [];
    const intentsObjectives = intents?.preferred_objectives ?? [];

    const preferredObjectives = Array.from(
      new Set([
        ...user.objectives,
        ...onboardingObjectives,
        ...needsObjectives,
        ...intentsObjectives,
      ]),
    );

    const preferredDomain =
      (needsData?.domain as string | undefined) ??
      (onboardingAnswers?.domain as string | undefined) ??
      intents?.preferred_domain ??
      null;

    const preferredLevel =
      (needsData?.level as string | undefined) ??
      (onboardingAnswers?.level as string | undefined) ??
      user.level ??
      null;

    return {
      preferredDomain,
      preferredObjectives,
      preferredLevel,
      budgetMax: intents?.budget_max ?? null,
    };
  }

  private matchesFilters(
    mentor: MentorRecommendation,
    filters: RecommendationFilters,
  ): boolean {
    if (filters.domains && filters.domains.length > 0) {
      if (!filters.domains.includes(mentor.domain)) {
        return false;
      }
    }

    if (filters.maxPrice !== undefined && mentor.hourlyRate !== null) {
      if (mentor.hourlyRate > filters.maxPrice) {
        return false;
      }
    }

    if (filters.minRating !== undefined) {
      if (mentor.rating < filters.minRating) {
        return false;
      }
    }

    return true;
  }

  private collectScoringSignals(mentors: MentorRecommendation[]): string[] {
    return Array.from(new Set(mentors.flatMap((mentor) => mentor.signals)));
  }

  private buildCacheKey(filters: RecommendationFilters): string {
    return JSON.stringify({
      domains: [...(filters.domains ?? [])].sort(),
      maxPrice: filters.maxPrice ?? null,
      minRating: filters.minRating ?? null,
    });
  }

  private encodeCursor(offset: number): string {
    return Buffer.from(String(offset), 'utf-8').toString('base64');
  }

  private decodeCursor(cursor?: string): number {
    if (!cursor) return 0;
    try {
      const value = Number(Buffer.from(cursor, 'base64').toString('utf-8'));
      if (!Number.isFinite(value) || value < 0) return 0;
      return value;
    } catch {
      return 0;
    }
  }

  private async assertUserExists(userId: string): Promise<void> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouve',
      });
    }
  }
}
