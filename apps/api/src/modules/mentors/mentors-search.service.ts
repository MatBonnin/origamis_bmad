import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { MentorSearchSort } from './dto/get-mentors-search-query.dto';

export interface MentorSearchFilters {
  domains?: string[];
  supportTypes?: ('ponctuel' | 'suivi_regulier' | 'long_uniquement')[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  availability?: 'available' | 'all';
}

interface SearchMentorItem {
  mentorId: string;
  firstName: string;
  lastName: string;
  domain: string;
  expertiseTags: string[];
  keywords: string[];
  supportTypes: string[];
  educationLevel: string | null;
  hourlyRate: number | null;
  rating: number;
  isAvailable: boolean;
}

interface SearchResult {
  mentors: SearchMentorItem[];
  metadata: {
    total: number;
    applied_filters: MentorSearchFilters;
    next_cursor: string | null;
  };
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

@Injectable()
export class MentorsSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchMentors(input: {
    q?: string;
    filters?: MentorSearchFilters;
    sort?: MentorSearchSort;
    cursor?: string;
    limit?: number;
  }): Promise<SearchResult> {
    const q = input.q?.trim() ?? '';
    const filters = input.filters ?? {};
    const limit = Math.max(
      1,
      Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT),
    );
    const offset = this.decodeCursor(input.cursor);
    const sort = input.sort ?? 'relevance';

    const tokens = this.tokenize(q);
    const baseWhere = this.buildWhere(tokens, filters);

    const mentors = await this.prisma.mentor_profiles.findMany({
      where: baseWhere,
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
            bio: true,
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

    const projected = mentors
      .filter((mentor) => {
        const validationStatus =
          mentor.validation_checks?.[0]?.status ??
          (mentor.is_validated ? 'validated' : 'pending_review');
        const visibility = mentor.visibility?.status ?? 'visible';

        return validationStatus === 'validated' && visibility !== 'hidden';
      })
      .map((mentor) => ({
        mentorId: mentor.user_id,
        firstName: mentor.user.first_name,
        lastName: mentor.user.last_name,
        domain: mentor.domain,
        expertiseTags: mentor.expertise_tags,
        keywords: mentor.keywords ?? [],
        supportTypes: mentor.support_types ?? [],
        educationLevel: mentor.education_level ?? null,
        hourlyRate: mentor.hourly_rate,
        rating: mentor.rating_avg ?? 0,
        isAvailable: mentor.availability?.is_available ?? false,
        relevanceScore: this.computeRelevanceScore(mentor, tokens),
      }))
      .filter((item) => this.matchesFilters(item, filters));

    const sorted = this.sortResults(projected, sort);
    const paginated = sorted.slice(offset, offset + limit).map((item) => ({
      mentorId: item.mentorId,
      firstName: item.firstName,
      lastName: item.lastName,
      domain: item.domain,
      expertiseTags: item.expertiseTags,
      keywords: item.keywords,
      supportTypes: item.supportTypes,
      educationLevel: item.educationLevel,
      hourlyRate: item.hourlyRate,
      rating: item.rating,
      isAvailable: item.isAvailable,
    }));
    const nextOffset = offset + limit;
    const nextCursor =
      nextOffset < sorted.length ? this.encodeCursor(nextOffset) : null;

    return {
      mentors: paginated,
      metadata: {
        total: sorted.length,
        applied_filters: filters,
        next_cursor: nextCursor,
      },
    };
  }

  async getFilterFacets() {
    const [mentors, domainRefs] = await Promise.all([
      this.prisma.mentor_profiles.findMany({
        where: { is_validated: true, is_publish_ready: true },
        select: {
          user_id: true,
          is_validated: true,
          domain: true,
          support_types: true,
          hourly_rate: true,
          rating_avg: true,
          visibility: { select: { status: true } },
          validation_checks: {
            select: { status: true },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
          availability: {
            select: {
              is_available: true,
            },
          },
        },
      }),
      this.prisma.domain_refs.findMany({
        select: { label: true },
        orderBy: { label: 'asc' },
      }),
    ]);

    const visibleMentors = mentors.filter((mentor) => {
      const validationStatus =
        mentor.validation_checks?.[0]?.status ??
        (mentor.is_validated ? 'validated' : 'pending_review');
      const visibility = mentor.visibility?.status ?? 'visible';
      return validationStatus === 'validated' && visibility !== 'hidden';
    });

    const domains = domainRefs.map((d) => d.label);
    const ratings = [4.5, 4, 3.5, 3].filter((threshold) =>
      visibleMentors.some((mentor) => (mentor.rating_avg ?? 0) >= threshold),
    );
    const hasAvailable = visibleMentors.some(
      (mentor) => mentor.availability?.is_available,
    );
    const hasUnavailable = visibleMentors.some(
      (mentor) => !mentor.availability?.is_available,
    );

    const prices = visibleMentors
      .map((mentor) => mentor.hourly_rate)
      .filter(
        (value): value is number =>
          typeof value === 'number' && Number.isFinite(value),
      );
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
    const supportTypes = Array.from(
      new Set(visibleMentors.flatMap((mentor) => mentor.support_types)),
    );

    return {
      domains,
      price_ranges: {
        min: minPrice,
        max: maxPrice,
        presets: [
          { key: 'budget', min: 0, max: 30, label: 'Budget (0-30 EUR/h)' },
          {
            key: 'standard',
            min: 31,
            max: 60,
            label: 'Standard (31-60 EUR/h)',
          },
          { key: 'premium', min: 61, max: null, label: 'Premium (61+ EUR/h)' },
        ],
      },
      availabilities: [
        ...(hasAvailable ? ['available'] : []),
        ...(hasUnavailable ? ['unavailable'] : []),
      ],
      support_types: supportTypes,
      rating_thresholds: ratings,
    };
  }

  private buildWhere(tokens: string[], filters: MentorSearchFilters) {
    const base: Record<string, unknown> = {
      is_validated: true,
      is_publish_ready: true,
    };

    if (filters.availability === 'available') {
      base.availability = { is: { is_available: true } };
    }

    if (filters.domains && filters.domains.length > 0) {
      base.domain = { in: filters.domains };
    }
    if (filters.supportTypes && filters.supportTypes.length > 0) {
      base.support_types = {
        hasSome: filters.supportTypes,
      };
    }

    if (filters.minRating !== undefined) {
      base.rating_avg = { gte: filters.minRating };
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      base.hourly_rate = {
        ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
        ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
      };
    }

    if (tokens.length > 0) {
      base.AND = tokens.map((token) => ({
        OR: [
          { domain: { contains: token, mode: 'insensitive' } },
          { expertise_tags: { has: token } },
          { keywords: { has: token } },
          { education_level: { contains: token, mode: 'insensitive' } },
          { user: { first_name: { contains: token, mode: 'insensitive' } } },
          { user: { last_name: { contains: token, mode: 'insensitive' } } },
          { user: { bio: { contains: token, mode: 'insensitive' } } },
        ],
      }));
    }

    return base;
  }

  private matchesFilters(
    mentor: SearchMentorItem & { relevanceScore: number },
    filters: MentorSearchFilters,
  ): boolean {
    if (
      filters.minPrice !== undefined &&
      mentor.hourlyRate !== null &&
      mentor.hourlyRate < filters.minPrice
    ) {
      return false;
    }
    if (
      filters.maxPrice !== undefined &&
      mentor.hourlyRate !== null &&
      mentor.hourlyRate > filters.maxPrice
    ) {
      return false;
    }
    if (filters.minRating !== undefined && mentor.rating < filters.minRating) {
      return false;
    }
    if (filters.availability === 'available' && !mentor.isAvailable) {
      return false;
    }
    if (
      filters.supportTypes &&
      filters.supportTypes.length > 0 &&
      !filters.supportTypes.some((value) => mentor.supportTypes.includes(value))
    ) {
      return false;
    }
    return true;
  }

  private sortResults(
    mentors: Array<SearchMentorItem & { relevanceScore: number }>,
    sort: MentorSearchSort,
  ) {
    return [...mentors].sort((a, b) => {
      if (sort === 'rating_desc') {
        if (b.rating !== a.rating) return b.rating - a.rating;
      } else if (sort === 'price_asc') {
        return this.compareNullableNumbers(a.hourlyRate, b.hourlyRate, 'asc');
      } else if (sort === 'price_desc') {
        return this.compareNullableNumbers(a.hourlyRate, b.hourlyRate, 'desc');
      } else if (sort === 'availability') {
        if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
        if (b.rating !== a.rating) return b.rating - a.rating;
      } else {
        if (b.relevanceScore !== a.relevanceScore)
          return b.relevanceScore - a.relevanceScore;
        if (b.rating !== a.rating) return b.rating - a.rating;
      }

      return a.mentorId.localeCompare(b.mentorId);
    });
  }

  private compareNullableNumbers(
    a: number | null,
    b: number | null,
    direction: 'asc' | 'desc',
  ): number {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;

    if (direction === 'asc') return a - b;
    return b - a;
  }

  private computeRelevanceScore(
    mentor: {
      domain: string;
      expertise_tags: string[];
      keywords: string[];
      education_level: string | null;
      user: { first_name: string; last_name: string; bio: string | null };
    },
    tokens: string[],
  ): number {
    if (tokens.length === 0) {
      return 0;
    }

    const fullName =
      `${mentor.user.first_name} ${mentor.user.last_name}`.toLowerCase();
    const domain = mentor.domain.toLowerCase();
    const bio = (mentor.user.bio ?? '').toLowerCase();
    const tags = mentor.expertise_tags.map((tag) => tag.toLowerCase());
    const keywords = (mentor.keywords ?? []).map((keyword) =>
      keyword.toLowerCase(),
    );
    const educationLevel = (mentor.education_level ?? '').toLowerCase();

    return tokens.reduce((score, token) => {
      let current = score;
      if (domain.includes(token)) current += 6;
      if (tags.some((tag) => tag.includes(token))) current += 8;
      if (keywords.some((keyword) => keyword.includes(token))) current += 7;
      if (educationLevel.includes(token)) current += 4;
      if (fullName.includes(token)) current += 5;
      if (bio.includes(token)) current += 3;
      return current;
    }, 0);
  }

  private tokenize(input: string): string[] {
    if (!input) return [];
    return input
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 1);
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
}
