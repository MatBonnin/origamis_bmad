import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsService } from '../notifications';
import { PrismaService } from '../prisma';

type Role = 'etudiant' | 'mentor' | 'admin' | 'support';
type MilestoneType = 'message' | 'rdv' | 'visio';
type MilestoneStatus = 'planned' | 'in_progress' | 'review' | 'done' | 'blocked';

interface CurrentUser {
  id: string;
  roles: string[];
}

export interface Milestone {
  id: string;
  sourceId: string;
  source: 'program';
  userId: string;
  mentorId: string;
  type: MilestoneType;
  status: MilestoneStatus;
  dueAt: string;
  completedAt: string | null;
  title: string;
  notes: string | null;
  overdue: boolean;
  programId: string;
}

interface GetProgressionQuery {
  userId?: string;
  type?: MilestoneType;
}

interface UpdateStatusInput {
  status: MilestoneStatus;
  comment?: string;
}

interface ReviewInput {
  approved: boolean;
  comments?: string;
}

const VALID_STATUSES: MilestoneStatus[] = [
  'planned',
  'in_progress',
  'review',
  'done',
  'blocked',
];

@Injectable()
export class MilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getProgression(currentUser: CurrentUser, query: GetProgressionQuery) {
    const targetUserId = await this.resolveProgressionTarget(
      currentUser,
      query.userId,
    );
    const milestones = await this.buildProgramMilestonesForStudent(targetUserId);

    const filtered = query.type
      ? milestones.filter((item) => item.type === query.type)
      : milestones;

    return {
      milestones: filtered,
      metadata: this.buildProgressionMetadata(filtered),
    };
  }

  async getStudentProgression(currentUser: CurrentUser, studentId: string) {
    this.assertRole(currentUser, ['mentor', 'admin', 'support']);
    await this.assertMentorCanAccessStudent(
      currentUser.id,
      studentId,
      currentUser.roles,
    );

    const milestones = await this.buildProgramMilestonesForStudent(studentId);
    return {
      milestones,
      metadata: this.buildProgressionMetadata(milestones),
    };
  }

  async getStudentInsights(currentUser: CurrentUser, studentId: string) {
    this.assertRole(currentUser, ['mentor', 'admin', 'support']);
    await this.assertMentorCanAccessStudent(
      currentUser.id,
      studentId,
      currentUser.roles,
    );

    const milestones = await this.buildProgramMilestonesForStudent(studentId);
    const done = milestones.filter((item) => item.status === 'done').length;
    const overdue = milestones.filter((item) => item.overdue).length;
    const reviewPending = milestones.filter(
      (item) => item.status === 'review',
    ).length;

    const riskLevel: 'low' | 'medium' | 'high' =
      overdue > 2 ? 'high' : overdue > 0 ? 'medium' : 'low';

    return {
      insights: {
        studentId,
        completionRate:
          milestones.length === 0
            ? 0
            : Math.round((done / milestones.length) * 100),
        overdueCount: overdue,
        reviewPending,
        riskLevel,
        notes:
          riskLevel === 'high'
            ? 'Plusieurs jalons en retard, prevoir un point mentor rapidement.'
            : riskLevel === 'medium'
              ? 'Des jalons sont en retard, surveiller la progression cette semaine.'
              : 'Progression stable.',
      },
    };
  }

  async getMilestone(currentUser: CurrentUser, milestoneId: string) {
    const milestone = await this.findProgramMilestoneById(milestoneId);
    this.assertCanAccessMilestone(currentUser, milestone);
    return { milestone };
  }

  async updateMilestoneStatus(
    currentUser: CurrentUser,
    milestoneId: string,
    input: UpdateStatusInput,
  ) {
    if (!VALID_STATUSES.includes(input.status)) {
      throw new BadRequestException({
        code: 'MILESTONE_STATUS_INVALID',
        message: 'Statut de jalon invalide',
      });
    }

    const milestone = await this.findProgramMilestoneById(milestoneId);
    this.assertCanAccessMilestone(currentUser, milestone);

    let nextStatus = input.status;
    const isStudentAction = milestone.userId === currentUser.id;

    if (isStudentAction && nextStatus === 'done') {
      nextStatus = 'review';
    }

    if (
      nextStatus === 'done' &&
      !currentUser.roles.includes('mentor') &&
      !currentUser.roles.includes('admin')
    ) {
      throw new BadRequestException({
        code: 'MILESTONE_REVIEW_REQUIRED',
        message: 'Validation mentor requise avant de terminer le jalon',
      });
    }

    const updated = await this.prisma.student_program_milestones.update({
      where: { id: milestoneId },
      data: {
        status: nextStatus,
      },
      include: {
        program: {
          select: {
            id: true,
            mentor_id: true,
            student_id: true,
          },
        },
      },
    });

    if (nextStatus === 'review') {
      await this.safeNotify(updated.program.mentor_id, {
        channel: 'in_app',
        category: 'rdv',
        title: 'Jalon en attente de validation',
        message: "Un etudiant a demande la validation d'un jalon.",
        payload: { milestoneId: updated.id, studentId: updated.program.student_id },
      });
    }

    const refreshed = await this.findProgramMilestoneById(updated.id);
    const progression = this.buildProgressionMetadata(
      await this.buildProgramMilestonesForStudent(refreshed.userId),
    );

    return {
      milestone: refreshed,
      progression,
    };
  }

  async reviewMilestone(
    currentUser: CurrentUser,
    milestoneId: string,
    input: ReviewInput,
  ) {
    this.assertRole(currentUser, ['mentor', 'admin', 'support']);
    const milestone = await this.findProgramMilestoneById(milestoneId);

    if (
      milestone.mentorId !== currentUser.id &&
      !currentUser.roles.includes('admin') &&
      !currentUser.roles.includes('support')
    ) {
      throw new ForbiddenException({
        code: 'MILESTONE_REVIEW_FORBIDDEN',
        message: 'Ce jalon ne vous est pas assigne',
      });
    }

    const nextStatus: MilestoneStatus = input.approved ? 'done' : 'in_progress';

    const updated = await this.prisma.student_program_milestones.update({
      where: { id: milestoneId },
      data: { status: nextStatus },
      include: {
        program: {
          select: {
            student_id: true,
          },
        },
      },
    });

    await this.safeNotify(updated.program.student_id, {
      channel: 'in_app',
      category: 'rdv',
      title: input.approved ? 'Jalon valide' : 'Jalon a reprendre',
      message: input.approved
        ? 'Votre jalon a ete valide par votre mentor.'
        : 'Votre jalon doit etre ajuste avant validation.',
      payload: {
        milestoneId: updated.id,
        approved: input.approved,
        comments: input.comments ?? '',
      },
    });

    const refreshed = await this.findProgramMilestoneById(updated.id);

    return {
      review: {
        milestoneId: updated.id,
        approved: input.approved,
        comments: input.comments ?? null,
        reviewedBy: currentUser.id,
      },
      milestone: refreshed,
    };
  }

  private async resolveProgressionTarget(
    currentUser: CurrentUser,
    requestedUserId?: string,
  ) {
    if (!requestedUserId || requestedUserId === currentUser.id) {
      return currentUser.id;
    }

    if (
      !currentUser.roles.includes('mentor') &&
      !currentUser.roles.includes('admin')
    ) {
      throw new ForbiddenException({
        code: 'PROGRESSION_ACCESS_FORBIDDEN',
        message: 'Acces refuse a la progression demandee',
      });
    }

    await this.assertMentorCanAccessStudent(
      currentUser.id,
      requestedUserId,
      currentUser.roles,
    );
    return requestedUserId;
  }

  private async assertMentorCanAccessStudent(
    mentorId: string,
    studentId: string,
    roles: string[],
  ) {
    if (roles.includes('admin') || roles.includes('support')) {
      return;
    }

    const relation = await this.prisma.student_programs.findFirst({
      where: { mentor_id: mentorId, student_id: studentId },
      select: { id: true },
    });

    if (!relation) {
      throw new ForbiddenException({
        code: 'STUDENT_ACCESS_FORBIDDEN',
        message: 'Ce suivi etudiant ne vous est pas accessible',
      });
    }
  }

  private assertRole(currentUser: CurrentUser, roles: Role[]) {
    if (!currentUser.roles.some((role) => roles.includes(role as Role))) {
      throw new ForbiddenException({
        code: 'ROLE_FORBIDDEN',
        message: 'Role insuffisant pour cette action',
      });
    }
  }

  private assertCanAccessMilestone(
    currentUser: CurrentUser,
    milestone: Milestone,
  ) {
    const isOwner = milestone.userId === currentUser.id;
    const isMentor = milestone.mentorId === currentUser.id;
    const isStaff =
      currentUser.roles.includes('admin') ||
      currentUser.roles.includes('support');

    if (isOwner || isMentor || isStaff) {
      return;
    }

    throw new ForbiddenException({
      code: 'MILESTONE_ACCESS_FORBIDDEN',
      message: 'Vous ne pouvez pas acceder a ce jalon',
    });
  }

  private async buildProgramMilestonesForStudent(studentId: string) {
    const rows = await this.prisma.student_program_milestones.findMany({
      where: {
        program: { student_id: studentId },
      },
      include: {
        program: {
          select: {
            id: true,
            student_id: true,
            mentor_id: true,
            title: true,
          },
        },
      },
      orderBy: [{ deadline_at: 'asc' }, { milestone_order: 'asc' }],
      take: 300,
    });

    return rows.map((row) => this.mapProgramMilestone(row));
  }

  private async findProgramMilestoneById(milestoneId: string) {
    if (milestoneId.includes(':')) {
      throw new NotFoundException({
        code: 'MILESTONE_NOT_FOUND',
        message: 'Ce jalon provient de l ancien modele de progression',
      });
    }

    const row = await this.prisma.student_program_milestones.findUnique({
      where: { id: milestoneId },
      include: {
        program: {
          select: {
            id: true,
            student_id: true,
            mentor_id: true,
            title: true,
          },
        },
      },
    });

    if (!row) {
      throw new NotFoundException({
        code: 'MILESTONE_NOT_FOUND',
        message: 'Jalon introuvable',
      });
    }

    return this.mapProgramMilestone(row);
  }

  private mapProgramMilestone(row: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    deadline_at: Date;
    updated_at: Date;
    program: {
      id: string;
      student_id: string;
      mentor_id: string;
      title: string;
    };
  }): Milestone {
    const status = row.status as MilestoneStatus;
    const dueAt = row.deadline_at.toISOString();
    const completedAt = status === 'done' ? row.updated_at.toISOString() : null;

    return {
      id: row.id,
      sourceId: row.id,
      source: 'program',
      userId: row.program.student_id,
      mentorId: row.program.mentor_id,
      type: 'rdv',
      status,
      dueAt,
      completedAt,
      title: row.title,
      notes: row.description,
      overdue: status !== 'done' && row.deadline_at < new Date(),
      programId: row.program.id,
    };
  }

  private buildProgressionMetadata(milestones: Milestone[]) {
    const total = milestones.length;
    const totalCompleted = milestones.filter(
      (item) => item.status === 'done',
    ).length;
    const totalPending = milestones.filter(
      (item) => item.status !== 'done',
    ).length;

    return {
      total,
      totalCompleted,
      totalPending,
      completionRate:
        total === 0 ? 0 : Math.round((totalCompleted / total) * 100),
    };
  }

  private async safeNotify(
    userId: string,
    input: {
      channel: 'in_app';
      category: 'rdv' | 'messages' | 'system';
      title: string;
      message: string;
      payload: Record<string, unknown>;
    },
  ) {
    try {
      await this.notifications.emitNotification({ userId, ...input });
    } catch {
      // Notification should not block milestone flow
    }
  }
}
