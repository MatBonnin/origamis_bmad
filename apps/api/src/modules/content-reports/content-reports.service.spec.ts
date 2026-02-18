import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications';
import { ContentReportsService } from './content-reports.service';

describe('ContentReportsService', () => {
  let service: ContentReportsService;

  const mockNotifications = {
    emitNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentReportsService,
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<ContentReportsService>(ContentReportsService);
    jest.clearAllMocks();
  });

  it('creates report and gets it', async () => {
    const created = await service.createReport(
      { id: 'user-1', roles: ['etudiant'] },
      {
        targetType: 'post',
        targetId: 'post-1',
        reason: 'Spam',
        captchaToken: 'ok',
      },
    );

    const read = await service.getReport(
      { id: 'user-1', roles: ['etudiant'] },
      created.report.id,
    );

    expect(read.report.id).toBe(created.report.id);
  });

  it('forbids non owner access', async () => {
    const created = await service.createReport(
      { id: 'user-1', roles: ['etudiant'] },
      {
        targetType: 'post',
        targetId: 'post-1',
        reason: 'Spam',
        captchaToken: 'ok',
      },
    );

    await expect(
      service.getReport(
        { id: 'user-2', roles: ['etudiant'] },
        created.report.id,
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
