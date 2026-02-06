import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { PrismaService } from '../prisma';

describe('OnboardingService', () => {
  let service: OnboardingService;

  const mockPrismaService = {
    users: {
      findUnique: jest.fn(),
    },
    onboarding: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
    jest.clearAllMocks();
  });

  it('getMyOnboarding should create defaults when onboarding is missing', async () => {
    mockPrismaService.users.findUnique.mockResolvedValue({ id: 'u1' });
    mockPrismaService.onboarding.findUnique.mockResolvedValue(null);
    mockPrismaService.onboarding.create.mockResolvedValue({
      step: 1,
      answers_json: {},
      completed_at: null,
    });

    const result = await service.getMyOnboarding('u1');

    expect(result).toEqual({ step: 1, answers: {}, completed: false });
  });

  it('updateStep should merge answers and update step', async () => {
    mockPrismaService.users.findUnique.mockResolvedValue({ id: 'u1' });
    mockPrismaService.onboarding.findUnique.mockResolvedValue({
      step: 1,
      answers_json: { profileType: 'etudiant' },
      completed_at: null,
    });
    mockPrismaService.onboarding.update.mockResolvedValue({
      step: 2,
      answers_json: { profileType: 'etudiant', domain: 'informatique' },
    });

    const result = await service.updateStep('u1', {
      step: 2,
      answers: { domain: 'informatique' },
    });

    expect(result).toEqual({
      step: 2,
      answers: { profileType: 'etudiant', domain: 'informatique' },
    });
  });

  it('complete should set completed flag', async () => {
    mockPrismaService.users.findUnique.mockResolvedValue({ id: 'u1' });
    mockPrismaService.onboarding.findUnique.mockResolvedValue({
      step: 3,
      answers_json: {},
      completed_at: null,
    });
    mockPrismaService.onboarding.update.mockResolvedValue({});

    const result = await service.complete('u1');

    expect(result).toEqual({ completed: true });
  });

  it('should throw if user does not exist', async () => {
    mockPrismaService.users.findUnique.mockResolvedValue(null);

    await expect(service.getMyOnboarding('unknown')).rejects.toThrow(NotFoundException);
  });
});
