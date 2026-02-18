import { Test, TestingModule } from '@nestjs/testing';
import { CommunityService } from '../community';
import { ContentReportsService } from '../content-reports';
import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
  let service: ModerationService;

  const mockReports = {
    listPendingReports: jest.fn(),
    addAction: jest.fn(),
  };

  const mockCommunity = {
    setPostStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: ContentReportsService, useValue: mockReports },
        { provide: CommunityService, useValue: mockCommunity },
      ],
    }).compile();

    service = module.get<ModerationService>(ModerationService);
    jest.clearAllMocks();
  });

  it('applies hide action and writes audit', async () => {
    mockReports.addAction.mockResolvedValue({
      action: { reportId: 'report-1', actionType: 'hide' },
      report: { id: 'report-1', targetType: 'post', targetId: 'post-1' },
    });

    const result = await service.applyAction(
      { id: 'admin-1', roles: ['admin'] },
      'report-1',
      { actionType: 'hide', reason: 'Violation' },
    );

    expect(mockCommunity.setPostStatus).toHaveBeenCalledWith(
      'post-1',
      'removed',
      'Violation',
    );
    expect(result.audit.action).toBe('hide');
  });
});
