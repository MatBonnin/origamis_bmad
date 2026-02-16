import { BadRequestException } from '@nestjs/common';
import { MentorsController } from './mentors.controller';
import { MatchingService } from '../matching';

describe('MentorsController', () => {
  const mockMatchingService = {
    getRecommendations: jest.fn(),
  };

  let controller: MentorsController;

  beforeEach(() => {
    controller = new MentorsController(
      mockMatchingService as unknown as MatchingService,
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

    const result = await controller.getRecommendations(
      { id: 'student-1' } as never,
      { limit: 5, filters: '{"domains":["informatique"]}' },
    );

    expect(mockMatchingService.getRecommendations).toHaveBeenCalledWith(
      'student-1',
      {
        cursor: undefined,
        limit: 5,
        filters: { domains: ['informatique'] },
      },
    );
    expect(result).toEqual({
      data: expect.any(Object),
      error: null,
    });
  });

  it('throws BadRequestException when filters is invalid json', async () => {
    await expect(
      controller.getRecommendations(
        { id: 'student-1' } as never,
        { filters: '{invalid' },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
