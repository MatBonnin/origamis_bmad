import { Test, TestingModule } from '@nestjs/testing';
import { ContentReportsService } from '../content-reports';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

describe('ModerationController', () => {
  let controller: ModerationController;

  const mockModerationService = {
    listPending: jest.fn(),
    applyAction: jest.fn(),
    getAuditLogs: jest.fn(),
  };

  const mockReportsService = {
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModerationController],
      providers: [
        { provide: ModerationService, useValue: mockModerationService },
        { provide: ContentReportsService, useValue: mockReportsService },
      ],
    }).compile();

    controller = module.get<ModerationController>(ModerationController);
    jest.clearAllMocks();
  });

  it('returns pending reports with envelope', async () => {
    mockModerationService.listPending.mockResolvedValue({
      reports: [{ id: 'report-1' }],
    });

    const result = await controller.getPending({
      id: 'admin-1',
      roles: ['admin'],
    });

    expect(result).toEqual({
      data: { reports: [{ id: 'report-1' }] },
      error: null,
    });
  });

  it('applies moderation action', async () => {
    mockModerationService.applyAction.mockResolvedValue({
      action: { reportId: 'report-1', actionType: 'hide' },
      audit: { entity: 'report' },
    });

    const result = await controller.postAction(
      { id: 'admin-1', roles: ['admin'] },
      'report-1',
      { actionType: 'hide', reason: 'Violation' },
    );

    expect(result.error).toBeNull();
  });
});
