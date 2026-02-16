import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';

interface MentorReview {
  reviewId: string;
  rating: number;
  comment: string;
  author: string;
  source: 'session' | 'feedback';
  createdAt: string;
}

interface MentorProfileResult {
  mentor: {
    mentorId: string;
    fullName: string;
    bio: string | null;
    avatarUrl: string | null;
    domain: string;
    expertiseTags: string[];
    supportedLevels: string[];
    hourlyRate: number | null;
  };
  reviews: MentorReview[];
  availability: {
    isAvailable: boolean;
    nextAvailableAt: string | null;
  };
  rating: {
    average: number;
    reviewCount: number;
  };
}

const DEFAULT_REVIEW_PAGE = 1;
const DEFAULT_REVIEW_LIMIT = 5;
const MAX_REVIEW_LIMIT = 20;

@Injectable()
export class MentorsProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getMentorProfile(mentorId: string): Promise<MentorProfileResult> {
    const mentor = await this.findMentorOrThrow(mentorId);
    const reviews = await this.buildReviews(mentorId);
    const rating = this.computeWeightedRating(reviews, mentor.rating_avg ?? 0);

    return {
      mentor: {
        mentorId: mentor.user_id,
        fullName: `${mentor.user.first_name} ${mentor.user.last_name}`,
        bio: mentor.user.bio,
        avatarUrl: mentor.user.avatar_url,
        domain: mentor.domain,
        expertiseTags: mentor.expertise_tags,
        supportedLevels: mentor.supported_levels,
        hourlyRate: mentor.hourly_rate,
      },
      reviews: reviews.slice(0, DEFAULT_REVIEW_LIMIT),
      availability: {
        isAvailable: mentor.availability?.is_available ?? false,
        nextAvailableAt:
          mentor.availability?.next_available_at?.toISOString() ?? null,
      },
      rating,
    };
  }

  async getMentorReviews(
    mentorId: string,
    input: { page?: number; limit?: number },
  ) {
    await this.findMentorOrThrow(mentorId);

    const page = Math.max(
      DEFAULT_REVIEW_PAGE,
      input.page ?? DEFAULT_REVIEW_PAGE,
    );
    const limit = Math.max(
      1,
      Math.min(input.limit ?? DEFAULT_REVIEW_LIMIT, MAX_REVIEW_LIMIT),
    );
    const reviews = await this.buildReviews(mentorId);
    const offset = (page - 1) * limit;
    const pageItems = reviews.slice(offset, offset + limit);

    return {
      reviews: pageItems,
      pagination: {
        page,
        limit,
        total: reviews.length,
        hasNextPage: offset + limit < reviews.length,
      },
    };
  }

  private async findMentorOrThrow(mentorId: string) {
    const mentor = await this.prisma.mentor_profiles.findUnique({
      where: { user_id: mentorId },
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
            bio: true,
            avatar_url: true,
          },
        },
        availability: true,
      },
    });

    if (!mentor || !mentor.is_validated) {
      throw new NotFoundException({
        code: 'MENTOR_NOT_FOUND',
        message: 'Profil mentor introuvable',
      });
    }

    return mentor;
  }

  private async buildReviews(mentorId: string): Promise<MentorReview[]> {
    const interactions = await this.prisma.mentor_interactions.findMany({
      where: {
        mentor_user_id: mentorId,
        interaction_count: {
          gt: 0,
        },
      },
      orderBy: {
        last_interaction_at: 'desc',
      },
      include: {
        student: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    return interactions.map((interaction) => {
      const rating = Math.min(5, 3 + interaction.interaction_count * 0.4);
      const timestamp =
        interaction.last_interaction_at ?? interaction.created_at;
      const authorName = interaction.student
        ? `${interaction.student.first_name} ${interaction.student.last_name}`
        : 'Etudiant OrigAMI';

      return {
        reviewId: `${interaction.student_user_id}-${interaction.mentor_user_id}`,
        rating: Number(rating.toFixed(1)),
        comment: 'Session de mentorat validee par retour de session.',
        author: authorName,
        source: 'session',
        createdAt: timestamp.toISOString(),
      };
    });
  }

  private computeWeightedRating(
    reviews: MentorReview[],
    fallbackAverage: number,
  ): { average: number; reviewCount: number } {
    if (reviews.length === 0) {
      return {
        average: Number(fallbackAverage.toFixed(1)),
        reviewCount: 0,
      };
    }

    const now = Date.now();
    let weightedSum = 0;
    let totalWeight = 0;

    for (const review of reviews) {
      const daysFromNow =
        (now - new Date(review.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const recencyWeight =
        daysFromNow <= 30 ? 1.4 : daysFromNow <= 90 ? 1.1 : 1;
      weightedSum += review.rating * recencyWeight;
      totalWeight += recencyWeight;
    }

    const average =
      totalWeight > 0 ? weightedSum / totalWeight : fallbackAverage;
    return {
      average: Number(average.toFixed(1)),
      reviewCount: reviews.length,
    };
  }
}
