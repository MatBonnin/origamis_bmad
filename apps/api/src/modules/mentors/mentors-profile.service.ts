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

interface MentorProfileResult {
  mentor: {
    mentorId: string;
    fullName: string;
    bio: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    about: string | null;
    professionalLinks: string[];
    educationLevel: string | null;
    degrees: string[];
    keywords: string[];
    domain: string;
    expertiseTags: string[];
    supportedLevels: string[];
    supportTypes: string[];
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
        bannerUrl: mentor.banner_url ?? null,
        about: mentor.about ?? null,
        professionalLinks: mentor.professional_links ?? [],
        educationLevel: mentor.education_level ?? null,
        degrees: mentor.degrees ?? [],
        keywords: mentor.keywords ?? [],
        domain: mentor.domain,
        expertiseTags: mentor.expertise_tags,
        supportedLevels: mentor.supported_levels,
        supportTypes: mentor.support_types ?? [],
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

    const duplicate = await this.prisma.mentor_reviews.findFirst({
      where: {
        mentor_id: mentorId,
        student_id: input.studentId,
        booking_id: resolvedBookingId,
        status: { not: 'removed' },
      },
    });

    if (duplicate) {
      return {
        review: this.mapDbReview(duplicate),
      };
    }
    const review = await this.prisma.mentor_reviews.create({
      data: {
        mentor_id: mentorId,
        student_id: input.studentId,
        booking_id: resolvedBookingId,
        rating: Math.max(1, Math.min(5, Number(input.rating.toFixed(1)))),
        body: input.body.trim(),
        status: 'published',
      },
    });

    return {
      review: this.mapDbReview(review),
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
    const review = await this.prisma.mentor_reviews.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.mentor_id !== mentorId) {
      throw new NotFoundException({
        code: 'REVIEW_NOT_FOUND',
        message: 'Avis introuvable',
      });
    }

    if (review.student_id !== input.studentId) {
      throw new NotFoundException({
        code: 'REVIEW_NOT_FOUND',
        message: 'Avis introuvable',
      });
    }

    const updated = await this.prisma.mentor_reviews.update({
      where: { id: reviewId },
      data: {
        rating:
          input.rating !== undefined
            ? Math.max(1, Math.min(5, Number(input.rating.toFixed(1))))
            : undefined,
        body: input.body?.trim() || undefined,
        status: input.status,
      },
    });
    return {
      review: this.mapDbReview(updated),
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
        visibility: {
          select: { status: true },
        },
      },
    });

    if (
      !mentor ||
      !mentor.is_validated ||
      (mentor.is_publish_ready !== undefined && !mentor.is_publish_ready) ||
      mentor.visibility?.status === 'hidden'
    ) {
      throw new NotFoundException({
        code: 'MENTOR_NOT_FOUND',
        message: 'Profil mentor introuvable',
      });
    }

    return mentor;
  }

  private async buildReviews(mentorId: string): Promise<MentorReview[]> {
    const reviews = await this.prisma.mentor_reviews.findMany({
      where: {
        mentor_id: mentorId,
        status: 'published',
      },
      orderBy: {
        created_at: 'desc',
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

    return reviews
      .map((review) => this.mapDbReview(review))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  private mapDbReview(review: {
    id: string;
    rating: number;
    body: string;
    student_id?: string;
    student?: { first_name: string; last_name: string } | null;
    created_at: Date;
  }): MentorReview {
    const authorName = review.student
      ? `${review.student.first_name} ${review.student.last_name}`
      : (review.student_id ?? 'Etudiant');

    return {
      reviewId: review.id,
      rating: review.rating,
      comment: review.body,
      author: authorName,
      source: 'feedback',
      createdAt: review.created_at.toISOString(),
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
