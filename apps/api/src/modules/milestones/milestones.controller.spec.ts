import { Test, TestingModule } from '@nestjs/testing';
import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';

describe('MilestonesController', () => {
  let controller: MilestonesController;

  const mockService = {
    getProgression: jest.fn(),
    getStudentProgression: jest.fn(),
    getStudentInsights: jest.fn(),
    getMilestone: jest.fn(),
    updateMilestoneStatus: jest.fn(),
    reviewMilestone: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MilestonesController],
      providers: [{ provide: MilestonesService, useValue: mockService }],
    }).compile();

    controller = module.get<MilestonesController>(MilestonesController);
    jest.clearAllMocks();
  });

  it('wraps progression response in api envelope', async () => {
    mockService.getProgression.mockResolvedValue({
      milestones: [],
      metadata: {
        total: 0,
        totalCompleted: 0,
        totalPending: 0,
        completionRate: 0,
      },
    });

    const result = await controller.getProgression(
      { id: 'student-1', roles: ['etudiant'] },
      'student-1',
      'rdv',
    );

    expect(result).toEqual({
      data: {
        milestones: [],
        metadata: {
          total: 0,
          totalCompleted: 0,
          totalPending: 0,
          completionRate: 0,
        },
      },
      error: null,
    });

    expect(mockService.getProgression).toHaveBeenCalledWith(
      { id: 'student-1', roles: ['etudiant'] },
      { userId: 'student-1', type: 'rdv' },
    );
  });

  it('patches milestone status with api envelope', async () => {
    mockService.updateMilestoneStatus.mockResolvedValue({
      milestone: { id: 'booking:b-1', status: 'review' },
      progression: {
        total: 1,
        totalCompleted: 0,
        totalPending: 1,
        completionRate: 0,
      },
    });

    const result = await controller.updateStatus(
      { id: 'student-1', roles: ['etudiant'] },
      'booking:b-1',
      { status: 'done' },
    );

    expect(result.error).toBeNull();
    expect(result.data.milestone.status).toBe('review');
  });

  it('reviews milestone with api envelope', async () => {
    mockService.reviewMilestone.mockResolvedValue({
      review: { milestoneId: 'booking:b-1', approved: true },
      milestone: { id: 'booking:b-1', status: 'done' },
    });

    const result = await controller.reviewMilestone(
      { id: 'mentor-1', roles: ['mentor'] },
      'booking:b-1',
      { approved: true },
    );

    expect(result).toEqual({
      data: {
        review: { milestoneId: 'booking:b-1', approved: true },
        milestone: { id: 'booking:b-1', status: 'done' },
      },
      error: null,
    });
  });
});
