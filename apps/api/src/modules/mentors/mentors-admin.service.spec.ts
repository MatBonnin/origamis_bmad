import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma';
import { MentorsAdminService } from './mentors-admin.service';

describe('MentorsAdminService', () => {
  let service: MentorsAdminService;

  const mockPrisma = {
    mentor_profiles: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MentorsAdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MentorsAdminService>(MentorsAdminService);
    jest.clearAllMocks();

    mockPrisma.mentor_profiles.findMany.mockResolvedValue([
      {
        user_id: 'mentor-1',
        domain: 'informatique',
        is_validated: false,
        updated_at: new Date('2026-02-10T10:00:00.000Z'),
        user: { first_name: 'Alice', last_name: 'Martin', email: 'alice@example.com' },
      },
    ]);

    mockPrisma.mentor_profiles.findUnique.mockResolvedValue({ user_id: 'mentor-1' });
  });

  it('returns pending mentors for admin', async () => {
    const result = await service.getPendingMentors({ roles: ['admin'] });
    expect(result.mentors).toHaveLength(1);
  });

  it('updates visibility for validated mentor', async () => {
    await service.updateMentorStatus(
      { id: 'admin-1', roles: ['admin'] },
      'mentor-1',
      'validated',
      'ok',
    );

    const result = await service.updateVisibility(
      { id: 'admin-1', roles: ['admin'] },
      'mentor-1',
      { status: 'priority' },
    );

    expect(result.mentor.visibility).toBe('priority');
  });

  it('blocks non admin access', async () => {
    await expect(
      service.getPendingMentors({ roles: ['mentor'] }),
    ).rejects.toThrow(ForbiddenException);
  });
});
