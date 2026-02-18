import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications';
import { PrismaService } from '../prisma';
import { MilestonesService } from './milestones.service';

describe('MilestonesService', () => {
  let service: MilestonesService;

  const mockPrisma = {
    bookings: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    conversations: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockNotifications = {
    emitNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestonesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<MilestonesService>(MilestonesService);

    jest.clearAllMocks();

    mockPrisma.bookings.findMany.mockResolvedValue([
      {
        id: 'b-1',
        student_id: 'student-1',
        mentor_id: 'mentor-1',
        booking_date: new Date('2026-02-01T10:00:00.000Z'),
        status: 'confirmed',
        notes: 'Point weekly',
        session: null,
      },
    ]);

    mockPrisma.conversations.findMany.mockResolvedValue([
      {
        id: 'c-1',
        student_id: 'student-1',
        mentor_id: 'mentor-1',
        last_message_at: new Date('2026-02-02T10:00:00.000Z'),
      },
    ]);

    mockPrisma.bookings.findUnique.mockResolvedValue({
      id: 'b-1',
      student_id: 'student-1',
      mentor_id: 'mentor-1',
      booking_date: new Date('2026-02-01T10:00:00.000Z'),
      status: 'confirmed',
      notes: 'Point weekly',
      session: null,
    });

    mockPrisma.bookings.findFirst.mockResolvedValue({ id: 'rel-1' });
    mockPrisma.conversations.findUnique.mockResolvedValue({
      id: 'c-1',
      student_id: 'student-1',
      mentor_id: 'mentor-1',
      last_message_at: new Date('2026-02-02T10:00:00.000Z'),
    });
  });

  it('returns progression with metadata', async () => {
    const result = await service.getProgression(
      { id: 'student-1', roles: ['etudiant'] },
      {},
    );

    expect(result.milestones.length).toBeGreaterThan(0);
    expect(result.metadata.total).toBe(result.milestones.length);
  });

  it('forbids student accessing another student progression', async () => {
    await expect(
      service.getProgression(
        { id: 'student-1', roles: ['etudiant'] },
        { userId: 'student-2' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('requires mentor review before done for student action', async () => {
    await expect(
      service.updateMilestoneStatus(
        { id: 'student-1', roles: ['etudiant'] },
        'booking:b-1',
        { status: 'done' },
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        milestone: expect.objectContaining({ status: 'review' }),
      }),
    );
  });

  it('allows mentor to approve milestone review', async () => {
    const result = await service.reviewMilestone(
      { id: 'mentor-1', roles: ['mentor'] },
      'booking:b-1',
      { approved: true, comments: 'OK' },
    );

    expect(result.review.approved).toBe(true);
    expect(result.milestone.status).toBe('done');
    expect(mockNotifications.emitNotification).toHaveBeenCalled();
  });

  it('blocks review for non mentor role', async () => {
    await expect(
      service.reviewMilestone(
        { id: 'student-1', roles: ['etudiant'] },
        'booking:b-1',
        { approved: true },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects direct done transition when not owner and not mentor', async () => {
    mockPrisma.bookings.findUnique.mockResolvedValue({
      id: 'b-1',
      student_id: 'student-1',
      mentor_id: 'mentor-1',
      booking_date: new Date('2026-02-01T10:00:00.000Z'),
      status: 'confirmed',
      notes: 'Point weekly',
      session: null,
    });

    await expect(
      service.updateMilestoneStatus(
        { id: 'outsider-1', roles: ['etudiant'] },
        'booking:b-1',
        { status: 'done' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns mentor insights with risk level', async () => {
    mockPrisma.bookings.findMany.mockResolvedValue([
      {
        id: 'b-1',
        student_id: 'student-1',
        mentor_id: 'mentor-1',
        booking_date: new Date('2025-01-01T10:00:00.000Z'),
        status: 'confirmed',
        notes: null,
        session: null,
      },
    ]);

    const result = await service.getStudentInsights(
      { id: 'mentor-1', roles: ['mentor'] },
      'student-1',
    );

    expect(result.insights.riskLevel).toBe('medium');
  });

  it('throws when mentor is not linked to student', async () => {
    mockPrisma.bookings.findFirst.mockResolvedValue(null);

    await expect(
      service.getStudentProgression(
        { id: 'mentor-2', roles: ['mentor'] },
        'student-1',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws when non mentor asks student insights', async () => {
    await expect(
      service.getStudentInsights(
        { id: 'student-1', roles: ['etudiant'] },
        'student-1',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws for invalid transition to done without review for support user', async () => {
    await expect(
      service.updateMilestoneStatus(
        { id: 'support-1', roles: ['support'] },
        'booking:b-1',
        { status: 'done' },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
