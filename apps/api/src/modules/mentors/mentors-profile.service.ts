import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';

interface MentorReview {
  reviewId: string;
  rating: number;
  comment: string;
  author: string;
  source: 'session' | 'feedback';
  createdAt: string;
}

interface StoredMentorReview {
  reviewId: string;
  mentorId: string;
  studentId: string;
  bookingId: string | null;
  rating: number;
  comment: string;
  status: 'pending' | 'published' | 'removed';
  createdAt: string;
  updatedAt: string;
}

interface MentorProfileResult {
  mentor: {
    mentorId: string;
    fullName: string;
    bio: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    about: string | null;
    professionalLinks: string[];
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
  private readonly storedReviews = new Map<string, StoredMentorReview>();

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
        bannerUrl: mentor.banner_url ?? null,
        about: mentor.about ?? null,
        professionalLinks: mentor.professional_links ?? [],
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
      metadata: {
        page,
        limit,
        total: reviews.length,
        hasNextPage: offset + limit < reviews.length,
      },
    };
  }

  async createMentorReview(
    mentorId: string,
    input: {
      studentId: string;
      bookingId?: string;
      rating: number;
      body: string;
    },
  ) {
    await this.findMentorOrThrow(mentorId);

    const hasBooking = await this.prisma.bookings.findFirst({
      where: {
        mentor_id: mentorId,
        student_id: input.studentId,
        status: { in: ['confirmed', 'completed'] },
      },
      select: { id: true },
    });

    if (!hasBooking) {
      throw new NotFoundException({
        code: 'REVIEW_BOOKING_REQUIRED',
        message: 'Une session mentor est requise avant de laisser un avis',
      });
    }

    const resolvedBookingId = input.bookingId ?? hasBooking.id;

    if (!input.body.trim()) {
      throw new BadRequestException({
        code: 'REVIEW_BODY_REQUIRED',
        message: 'Le commentaire de l avis est requis',
      });
    }

    const duplicate = [...this.storedReviews.values()].find(
      (review) =>
        review.mentorId === mentorId &&
        review.studentId === input.studentId &&
        review.bookingId === resolvedBookingId &&
        review.status !== 'removed',
    );

    if (duplicate) {
      return {
        review: this.mapStoredReview(duplicate),
      };
    }

    const now = new Date().toISOString();
    const review: StoredMentorReview = {
      reviewId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      mentorId,
      studentId: input.studentId,
      bookingId: resolvedBookingId,
      rating: Math.max(1, Math.min(5, Number(input.rating.toFixed(1)))),
      comment: input.body.trim(),
      status: 'published',
      createdAt: now,
      updatedAt: now,
    };

    this.storedReviews.set(review.reviewId, review);

    return {
      review: this.mapStoredReview(review),
    };
  }

  async updateMentorReview(
    mentorId: string,
    reviewId: string,
    input: {
      studentId: string;
      rating?: number;
      body?: string;
      status?: 'pending' | 'published' | 'removed';
    },
  ) {
    await this.findMentorOrThrow(mentorId);
    const review = this.storedReviews.get(reviewId);

    if (!review || review.mentorId !== mentorId) {
      throw new NotFoundException({
        code: 'REVIEW_NOT_FOUND',
        message: 'Avis introuvable',
      });
    }

    if (review.studentId !== input.studentId) {
      throw new NotFoundException({
        code: 'REVIEW_NOT_FOUND',
        message: 'Avis introuvable',
      });
    }

    const updated: StoredMentorReview = {
      ...review,
      rating:
        input.rating !== undefined
          ? Math.max(1, Math.min(5, Number(input.rating.toFixed(1))))
          : review.rating,
      comment: input.body?.trim() || review.comment,
      status: input.status ?? review.status,
      updatedAt: new Date().toISOString(),
    };

    this.storedReviews.set(reviewId, updated);
    return {
      review: this.mapStoredReview(updated),
    };
  }

  async deleteMentorReview(
    mentorId: string,
    reviewId: string,
    studentId: string,
  ) {
    return this.updateMentorReview(mentorId, reviewId, {
      studentId,
      status: 'removed',
    });
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

    const autoReviews = interactions.map((interaction) => {
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
        source: 'session' as const,
        createdAt: timestamp.toISOString(),
      };
    });

    const manualReviews = [...this.storedReviews.values()]
      .filter(
        (review) =>
          review.mentorId === mentorId && review.status === 'published',
      )
      .map((review): MentorReview => this.mapStoredReview(review));

    return [...manualReviews, ...autoReviews].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  private mapStoredReview(review: StoredMentorReview): MentorReview {
    return {
      reviewId: review.reviewId,
      rating: review.rating,
      comment: review.comment,
      author: review.studentId,
      source: 'feedback',
      createdAt: review.createdAt,
    };
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
