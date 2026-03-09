import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { NotificationsService } from '../notifications';

export type SessionHistoryCategory = 'message' | 'rdv' | 'visio';
export type SessionHistoryExportFormat = 'csv' | 'pdf';

export interface GetSessionHistoryQuery {
  userId?: string;
  category?: SessionHistoryCategory;
  cursor?: string;
  limit?: number;
}

export interface SessionHistoryItem {
  id: string;
  bookingId: string | null;
  userId: string;
  mentorId: string;
  type: SessionHistoryCategory;
  startedAt: string;
  endedAt: string;
  notes: string | null;
  status: string;
  replayAvailable?: boolean;
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getHistory(currentUserId: string, query: GetSessionHistoryQuery) {
    const targetUserId = this.assertOwnerAccess(currentUserId, query.userId);
    const isAnonymized = await this.isHistoryHiddenByRgpd(targetUserId);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);

    if (isAnonymized) {
      this.auditAccess(targetUserId, 'history.hidden_rgpd');
      return {
        sessions: [],
        metadata: {
          nextCursor: null,
          hasMore: false,
          limit,
          rgpdRestricted: true,
        },
      };
    }

    const category = query.category ?? 'rdv';
    const data = await this.loadHistoryEntries(targetUserId, {
      category,
      cursor: query.cursor,
      limit,
    });

    this.auditAccess(targetUserId, 'history.read', { category });
    return data;
  }

  async getReplayLink(currentUserId: string, sessionId: string) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: sessionId },
      include: { session: true },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Session introuvable',
      });
    }

    if (
      booking.student_id !== currentUserId &&
      booking.mentor_id !== currentUserId
    ) {
      throw new ForbiddenException({
        code: 'REPLAY_ACCESS_FORBIDDEN',
        message: 'Acces au replay refuse',
      });
    }

    if (!booking.session || booking.session.expires_at <= new Date()) {
      throw new NotFoundException({
        code: 'REPLAY_NOT_AVAILABLE',
        message: 'Replay indisponible ou expire',
      });
    }

    this.auditAccess(currentUserId, 'history.replay.read', {
      sessionId,
    });

    return {
      url: booking.session.session_url,
    };
  }

  async exportHistory(
    currentUserId: string,
    input: {
      userId?: string;
      category?: SessionHistoryCategory;
      format?: SessionHistoryExportFormat;
    },
  ) {
    const targetUserId = this.assertOwnerAccess(currentUserId, input.userId);
    const category = input.category ?? 'rdv';
    const format = input.format ?? 'csv';

    const isAnonymized = await this.isHistoryHiddenByRgpd(targetUserId);
    if (isAnonymized) {
      return {
        exportUrl: '',
        export_url: '',
      };
    }

    const data = await this.loadHistoryEntries(targetUserId, {
      category,
      limit: 200,
    });

    const lines = data.sessions.map((item) => ({
      id: item.id,
      type: item.type,
      status: item.status,
      startedAt: item.startedAt,
      endedAt: item.endedAt,
      mentorId: item.mentorId,
      notes: item.notes ?? '',
    }));

    const payload =
      format === 'pdf'
        ? this.toPdf(lines)
        : this.toCsv(
            lines.map((line) => [
              line.id,
              line.type,
              line.status,
              line.startedAt,
              line.endedAt,
              line.mentorId,
              line.notes,
            ]),
          );
    const mime =
      format === 'pdf' ? 'application/pdf' : 'text/csv;charset=utf-8';
    const exportUrl = `data:${mime};base64,${Buffer.from(payload).toString('base64')}`;

    this.auditAccess(targetUserId, 'history.export', { category, format });

    return {
      exportUrl,
      export_url: exportUrl,
    };
  }

  private assertOwnerAccess(currentUserId: string, requestedUserId?: string) {
    const targetUserId = requestedUserId ?? currentUserId;
    if (targetUserId !== currentUserId) {
      throw new ForbiddenException({
        code: 'HISTORY_ACCESS_FORBIDDEN',
        message: 'Vous ne pouvez consulter que votre historique',
      });
    }
    return targetUserId;
  }

  private async isHistoryHiddenByRgpd(userId: string) {
    const latestConsent = await this.prisma.consents.findFirst({
      where: { user_id: userId },
      orderBy: { consented_at: 'desc' },
    });
    return Boolean(latestConsent?.withdrawn_at);
  }

  private async loadHistoryEntries(
    targetUserId: string,
    input: { category: SessionHistoryCategory; cursor?: string; limit: number },
  ) {
    const { category, cursor, limit } = input;
    if (category === 'message') {
      const rows = await this.prisma.conversations.findMany({
        where: {
          OR: [{ student_id: targetUserId }, { mentor_id: targetUserId }],
          last_message_at: { lte: new Date() },
        },
        orderBy: { last_message_at: 'desc' },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = rows.length > limit;
      const pageRows = hasMore ? rows.slice(0, limit) : rows;

      return {
        sessions: pageRows.map(
          (row): SessionHistoryItem => ({
            id: row.id,
            type: 'message',
            startedAt: row.last_message_at.toISOString(),
            endedAt: row.last_message_at.toISOString(),
            bookingId: null,
            mentorId: row.mentor_id,
            userId: row.student_id,
            notes: null,
            status: 'completed',
          }),
        ),
        metadata: {
          nextCursor: hasMore ? pageRows[pageRows.length - 1].id : null,
          hasMore,
          limit,
        },
      };
    }

    const where: Record<string, unknown> = {
      OR: [{ student_id: targetUserId }, { mentor_id: targetUserId }],
      booking_date: { lte: new Date() },
    };

    if (category === 'visio') {
      where.session = { isNot: null };
    }

    const rows = await this.prisma.bookings.findMany({
      where,
      include: { session: true },
      orderBy: { booking_date: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    return {
      sessions: pageRows.map(
        (row): SessionHistoryItem => ({
          id: row.id,
          bookingId: row.id,
          userId: targetUserId,
          mentorId: row.mentor_id,
          type: category,
          startedAt: row.booking_date.toISOString(),
          endedAt: row.booking_date.toISOString(),
          notes: row.notes,
          status: row.status,
          replayAvailable:
            category === 'visio'
              ? Boolean(row.session && row.session.expires_at > new Date())
              : undefined,
        }),
      ),
      metadata: {
        nextCursor: hasMore ? pageRows[pageRows.length - 1].id : null,
        hasMore,
        limit,
      },
    };
  }

  private toCsv(rows: string[][]) {
    const header = [
      'id',
      'type',
      'status',
      'started_at',
      'ended_at',
      'mentor_id',
      'notes',
    ];
    const normalizedRows = rows.map((row) =>
      row.map((value) => `"${value.replaceAll('"', '""')}"`).join(','),
    );
    return [header.join(','), ...normalizedRows].join('\n');
  }

  private toPdf(
    rows: Array<{
      id: string;
      type: string;
      status: string;
      startedAt: string;
      endedAt: string;
      mentorId: string;
      notes: string;
    }>,
  ) {
    const content = [
      'Historique des sessions',
      ...rows.map(
        (row) =>
          `${row.id} | ${row.type} | ${row.status} | ${row.startedAt} | ${row.mentorId} | ${row.notes}`,
      ),
    ]
      .join('\n')
      .replace(/[()]/g, '');

    return `%PDF-1.1
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length ${content.length + 30} >>
stream
BT
/F1 12 Tf
50 740 Td
(${content}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000201 00000 n 
trailer
<< /Root 1 0 R /Size 5 >>
startxref
330
%%EOF`;
  }

  // ─── Notes ──────────────────────────────────────────────────────────────────

  async createNote(
    userId: string,
    bookingId: string,
    input: { content: string },
  ) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Session introuvable' });
    }

    if (booking.student_id !== userId && booking.mentor_id !== userId) {
      throw new ForbiddenException({ code: 'NOT_PARTICIPANT', message: 'Vous n\'etes pas participant de cette session' });
    }

    if (booking.status !== 'completed') {
      throw new BadRequestException({ code: 'SESSION_NOT_COMPLETED', message: 'La session doit etre terminee pour ajouter des notes' });
    }

    if (input.content.length > 2000) {
      throw new BadRequestException({ code: 'CONTENT_TOO_LONG', message: 'Le contenu ne peut pas depasser 2000 caracteres' });
    }

    const role = booking.mentor_id === userId ? 'mentor' : 'student';

    const note = await this.prisma.session_notes.upsert({
      where: { booking_id_author_id: { booking_id: bookingId, author_id: userId } },
      create: { booking_id: bookingId, author_id: userId, role, content: input.content },
      update: { content: input.content },
    });

    return note;
  }

  async getNotes(userId: string, bookingId: string) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Session introuvable' });
    }

    if (booking.student_id !== userId && booking.mentor_id !== userId) {
      throw new ForbiddenException({ code: 'NOT_PARTICIPANT', message: 'Acces refuse' });
    }

    const notes = await this.prisma.session_notes.findMany({
      where: { booking_id: bookingId },
      orderBy: { created_at: 'asc' },
    });

    return notes;
  }

  // ─── Feedback ───────────────────────────────────────────────────────────────

  async submitFeedback(
    mentorId: string,
    bookingId: string,
    input: {
      nextActions: string[];
      objectivesMet: boolean;
      linkedMilestoneId?: string;
      notesForStudent?: string;
    },
  ) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Session introuvable' });
    }

    if (booking.mentor_id !== mentorId) {
      throw new ForbiddenException({ code: 'NOT_MENTOR', message: 'Seul le mentor peut soumettre le feedback' });
    }

    if (booking.status !== 'completed') {
      throw new BadRequestException({ code: 'SESSION_NOT_COMPLETED', message: 'La session doit etre terminee' });
    }

    if (input.linkedMilestoneId) {
      const linkedMilestone = await this.prisma.student_program_milestones.findUnique({
        where: { id: input.linkedMilestoneId },
        include: {
          program: {
            select: {
              mentor_id: true,
              student_id: true,
              status: true,
            },
          },
        },
      });

      if (!linkedMilestone) {
        throw new BadRequestException({
          code: 'LINKED_MILESTONE_NOT_FOUND',
          message: 'Le jalon lie est introuvable',
        });
      }

      const samePair =
        linkedMilestone.program.mentor_id === booking.mentor_id &&
        linkedMilestone.program.student_id === booking.student_id;
      if (!samePair || linkedMilestone.program.status !== 'active') {
        throw new BadRequestException({
          code: 'LINKED_MILESTONE_INVALID',
          message: 'Le jalon lie doit appartenir au parcours actif de cet etudiant',
        });
      }
    }

    const feedback = await this.prisma.session_feedback.upsert({
      where: { booking_id: bookingId },
      create: {
        booking_id: bookingId,
        submitted_by: mentorId,
        next_actions: input.nextActions,
        objectives_met: input.objectivesMet,
        linked_milestone_id: input.linkedMilestoneId ?? null,
        notes_for_student: input.notesForStudent ?? null,
      },
      update: {
        next_actions: input.nextActions,
        objectives_met: input.objectivesMet,
        linked_milestone_id: input.linkedMilestoneId ?? null,
        notes_for_student: input.notesForStudent ?? null,
      },
    });

    await this.notifications.emitNotification({
      userId: booking.student_id,
      category: 'rdv',
      channel: 'in_app',
      title: 'Feedback de session disponible',
      message: 'Votre mentor a soumis un feedback pour votre derniere session.',
      payload: { bookingId },
    });

    return feedback;
  }

  async getFeedback(userId: string, bookingId: string) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Session introuvable' });
    }

    if (booking.student_id !== userId && booking.mentor_id !== userId) {
      throw new ForbiddenException({ code: 'NOT_PARTICIPANT', message: 'Acces refuse' });
    }

    const feedback = await this.prisma.session_feedback.findUnique({
      where: { booking_id: bookingId },
    });

    return feedback;
  }

  private auditAccess(
    userId: string,
    action: string,
    details?: Record<string, unknown>,
  ) {
    this.logger.log(
      `[AUDIT] action=${action} userId=${userId} details=${JSON.stringify(details ?? {})}`,
    );
  }
}
