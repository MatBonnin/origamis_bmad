import { Test, TestingModule } from '@nestjs/testing';
import { ProfileSuggestionController } from './profile-suggestion.controller';
import { ProfileSuggestionService } from './profile-suggestion.service';
import { JwtAuthGuard } from '../../common/guards';

describe('ProfileSuggestionController', () => {
  let controller: ProfileSuggestionController;

  const mockService = {
    getSuggestion: jest.fn(),
    acceptSuggestion: jest.fn(),
    modifySuggestion: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    roles: ['etudiant'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileSuggestionController],
      providers: [{ provide: ProfileSuggestionService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProfileSuggestionController>(
      ProfileSuggestionController,
    );
    jest.clearAllMocks();
  });

  it('getSuggestion should return suggestion wrapped in data envelope', async () => {
    const suggestion = {
      suggestion: {
        level: 'intermediaire',
        objectives: ['career-guidance'],
        bio: 'Test bio',
      },
      accepted: false,
    };
    mockService.getSuggestion.mockResolvedValue(suggestion);

    const result = await controller.getSuggestion(mockUser as never);

    expect(result).toEqual({ data: suggestion, error: null });
    expect(mockService.getSuggestion).toHaveBeenCalledWith('user-1');
  });

  it('acceptSuggestion should return profile wrapped in data envelope', async () => {
    const profile = {
      profile: {
        level: 'intermediaire',
        objectives: ['career-guidance'],
        bio: 'Test bio',
      },
    };
    mockService.acceptSuggestion.mockResolvedValue(profile);

    const result = await controller.acceptSuggestion(mockUser as never);

    expect(result).toEqual({ data: profile, error: null });
    expect(mockService.acceptSuggestion).toHaveBeenCalledWith('user-1');
  });

  it('modifySuggestion should return modified profile wrapped in data envelope', async () => {
    const profile = {
      profile: {
        level: 'avance',
        objectives: ['career-guidance'],
        bio: 'Modified bio',
      },
    };
    mockService.modifySuggestion.mockResolvedValue(profile);

    const dto = { level: 'avance', bio: 'Modified bio' };
    const result = await controller.modifySuggestion(mockUser as never, dto);

    expect(result).toEqual({ data: profile, error: null });
    expect(mockService.modifySuggestion).toHaveBeenCalledWith('user-1', dto);
  });
});
