import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const mockService = {
    listNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  };

  const mockUser = { id: 'user-1', email: 'test@test.com' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    jest.clearAllMocks();
  });

  it('should list notifications with envelope', async () => {
    mockService.listNotifications.mockResolvedValue({
      notifications: [
        { notificationId: 'n-1', title: 'Test', category: 'messages' },
      ],
    });

    const result = await controller.getNotifications(mockUser as any);

    expect(result).toEqual({
      data: {
        notifications: [
          { notificationId: 'n-1', title: 'Test', category: 'messages' },
        ],
      },
      error: null,
    });
  });

  it('should filter by category', async () => {
    mockService.listNotifications.mockResolvedValue({ notifications: [] });

    await controller.getNotifications(mockUser as any, 'rdv', undefined);

    expect(mockService.listNotifications).toHaveBeenCalledWith('user-1', {
      category: 'rdv',
      unreadOnly: false,
    });
  });

  it('should return unread count with envelope', async () => {
    mockService.getUnreadCount.mockResolvedValue({ unreadCount: 3 });

    const result = await controller.getUnreadCount(mockUser as any);

    expect(result).toEqual({ data: { unreadCount: 3 }, error: null });
  });

  it('should mark as read with envelope', async () => {
    mockService.markAsRead.mockResolvedValue({ success: true });

    const result = await controller.markAsRead(mockUser as any, 'notif-1');

    expect(result).toEqual({ data: { success: true }, error: null });
  });

  it('should mark all as read with envelope', async () => {
    mockService.markAllAsRead.mockResolvedValue({ success: true });

    const result = await controller.markAllAsRead(mockUser as any);

    expect(result).toEqual({ data: { success: true }, error: null });
  });
});
