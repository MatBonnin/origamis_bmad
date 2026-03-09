import { BadRequestException } from '@nestjs/common';
import { MatchingService } from '../matching';
import { MentorsAdminService } from './mentors-admin.service';
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
    createMentorReview: jest.fn(),
    updateMentorReview: jest.fn(),
    deleteMentorReview: jest.fn(),
  };
  const mockMentorsSelfService = {
    getMyProfile: jest.fn(),
    createMyProfile: jest.fn(),
    updateMyProfile: jest.fn(),
  };
  const mockMentorsAdminService = {
    getPendingMentors: jest.fn(),
    validateMentor: jest.fn(),
    updateMentorStatus: jest.fn(),
    updateVisibility: jest.fn(),
    getVisibility: jest.fn(),
    getMentorVisibilityStatus: jest.fn(),
    getMentorValidationOverride: jest.fn(),
  };
  const mockMentorsEpic8Service = {
    listMyDocuments: jest.fn(),
    uploadMyDocument: jest.fn(),
    deleteMyDocument: jest.fn(),
    connectGoogleCalendar: jest.fn(),
    disconnectGoogleCalendar: jest.fn(),
    syncGoogleCalendar: jest.fn(),
    getMentorDocumentsForAdmin: jest.fn(),
    updateMentorDocumentStatus: jest.fn(),
  };

  let controller: MentorsController;

  beforeEach(() => {
    controller = new MentorsController(
      mockMatchingService as unknown as MatchingService,
      mockMentorsSearchService as unknown as MentorsSearchService,
      mockMentorsProfileService as unknown as MentorsProfileService,
      mockMentorsSelfService as unknown as MentorsSelfService,
      {} as never,
      mockMentorsAdminService as unknown as MentorsAdminService,
      mockMentorsEpic8Service as never,
    );
    jest.clearAllMocks();
    mockMentorsAdminService.getMentorVisibilityStatus.mockReturnValue('visible');
    mockMentorsAdminService.getMentorValidationOverride.mockReturnValue(null);
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
      metadata: {
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

  it('creates mentor review', async () => {
    mockMentorsProfileService.createMentorReview.mockResolvedValue({
      review: { reviewId: 'r-1' },
    });

    const responsePromise = controller.createMentorReview(
      { id: 'student-1' } as never,
      'mentor-1',
      { rating: 4.5, body: 'Excellent mentor' },
    );
    await expect(responsePromise).resolves.toHaveProperty('error', null);
    expect(mockMentorsProfileService.createMentorReview).toHaveBeenCalledWith(
      'mentor-1',
      {
        studentId: 'student-1',
        bookingId: undefined,
        rating: 4.5,
        body: 'Excellent mentor',
      },
    );
  });

  it('updates mentor visibility (admin)', async () => {
    mockMentorsAdminService.updateVisibility.mockResolvedValue({
      mentor: { mentorId: 'mentor-1', visibility: 'priority' },
    });

    const responsePromise = controller.patchMentorVisibility(
      { id: 'admin-1', roles: ['admin'] } as never,
      'mentor-1',
      { status: 'priority' },
    );

    await expect(responsePromise).resolves.toHaveProperty('error', null);
  });
});
