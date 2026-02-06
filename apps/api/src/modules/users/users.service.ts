import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { UpdateProfileDto, UserProfileResponseDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
}
