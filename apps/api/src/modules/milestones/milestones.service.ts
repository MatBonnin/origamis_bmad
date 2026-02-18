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

type MilestoneStatus =
  | 'planned'
  | 'in-progress'
  | 'review'
  | 'done'
  | 'blocked';

interface CurrentUser {
  id: string;
  roles: string[];
}

interface Milestone {
  id: string;
  sourceId: string;
  source: 'booking' | 'conversation';
  userId: string;
  mentorId: string;
  type: MilestoneType;
  status: MilestoneStatus;
  dueAt: string;
  completedAt: string | null;
  title: string;
  notes: string | null;
  overdue: boolean;
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

interface OverrideState {
  status: MilestoneStatus;
  completedAt: string | null;
  updatedBy: string;
}

const REVIEW_REQUIRED_FOR_DONE: MilestoneStatus[] = [
  'planned',
  'in-progress',
  'blocked',
];

@Injectable()
export class MilestonesService {
  private readonly statusOverrides = new Map<string, OverrideState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getProgression(currentUser: CurrentUser, query: GetProgressionQuery) {
    const targetUserId = await this.resolveProgressionTarget(
      currentUser,
      query.userId,
    );
    const milestones = await this.buildMilestonesForStudent(targetUserId);

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

    const milestones = await this.buildMilestonesForStudent(studentId);
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

    const milestones = await this.buildMilestonesForStudent(studentId);
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
    const milestone = await this.findMilestoneById(milestoneId);
    this.assertCanAccessMilestone(currentUser, milestone);

    return { milestone };
  }

  async updateMilestoneStatus(
    currentUser: CurrentUser,
    milestoneId: string,
    input: UpdateStatusInput,
  ) {
    const milestone = await this.findMilestoneById(milestoneId);
    this.assertCanAccessMilestone(currentUser, milestone);

    let nextStatus = input.status;

    const isStudentAction = milestone.userId === currentUser.id;
    if (isStudentAction && nextStatus === 'done') {
      nextStatus = 'review';
    }

    if (
      nextStatus === 'done' &&
      REVIEW_REQUIRED_FOR_DONE.includes(milestone.status) &&
      !currentUser.roles.includes('mentor')
    ) {
      throw new BadRequestException({
        code: 'MILESTONE_REVIEW_REQUIRED',
        message: 'Validation mentor requise avant de terminer le jalon',
      });
    }

    const completedAt = nextStatus === 'done' ? new Date().toISOString() : null;

    this.statusOverrides.set(milestone.id, {
      status: nextStatus,
      completedAt,
      updatedBy: currentUser.id,
    });

    if (nextStatus === 'review') {
      await this.safeNotify(milestone.mentorId, {
        channel: 'in_app',
        category: 'rdv',
        title: 'Jalon en attente de validation',
        message: 'Un etudiant a demande la validation d un jalon.',
        payload: { milestoneId: milestone.id, studentId: milestone.userId },
      });
    }

    const refreshed = await this.findMilestoneById(milestone.id);

    return {
      milestone: refreshed,
      progression: this.buildProgressionMetadata(
        (await this.buildMilestonesForStudent(milestone.userId)).filter(
          (item) => item.userId === milestone.userId,
        ),
      ),
    };
  }

  async reviewMilestone(
    currentUser: CurrentUser,
    milestoneId: string,
    input: ReviewInput,
  ) {
    this.assertRole(currentUser, ['mentor', 'admin', 'support']);

    const milestone = await this.findMilestoneById(milestoneId);

    if (
      milestone.mentorId !== currentUser.id &&
      !currentUser.roles.includes('admin')
    ) {
      throw new ForbiddenException({
        code: 'MILESTONE_REVIEW_FORBIDDEN',
        message: 'Ce jalon ne vous est pas assigne',
      });
    }

    const nextStatus: MilestoneStatus = input.approved ? 'done' : 'in-progress';

    this.statusOverrides.set(milestone.id, {
      status: nextStatus,
      completedAt: input.approved ? new Date().toISOString() : null,
      updatedBy: currentUser.id,
    });

    await this.safeNotify(milestone.userId, {
      channel: 'in_app',
      category: 'rdv',
      title: input.approved ? 'Jalon valide' : 'Jalon a reprendre',
      message: input.approved
        ? 'Votre jalon a ete valide par votre mentor.'
        : 'Votre jalon doit etre ajuste avant validation.',
      payload: {
        milestoneId: milestone.id,
        approved: input.approved,
        comments: input.comments ?? '',
      },
    });

    const refreshed = await this.findMilestoneById(milestone.id);

    return {
      review: {
        milestoneId: milestone.id,
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

    const relation = await this.prisma.bookings.findFirst({
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

  private assertCanAccessMilestone(currentUser: CurrentUser, milestone: Milestone) {
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

  private async findMilestoneById(milestoneId: string) {
    const [source, sourceId] = milestoneId.split(':');

    if (source === 'booking') {
      const booking = await this.prisma.bookings.findUnique({
        where: { id: sourceId },
        include: { session: true },
      });

      if (!booking) {
        throw new NotFoundException({
          code: 'MILESTONE_NOT_FOUND',
          message: 'Jalon introuvable',
        });
      }

      return this.mapBookingMilestone(booking);
    }

    if (source === 'conversation') {
      const conversation = await this.prisma.conversations.findUnique({
        where: { id: sourceId },
      });

      if (!conversation) {
        throw new NotFoundException({
          code: 'MILESTONE_NOT_FOUND',
          message: 'Jalon introuvable',
        });
      }

      return this.mapConversationMilestone(conversation);
    }

    throw new NotFoundException({
      code: 'MILESTONE_NOT_FOUND',
      message: 'Jalon introuvable',
    });
  }

  private async buildMilestonesForStudent(studentId: string) {
    const [bookings, conversations] = await Promise.all([
      this.prisma.bookings.findMany({
        where: {
          OR: [{ student_id: studentId }, { mentor_id: studentId }],
        },
        include: { session: true },
        orderBy: { booking_date: 'desc' },
        take: 100,
      }),
      this.prisma.conversations.findMany({
        where: {
          OR: [{ student_id: studentId }, { mentor_id: studentId }],
        },
        orderBy: { last_message_at: 'desc' },
        take: 50,
      }),
    ]);

    const bookingMilestones = bookings
      .filter((row) => row.student_id === studentId)
      .map((row) => this.mapBookingMilestone(row));

    const messageMilestones = conversations
      .filter((row) => row.student_id === studentId)
      .map((row) => this.mapConversationMilestone(row));

    return [...bookingMilestones, ...messageMilestones].sort(
      (a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime(),
    );
  }

  private mapBookingMilestone(booking: {
    id: string;
    student_id: string;
    mentor_id: string;
    booking_date: Date;
    status: string;
    notes: string | null;
    session?: { id: string } | null;
  }): Milestone {
    const isVisio = Boolean(booking.session);
    const defaultStatus = this.mapBookingStatus(booking.status);

    return this.applyOverride({
      id: `booking:${booking.id}`,
      sourceId: booking.id,
      source: 'booking',
      userId: booking.student_id,
      mentorId: booking.mentor_id,
      type: isVisio ? 'visio' : 'rdv',
      status: defaultStatus,
      dueAt: booking.booking_date.toISOString(),
      completedAt:
        defaultStatus === 'done' ? booking.booking_date.toISOString() : null,
      title: isVisio ? 'Session visio' : 'Rendez-vous mentorat',
      notes: booking.notes,
      overdue: defaultStatus !== 'done' && booking.booking_date < new Date(),
    });
  }

  private mapConversationMilestone(conversation: {
    id: string;
    student_id: string;
    mentor_id: string;
    last_message_at: Date;
  }): Milestone {
    return this.applyOverride({
      id: `conversation:${conversation.id}`,
      sourceId: conversation.id,
      source: 'conversation',
      userId: conversation.student_id,
      mentorId: conversation.mentor_id,
      type: 'message',
      status: 'done',
      dueAt: conversation.last_message_at.toISOString(),
      completedAt: conversation.last_message_at.toISOString(),
      title: 'Interaction messagerie',
      notes: null,
      overdue: false,
    });
  }

  private applyOverride(milestone: Milestone): Milestone {
    const override = this.statusOverrides.get(milestone.id);
    if (!override) {
      return milestone;
    }

    return {
      ...milestone,
      status: override.status,
      completedAt: override.completedAt,
    };
  }

  private mapBookingStatus(status: string): MilestoneStatus {
    if (status === 'completed') {
      return 'done';
    }
    if (status === 'confirmed') {
      return 'in-progress';
    }
    if (status === 'cancelled') {
      return 'blocked';
    }
    return 'planned';
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
