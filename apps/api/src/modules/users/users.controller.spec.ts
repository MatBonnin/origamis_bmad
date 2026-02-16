import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUsersService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    getNotificationPreferences: jest.fn(),
    updateNotificationPreferences: jest.fn(),
    getNeeds: jest.fn(),
    updateNeeds: jest.fn(),
    getConsent: jest.fn(),
    withdrawConsent: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    roles: ['etudiant'],
    createdAt: new Date('2024-01-01'),
  };

  const mockProfile = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    roles: ['etudiant'],
    level: 'intermediaire',
    objectives: ['Apprendre React'],
    bio: 'Développeur passionné',
    avatarUrl: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile wrapped in data envelope', async () => {
      mockUsersService.getProfile.mockResolvedValue(mockProfile);

      const result = await controller.getProfile(mockUser);

      expect(result).toEqual({
        data: mockProfile,
        error: null,
      });
      expect(usersService.getProfile).toHaveBeenCalledWith('user-1');
    });
  });

  describe('updateProfile', () => {
    it('should update and return profile wrapped in data envelope', async () => {
      const updateDto = {
        firstName: 'Jane',
        bio: 'Nouvelle bio',
      };
      const updatedProfile = {
        ...mockProfile,
        firstName: 'Jane',
        bio: 'Nouvelle bio',
      };
      mockUsersService.updateProfile.mockResolvedValue(updatedProfile);

      const result = await controller.updateProfile(mockUser, updateDto);

      expect(result).toEqual({
        data: updatedProfile,
        error: null,
      });
      expect(usersService.updateProfile).toHaveBeenCalledWith(
        'user-1',
        updateDto,
      );
    });

    it('should update level, objectives and other fields', async () => {
      const updateDto = {
        level: 'avance',
        objectives: ['Nouvel objectif'],
        avatarUrl: 'https://avatar.com/img.jpg',
      };
      const updatedProfile = {
        ...mockProfile,
        level: 'avance',
        objectives: ['Nouvel objectif'],
        avatarUrl: 'https://avatar.com/img.jpg',
      };
      mockUsersService.updateProfile.mockResolvedValue(updatedProfile);

      const result = await controller.updateProfile(mockUser, updateDto);

      expect(result.data.level).toBe('avance');
      expect(result.data.objectives).toEqual(['Nouvel objectif']);
      expect(result.data.avatarUrl).toBe('https://avatar.com/img.jpg');
    });
  });

  describe('notification preferences', () => {
    it('should return notification preferences wrapped in data envelope', async () => {
      const preferences = [
        { channel: 'email', category: 'messages', enabled: true },
      ];
      mockUsersService.getNotificationPreferences.mockResolvedValue({
        preferences,
      });

      const result = await controller.getNotificationPreferences(mockUser);

      expect(result).toEqual({
        data: { preferences },
        error: null,
      });
      expect(usersService.getNotificationPreferences).toHaveBeenCalledWith(
        'user-1',
      );
    });

    it('should update notification preferences wrapped in data envelope', async () => {
      const dto = {
        preferences: [
          {
            channel: 'push' as const,
            category: 'rdv' as const,
            enabled: false,
          },
        ],
      };
      const preferences = dto.preferences;
      mockUsersService.updateNotificationPreferences.mockResolvedValue({
        preferences,
      });

      const result = await controller.updateNotificationPreferences(
        mockUser,
        dto,
      );

      expect(result).toEqual({
        data: { preferences },
        error: null,
      });
      expect(usersService.updateNotificationPreferences).toHaveBeenCalledWith(
        'user-1',
        dto,
      );
    });
  });

  describe('getNeeds', () => {
    it('should return needs wrapped in data envelope', async () => {
      const mockNeeds = {
        objectives: ['academic-writing'],
        domain: 'informatique',
        level: 'master-1',
        graduationYear: '2026',
        updatedAt: new Date(),
      };
      mockUsersService.getNeeds.mockResolvedValue(mockNeeds);

      const result = await controller.getNeeds(mockUser);

      expect(result).toEqual({ data: mockNeeds, error: null });
      expect(usersService.getNeeds).toHaveBeenCalledWith('user-1');
    });
  });

  describe('updateNeeds', () => {
    it('should update and return needs wrapped in data envelope', async () => {
      const dto = { objectives: ['career-guidance'], domain: 'sciences' };
      const updatedNeeds = {
        objectives: ['career-guidance'],
        domain: 'sciences',
        level: null,
        graduationYear: null,
        updatedAt: new Date(),
      };
      mockUsersService.updateNeeds.mockResolvedValue(updatedNeeds);

      const result = await controller.updateNeeds(mockUser, dto);

      expect(result).toEqual({ data: updatedNeeds, error: null });
      expect(usersService.updateNeeds).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('getConsent', () => {
    it('should return consent status wrapped in data envelope', async () => {
      const mockConsent = {
        hasActiveConsent: true,
        consentVersion: '1.0',
        consentedAt: new Date(),
        withdrawnAt: null,
      };
      mockUsersService.getConsent.mockResolvedValue(mockConsent);

      const result = await controller.getConsent(mockUser);

      expect(result).toEqual({ data: mockConsent, error: null });
      expect(usersService.getConsent).toHaveBeenCalledWith('user-1');
    });
  });

  describe('withdrawConsent', () => {
    it('should withdraw consent and return result in data envelope', async () => {
      const mockResult = {
        hasActiveConsent: false,
        withdrawnAt: new Date(),
        impactMessage: 'Test impact message',
      };
      mockUsersService.withdrawConsent.mockResolvedValue(mockResult);

      const result = await controller.withdrawConsent(mockUser);

      expect(result).toEqual({ data: mockResult, error: null });
      expect(usersService.withdrawConsent).toHaveBeenCalledWith('user-1');
    });
  });
});
