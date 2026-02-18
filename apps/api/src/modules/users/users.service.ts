import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { MatchingService } from '../matching';
import {
  ConsentResponseDto,
  ConsentWithdrawResponseDto,
  NotificationCategory,
  NotificationChannel,
  NotificationPreferencesResponseDto,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  UpdateNotificationPreferencesDto,
  UpdateProfileDto,
  UpdateUserNeedsDto,
  UserNeedsResponseDto,
  UserProfileResponseDto,
} from './dto';

@Injectable()
export class UsersService {
  private readonly deletionRequests = new Map<
    string,
    {
      id: string;
      userId: string;
      reason: string;
      requestExport: boolean;
      status: 'requested' | 'reviewed' | 'approved' | 'rejected' | 'deleted';
      reviewedBy: string | null;
      requestedAt: string;
      updatedAt: string;
      notes: string;
    }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly matchingService: MatchingService,
  ) {}

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

  async getNeeds(userId: string): Promise<UserNeedsResponseDto> {
    await this.assertUserExists(userId);

    const record = await this.prisma.user_needs.findUnique({
      where: { user_id: userId },
    });

    if (!record) {
      return {
        objectives: [],
        domain: null,
        level: null,
        graduationYear: null,
        updatedAt: new Date(),
      };
    }

    const needs = record.needs_json as Record<string, unknown>;
    return {
      objectives: (needs.objectives as string[]) || [],
      domain: (needs.domain as string) || null,
      level: (needs.level as string) || null,
      graduationYear: (needs.graduationYear as string) || null,
      updatedAt: record.updated_at,
    };
  }

  async updateNeeds(
    userId: string,
    dto: UpdateUserNeedsDto,
  ): Promise<UserNeedsResponseDto> {
    await this.assertUserExists(userId);

    // Load existing needs for merge
    const existing = await this.prisma.user_needs.findUnique({
      where: { user_id: userId },
    });

    const existingNeeds = existing
      ? (existing.needs_json as Record<string, unknown>)
      : { objectives: [], domain: null, level: null, graduationYear: null };

    const mergedNeeds = {
      objectives:
        dto.objectives !== undefined
          ? dto.objectives
          : (existingNeeds.objectives as string[]) || [],
      domain:
        dto.domain !== undefined
          ? dto.domain
          : (existingNeeds.domain as string) || null,
      level:
        dto.level !== undefined
          ? dto.level
          : (existingNeeds.level as string) || null,
      graduationYear:
        dto.graduationYear !== undefined
          ? dto.graduationYear
          : (existingNeeds.graduationYear as string) || null,
    };

    const record = await this.prisma.user_needs.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        needs_json: mergedNeeds,
        needs_updated: true,
      },
      update: {
        needs_json: mergedNeeds,
        needs_updated: true,
      },
    });

    await this.matchingService.invalidateUserRecommendations(userId);

    const needs = record.needs_json as Record<string, unknown>;
    return {
      objectives: (needs.objectives as string[]) || [],
      domain: (needs.domain as string) || null,
      level: (needs.level as string) || null,
      graduationYear: (needs.graduationYear as string) || null,
      updatedAt: record.updated_at,
    };
  }

  async getConsent(userId: string): Promise<ConsentResponseDto> {
    await this.assertUserExists(userId);

    const consent = await this.prisma.consents.findFirst({
      where: { user_id: userId },
      orderBy: { consented_at: 'desc' },
    });

    if (!consent) {
      return {
        hasActiveConsent: false,
        consentVersion: null,
        consentedAt: null,
        withdrawnAt: null,
      };
    }

    return {
      hasActiveConsent: consent.withdrawn_at === null,
      consentVersion: consent.consent_version,
      consentedAt: consent.consented_at,
      withdrawnAt: consent.withdrawn_at,
    };
  }

  async withdrawConsent(userId: string): Promise<ConsentWithdrawResponseDto> {
    await this.assertUserExists(userId);

    const consent = await this.prisma.consents.findFirst({
      where: { user_id: userId, withdrawn_at: null },
      orderBy: { consented_at: 'desc' },
    });

    if (!consent) {
      throw new NotFoundException({
        code: 'NO_ACTIVE_CONSENT',
        message: 'Aucun consentement actif trouvé',
      });
    }

    const now = new Date();
    await this.prisma.consents.update({
      where: { id: consent.id },
      data: { withdrawn_at: now },
    });

    return {
      hasActiveConsent: false,
      withdrawnAt: now,
      impactMessage:
        'En retirant votre consentement, les fonctionnalites suivantes seront desactivees : ' +
        'matching de mentors, messagerie, prise de rendez-vous et notifications. ' +
        'Vous pourrez toujours consulter votre compte, telecharger vos donnees et demander leur suppression.',
    };
  }

  async requestDeletion(
    actor: { id: string; roles?: string[] },
    targetUserId: string,
    input: { reason?: string; requestExport?: boolean },
  ) {
    if (actor.id !== targetUserId && !actor.roles?.includes('admin')) {
      throw new ForbiddenException({
        code: 'RGPD_FORBIDDEN',
        message: 'Vous ne pouvez demander que la suppression de vos donnees',
      });
    }

    await this.assertUserExists(targetUserId);

    const now = new Date().toISOString();
    const existing = this.deletionRequests.get(targetUserId);
    const request = {
      id:
        existing?.id ??
        `deletion-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: targetUserId,
      reason: input.reason?.trim() || 'Demande utilisateur',
      requestExport: Boolean(input.requestExport),
      status: 'requested' as const,
      reviewedBy: null,
      requestedAt: existing?.requestedAt ?? now,
      updatedAt: now,
      notes: '',
    };

    this.deletionRequests.set(targetUserId, request);
    return request;
  }

  async updateDeletionStatus(
    actor: { id: string; roles?: string[] },
    targetUserId: string,
    input: {
      status: 'requested' | 'reviewed' | 'approved' | 'rejected' | 'deleted';
      notes?: string;
    },
  ) {
    if (!actor.roles?.includes('admin') && !actor.roles?.includes('support')) {
      throw new ForbiddenException({
        code: 'RGPD_STATUS_FORBIDDEN',
        message: 'Acces reserve au support/admin',
      });
    }

    await this.assertUserExists(targetUserId);

    const existing = this.deletionRequests.get(targetUserId);
    if (!existing) {
      throw new NotFoundException({
        code: 'RGPD_REQUEST_NOT_FOUND',
        message: 'Aucune demande de suppression trouvee',
      });
    }

    const updated = {
      ...existing,
      status: input.status,
      reviewedBy: actor.id,
      notes: input.notes?.trim() ?? existing.notes,
      updatedAt: new Date().toISOString(),
    };
    this.deletionRequests.set(targetUserId, updated);

    return {
      userId: targetUserId,
      status: updated.status,
      reviewedBy: updated.reviewedBy,
      updatedAt: updated.updatedAt,
      notes: updated.notes,
    };
  }

  async deleteUserData(
    actor: { id: string; roles?: string[] },
    targetUserId: string,
  ) {
    if (!actor.roles?.includes('admin')) {
      throw new ForbiddenException({
        code: 'RGPD_DELETE_FORBIDDEN',
        message: 'Seul un admin peut executer la suppression finale',
      });
    }

    await this.assertUserExists(targetUserId);

    const request = this.deletionRequests.get(targetUserId);
    if (!request || (request.status !== 'approved' && request.status !== 'deleted')) {
      throw new ForbiddenException({
        code: 'RGPD_NOT_APPROVED',
        message: 'La suppression finale requiert une approbation prealable',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.notifications.deleteMany({ where: { user_id: targetUserId } });
      await tx.notification_preferences.deleteMany({
        where: { user_id: targetUserId },
      });
      await tx.messages.deleteMany({
        where: {
          OR: [{ sender_id: targetUserId }, { receiver_id: targetUserId }],
        },
      });
      await tx.read_status.deleteMany({ where: { user_id: targetUserId } });
      await tx.bookings.deleteMany({
        where: {
          OR: [{ student_id: targetUserId }, { mentor_id: targetUserId }],
        },
      });
      await tx.user_needs.deleteMany({ where: { user_id: targetUserId } });
      await tx.sessions.deleteMany({ where: { user_id: targetUserId } });
      await tx.consents.deleteMany({ where: { user_id: targetUserId } });
      await tx.user_roles.deleteMany({ where: { user_id: targetUserId } });
      await tx.users.update({
        where: { id: targetUserId },
        data: {
          first_name: 'Supprime',
          last_name: 'Utilisateur',
          email: `deleted+${targetUserId}@example.invalid`,
          bio: null,
          avatar_url: null,
          objectives: [],
        },
      });
    });

    this.deletionRequests.set(targetUserId, {
      ...request,
      status: 'deleted',
      reviewedBy: actor.id,
      updatedAt: new Date().toISOString(),
      notes: request.notes || 'Suppression executee',
    });

    return {
      success: true,
      userId: targetUserId,
      deletedArtifacts: [
        'notifications',
        'notification_preferences',
        'messages',
        'read_status',
        'bookings',
        'user_needs',
        'sessions',
        'consents',
        'user_roles',
        'users(anonymized)',
      ],
    };
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

  private async ensureDefaultNotificationPreferences(
    userId: string,
  ): Promise<void> {
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
