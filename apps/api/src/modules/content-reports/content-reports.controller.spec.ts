import { Test, TestingModule } from '@nestjs/testing';
import { ContentReportsController } from './content-reports.controller';
import { ContentReportsService } from './content-reports.service';

describe('ContentReportsController', () => {
  let controller: ContentReportsController;

  const mockService = {
    createReport: jest.fn(),
    getReport: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentReportsController],
      providers: [{ provide: ContentReportsService, useValue: mockService }],
    }).compile();

    controller = module.get<ContentReportsController>(ContentReportsController);
    jest.clearAllMocks();
  });

  it('creates report with envelope', async () => {
    mockService.createReport.mockResolvedValue({ report: { id: 'report-1' } });

    const result = await controller.createReport(
      { id: 'user-1', roles: ['etudiant'] },
      {
        targetType: 'post',
        targetId: 'post-1',
        reason: 'Spam',
        captchaToken: 'ok',
      },
    );

    expect(result).toEqual({
      data: { report: { id: 'report-1' } },
      error: null,
    });
  });
});
