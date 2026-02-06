import {
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

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listUsers() {
    const users = await this.prisma.users.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        user_roles: {
          include: { role: true },
        },
      },
    });

    return users.map((user) => this.mapUser(user));
  }

  async updateUserRoles(actorUserId: string, targetUserId: string, roles: string[]) {
    if (actorUserId === targetUserId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Vous ne pouvez pas modifier vos propres roles',
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
        const created = await this.prisma.roles.create({ data: { name: roleName } });
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

  private mapUser(user: UserWithRoles) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roles: user.user_roles.map((entry) => entry.role.name),
      createdAt: user.created_at,
    };
  }
}
