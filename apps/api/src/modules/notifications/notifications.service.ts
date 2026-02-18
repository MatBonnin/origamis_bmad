import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import {
  NotificationCategory,
  NotificationChannel,
} from '../users/dto/notification-preferences.dto';

export interface EmitNotificationInput {
  userId: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
}

export interface EmitNotificationResult {
  sent: boolean;
  notificationId?: string;
  reason?: 'DISABLED_BY_PREFERENCE';
}

const MAX_RETRIES = 5;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private wsEmitter: ((userId: string, notification: unknown) => void) | null =
    null;

  constructor(private readonly prisma: PrismaService) {}

  /** Called by the gateway to register the WebSocket emitter */
  registerWsEmitter(emitter: (userId: string, notification: unknown) => void) {
    this.wsEmitter = emitter;
  }

  async emitNotification(
    input: EmitNotificationInput,
  ): Promise<EmitNotificationResult> {
    const preference = await this.prisma.notification_preferences.findUnique({
      where: {
        user_id_channel_category: {
          user_id: input.userId,
          channel: input.channel,
          category: input.category,
        },
      },
    });

    if (preference && !preference.enabled) {
      return { sent: false, reason: 'DISABLED_BY_PREFERENCE' };
    }

    // Persist the notification
    const notification = await this.prisma.notifications.create({
      data: {
        user_id: input.userId,
        category: input.category,
        channel: input.channel,
        title: input.title,
        message: input.message,
        payload: input.payload ?? {},
        status: 'sent',
        sent_at: new Date(),
      },
    });

    this.logger.log(
      `Notification [${notification.id}] sent to ${input.userId} (${input.channel}/${input.category}): ${input.title}`,
    );

    // Push via WebSocket for in_app channel
    if (input.channel === 'in_app' && this.wsEmitter) {
      this.wsEmitter(input.userId, {
        notificationId: notification.id,
        category: notification.category,
        title: notification.title,
        message: notification.message,
        payload: notification.payload,
        createdAt: notification.created_at.toISOString(),
      });
    }

    return { sent: true, notificationId: notification.id };
  }

  async listNotifications(
    userId: string,
    filters?: { category?: NotificationCategory; unreadOnly?: boolean },
  ) {
    const where: Record<string, unknown> = { user_id: userId };

    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.unreadOnly) {
      where.read_at = null;
    }

    const rows = await this.prisma.notifications.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return {
      notifications: rows.map((n) => ({
        notificationId: n.id,
        category: n.category,
        channel: n.channel,
        title: n.title,
        message: n.message,
        payload: n.payload,
        readAt: n.read_at?.toISOString() ?? null,
        createdAt: n.created_at.toISOString(),
      })),
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notifications.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.user_id !== userId) {
      throw new NotFoundException({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Notification introuvable',
      });
    }

    if (notification.read_at) {
      return { success: true };
    }

    await this.prisma.notifications.update({
      where: { id: notificationId },
      data: { read_at: new Date() },
    });

    return { success: true };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notifications.updateMany({
      where: { user_id: userId, read_at: null },
      data: { read_at: new Date() },
    });

    return { success: true };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notifications.count({
      where: { user_id: userId, read_at: null },
    });

    return { unreadCount: count };
  }

  /** Retry failed notifications (called by a worker/cron) */
  async retryFailed() {
    const failed = await this.prisma.notifications.findMany({
      where: { status: 'failed', retries: { lt: MAX_RETRIES } },
      take: 20,
    });

    let retried = 0;
    for (const n of failed) {
      await this.prisma.notifications.update({
        where: { id: n.id },
        data: { retries: n.retries + 1, status: 'sent', sent_at: new Date() },
      });
      retried++;
      this.logger.log(
        `Retried notification ${n.id} (attempt ${n.retries + 1})`,
      );
    }

    return { retried };
  }
}
