import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../../common/guards';

describe('OnboardingController', () => {
  let controller: OnboardingController;
  let onboardingService: OnboardingService;

  const mockOnboardingService = {
    getMyOnboarding: jest.fn(),
    updateStep: jest.fn(),
    complete: jest.fn(),
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
      controllers: [OnboardingController],
      providers: [
        { provide: OnboardingService, useValue: mockOnboardingService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OnboardingController>(OnboardingController);
    onboardingService = module.get<OnboardingService>(OnboardingService);
    jest.clearAllMocks();
  });

  it('should return onboarding state wrapped in data envelope', async () => {
    mockOnboardingService.getMyOnboarding.mockResolvedValue({
      step: 1,
      answers: {},
      completed: false,
    });

    const result = await controller.getMyOnboarding(mockUser as never);

    expect(result).toEqual({
      data: { step: 1, answers: {}, completed: false },
      error: null,
    });
    expect(onboardingService.getMyOnboarding).toHaveBeenCalledWith('user-1');
  });

  it('should update step wrapped in data envelope', async () => {
    const dto = { step: 2, answers: { domain: 'informatique' } };
    mockOnboardingService.updateStep.mockResolvedValue(dto);

    const result = await controller.updateStep(mockUser as never, dto);

    expect(result).toEqual({ data: dto, error: null });
  });

  it('should complete onboarding wrapped in data envelope', async () => {
    mockOnboardingService.complete.mockResolvedValue({ completed: true });

    const result = await controller.complete(mockUser as never);

    expect(result).toEqual({ data: { completed: true }, error: null });
  });
});
