import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrismaService = {
    notification_preferences: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('should not emit notification when preference is disabled', async () => {
    mockPrismaService.notification_preferences.findUnique.mockResolvedValue({
      enabled: false,
    });

    const result = await service.emitNotification({
      userId: 'user-1',
      channel: 'email',
      category: 'messages',
      title: 'Nouveau message',
      message: 'Vous avez un nouveau message',
    });

    expect(result).toEqual({ sent: false, reason: 'DISABLED_BY_PREFERENCE' });
  });

  it('should emit notification when preference is enabled', async () => {
    mockPrismaService.notification_preferences.findUnique.mockResolvedValue({
      enabled: true,
    });

    const result = await service.emitNotification({
      userId: 'user-1',
      channel: 'in_app',
      category: 'system',
      title: 'Info',
      message: 'System update',
    });

    expect(result).toEqual({ sent: true });
  });
});
