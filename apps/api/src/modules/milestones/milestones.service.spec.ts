import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications';
import { PrismaService } from '../prisma';
import { MilestonesService } from './milestones.service';

describe('MilestonesService', () => {
  let service: MilestonesService;

  const mockPrisma = {
    student_programs: {
      findFirst: jest.fn(),
    },
    student_program_milestones: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockNotifications = {
    emitNotification: jest.fn(),
  };

  const baseMilestoneRow = {
    id: 'm-1',
    title: 'Cadrer le projet',
    description: 'Description',
    status: 'in_progress',
    deadline_at: new Date('2026-02-10T10:00:00.000Z'),
    updated_at: new Date('2026-02-01T10:00:00.000Z'),
    program: {
      id: 'p-1',
      student_id: 'student-1',
      mentor_id: 'mentor-1',
      title: 'Parcours',
    },
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

    let currentStatus = baseMilestoneRow.status;

    mockPrisma.student_programs.findFirst.mockResolvedValue({ id: 'p-1' });
    mockPrisma.student_program_milestones.findMany.mockResolvedValue([
      { ...baseMilestoneRow, status: currentStatus },
    ]);
    mockPrisma.student_program_milestones.findUnique.mockImplementation(async () => ({
      ...baseMilestoneRow,
      status: currentStatus,
    }));
    mockPrisma.student_program_milestones.update.mockImplementation(
      async ({ data }: { data: { status?: string } }) => {
        currentStatus = data.status ?? currentStatus;
        return {
          ...baseMilestoneRow,
          status: currentStatus,
        };
      },
    );
  });

  it('returns progression with metadata', async () => {
    const result = await service.getProgression(
      { id: 'student-1', roles: ['etudiant'] },
      {},
    );

    expect(result.milestones).toHaveLength(1);
    expect(result.metadata.total).toBe(1);
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
    const result = await service.updateMilestoneStatus(
      { id: 'student-1', roles: ['etudiant'] },
      'm-1',
      { status: 'done' },
    );

    expect(result.milestone.status).toBe('review');
  });

  it('allows mentor to approve milestone review', async () => {
    const result = await service.reviewMilestone(
      { id: 'mentor-1', roles: ['mentor'] },
      'm-1',
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
        'm-1',
        { approved: true },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects direct done transition when not owner and not mentor', async () => {
    await expect(
      service.updateMilestoneStatus(
        { id: 'outsider-1', roles: ['etudiant'] },
        'm-1',
        { status: 'done' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns mentor insights with risk level', async () => {
    mockPrisma.student_program_milestones.findMany.mockResolvedValue([
      {
        ...baseMilestoneRow,
        status: 'in_progress',
        deadline_at: new Date('2025-01-01T10:00:00.000Z'),
      },
    ]);

    const result = await service.getStudentInsights(
      { id: 'mentor-1', roles: ['mentor'] },
      'student-1',
    );

    expect(result.insights.riskLevel).toBe('medium');
  });

  it('throws when mentor is not linked to student', async () => {
    mockPrisma.student_programs.findFirst.mockResolvedValue(null);

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

  it('throws for invalid transition to done without mentor validation for support user', async () => {
    await expect(
      service.updateMilestoneStatus(
        { id: 'support-1', roles: ['support'] },
        'm-1',
        { status: 'done' },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
