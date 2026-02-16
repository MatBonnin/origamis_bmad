import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ProfileSuggestionService,
  ProfileSuggestion,
} from './profile-suggestion.service';
import { PrismaService } from '../prisma';

describe('ProfileSuggestionService', () => {
  let service: ProfileSuggestionService;

  const mockPrismaService = {
    users: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    onboarding: {
      findUnique: jest.fn(),
    },
    profile_suggestions: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileSuggestionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProfileSuggestionService>(ProfileSuggestionService);
    jest.clearAllMocks();
  });

  describe('generateSuggestion', () => {
    it('should map licence-1 to debutant level', () => {
      const result = service.generateSuggestion({
        level: 'licence-1',
        domain: 'informatique',
        objectives: ['career-guidance'],
      });

      expect(result.level).toBe('debutant');
    });

    it('should map master-2 to avance level', () => {
      const result = service.generateSuggestion({
        level: 'master-2',
        domain: 'droit',
        objectives: ['research-methodology'],
      });

      expect(result.level).toBe('avance');
    });

    it('should map master-1 to intermediaire level', () => {
      const result = service.generateSuggestion({
        level: 'master-1',
        domain: 'sciences',
        objectives: ['stress-management'],
      });

      expect(result.level).toBe('intermediaire');
    });

    it('should default to intermediaire for unknown level', () => {
      const result = service.generateSuggestion({
        level: 'unknown-level',
        domain: 'informatique',
      });

      expect(result.level).toBe('intermediaire');
    });

    it('should use user objectives when provided', () => {
      const objectives = ['academic-writing', 'networking'];
      const result = service.generateSuggestion({
        level: 'licence-3',
        objectives,
      });

      expect(result.objectives).toEqual(objectives);
    });

    it('should use default objectives when none provided', () => {
      const result = service.generateSuggestion({
        level: 'licence-3',
        domain: 'informatique',
      });

      expect(result.objectives).toEqual(['career-guidance', 'time-management']);
    });

    it('should generate bio from domain', () => {
      const result = service.generateSuggestion({
        domain: 'informatique',
        level: 'licence-3',
      });

      expect(result.bio).toContain('informatique');
    });

    it('should use default bio for unknown domain', () => {
      const result = service.generateSuggestion({
        domain: 'unknown-domain',
        level: 'licence-3',
      });

      expect(result.bio).toBe('Etudiant(e) motive(e) et pret(e) a progresser.');
    });

    it('should use default bio when no domain', () => {
      const result = service.generateSuggestion({ level: 'licence-3' });

      expect(result.bio).toBe('Etudiant(e) motive(e) et pret(e) a progresser.');
    });
  });

  describe('getSuggestion', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      await expect(service.getSuggestion('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return existing suggestion if already stored', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue({ id: 'u1' });
      const storedSuggestion: ProfileSuggestion = {
        level: 'intermediaire',
        objectives: ['career-guidance'],
        bio: 'Test bio',
      };
      mockPrismaService.profile_suggestions.findUnique.mockResolvedValue({
        user_id: 'u1',
        suggestion_json: storedSuggestion,
        accepted_at: null,
      });

      const result = await service.getSuggestion('u1');

      expect(result).toEqual({
        suggestion: storedSuggestion,
        accepted: false,
      });
    });

    it('should return accepted=true when suggestion was accepted', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue({ id: 'u1' });
      mockPrismaService.profile_suggestions.findUnique.mockResolvedValue({
        user_id: 'u1',
        suggestion_json: {
          level: 'intermediaire',
          objectives: [],
          bio: 'Bio',
        },
        accepted_at: new Date(),
      });

      const result = await service.getSuggestion('u1');

      expect(result.accepted).toBe(true);
    });

    it('should throw BadRequestException if onboarding not completed', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue({ id: 'u1' });
      mockPrismaService.profile_suggestions.findUnique.mockResolvedValue(null);
      mockPrismaService.onboarding.findUnique.mockResolvedValue({
        user_id: 'u1',
        answers_json: {},
        completed_at: null,
      });

      await expect(service.getSuggestion('u1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should generate and persist suggestion from onboarding answers', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue({ id: 'u1' });
      mockPrismaService.profile_suggestions.findUnique.mockResolvedValue(null);
      mockPrismaService.onboarding.findUnique.mockResolvedValue({
        user_id: 'u1',
        answers_json: {
          domain: 'informatique',
          level: 'master-1',
          objectives: ['networking'],
        },
        completed_at: new Date(),
      });
      mockPrismaService.profile_suggestions.create.mockResolvedValue({});

      const result = await service.getSuggestion('u1');

      expect(result.suggestion.level).toBe('intermediaire');
      expect(result.suggestion.objectives).toEqual(['networking']);
      expect(result.suggestion.bio).toContain('informatique');
      expect(result.accepted).toBe(false);
      expect(mockPrismaService.profile_suggestions.create).toHaveBeenCalled();
    });
  });

  describe('acceptSuggestion', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      await expect(service.acceptSuggestion('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if no suggestion exists', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue({ id: 'u1' });
      mockPrismaService.profile_suggestions.findUnique.mockResolvedValue(null);

      await expect(service.acceptSuggestion('u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update user profile and mark suggestion as accepted', async () => {
      const suggestion: ProfileSuggestion = {
        level: 'intermediaire',
        objectives: ['career-guidance'],
        bio: 'Test bio',
      };
      mockPrismaService.users.findUnique.mockResolvedValue({ id: 'u1' });
      mockPrismaService.profile_suggestions.findUnique.mockResolvedValue({
        user_id: 'u1',
        suggestion_json: suggestion,
        accepted_at: null,
      });
      mockPrismaService.users.update.mockResolvedValue({});
      mockPrismaService.profile_suggestions.update.mockResolvedValue({});

      const result = await service.acceptSuggestion('u1');

      expect(result.profile).toEqual(suggestion);
      expect(mockPrismaService.users.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          level: 'intermediaire',
          objectives: ['career-guidance'],
          bio: 'Test bio',
        },
      });
      expect(mockPrismaService.profile_suggestions.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: 'u1' },
          data: expect.objectContaining({ accepted_at: expect.any(Date) }),
        }),
      );
    });
  });

  describe('modifySuggestion', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      await expect(
        service.modifySuggestion('unknown', { level: 'avance' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if no suggestion exists', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue({ id: 'u1' });
      mockPrismaService.profile_suggestions.findUnique.mockResolvedValue(null);

      await expect(
        service.modifySuggestion('u1', { level: 'avance' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should merge modifications with original suggestion and update profile', async () => {
      const originalSuggestion: ProfileSuggestion = {
        level: 'intermediaire',
        objectives: ['career-guidance'],
        bio: 'Original bio',
      };
      mockPrismaService.users.findUnique.mockResolvedValue({ id: 'u1' });
      mockPrismaService.profile_suggestions.findUnique.mockResolvedValue({
        user_id: 'u1',
        suggestion_json: originalSuggestion,
        accepted_at: null,
      });
      mockPrismaService.users.update.mockResolvedValue({});
      mockPrismaService.profile_suggestions.update.mockResolvedValue({});

      const result = await service.modifySuggestion('u1', {
        level: 'avance',
        bio: 'Modified bio',
      });

      expect(result.profile).toEqual({
        level: 'avance',
        objectives: ['career-guidance'],
        bio: 'Modified bio',
      });
      expect(mockPrismaService.users.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          level: 'avance',
          objectives: ['career-guidance'],
          bio: 'Modified bio',
        },
      });
    });
  });
});
