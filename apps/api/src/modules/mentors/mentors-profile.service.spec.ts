import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma';
import { MentorsProfileService } from './mentors-profile.service';

describe('MentorsProfileService', () => {
  let service: MentorsProfileService;

  const mockPrismaService = {
    mentor_profiles: {
      findUnique: jest.fn(),
    },
    mentor_interactions: {
      findMany: jest.fn(),
    },
    bookings: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MentorsProfileService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MentorsProfileService>(MentorsProfileService);
    jest.clearAllMocks();
  });

  it('returns mentor profile with weighted rating, reviews and availability', async () => {
    mockPrismaService.mentor_profiles.findUnique.mockResolvedValue({
      user_id: 'mentor-1',
      domain: 'informatique',
      banner_url: 'https://cdn.origami.app/banner.png',
      about: 'Mentor frontend',
      professional_links: ['https://www.linkedin.com/in/alice-martin'],
      expertise_tags: ['react', 'typescript'],
      hourly_rate: 45,
      rating_avg: 4.2,
      supported_levels: ['intermediaire'],
      is_validated: true,
      user: {
        first_name: 'Alice',
        last_name: 'Martin',
        bio: 'Mentor frontend',
        avatar_url: 'https://example.com/a.jpg',
      },
      availability: {
        is_available: true,
        next_available_at: new Date('2026-02-17T10:00:00.000Z'),
      },
    });
    mockPrismaService.mentor_interactions.findMany.mockResolvedValue([
      {
        student_user_id: 'student-1',
        interaction_count: 3,
        last_interaction_at: new Date('2026-02-10T10:00:00.000Z'),
        created_at: new Date('2026-01-01T10:00:00.000Z'),
        student: { first_name: 'Nina', last_name: 'Dupont' },
      },
    ]);

    const result = await service.getMentorProfile('mentor-1');

    expect(result.mentor.mentorId).toBe('mentor-1');
    expect(result.mentor.fullName).toBe('Alice Martin');
    expect(result.mentor.bannerUrl).toBe('https://cdn.origami.app/banner.png');
    expect(result.mentor.about).toBe('Mentor frontend');
    expect(result.mentor.professionalLinks).toEqual([
      'https://www.linkedin.com/in/alice-martin',
    ]);
    expect(result.availability.isAvailable).toBe(true);
    expect(result.reviews).toHaveLength(1);
    expect(result.rating.reviewCount).toBe(1);
    expect(result.rating.average).toBeGreaterThan(0);
  });

  it('returns paginated reviews sorted by recency', async () => {
    mockPrismaService.mentor_profiles.findUnique.mockResolvedValue({
      user_id: 'mentor-1',
      domain: 'informatique',
      expertise_tags: [],
      hourly_rate: 45,
      rating_avg: 4,
      supported_levels: [],
      is_validated: true,
      user: {
        first_name: 'Alice',
        last_name: 'Martin',
        bio: 'Mentor',
        avatar_url: null,
      },
      availability: {
        is_available: true,
        next_available_at: null,
      },
    });
    mockPrismaService.mentor_interactions.findMany.mockResolvedValue([
      {
        student_user_id: 'student-2',
        interaction_count: 1,
        last_interaction_at: new Date('2026-02-15T10:00:00.000Z'),
        created_at: new Date('2026-02-14T10:00:00.000Z'),
        student: { first_name: 'Bob', last_name: 'Durand' },
      },
      {
        student_user_id: 'student-1',
        interaction_count: 2,
        last_interaction_at: new Date('2026-02-10T10:00:00.000Z'),
        created_at: new Date('2026-02-01T10:00:00.000Z'),
        student: { first_name: 'Nina', last_name: 'Dupont' },
      },
    ]);

    const result = await service.getMentorReviews('mentor-1', {
      page: 1,
      limit: 1,
    });

    expect(result.reviews).toHaveLength(1);
    expect(result.reviews[0].author).toBe('Bob Durand');
    expect(result.metadata.total).toBe(2);
    expect(result.metadata.hasNextPage).toBe(true);
  });

  it('throws NotFoundException when mentor does not exist', async () => {
    mockPrismaService.mentor_profiles.findUnique.mockResolvedValue(null);

    await expect(service.getMentorProfile('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('creates review when student has booking', async () => {
    mockPrismaService.mentor_profiles.findUnique.mockResolvedValue({
      user_id: 'mentor-1',
      domain: 'informatique',
      expertise_tags: [],
      hourly_rate: 45,
      rating_avg: 4,
      supported_levels: [],
      is_validated: true,
      user: {
        first_name: 'Alice',
        last_name: 'Martin',
        bio: '',
        avatar_url: null,
      },
      availability: null,
    });
    mockPrismaService.bookings.findFirst.mockResolvedValue({ id: 'b-1' });

    const result = await service.createMentorReview('mentor-1', {
      studentId: 'student-1',
      rating: 5,
      body: 'Tres bonne session',
    });

    expect(result.review.reviewId).toContain('manual-');
  });
});
