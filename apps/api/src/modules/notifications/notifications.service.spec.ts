import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrisma = {
    notification_preferences: {
      findUnique: jest.fn(),
    },
    notifications: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  describe('emitNotification', () => {
    it('should not emit when preference is disabled', async () => {
      mockPrisma.notification_preferences.findUnique.mockResolvedValue({
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
      expect(mockPrisma.notifications.create).not.toHaveBeenCalled();
    });

    it('should persist and emit when preference is enabled', async () => {
      mockPrisma.notification_preferences.findUnique.mockResolvedValue({
        enabled: true,
      });
      mockPrisma.notifications.create.mockResolvedValue({
        id: 'notif-1',
        user_id: 'user-1',
        category: 'messages',
        channel: 'in_app',
        title: 'Nouveau message',
        message: 'De Alice',
        payload: {},
        status: 'sent',
        sent_at: new Date(),
        created_at: new Date(),
      });

      const result = await service.emitNotification({
        userId: 'user-1',
        channel: 'in_app',
        category: 'messages',
        title: 'Nouveau message',
        message: 'De Alice',
      });

      expect(result.sent).toBe(true);
      expect(result.notificationId).toBe('notif-1');
      expect(mockPrisma.notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user_id: 'user-1',
            category: 'messages',
            channel: 'in_app',
            status: 'sent',
          }),
        }),
      );
    });

    it('should push via WebSocket for in_app channel', async () => {
      const mockEmitter = jest.fn();
      service.registerWsEmitter(mockEmitter);

      mockPrisma.notification_preferences.findUnique.mockResolvedValue(null);
      mockPrisma.notifications.create.mockResolvedValue({
        id: 'notif-2',
        user_id: 'user-1',
        category: 'system',
        channel: 'in_app',
        title: 'Update',
        message: 'System update',
        payload: {},
        status: 'sent',
        sent_at: new Date(),
        created_at: new Date('2026-02-17T10:00:00.000Z'),
      });

      await service.emitNotification({
        userId: 'user-1',
        channel: 'in_app',
        category: 'system',
        title: 'Update',
        message: 'System update',
      });

      expect(mockEmitter).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          notificationId: 'notif-2',
          title: 'Update',
        }),
      );
    });
  });

  describe('listNotifications', () => {
    it('should list notifications for user', async () => {
      mockPrisma.notifications.findMany.mockResolvedValue([
        {
          id: 'notif-1',
          category: 'messages',
          channel: 'in_app',
          title: 'Nouveau message',
          message: 'De Alice',
          payload: {},
          read_at: null,
          created_at: new Date('2026-02-17T10:00:00.000Z'),
        },
      ]);

      const result = await service.listNotifications('user-1');

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].notificationId).toBe('notif-1');
      expect(result.notifications[0].readAt).toBeNull();
    });

    it('should filter by category', async () => {
      mockPrisma.notifications.findMany.mockResolvedValue([]);

      await service.listNotifications('user-1', { category: 'rdv' });

      expect(mockPrisma.notifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'rdv' }),
        }),
      );
    });

    it('should filter unread only', async () => {
      mockPrisma.notifications.findMany.mockResolvedValue([]);

      await service.listNotifications('user-1', { unreadOnly: true });

      expect(mockPrisma.notifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ read_at: null }),
        }),
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockPrisma.notifications.findUnique.mockResolvedValue({
        id: 'notif-1',
        user_id: 'user-1',
        read_at: null,
      });
      mockPrisma.notifications.update.mockResolvedValue({});

      const result = await service.markAsRead('user-1', 'notif-1');

      expect(result).toEqual({ success: true });
      expect(mockPrisma.notifications.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'notif-1' },
          data: { read_at: expect.any(Date) },
        }),
      );
    });

    it('should throw if notification not found', async () => {
      mockPrisma.notifications.findUnique.mockResolvedValue(null);

      await expect(
        service.markAsRead('user-1', 'notif-unknown'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if notification belongs to another user', async () => {
      mockPrisma.notifications.findUnique.mockResolvedValue({
        id: 'notif-1',
        user_id: 'user-2',
        read_at: null,
      });

      await expect(service.markAsRead('user-1', 'notif-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockPrisma.notifications.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-1');

      expect(result).toEqual({ unreadCount: 5 });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all as read', async () => {
      mockPrisma.notifications.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead('user-1');

      expect(result).toEqual({ success: true });
      expect(mockPrisma.notifications.updateMany).toHaveBeenCalledWith({
        where: { user_id: 'user-1', read_at: null },
        data: { read_at: expect.any(Date) },
      });
    });
  });

  describe('retryFailed', () => {
    it('should retry failed notifications', async () => {
      mockPrisma.notifications.findMany.mockResolvedValue([
        { id: 'notif-fail-1', retries: 1 },
        { id: 'notif-fail-2', retries: 3 },
      ]);
      mockPrisma.notifications.update.mockResolvedValue({});

      const result = await service.retryFailed();

      expect(result).toEqual({ retried: 2 });
      expect(mockPrisma.notifications.update).toHaveBeenCalledTimes(2);
    });
  });
});
