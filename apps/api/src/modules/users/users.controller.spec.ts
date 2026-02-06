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
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    roles: ['etudiant'],
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
      providers: [
        { provide: UsersService, useValue: mockUsersService },
      ],
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
      expect(usersService.updateProfile).toHaveBeenCalledWith('user-1', updateDto);
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
});
