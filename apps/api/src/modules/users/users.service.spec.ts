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
    notification_preferences: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      createMany: jest.fn(),
      upsert: jest.fn(),
    },
    user_needs: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    consents: {
      findFirst: jest.fn(),
      create: jest.fn(),
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

  describe('notification preferences', () => {
    it('should return notification preferences and create defaults if missing', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.notification_preferences.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { channel: 'email', category: 'messages', enabled: true },
          { channel: 'push', category: 'rdv', enabled: false },
        ]);

      const result = await service.getNotificationPreferences('user-1');

      expect(mockPrismaService.notification_preferences.createMany).toHaveBeenCalled();
      expect(result.preferences).toEqual([
        { channel: 'email', category: 'messages', enabled: true },
        { channel: 'push', category: 'rdv', enabled: false },
      ]);
    });

    it('should update notification preferences with upsert', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.notification_preferences.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { channel: 'email', category: 'messages' },
        ])
        .mockResolvedValueOnce([
          { channel: 'email', category: 'messages', enabled: false },
        ]);

      const result = await service.updateNotificationPreferences('user-1', {
        preferences: [{ channel: 'email', category: 'messages', enabled: false }],
      });

      expect(mockPrismaService.notification_preferences.upsert).toHaveBeenCalledWith({
        where: {
          user_id_channel_category: {
            user_id: 'user-1',
            channel: 'email',
            category: 'messages',
          },
        },
        update: { enabled: false },
        create: {
          user_id: 'user-1',
          channel: 'email',
          category: 'messages',
          enabled: false,
        },
      });
      expect(result.preferences).toEqual([
        { channel: 'email', category: 'messages', enabled: false },
      ]);
    });

    it('should return true by default when preference does not exist', async () => {
      mockPrismaService.notification_preferences.findMany.mockResolvedValue([]);
      mockPrismaService.notification_preferences.findUnique.mockResolvedValue(null);

      const enabled = await service.isNotificationEnabled(
        'user-1',
        'email',
        'system',
      );

      expect(enabled).toBe(true);
    });
  });

  describe('getNeeds', () => {
    it('should return default empty needs when no record exists', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user_needs.findUnique.mockResolvedValue(null);

      const result = await service.getNeeds('user-1');

      expect(result).toEqual({
        objectives: [],
        domain: null,
        level: null,
        graduationYear: null,
        updatedAt: expect.any(Date),
      });
    });

    it('should return stored needs when record exists', async () => {
      const mockNeeds = {
        id: 'needs-1',
        user_id: 'user-1',
        needs_json: {
          objectives: ['academic-writing', 'career-guidance'],
          domain: 'informatique',
          level: 'master-1',
          graduationYear: '2026',
        },
        needs_updated: false,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-02'),
      };
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user_needs.findUnique.mockResolvedValue(mockNeeds);

      const result = await service.getNeeds('user-1');

      expect(result).toEqual({
        objectives: ['academic-writing', 'career-guidance'],
        domain: 'informatique',
        level: 'master-1',
        graduationYear: '2026',
        updatedAt: new Date('2024-01-02'),
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      await expect(service.getNeeds('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateNeeds', () => {
    it('should upsert needs and set needs_updated flag', async () => {
      const now = new Date();
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user_needs.findUnique.mockResolvedValue(null);
      mockPrismaService.user_needs.upsert.mockResolvedValue({
        id: 'needs-1',
        user_id: 'user-1',
        needs_json: {
          objectives: ['academic-writing'],
          domain: 'informatique',
          level: null,
          graduationYear: null,
        },
        needs_updated: true,
        created_at: now,
        updated_at: now,
      });

      const result = await service.updateNeeds('user-1', {
        objectives: ['academic-writing'],
        domain: 'informatique',
      });

      expect(mockPrismaService.user_needs.upsert).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        create: {
          user_id: 'user-1',
          needs_json: {
            objectives: ['academic-writing'],
            domain: 'informatique',
            level: null,
            graduationYear: null,
          },
          needs_updated: true,
        },
        update: {
          needs_json: {
            objectives: ['academic-writing'],
            domain: 'informatique',
            level: null,
            graduationYear: null,
          },
          needs_updated: true,
        },
      });
      expect(result.objectives).toEqual(['academic-writing']);
      expect(result.domain).toBe('informatique');
    });

    it('should merge with existing needs when partial update', async () => {
      const existingNeeds = {
        id: 'needs-1',
        user_id: 'user-1',
        needs_json: {
          objectives: ['academic-writing'],
          domain: 'informatique',
          level: 'master-1',
          graduationYear: '2026',
        },
        needs_updated: false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user_needs.findUnique.mockResolvedValue(existingNeeds);
      mockPrismaService.user_needs.upsert.mockResolvedValue({
        ...existingNeeds,
        needs_json: {
          objectives: ['career-guidance'],
          domain: 'informatique',
          level: 'master-1',
          graduationYear: '2026',
        },
        needs_updated: true,
      });

      const result = await service.updateNeeds('user-1', {
        objectives: ['career-guidance'],
      });

      expect(result.objectives).toEqual(['career-guidance']);
      expect(result.domain).toBe('informatique');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      await expect(
        service.updateNeeds('invalid-id', { objectives: ['test'] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should always set needs_updated flag to true for recommendation recalculation', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user_needs.findUnique.mockResolvedValue(null);
      mockPrismaService.user_needs.upsert.mockResolvedValue({
        id: 'needs-1',
        user_id: 'user-1',
        needs_json: { objectives: ['test'], domain: null, level: null, graduationYear: null },
        needs_updated: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await service.updateNeeds('user-1', { objectives: ['test'] });

      const upsertCall = mockPrismaService.user_needs.upsert.mock.calls[0][0];
      expect(upsertCall.create.needs_updated).toBe(true);
      expect(upsertCall.update.needs_updated).toBe(true);
    });
  });

  describe('getConsent', () => {
    it('should return active consent when record exists and not withdrawn', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consents.findFirst.mockResolvedValue({
        id: 'consent-1',
        user_id: 'user-1',
        consent_version: '1.0',
        consented_at: new Date('2024-01-01'),
        withdrawn_at: null,
      });

      const result = await service.getConsent('user-1');

      expect(result.hasActiveConsent).toBe(true);
      expect(result.consentVersion).toBe('1.0');
      expect(result.withdrawnAt).toBeNull();
    });

    it('should return inactive consent when withdrawn', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consents.findFirst.mockResolvedValue({
        id: 'consent-1',
        user_id: 'user-1',
        consent_version: '1.0',
        consented_at: new Date('2024-01-01'),
        withdrawn_at: new Date('2024-06-01'),
      });

      const result = await service.getConsent('user-1');

      expect(result.hasActiveConsent).toBe(false);
      expect(result.withdrawnAt).toEqual(new Date('2024-06-01'));
    });

    it('should return no consent when no record exists', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consents.findFirst.mockResolvedValue(null);

      const result = await service.getConsent('user-1');

      expect(result.hasActiveConsent).toBe(false);
      expect(result.consentVersion).toBeNull();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      await expect(service.getConsent('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('withdrawConsent', () => {
    it('should withdraw active consent and return impact message', async () => {
      const activeConsent = {
        id: 'consent-1',
        user_id: 'user-1',
        consent_version: '1.0',
        consented_at: new Date('2024-01-01'),
        withdrawn_at: null,
      };
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consents.findFirst.mockResolvedValue(activeConsent);
      mockPrismaService.consents.update.mockResolvedValue({
        ...activeConsent,
        withdrawn_at: new Date(),
      });

      const result = await service.withdrawConsent('user-1');

      expect(result.hasActiveConsent).toBe(false);
      expect(result.withdrawnAt).toBeDefined();
      expect(result.impactMessage).toBeTruthy();
      expect(mockPrismaService.consents.update).toHaveBeenCalledWith({
        where: { id: 'consent-1' },
        data: { withdrawn_at: expect.any(Date) },
      });
    });

    it('should throw NotFoundException if no active consent exists', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.consents.findFirst.mockResolvedValue(null);

      await expect(service.withdrawConsent('user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if consent already withdrawn', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      // findFirst with withdrawn_at: null filter returns null for already-withdrawn consent
      mockPrismaService.consents.findFirst.mockResolvedValue(null);

      await expect(service.withdrawConsent('user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
