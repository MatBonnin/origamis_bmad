import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma';
import { MentorsSearchService } from './mentors-search.service';

describe('MentorsSearchService', () => {
  let service: MentorsSearchService;

  const mockPrismaService = {
    mentor_profiles: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MentorsSearchService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MentorsSearchService>(MentorsSearchService);
    jest.clearAllMocks();
  });

  it('returns paginated search results sorted by relevance', async () => {
    mockPrismaService.mentor_profiles.findMany.mockResolvedValue([
      {
        user_id: 'mentor-2',
        domain: 'informatique',
        expertise_tags: ['react', 'typescript'],
        hourly_rate: 45,
        rating_avg: 4.3,
        user: {
          first_name: 'Nina',
          last_name: 'Dupont',
          bio: 'Mentor frontend react',
        },
        availability: { is_available: true },
      },
      {
        user_id: 'mentor-1',
        domain: 'commerce',
        expertise_tags: ['negociation'],
        hourly_rate: 25,
        rating_avg: 4.9,
        user: {
          first_name: 'Alice',
          last_name: 'Martin',
          bio: 'Coach React et carriere',
        },
        availability: { is_available: false },
      },
    ]);

    const result = await service.searchMentors({
      q: 'react',
      limit: 1,
      sort: 'relevance',
      filters: {},
    });

    expect(result.mentors).toHaveLength(1);
    expect(result.mentors[0].mentorId).toBe('mentor-2');
    expect(result.metadata.total).toBe(2);
    expect(result.metadata.next_cursor).toBe(
      Buffer.from('1', 'utf-8').toString('base64'),
    );
  });

  it('applies filters and sort by ascending price', async () => {
    mockPrismaService.mentor_profiles.findMany.mockResolvedValue([
      {
        user_id: 'mentor-1',
        domain: 'informatique',
        expertise_tags: ['react'],
        hourly_rate: 70,
        rating_avg: 4.9,
        user: { first_name: 'Alice', last_name: 'Martin', bio: null },
        availability: { is_available: true },
      },
      {
        user_id: 'mentor-2',
        domain: 'informatique',
        expertise_tags: ['react'],
        hourly_rate: 30,
        rating_avg: 4.2,
        user: { first_name: 'Nina', last_name: 'Dupont', bio: null },
        availability: { is_available: true },
      },
    ]);

    const result = await service.searchMentors({
      q: '',
      sort: 'price_asc',
      filters: {
        domains: ['informatique'],
        maxPrice: 60,
      },
    });

    expect(result.mentors).toHaveLength(1);
    expect(result.mentors[0].mentorId).toBe('mentor-2');
  });

  it('returns facets for domain, price, availability and rating', async () => {
    mockPrismaService.mentor_profiles.findMany.mockResolvedValue([
      {
        domain: 'informatique',
        hourly_rate: 20,
        rating_avg: 4.7,
        availability: { is_available: true },
      },
      {
        domain: 'commerce',
        hourly_rate: 60,
        rating_avg: 3.9,
        availability: { is_available: false },
      },
    ]);

    const facets = await service.getFilterFacets();

    expect(facets.domains).toEqual(['commerce', 'informatique']);
    expect(facets.price_ranges.min).toBe(20);
    expect(facets.price_ranges.max).toBe(60);
    expect(facets.availabilities).toEqual(['available', 'unavailable']);
    expect(facets.rating_thresholds).toContain(4);
  });
});
