import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma';
import { MentorsSelfService } from './mentors-self.service';

describe('MentorsSelfService', () => {
  let service: MentorsSelfService;

  const mockPrismaService = {
    users: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    mentor_profiles: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    mentor_availability: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    mentor_availability_slots: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    user_needs: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MentorsSelfService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MentorsSelfService>(MentorsSelfService);
    jest.clearAllMocks();
    mockPrismaService.mentor_availability.findUnique.mockResolvedValue({
      id: 'avail-1',
    });
  });

  it('creates mentor profile with tariffs and availability metadata', async () => {
    mockPrismaService.users.findUnique.mockResolvedValue({
      id: 'mentor-1',
      user_roles: [{ role: { name: 'mentor' } }],
    });
    const persistedProfile = {
        user_id: 'mentor-1',
        domain: 'informatique',
        banner_url: 'https://cdn.origami.app/banner.png',
        about: 'Mentor fullstack',
        professional_links: ['https://www.linkedin.com/in/alice-martin'],
        expertise_tags: ['react'],
        supported_levels: ['intermediaire'],
        hourly_rate: 30,
        is_validated: true,
        updated_at: new Date('2026-02-16T10:00:00.000Z'),
        user: {
          first_name: 'Alice',
          last_name: 'Martin',
          bio: 'Mentor fullstack',
        },
        availability: {
          is_available: true,
          next_available_at: new Date('2026-02-17T10:00:00.000Z'),
          slots: [{ day_of_week: 1, start_time: '09:00', end_time: '12:00' }],
        },
      };
    mockPrismaService.mentor_profiles.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValue(persistedProfile);
    mockPrismaService.user_needs.findUnique.mockResolvedValue({
      needs_json: {
        mentorProfile: {
          languages: ['fr'],
          certifications: ['react-cert'],
          tariffs: { min: 30, max: 50, currency: 'EUR' },
          availabilitySlots: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
          ],
        },
      },
    });

    const result = await service.createMyProfile('mentor-1', {
      domain: 'informatique',
      expertiseTags: ['react'],
      supportedLevels: ['intermediaire'],
      languages: ['fr'],
      certifications: ['react-cert'],
      bio: 'Mentor fullstack',
      bannerUrl: 'https://cdn.origami.app/banner.png',
      about: 'Mentor fullstack',
      professionalLinks: ['https://www.linkedin.com/in/alice-martin'],
      tariffs: { min: 30, max: 50, currency: 'EUR' },
      availability: {
        isAvailable: true,
        nextAvailableAt: '2026-02-17T10:00:00.000Z',
        slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }],
      },
    });

    expect(result.profile.mentorId).toBe('mentor-1');
    expect(result.profile.tariffs.min).toBe(30);
    expect(result.profile.bannerUrl).toBe('https://cdn.origami.app/banner.png');
    expect(result.profile.professionalLinks).toEqual([
      'https://www.linkedin.com/in/alice-martin',
    ]);
    expect(mockPrismaService.mentor_profiles.create).toHaveBeenCalled();
    expect(mockPrismaService.user_needs.upsert).toHaveBeenCalled();
  });

  it('rejects profile creation when user is not mentor', async () => {
    mockPrismaService.users.findUnique.mockResolvedValue({
      id: 'student-1',
      user_roles: [{ role: { name: 'etudiant' } }],
    });

    await expect(
      service.createMyProfile('student-1', {
        domain: 'informatique',
        expertiseTags: ['react'],
        tariffs: { min: 30, max: 50, currency: 'EUR' },
        availability: { isAvailable: true },
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects create when tariffs range is invalid', async () => {
    mockPrismaService.users.findUnique.mockResolvedValue({
      id: 'mentor-1',
      user_roles: [{ role: { name: 'mentor' } }],
    });

    await expect(
      service.createMyProfile('mentor-1', {
        domain: 'informatique',
        expertiseTags: ['react'],
        tariffs: { min: 40, max: 40, currency: 'EUR' },
        availability: { isAvailable: true },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects create when profile already exists', async () => {
    mockPrismaService.users.findUnique.mockResolvedValue({
      id: 'mentor-1',
      user_roles: [{ role: { name: 'mentor' } }],
    });
    mockPrismaService.mentor_profiles.findUnique.mockResolvedValue({
      user_id: 'mentor-1',
    });

    await expect(
      service.createMyProfile('mentor-1', {
        domain: 'informatique',
        expertiseTags: ['react'],
        tariffs: { min: 30, max: 50, currency: 'EUR' },
        availability: { isAvailable: true },
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws NotFoundException when profile is missing on get', async () => {
    mockPrismaService.users.findUnique.mockResolvedValue({
      id: 'mentor-1',
      user_roles: [{ role: { name: 'mentor' } }],
    });
    mockPrismaService.mentor_profiles.findUnique.mockResolvedValue(null);

    await expect(service.getMyProfile('mentor-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects invalid slot with start >= end on update', async () => {
    mockPrismaService.users.findUnique.mockResolvedValue({
      id: 'mentor-1',
      user_roles: [{ role: { name: 'mentor' } }],
    });
    mockPrismaService.mentor_profiles.findUnique.mockResolvedValue({
      user_id: 'mentor-1',
      domain: 'informatique',
      expertise_tags: ['react'],
      supported_levels: [],
      hourly_rate: 30,
      is_validated: true,
      updated_at: new Date('2026-02-16T10:00:00.000Z'),
      user: { first_name: 'Alice', last_name: 'Martin', bio: null },
      availability: { is_available: true, next_available_at: null },
    });
    mockPrismaService.user_needs.findUnique.mockResolvedValue({
      needs_json: {},
    });

    await expect(
      service.updateMyProfile('mentor-1', {
        availability: {
          isAvailable: true,
          slots: [{ dayOfWeek: 1, startTime: '12:00', endTime: '09:00' }],
        },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects professional links outside authorized domains', async () => {
    mockPrismaService.users.findUnique.mockResolvedValue({
      id: 'mentor-1',
      user_roles: [{ role: { name: 'mentor' } }],
    });
    mockPrismaService.mentor_profiles.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.createMyProfile('mentor-1', {
        domain: 'informatique',
        expertiseTags: ['react'],
        professionalLinks: ['https://example.com/profile'],
        tariffs: { min: 30, max: 50, currency: 'EUR' },
        availability: { isAvailable: true },
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
