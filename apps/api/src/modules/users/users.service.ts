import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationPreferencesResponseDto,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  UpdateNotificationPreferencesDto,
  UpdateProfileDto,
  UserProfileResponseDto,
} from './dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotificationPreferences(
    userId: string,
  ): Promise<NotificationPreferencesResponseDto> {
    await this.assertUserExists(userId);
    await this.ensureDefaultNotificationPreferences(userId);

    const rows = await this.prisma.notification_preferences.findMany({
      where: { user_id: userId },
      orderBy: [{ category: 'asc' }, { channel: 'asc' }],
    });

    return {
      preferences: rows.map((row) => ({
        channel: row.channel as NotificationChannel,
        category: row.category as NotificationCategory,
        enabled: row.enabled,
      })),
    };
  }

  async updateNotificationPreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesResponseDto> {
    await this.assertUserExists(userId);
    await this.ensureDefaultNotificationPreferences(userId);

    for (const preference of dto.preferences) {
      await this.prisma.notification_preferences.upsert({
        where: {
          user_id_channel_category: {
            user_id: userId,
            channel: preference.channel,
            category: preference.category,
          },
        },
        update: { enabled: preference.enabled },
        create: {
          user_id: userId,
          channel: preference.channel,
          category: preference.category,
          enabled: preference.enabled,
        },
      });
    }

    return this.getNotificationPreferences(userId);
  }

  async isNotificationEnabled(
    userId: string,
    channel: NotificationChannel,
    category: NotificationCategory,
  ): Promise<boolean> {
    await this.ensureDefaultNotificationPreferences(userId);
    const preference = await this.prisma.notification_preferences.findUnique({
      where: {
        user_id_channel_category: {
          user_id: userId,
          channel,
          category,
        },
      },
    });

    return preference?.enabled ?? true;
  }

  async getProfile(userId: string): Promise<UserProfileResponseDto> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        user_roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    return this.mapUserToProfileResponse(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserProfileResponseDto> {
    // First check if user exists
    const existingUser = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    // Build update data (only include provided fields)
    const updateData: Record<string, unknown> = {};

    if (dto.firstName !== undefined) {
      updateData.first_name = dto.firstName;
    }
    if (dto.lastName !== undefined) {
      updateData.last_name = dto.lastName;
    }
    if (dto.level !== undefined) {
      updateData.level = dto.level;
    }
    if (dto.objectives !== undefined) {
      updateData.objectives = dto.objectives;
    }
    if (dto.bio !== undefined) {
      updateData.bio = dto.bio;
    }
    if (dto.avatarUrl !== undefined) {
      updateData.avatar_url = dto.avatarUrl;
    }

    const user = await this.prisma.users.update({
      where: { id: userId },
      data: updateData,
      include: {
        user_roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return this.mapUserToProfileResponse(user);
  }

  private mapUserToProfileResponse(user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    level: string | null;
    objectives: string[];
    bio: string | null;
    avatar_url: string | null;
    created_at: Date;
    updated_at: Date;
    user_roles: { role: { name: string } }[];
  }): UserProfileResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roles: user.user_roles.map((ur) => ur.role.name),
      level: user.level,
      objectives: user.objectives,
      bio: user.bio,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  private async assertUserExists(userId: string): Promise<void> {
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }
  }

  private async ensureDefaultNotificationPreferences(userId: string): Promise<void> {
    const existing = await this.prisma.notification_preferences.findMany({
      where: { user_id: userId },
      select: { channel: true, category: true },
    });

    const existingKeys = new Set(
      existing.map((item) => `${item.channel}:${item.category}`),
    );
    const missing: {
      user_id: string;
      channel: NotificationChannel;
      category: NotificationCategory;
      enabled: boolean;
    }[] = [];

    for (const category of NOTIFICATION_CATEGORIES) {
      for (const channel of NOTIFICATION_CHANNELS) {
        const key = `${channel}:${category}`;
        if (!existingKeys.has(key)) {
          missing.push({
            user_id: userId,
            channel,
            category,
            enabled: true,
          });
        }
      }
    }

    if (missing.length > 0) {
      await this.prisma.notification_preferences.createMany({
        data: missing,
        skipDuplicates: true,
      });
    }
  }
}
