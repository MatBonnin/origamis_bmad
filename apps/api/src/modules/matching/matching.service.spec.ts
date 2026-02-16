import { Test, TestingModule } from '@nestjs/testing';
import { MatchingService } from './matching.service';
import { PrismaService } from '../prisma';

describe('MatchingService', () => {
  let service: MatchingService;

  const mockPrismaService = {
    users: {
      findUnique: jest.fn(),
    },
    onboarding: {
      findUnique: jest.fn(),
    },
    user_needs: {
      findUnique: jest.fn(),
    },
    user_intents: {
      findUnique: jest.fn(),
    },
    mentor_profiles: {
      findMany: jest.fn(),
    },
    mentor_interactions: {
      findMany: jest.fn(),
    },
    recommendation_cache: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
    jest.clearAllMocks();
  });

  it('returns mentors sorted by score using onboarding, needs and interaction history', async () => {
    mockPrismaService.users.findUnique
      .mockResolvedValueOnce({ id: 'student-1' })
      .mockResolvedValueOnce({
        objectives: ['career-guidance'],
        level: 'intermediaire',
      });
    mockPrismaService.onboarding.findUnique.mockResolvedValue({
      answers_json: { domain: 'informatique', objectives: ['networking'] },
    });
    mockPrismaService.user_needs.findUnique.mockResolvedValue({
      needs_json: { domain: 'informatique', objectives: ['career-guidance'] },
    });
    mockPrismaService.user_intents.findUnique.mockResolvedValue({
      preferred_domain: 'informatique',
      budget_max: 50,
      preferred_objectives: ['networking'],
    });
    mockPrismaService.mentor_profiles.findMany.mockResolvedValue([
      {
        user_id: 'mentor-1',
        domain: 'informatique',
        expertise_tags: ['networking', 'career-guidance'],
        supported_levels: ['intermediaire'],
        hourly_rate: 40,
        rating_avg: 4.8,
        user: { first_name: 'Alice', last_name: 'Martin' },
        availability: { is_available: true },
      },
      {
        user_id: 'mentor-2',
        domain: 'commerce',
        expertise_tags: ['negociation'],
        supported_levels: ['debutant'],
        hourly_rate: 80,
        rating_avg: 4.1,
        user: { first_name: 'Bob', last_name: 'Durand' },
        availability: { is_available: true },
      },
    ]);
    mockPrismaService.mentor_interactions.findMany.mockResolvedValue([
      { mentor_user_id: 'mentor-1', interaction_count: 2 },
    ]);
    mockPrismaService.recommendation_cache.findUnique.mockResolvedValue(null);
    mockPrismaService.recommendation_cache.upsert.mockResolvedValue({});

    const result = await service.getRecommendations('student-1', {
      limit: 10,
      filters: {},
    });

    expect(result.mentors).toHaveLength(2);
    expect(result.mentors[0].mentorId).toBe('mentor-1');
    expect(result.mentors[0].signals).toEqual(
      expect.arrayContaining([
        'domain_match',
        'objectives_overlap',
        'level_match',
        'budget_fit',
        'interaction_history',
      ]),
    );
  });

  it('applies pagination with cursor and returns next cursor', async () => {
    const cursor = Buffer.from('1', 'utf-8').toString('base64');
    mockPrismaService.users.findUnique.mockResolvedValue({ id: 'student-1' });
    mockPrismaService.recommendation_cache.findUnique.mockResolvedValue({
      payload_json: {
        mentors: [
          { mentorId: 'mentor-1', signals: [], rating: 4, hourlyRate: 20, domain: 'informatique' },
          { mentorId: 'mentor-2', signals: [], rating: 4, hourlyRate: 30, domain: 'informatique' },
          { mentorId: 'mentor-3', signals: [], rating: 4, hourlyRate: 40, domain: 'informatique' },
        ],
      },
      expires_at: new Date(Date.now() + 60_000),
    });

    const result = await service.getRecommendations('student-1', {
      cursor,
      limit: 1,
      filters: {},
    });

    expect(result.mentors).toHaveLength(1);
    expect(result.mentors[0].mentorId).toBe('mentor-2');
    expect(result.metadata.next_cursor).toBe(Buffer.from('2', 'utf-8').toString('base64'));
  });

  it('uses cache when not expired', async () => {
    mockPrismaService.users.findUnique.mockResolvedValue({ id: 'student-1' });
    mockPrismaService.recommendation_cache.findUnique.mockResolvedValue({
      payload_json: {
        mentors: [
          { mentorId: 'mentor-1', signals: ['mentor_rating'], rating: 4.5, hourlyRate: 30, domain: 'informatique' },
        ],
      },
      expires_at: new Date(Date.now() + 60_000),
    });

    const result = await service.getRecommendations('student-1', {
      limit: 5,
      filters: {},
    });

    expect(result.mentors[0].mentorId).toBe('mentor-1');
    expect(mockPrismaService.mentor_profiles.findMany).not.toHaveBeenCalled();
  });

  it('invalidates user cache entries', async () => {
    await service.invalidateUserRecommendations('student-1');

    expect(mockPrismaService.recommendation_cache.deleteMany).toHaveBeenCalledWith({
      where: { user_id: 'student-1' },
    });
  });

  it('scores recommendation list fast for live usage baseline', async () => {
    const mentors = Array.from({ length: 600 }).map((_, index) => ({
      user_id: `mentor-${index}`,
      domain: index % 2 === 0 ? 'informatique' : 'commerce',
      expertise_tags: ['career-guidance', 'networking'],
      supported_levels: ['intermediaire'],
      hourly_rate: 30 + (index % 20),
      rating_avg: 4,
      user: { first_name: 'Mentor', last_name: String(index) },
      availability: { is_available: true },
    }));

    mockPrismaService.users.findUnique
      .mockResolvedValueOnce({ id: 'student-1' })
      .mockResolvedValueOnce({
        objectives: ['career-guidance'],
        level: 'intermediaire',
      });
    mockPrismaService.onboarding.findUnique.mockResolvedValue({
      answers_json: { domain: 'informatique', objectives: ['networking'] },
    });
    mockPrismaService.user_needs.findUnique.mockResolvedValue({
      needs_json: { domain: 'informatique', objectives: ['career-guidance'] },
    });
    mockPrismaService.user_intents.findUnique.mockResolvedValue({
      preferred_domain: 'informatique',
      budget_max: 70,
      preferred_objectives: ['networking'],
    });
    mockPrismaService.mentor_profiles.findMany.mockResolvedValue(mentors);
    mockPrismaService.mentor_interactions.findMany.mockResolvedValue([]);
    mockPrismaService.recommendation_cache.findUnique.mockResolvedValue(null);
    mockPrismaService.recommendation_cache.upsert.mockResolvedValue({});

    const start = Date.now();
    await service.getRecommendations('student-1', {
      limit: 20,
      filters: {},
    });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(200);
  });
});
