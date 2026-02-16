import { BadRequestException } from '@nestjs/common';
import { MatchingService } from '../matching';
import { MentorsController } from './mentors.controller';
import { MentorsProfileService } from './mentors-profile.service';
import { MentorsSearchService } from './mentors-search.service';
import { MentorsSelfService } from './mentors-self.service';

describe('MentorsController', () => {
  const mockMatchingService = {
    getRecommendations: jest.fn(),
  };
  const mockMentorsSearchService = {
    searchMentors: jest.fn(),
    getFilterFacets: jest.fn(),
  };
  const mockMentorsProfileService = {
    getMentorProfile: jest.fn(),
    getMentorReviews: jest.fn(),
  };
  const mockMentorsSelfService = {
    getMyProfile: jest.fn(),
    createMyProfile: jest.fn(),
    updateMyProfile: jest.fn(),
  };

  let controller: MentorsController;

  beforeEach(() => {
    controller = new MentorsController(
      mockMatchingService as unknown as MatchingService,
      mockMentorsSearchService as unknown as MentorsSearchService,
      mockMentorsProfileService as unknown as MentorsProfileService,
      mockMentorsSelfService as unknown as MentorsSelfService,
    );
    jest.clearAllMocks();
  });

  it('returns envelope data for recommendations endpoint', async () => {
    mockMatchingService.getRecommendations.mockResolvedValue({
      mentors: [{ mentorId: 'mentor-1' }],
      metadata: {
        scoring_signals: ['domain_match'],
        applied_filters: {},
        next_cursor: null,
      },
    });

    const responsePromise = controller.getRecommendations(
      { id: 'student-1' } as never,
      { limit: 5, filters: '{"domains":["informatique"]}' },
    );
    await expect(responsePromise).resolves.toHaveProperty('error', null);
    await expect(responsePromise).resolves.toHaveProperty('data');

    expect(mockMatchingService.getRecommendations).toHaveBeenCalledWith(
      'student-1',
      {
        cursor: undefined,
        limit: 5,
        filters: { domains: ['informatique'] },
      },
    );
  });

  it('throws BadRequestException when filters is invalid json', async () => {
    await expect(
      controller.getRecommendations({ id: 'student-1' } as never, {
        filters: '{invalid',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns envelope data for mentors search endpoint', async () => {
    mockMentorsSearchService.searchMentors.mockResolvedValue({
      mentors: [{ mentorId: 'mentor-1' }],
      metadata: {
        total: 1,
        applied_filters: { domains: ['informatique'] },
        next_cursor: null,
      },
    });

    const responsePromise = controller.searchMentors({
      q: 'react',
      limit: 6,
      sort: 'rating_desc',
      filters: '{"domains":["informatique"],"maxPrice":60}',
    });
    await expect(responsePromise).resolves.toHaveProperty('error', null);
    await expect(responsePromise).resolves.toHaveProperty('data');

    expect(mockMentorsSearchService.searchMentors).toHaveBeenCalledWith({
      q: 'react',
      cursor: undefined,
      limit: 6,
      sort: 'rating_desc',
      filters: {
        domains: ['informatique'],
        maxPrice: 60,
      },
    });
  });

  it('throws BadRequestException when search filters is invalid json', async () => {
    await expect(
      controller.searchMentors({
        q: 'react',
        filters: '{invalid',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns envelope data for filters facets endpoint', async () => {
    mockMentorsSearchService.getFilterFacets.mockResolvedValue({
      domains: ['informatique'],
      price_ranges: { min: 20, max: 100, presets: [] },
      availabilities: ['available'],
      rating_thresholds: [4],
    });

    const responsePromise = controller.getMentorFilterFacets();
    await expect(responsePromise).resolves.toHaveProperty('error', null);
    await expect(responsePromise).resolves.toHaveProperty('data');
    expect(mockMentorsSearchService.getFilterFacets).toHaveBeenCalledTimes(1);
  });

  it('returns mentor profile details', async () => {
    mockMentorsProfileService.getMentorProfile.mockResolvedValue({
      mentor: { mentorId: 'mentor-1' },
      reviews: [],
      availability: { isAvailable: true, nextAvailableAt: null },
      rating: { average: 4.2, reviewCount: 3 },
    });

    const responsePromise = controller.getMentorProfile('mentor-1');
    await expect(responsePromise).resolves.toHaveProperty('error', null);
    await expect(responsePromise).resolves.toHaveProperty('data');

    expect(mockMentorsProfileService.getMentorProfile).toHaveBeenCalledWith(
      'mentor-1',
    );
  });

  it('returns paginated mentor reviews', async () => {
    mockMentorsProfileService.getMentorReviews.mockResolvedValue({
      reviews: [],
      pagination: {
        page: 1,
        limit: 5,
        total: 0,
        hasNextPage: false,
      },
    });

    const responsePromise = controller.getMentorReviews('mentor-1', {
      page: 1,
      limit: 5,
    });
    await expect(responsePromise).resolves.toHaveProperty('error', null);
    await expect(responsePromise).resolves.toHaveProperty('data');

    expect(mockMentorsProfileService.getMentorReviews).toHaveBeenCalledWith(
      'mentor-1',
      {
        page: 1,
        limit: 5,
      },
    );
  });

  it('returns current mentor profile for authenticated mentor', async () => {
    mockMentorsSelfService.getMyProfile.mockResolvedValue({
      profile: { mentorId: 'mentor-1' },
    });

    const responsePromise = controller.getMyMentorProfile({
      id: 'mentor-1',
    } as never);
    await expect(responsePromise).resolves.toHaveProperty('error', null);
    await expect(responsePromise).resolves.toHaveProperty('data');

    expect(mockMentorsSelfService.getMyProfile).toHaveBeenCalledWith(
      'mentor-1',
    );
  });

  it('creates current mentor profile', async () => {
    const payload = {
      domain: 'informatique',
      expertiseTags: ['react'],
      tariffs: { min: 30, max: 45, currency: 'EUR' },
      availability: { isAvailable: true },
    };

    mockMentorsSelfService.createMyProfile.mockResolvedValue({
      profile: { mentorId: 'mentor-1' },
    });

    const responsePromise = controller.createMyMentorProfile(
      { id: 'mentor-1' } as never,
      payload as never,
    );
    await expect(responsePromise).resolves.toHaveProperty('error', null);
    await expect(responsePromise).resolves.toHaveProperty('data');

    expect(mockMentorsSelfService.createMyProfile).toHaveBeenCalledWith(
      'mentor-1',
      payload,
    );
  });

  it('updates current mentor profile', async () => {
    const payload = {
      expertiseTags: ['react', 'typescript'],
      tariffs: { min: 40, max: 60, currency: 'EUR' },
    };
    mockMentorsSelfService.updateMyProfile.mockResolvedValue({
      profile: { mentorId: 'mentor-1' },
    });

    const responsePromise = controller.updateMyMentorProfile(
      { id: 'mentor-1' } as never,
      payload as never,
    );
    await expect(responsePromise).resolves.toHaveProperty('error', null);
    await expect(responsePromise).resolves.toHaveProperty('data');

    expect(mockMentorsSelfService.updateMyProfile).toHaveBeenCalledWith(
      'mentor-1',
      payload,
    );
  });
});
