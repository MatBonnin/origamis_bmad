import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    users: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    level: 'intermediaire',
    objectives: ['Apprendre React', 'Trouver un mentor'],
    bio: 'Développeur passionné',
    avatar_url: 'https://example.com/avatar.jpg',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-02'),
    user_roles: [{ role: { name: 'etudiant' } }],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile with all fields mapped correctly', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-1');

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['etudiant'],
        level: 'intermediaire',
        objectives: ['Apprendre React', 'Trouver un mentor'],
        bio: 'Développeur passionné',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: mockUser.created_at,
        updatedAt: mockUser.updated_at,
      });
      expect(mockPrismaService.users.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: {
          user_roles: {
            include: {
              role: true,
            },
          },
        },
      });
    });

    it('should return profile with null values for optional fields', async () => {
      const userWithNulls = {
        ...mockUser,
        level: null,
        objectives: [],
        bio: null,
        avatar_url: null,
      };
      mockPrismaService.users.findUnique.mockResolvedValue(userWithNulls);

      const result = await service.getProfile('user-1');

      expect(result.level).toBeNull();
      expect(result.objectives).toEqual([]);
      expect(result.bio).toBeNull();
      expect(result.avatarUrl).toBeNull();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update only provided fields', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.users.update.mockResolvedValue({
        ...mockUser,
        first_name: 'Jane',
        bio: 'Nouvelle bio',
      });

      const updateDto = {
        firstName: 'Jane',
        bio: 'Nouvelle bio',
      };

      const result = await service.updateProfile('user-1', updateDto);

      expect(mockPrismaService.users.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          first_name: 'Jane',
          bio: 'Nouvelle bio',
        },
        include: {
          user_roles: {
            include: {
              role: true,
            },
          },
        },
      });
      expect(result.firstName).toBe('Jane');
      expect(result.bio).toBe('Nouvelle bio');
    });

    it('should update all profile fields correctly', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      const updatedUser = {
        ...mockUser,
        first_name: 'Jane',
        last_name: 'Smith',
        level: 'avance',
        objectives: ['Nouveau objectif'],
        bio: 'Nouvelle bio',
        avatar_url: 'https://new-avatar.com/img.jpg',
      };
      mockPrismaService.users.update.mockResolvedValue(updatedUser);

      const updateDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        level: 'avance',
        objectives: ['Nouveau objectif'],
        bio: 'Nouvelle bio',
        avatarUrl: 'https://new-avatar.com/img.jpg',
      };

      await service.updateProfile('user-1', updateDto);

      expect(mockPrismaService.users.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          first_name: 'Jane',
          last_name: 'Smith',
          level: 'avance',
          objectives: ['Nouveau objectif'],
          bio: 'Nouvelle bio',
          avatar_url: 'https://new-avatar.com/img.jpg',
        },
        include: {
          user_roles: {
            include: {
              role: true,
            },
          },
        },
      });
    });

    it('should not update fields that are not provided', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.users.update.mockResolvedValue(mockUser);

      const updateDto = {};

      await service.updateProfile('user-1', updateDto);

      expect(mockPrismaService.users.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {},
        include: {
          user_roles: {
            include: {
              role: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile('invalid-id', { firstName: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle empty objectives array', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.users.update.mockResolvedValue({
        ...mockUser,
        objectives: [],
      });

      await service.updateProfile('user-1', { objectives: [] });

      expect(mockPrismaService.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { objectives: [] },
        }),
      );
    });
  });
});
