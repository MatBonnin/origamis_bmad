import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { ALLOWED_ROLES } from './dto';

type UserWithRoles = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: Date;
  user_roles: { role: { name: string } }[];
};

type ManagedUserStatus = 'active' | 'suspended' | 'deleted';

interface UserAuditLogItem {
  id: string;
  userId: string;
  adminId: string;
  action: string;
  details: string;
  createdAt: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly userStatuses = new Map<string, ManagedUserStatus>();
  private readonly userAuditLogs: UserAuditLogItem[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async listUsers(input?: {
    role?: string;
    status?: ManagedUserStatus | 'all';
    cursor?: string;
    limit?: number;
  }) {
    const limit = Math.max(1, Math.min(input?.limit ?? 50, 100));
    const offset = this.decodeCursor(input?.cursor);
    const users = await this.prisma.users.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        user_roles: {
          include: { role: true },
        },
      },
    });

    const filtered = users
      .map((user) => this.mapUser(user))
      .filter((user) => {
        if (input?.role && !user.roles.includes(input.role)) {
          return false;
        }
        if (
          input?.status &&
          input.status !== 'all' &&
          user.status !== input.status
        ) {
          return false;
        }
        return true;
      });

    const pageItems = filtered.slice(offset, offset + limit);
    const nextOffset = offset + limit;

    return {
      users: pageItems,
      metadata: {
        total: filtered.length,
        nextCursor:
          nextOffset < filtered.length ? this.encodeCursor(nextOffset) : null,
      },
    };
  }

  async updateUserAccount(
    actorUserId: string,
    targetUserId: string,
    dto: { firstName?: string; lastName?: string; status?: ManagedUserStatus },
  ) {
    const targetUser = await this.prisma.users.findUnique({
      where: { id: targetUserId },
      include: { user_roles: { include: { role: true } } },
    });

    if (!targetUser) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouve',
      });
    }

    const updated = await this.prisma.users.update({
      where: { id: targetUserId },
      data: {
        ...(dto.firstName !== undefined ? { first_name: dto.firstName } : {}),
        ...(dto.lastName !== undefined ? { last_name: dto.lastName } : {}),
      },
      include: {
        user_roles: { include: { role: true } },
      },
    });

    if (dto.status) {
      this.userStatuses.set(targetUserId, dto.status);
    }

    this.createAuditLog(
      targetUserId,
      actorUserId,
      'user.account.updated',
      JSON.stringify(dto),
    );

    return this.mapUser(updated);
  }

  async updateUserRoles(
    actorUserId: string,
    targetUserId: string,
    roles: string[],
  ) {
    if (actorUserId === targetUserId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Vous ne pouvez pas modifier vos propres roles',
      });
    }

    if (roles.length === 0) {
      throw new BadRequestException({
        code: 'INVALID_ROLES',
        message: 'Au moins un role est requis',
      });
    }

    const targetUser = await this.prisma.users.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouve',
      });
    }

    const rolesInDb = await this.prisma.roles.findMany({
      where: { name: { in: [...ALLOWED_ROLES] } },
    });

    const existingByName = new Map(rolesInDb.map((role) => [role.name, role]));

    for (const roleName of roles) {
      if (!existingByName.has(roleName)) {
        const created = await this.prisma.roles.create({
          data: { name: roleName },
        });
        existingByName.set(roleName, created);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user_roles.deleteMany({ where: { user_id: targetUserId } });
      await tx.user_roles.createMany({
        data: roles.map((roleName) => ({
          user_id: targetUserId,
          role_id: existingByName.get(roleName)!.id,
        })),
      });
    });

    this.logger.log(
      `Role assignment by admin ${actorUserId} for user ${targetUserId}: [${roles.join(', ')}]`,
    );
    this.createAuditLog(
      targetUserId,
      actorUserId,
      'user.roles.updated',
      roles.join(','),
    );

    const updatedUser = await this.prisma.users.findUnique({
      where: { id: targetUserId },
      include: {
        user_roles: {
          include: { role: true },
        },
      },
    });

    if (!updatedUser) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouve',
      });
    }

    return this.mapUser(updatedUser);
  }

  async updateUserStatus(
    actorUserId: string,
    targetUserId: string,
    status: ManagedUserStatus,
  ) {
    await this.assertUserExists(targetUserId);
    this.userStatuses.set(targetUserId, status);
    this.createAuditLog(
      targetUserId,
      actorUserId,
      'user.status.updated',
      status,
    );

    const user = await this.prisma.users.findUnique({
      where: { id: targetUserId },
      include: { user_roles: { include: { role: true } } },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouve',
      });
    }

    return this.mapUser(user);
  }

  async suppressUser(actorUserId: string, targetUserId: string) {
    await this.assertUserExists(targetUserId);
    this.userStatuses.set(targetUserId, 'deleted');
    this.createAuditLog(
      targetUserId,
      actorUserId,
      'user.suppressed',
      'rgpd-archive',
    );

    return {
      userId: targetUserId,
      status: 'deleted' as const,
      suppressedAt: new Date().toISOString(),
    };
  }

  getAuditLogs(userId?: string) {
    return userId
      ? this.userAuditLogs.filter((item) => item.userId === userId)
      : [...this.userAuditLogs];
  }

  private mapUser(user: UserWithRoles) {
    const status = this.userStatuses.get(user.id) ?? 'active';
    const auditCount = this.userAuditLogs.filter(
      (log) => log.userId === user.id,
    ).length;

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roles: user.user_roles.map((entry) => entry.role.name),
      createdAt: user.created_at,
      status,
      rgpdSync: status !== 'deleted',
      auditCount,
    };
  }

  private createAuditLog(
    userId: string,
    adminId: string,
    action: string,
    details: string,
  ) {
    this.userAuditLogs.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId,
      adminId,
      action,
      details,
      createdAt: new Date().toISOString(),
    });
  }

  private async assertUserExists(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouve',
      });
    }
  }

  private encodeCursor(offset: number): string {
    return Buffer.from(String(offset), 'utf-8').toString('base64');
  }

  private decodeCursor(cursor?: string): number {
    if (!cursor) return 0;
    try {
      const value = Number(Buffer.from(cursor, 'base64').toString('utf-8'));
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }
}
