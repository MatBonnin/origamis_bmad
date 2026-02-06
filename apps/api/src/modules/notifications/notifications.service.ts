import { Injectable, Logger } from '@nestjs/common';
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
}

export interface EmitNotificationResult {
  sent: boolean;
  reason?: 'DISABLED_BY_PREFERENCE';
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

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

    this.logger.log(
      `Notification emitted to ${input.userId} (${input.channel}/${input.category}): ${input.title}`,
    );

    return { sent: true };
  }
}
