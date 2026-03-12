import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  call_session_status,
  transcript_capture_status,
  transcript_consent_status,
  transcript_job_status,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { NotificationsService } from '../notifications';
import { PrismaService } from '../prisma';
import { SessionProviderService } from './session-provider.service';
import {
  TranscriptJobPayload,
  TranscriptQueueService,
} from './transcript-queue.service';

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
  callSessionId?: string | null;
  callToken?: string | null;
  userId: string;
  mentorId: string;
  type: SessionHistoryCategory;
  startedAt: string;
  endedAt: string;
  notes: string | null;
  status: string;
  replayAvailable?: boolean;
  transcriptStatus?: string | null;
  transcriptSummary?: string | null;
  transcriptConsentStatus?: string | null;
}

interface TranscriptWebhookPayload {
  bookingId?: string;
  callSessionId?: string;
  providerJobId?: string;
  providerRoomId?: string;
  status?: 'completed' | 'failed' | 'processing';
  language?: string;
  fullText?: string;
  summaryText?: string;
  segments?: unknown[];
  providerEventId?: string;
  payload?: Record<string, unknown>;
}

interface VideoWebhookPayload {
  bookingId?: string;
  providerRoomId?: string;
  providerEventId?: string;
  eventType?: string;
  participantUserId?: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly accessLeadMinutes = 45;
  private readonly accessGraceHours = 12;
  private readonly unansweredCallMinutes = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly sessionProvider: SessionProviderService,
    private readonly transcriptQueue: TranscriptQueueService,
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
    const callSession = await this.prisma.booking_call_sessions.findUnique({
      where: { id: sessionId },
      include: {
        booking: {
          select: {
            id: true,
            student_id: true,
            mentor_id: true,
          },
        },
      },
    });

    if (!callSession) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Session introuvable',
      });
    }

    if (
      callSession.booking.student_id !== currentUserId &&
      callSession.booking.mentor_id !== currentUserId
    ) {
      throw new ForbiddenException({
        code: 'REPLAY_ACCESS_FORBIDDEN',
        message: 'Acces au replay refuse',
      });
    }

    if (callSession.expires_at <= new Date()) {
      throw new NotFoundException({
        code: 'REPLAY_NOT_AVAILABLE',
        message: 'Replay indisponible ou expire',
      });
    }

    this.auditAccess(currentUserId, 'history.replay.read', {
      sessionId,
    });

    return {
      url: callSession.session_url,
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

  async getSessionRoom(userId: string, bookingId: string) {
    const booking = await this.getBookingWithSession(userId, bookingId);
    const session = await this.ensureSessionRecord(booking);
    this.assertSessionWindow(booking);
    const activeCall = await this.getSyncedActiveCallForBooking(booking.id);
    return this.mapSessionRoom(userId, booking, session, activeCall);
  }

  async getSessionRoomByToken(userId: string, token: string) {
    const session = await this.prisma.booking_sessions.findUnique({
      where: { session_token: token },
      include: {
        booking: {
          include: {
            student: {
              select: { id: true, first_name: true, last_name: true },
            },
            mentor: {
              select: { id: true, first_name: true, last_name: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_TOKEN_NOT_FOUND',
        message: 'Session introuvable',
      });
    }

    this.assertBookingParticipant(userId, session.booking);
    this.assertSessionWindow(session.booking);
    const activeCall = await this.getSyncedActiveCallForBooking(session.booking.id);

    return this.mapSessionRoom(userId, session.booking, session, activeCall);
  }

  async assertSessionParticipant(userId: string, bookingId: string) {
    await this.getBookingWithSession(userId, bookingId);
  }

  async createCall(userId: string, bookingId: string) {
    const booking = await this.getBookingWithSession(userId, bookingId);
    const session = await this.ensureSessionRecord(booking);
    this.assertSessionWindow(booking);

    const activeCall = await this.getActiveCallForBooking(bookingId);
    if (activeCall) {
      throw new BadRequestException({
        code: 'CALL_ALREADY_ACTIVE',
        message: 'Un appel est deja actif pour cette reservation',
      });
    }

    const callId = randomUUID();
    const callToken = randomUUID();
    const roomId = this.sessionProvider.buildCallRoomId(callId);

    await this.sessionProvider.ensureRoom(roomId, {
      bookingId: booking.id,
      callSessionId: callId,
      initiatedBy: userId,
      studentId: booking.student_id,
      mentorId: booking.mentor_id,
    });

    const call = await this.prisma.booking_call_sessions.create({
      data: {
        id: callId,
        booking_id: booking.id,
        call_token: callToken,
        session_url: `/session/${session.session_token}?call=${callToken}`,
        provider: this.sessionProvider.getVideoProviderName(),
        provider_room_id: roomId,
        provider_join_url: this.sessionProvider.getLiveKitServerUrl(),
        initiated_by: userId,
        status: 'initiated',
        expires_at: session.expires_at,
      },
    });

    await this.logSessionEvent(call.id, booking.id, 'room_created', userId, {
      type: 'call.created',
      roomId,
    });

    return this.mapCallSession(userId, booking, call);
  }

  async getActiveCall(userId: string, bookingId: string) {
    const booking = await this.getBookingWithSession(userId, bookingId);
    this.assertSessionWindow(booking);

    const activeCall = await this.getActiveCallForBooking(bookingId);
    return {
      bookingId,
      activeCall: activeCall ? await this.mapCallSession(userId, booking, activeCall) : null,
    };
  }

  async getCallByToken(userId: string, callToken: string) {
    const call = await this.prisma.booking_call_sessions.findUnique({
      where: { call_token: callToken },
      include: {
        booking: {
          include: {
            student: { select: { id: true, first_name: true, last_name: true } },
            mentor: { select: { id: true, first_name: true, last_name: true } },
          },
        },
        transcript: true,
      },
    });

    if (!call) {
      throw new NotFoundException({
        code: 'CALL_NOT_FOUND',
        message: 'Appel introuvable',
      });
    }

    this.assertBookingParticipant(userId, call.booking);
    this.assertSessionWindow(call.booking);
    const normalized = await this.ensureCallNotExpired(call);

    return this.mapCallSession(userId, call.booking, normalized, call.transcript);
  }

  async listSessionChatMessages(userId: string, bookingId: string) {
    const booking = await this.getBookingWithSession(userId, bookingId);
    const session = await this.ensureSessionRecord(booking);

    const messages = await this.prisma.session_chat_messages.findMany({
      where: { booking_id: bookingId, booking_session_id: session.id },
      include: {
        author: { select: { id: true, first_name: true, last_name: true } },
        document: true,
      },
      orderBy: { created_at: 'asc' },
    });

    return {
      bookingId,
      messages: messages.map((message) => this.mapChatMessage(message)),
    };
  }

  async createSessionChatMessage(
    userId: string,
    bookingId: string,
    input: { body?: string; documentId?: string },
  ) {
    const booking = await this.getBookingWithSession(userId, bookingId);
    const session = await this.ensureSessionRecord(booking);
    const body = input.body?.trim() ?? '';

    if (!body && !input.documentId) {
      throw new BadRequestException({
        code: 'SESSION_MESSAGE_EMPTY',
        message: 'Le message ou le document est requis',
      });
    }

    let documentId = input.documentId ?? null;
    if (documentId) {
      const document = await this.prisma.session_documents.findUnique({
        where: { id: documentId },
      });
      if (!document || document.booking_id !== bookingId) {
        throw new BadRequestException({
          code: 'SESSION_DOCUMENT_INVALID',
          message: 'Le document ne correspond pas a cette session',
        });
      }
    }

    const created = await this.prisma.session_chat_messages.create({
      data: {
        booking_id: bookingId,
        booking_session_id: session.id,
        author_id: userId,
        body,
        document_id: documentId,
      },
      include: {
        author: { select: { id: true, first_name: true, last_name: true } },
        document: true,
      },
    });

    return {
      bookingId,
      message: this.mapChatMessage(created),
    };
  }

  async createSessionDocument(
    userId: string,
    bookingId: string,
    input: {
      url: string;
      originalName: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    },
  ) {
    const booking = await this.getBookingWithSession(userId, bookingId);
    const session = await this.ensureSessionRecord(booking);

    const document = await this.prisma.session_documents.create({
      data: {
        booking_id: bookingId,
        booking_session_id: session.id,
        uploaded_by: userId,
        url: input.url,
        original_name: input.originalName,
        file_name: input.fileName,
        mime_type: input.mimeType,
        size_bytes: input.sizeBytes,
      },
    });

    await this.logSessionEvent(session.id, bookingId, 'webhook_received', userId, {
      type: 'document.uploaded',
      documentId: document.id,
    });

    return {
      bookingId,
      document: this.mapSessionDocument(document),
    };
  }

  async getTranscript(userId: string, bookingId: string) {
    const booking = await this.getBookingWithSession(userId, bookingId);
    const latestCall = await this.prisma.booking_call_sessions.findFirst({
      where: { booking_id: booking.id },
      include: { transcript: true },
      orderBy: { created_at: 'desc' },
    });

    return latestCall?.transcript
      ? this.mapTranscript(latestCall.transcript)
      : {
          bookingId,
          provider: this.sessionProvider.getTranscriptProviderName(),
          status: latestCall ? this.resolveTranscriptDisplayStatus(latestCall) : 'not_requested',
          language: null,
          fullText: null,
          summaryText: null,
          segments: [],
          updatedAt: latestCall?.updated_at.toISOString() ?? null,
        };
  }

  async getCallTranscript(userId: string, callId: string) {
    const call = await this.prisma.booking_call_sessions.findUnique({
      where: { id: callId },
      include: { booking: true, transcript: true },
    });

    if (!call) {
      throw new NotFoundException({
        code: 'CALL_NOT_FOUND',
        message: 'Appel introuvable',
      });
    }

    this.assertBookingParticipant(userId, call.booking);

    return call.transcript
      ? this.mapTranscript(call.transcript)
      : {
          bookingId: call.booking_id,
          callSessionId: call.id,
          provider: this.sessionProvider.getTranscriptProviderName(),
          status: this.resolveTranscriptDisplayStatus(call),
          language: null,
          fullText: null,
          summaryText: null,
          segments: [],
          updatedAt: call.updated_at.toISOString(),
        };
  }

  async recordTranscriptConsent(
    userId: string,
    bookingId: string,
    input: { decision: 'accept' | 'decline' },
  ) {
    const activeCall = await this.getActiveCall(userId, bookingId);
    if (!activeCall.activeCall?.callSessionId) {
      throw new BadRequestException({
        code: 'CALL_NOT_ACTIVE',
        message: 'Aucun appel actif pour cette reservation',
      });
    }
    return this.recordCallTranscriptConsent(userId, activeCall.activeCall.callSessionId, input);
  }

  async recordCallTranscriptConsent(
    userId: string,
    callId: string,
    input: { decision: 'accept' | 'decline' },
  ) {
    const call = await this.prisma.booking_call_sessions.findUnique({
      where: { id: callId },
      include: { booking: true },
    });

    if (!call) {
      throw new NotFoundException({
        code: 'CALL_NOT_FOUND',
        message: 'Appel introuvable',
      });
    }

    this.assertBookingParticipant(userId, call.booking);

    const updated = await this.prisma.booking_call_sessions.update({
      where: { id: call.id },
      data: {
        transcript_consent_status: input.decision === 'accept' ? 'accepted' : 'declined',
        transcript_status: 'not_requested',
        transcript_consented_at: input.decision === 'accept' ? new Date() : null,
        transcript_error_message: null,
      },
    });

    await this.logSessionEvent(call.id, call.booking_id, 'transcript_requested', userId, {
      type:
        input.decision === 'accept'
          ? 'transcript.consent.accepted'
          : 'transcript.consent.declined',
    });

    if (input.decision === 'accept' && updated.status === 'live') {
      await this.maybeStartCallRecording(updated);
    }

    return {
      bookingId: updated.booking_id,
      callSessionId: updated.id,
      transcriptConsentStatus: updated.transcript_consent_status,
      transcriptStatus: updated.transcript_status,
      consentedAt: updated.transcript_consented_at?.toISOString() ?? null,
    };
  }

  async handleVideoWebhook(payload: VideoWebhookPayload) {
    const existingCall = await this.findCallFromWebhook(payload.bookingId, payload.providerRoomId);
    if (!existingCall) {
      return { ok: true, ignored: true };
    }

    const call = await this.ensureCallNotExpired(existingCall);
    const eventType = payload.eventType ?? 'unknown';

    if (call.status === 'missed') {
      await this.logSessionEvent(
        call.id,
        call.booking_id,
        this.mapVideoEventType(eventType),
        payload.participantUserId ?? null,
        {
          eventType,
          ignored: true,
          reason: 'call.missed',
        },
        payload.providerEventId,
      );
      return { ok: true, ignored: true };
    }

    const participantIds = this.getParticipantIdentities(call.participant_identities_json);
    const participantUserId = payload.participantUserId ?? null;
    const data: Record<string, unknown> = {};

    const egressInfo = this.extractEgressInfo(payload.payload);
    switch (eventType) {
      case 'participant_joined': {
        if (participantUserId && !participantIds.includes(participantUserId)) {
          participantIds.push(participantUserId);
        }
        data.participant_identities_json = this.toJsonValue(participantIds);
        data.status = participantIds.length >= 2 ? 'live' : 'waiting';
        if (participantIds.length >= 2 && !call.started_at) {
          data.started_at = new Date();
        }
        break;
      }
      case 'participant_left': {
        const remainingParticipantIds = participantIds.filter((value) => value !== participantUserId);
        data.participant_identities_json = this.toJsonValue(remainingParticipantIds);
        data.status = remainingParticipantIds.length > 0 ? 'waiting' : 'ended';
        data.ended_at = remainingParticipantIds.length === 0 ? new Date() : null;
        break;
      }
      case 'room_started': {
        if (call.status === 'initiated') {
          data.status = 'waiting';
        }
        break;
      }
      case 'room_finished': {
        data.status = 'ended';
        data.ended_at = call.ended_at ?? new Date();
        break;
      }
      default:
        break;
    }

    if (eventType === 'egress_started' && egressInfo?.egressId) {
      data.transcript_capture_status = 'recording';
      data.transcript_capture_provider_id = egressInfo.egressId;
    }

    if (eventType === 'egress_ended') {
      if (egressInfo?.fileResults?.[0]?.location) {
        data.transcript_capture_status = 'uploaded';
        data.transcript_source_url = egressInfo.fileResults[0].location;
        data.transcript_error_message = null;
      } else {
        data.transcript_capture_status = 'failed';
        data.transcript_status = 'failed';
        data.transcript_error_message = 'Capture audio LiveKit indisponible';
      }
    }

    const updated = await this.prisma.booking_call_sessions.update({
      where: { id: call.id },
      data,
    });

    if (
      eventType === 'participant_joined' &&
      updated.status === 'live' &&
      updated.transcript_consent_status === 'accepted'
    ) {
      await this.maybeStartCallRecording(updated);
    }

    if (
      eventType === 'participant_left' &&
      updated.status === 'ended'
    ) {
      await this.terminateCallInfrastructure(updated);
    }

    if (
      eventType === 'egress_ended' &&
      updated.transcript_consent_status === 'accepted' &&
      updated.transcript_capture_status === 'uploaded' &&
      updated.transcript_source_url
    ) {
      await this.queueTranscriptJob(updated);
    }

    await this.logSessionEvent(
      call.id,
      call.booking_id,
      this.mapVideoEventType(eventType),
      participantUserId,
      {
        eventType,
        payload: payload.payload ?? {},
      },
      payload.providerEventId,
    );

    return {
      ok: true,
      status: updated.status,
      transcriptStatus: updated.transcript_status,
    };
  }

  async handleTranscriptWebhook(payload: TranscriptWebhookPayload) {
    const call = await this.findSessionForTranscriptWebhook(payload);
    if (!call) {
      return { ok: true, ignored: true };
    }

    const status = payload.status ?? 'completed';

    await this.prisma.session_transcripts.upsert({
      where: { booking_call_session_id: call.id },
      create: {
        booking_id: call.booking_id,
        booking_call_session_id: call.id,
        provider: this.sessionProvider.getTranscriptProviderName(),
        status,
        language: payload.language ?? null,
        full_text: payload.fullText ?? null,
        summary_text: payload.summaryText ?? null,
        segments_json: this.toJsonValue(payload.segments ?? []),
      },
      update: {
        provider: this.sessionProvider.getTranscriptProviderName(),
        status,
        language: payload.language ?? null,
        full_text: payload.fullText ?? null,
        summary_text: payload.summaryText ?? null,
        segments_json: this.toJsonValue(payload.segments ?? []),
      },
    });

    await this.prisma.booking_call_sessions.update({
      where: { id: call.id },
      data: {
        transcript_status: status,
        transcript_provider_job_id:
          payload.providerJobId ?? call.transcript_provider_job_id ?? null,
        transcript_error_message:
          status === 'failed'
            ? String(payload.payload?.error ?? 'La transcription a echoue')
            : null,
      },
    });

    await this.logSessionEvent(
      call.id,
      call.booking_id,
      status === 'failed' ? 'transcript_failed' : 'transcript_completed',
      null,
      {
        providerJobId: payload.providerJobId ?? null,
        payload: payload.payload ?? {},
      },
      payload.providerEventId,
    );

    const booking = await this.prisma.bookings.findUnique({
      where: { id: call.booking_id },
      select: { student_id: true, mentor_id: true },
    });

    if (status === 'completed' && booking) {
      await Promise.all([
        this.notifications.emitNotification({
          userId: booking.student_id,
          category: 'rdv',
          channel: 'in_app',
          title: 'Transcription disponible',
          message: 'La retranscription de votre session est disponible.',
          payload: { bookingId: call.booking_id, callSessionId: call.id },
        }),
        this.notifications.emitNotification({
          userId: booking.mentor_id,
          category: 'rdv',
          channel: 'in_app',
          title: 'Transcription disponible',
          message: 'La retranscription de votre session est disponible.',
          payload: { bookingId: call.booking_id, callSessionId: call.id },
        }),
      ]);
    }

    return { ok: true, status };
  }

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
      throw new ForbiddenException({ code: 'NOT_PARTICIPANT', message: "Vous n'etes pas participant de cette session" });
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

    if (category === 'visio') {
      const rows = await this.prisma.booking_call_sessions.findMany({
        where: {
          booking: {
            OR: [{ student_id: targetUserId }, { mentor_id: targetUserId }],
            booking_date: { lte: new Date() },
          },
        },
        include: {
          booking: true,
          transcript: true,
        },
        orderBy: { created_at: 'desc' },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = rows.length > limit;
      const pageRows = hasMore ? rows.slice(0, limit) : rows;

      return {
        sessions: pageRows.map(
          (row): SessionHistoryItem => ({
            id: row.id,
            bookingId: row.booking_id,
            callSessionId: row.id,
            callToken: row.call_token,
            userId: targetUserId,
            mentorId: row.booking.mentor_id,
            type: 'visio',
            startedAt: (row.started_at ?? row.created_at).toISOString(),
            endedAt: (row.ended_at ?? row.created_at).toISOString(),
            notes: row.booking.notes,
            status: row.status,
            replayAvailable: row.expires_at > new Date(),
            transcriptStatus:
              row.transcript?.status ?? this.resolveTranscriptDisplayStatus(row),
            transcriptSummary: row.transcript?.summary_text ?? null,
            transcriptConsentStatus: row.transcript_consent_status,
          }),
        ),
        metadata: {
          nextCursor: hasMore ? pageRows[pageRows.length - 1].id : null,
          hasMore,
          limit,
        },
      };
    }

    const rows = await this.prisma.bookings.findMany({
      where: {
        OR: [{ student_id: targetUserId }, { mentor_id: targetUserId }],
        booking_date: { lte: new Date() },
      },
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

  private async getBookingWithSession(userId: string, bookingId: string) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: bookingId },
      include: {
        session: true,
        student: { select: { id: true, first_name: true, last_name: true } },
        mentor: { select: { id: true, first_name: true, last_name: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Session introuvable',
      });
    }

    this.assertBookingParticipant(userId, booking);
    return booking;
  }

  private assertBookingParticipant(
    userId: string,
    booking: { student_id: string; mentor_id: string },
  ) {
    if (booking.student_id !== userId && booking.mentor_id !== userId) {
      throw new ForbiddenException({
        code: 'NOT_BOOKING_PARTICIPANT',
        message: "Vous n'etes pas participant de cette session",
      });
    }
  }

  private assertSessionWindow(booking: {
    booking_date: Date;
    start_time: string;
    end_time: string;
  }) {
    const startAt = this.combineDateAndTime(booking.booking_date, booking.start_time);
    const endAt = this.combineDateAndTime(booking.booking_date, booking.end_time);
    const earliest = new Date(startAt.getTime() - this.accessLeadMinutes * 60 * 1000);
    const latest = new Date(endAt.getTime() + this.accessGraceHours * 60 * 60 * 1000);
    const now = new Date();

    if (now < earliest || now > latest) {
      throw new BadRequestException({
        code: 'SESSION_WINDOW_CLOSED',
        message: 'La salle est accessible uniquement autour du rendez-vous prevu',
      });
    }
  }

  private async ensureSessionRecord(booking: {
    id: string;
    student_id: string;
    mentor_id: string;
    booking_date: Date;
    start_time: string;
    end_time: string;
    status: string;
    student: { first_name: string; last_name: string };
    mentor: { first_name: string; last_name: string };
    session: {
      id: string;
      session_token: string;
      session_url: string;
      provider: string;
      provider_room_id: string | null;
      provider_join_url: string | null;
      status: string;
      transcript_consent_status: string;
      transcript_status: string;
      transcript_capture_status: string;
      transcript_capture_provider_id: string | null;
      transcript_consented_at: Date | null;
      transcript_source_url: string | null;
      transcript_error_message: string | null;
      started_at: Date | null;
      ended_at: Date | null;
      expires_at: Date;
      updated_at: Date;
      transcript_provider_job_id: string | null;
    } | null;
  }) {
    if (booking.status !== 'confirmed' && booking.status !== 'completed') {
      throw new BadRequestException({
        code: 'BOOKING_NOT_CONFIRMED',
        message: 'Le rendez-vous doit etre confirme pour ouvrir la session',
      });
    }

    const sessionToken = booking.session?.session_token ?? randomUUID();
    const expiresAt = new Date(
      this.combineDateAndTime(booking.booking_date, booking.end_time).getTime() +
        this.accessGraceHours * 60 * 60 * 1000,
    );

    if (booking.session) {
      return this.prisma.booking_sessions.update({
        where: { id: booking.session.id },
        data: {
          session_url: `/session/${sessionToken}`,
          expires_at: expiresAt,
          status:
            booking.session.status === 'ended'
              ? 'ended'
              : booking.status === 'completed'
                ? 'ended'
                : 'scheduled',
        },
      });
    }

    const created = await this.prisma.booking_sessions.create({
      data: {
        booking_id: booking.id,
        session_token: sessionToken,
        session_url: `/session/${sessionToken}`,
        provider: 'booking-portal',
        provider_room_id: null,
        provider_join_url: null,
        expires_at: expiresAt,
        status: booking.status === 'completed' ? 'ended' : 'scheduled',
        transcript_consent_status: 'pending',
        transcript_status: 'not_requested',
        transcript_capture_status: 'not_started',
      },
    });

    await this.logSessionEvent(created.id, booking.id, 'room_created', null, {
      provider: 'booking-portal',
    });

    return created;
  }

  private async mapSessionRoom(
    currentUserId: string,
    booking: {
      id: string;
      booking_date: Date;
      start_time: string;
      end_time: string;
      status: string;
      student_id: string;
      mentor_id: string;
      student: { id: string; first_name: string; last_name: string };
      mentor: { id: string; first_name: string; last_name: string };
    },
    session: {
      session_token: string;
      session_url: string;
      status: string;
      expires_at: Date;
    },
    activeCall:
      | {
          id: string;
          booking_id: string;
          call_token: string;
          session_url: string;
          provider: string;
          provider_room_id: string | null;
          provider_join_url: string | null;
          status: string;
          transcript_consent_status: string;
          transcript_status: string;
          transcript_capture_status: string;
          transcript_consented_at: Date | null;
          started_at: Date | null;
          ended_at: Date | null;
          expires_at: Date;
          participant_identities_json: unknown;
          created_at: Date;
          updated_at: Date;
        }
      | null,
  ) {
    return {
      bookingId: booking.id,
      sessionToken: session.session_token,
      sessionUrl: session.session_url,
      roomStatus: session.status,
      bookingStatus: booking.status,
      startsAt: this.combineDateAndTime(booking.booking_date, booking.start_time).toISOString(),
      endsAt: this.combineDateAndTime(booking.booking_date, booking.end_time).toISOString(),
      expiresAt: session.expires_at.toISOString(),
      participants: [
        {
          userId: booking.student.id,
          fullName: `${booking.student.first_name} ${booking.student.last_name}`,
          role: 'etudiant',
        },
        {
          userId: booking.mentor.id,
          fullName: `${booking.mentor.first_name} ${booking.mentor.last_name}`,
          role: 'mentor',
        },
      ],
      activeCall: activeCall
        ? await this.mapCallSession(currentUserId, booking, activeCall)
        : null,
    };
  }

  private async mapCallSession(
    currentUserId: string,
    booking: {
      id: string;
      student_id: string;
      mentor_id: string;
      student: { id: string; first_name: string; last_name: string };
      mentor: { id: string; first_name: string; last_name: string };
    },
    call: {
      id: string;
      booking_id: string;
      call_token: string;
      session_url: string;
      provider: string;
      provider_room_id: string | null;
      provider_join_url: string | null;
      status: string;
      participant_identities_json: unknown;
      started_at: Date | null;
      ended_at: Date | null;
      expires_at: Date;
      transcript_consent_status: string;
      transcript_status: string;
      transcript_capture_status: string;
      transcript_consented_at: Date | null;
      created_at: Date;
      updated_at: Date;
    },
    transcript?:
      | {
          booking_id?: string;
          provider: string;
          status: string;
          language: string | null;
          full_text: string | null;
          summary_text: string | null;
          segments_json: unknown;
          updated_at: Date;
        }
      | null,
  ) {
    const currentParticipant =
      booking.student.id === currentUserId
        ? {
            id: booking.student.id,
            role: 'etudiant' as const,
            fullName: `${booking.student.first_name} ${booking.student.last_name}`,
          }
        : {
            id: booking.mentor.id,
            role: 'mentor' as const,
            fullName: `${booking.mentor.first_name} ${booking.mentor.last_name}`,
          };

    const liveKitToken =
      call.provider_room_id === null || call.transcript_consent_status === 'pending'
        ? null
        : await this.sessionProvider.buildParticipantToken({
            roomId: call.provider_room_id,
            identity: currentParticipant.id,
            displayName: currentParticipant.fullName,
            metadata: {
              bookingId: booking.id,
              callSessionId: call.id,
              role: currentParticipant.role,
            },
          });

    return {
      callSessionId: call.id,
      bookingId: booking.id,
      callToken: call.call_token,
      sessionUrl: call.session_url,
      provider: {
        name: call.provider,
        roomId: call.provider_room_id,
        joinUrl: null,
        serverUrl: call.provider_join_url,
        token: liveKitToken,
      },
      callStatus: call.status,
      startedAt: call.started_at?.toISOString() ?? null,
      endedAt: call.ended_at?.toISOString() ?? null,
      expiresAt: call.expires_at.toISOString(),
      participantIds: this.getParticipantIdentities(call.participant_identities_json),
      transcript: transcript
        ? this.mapTranscript(transcript)
        : {
            bookingId: booking.id,
            callSessionId: call.id,
            provider: this.sessionProvider.getTranscriptProviderName(),
            status: this.resolveTranscriptDisplayStatus(call),
            language: null,
            fullText: null,
            summaryText: null,
            segments: [],
            updatedAt: call.updated_at.toISOString(),
          },
      transcriptConsentRequired: call.transcript_consent_status === 'pending',
      transcriptConsentStatus: call.transcript_consent_status,
      transcriptCaptureStatus: call.transcript_capture_status,
      transcriptConsentedAt: call.transcript_consented_at?.toISOString() ?? null,
    };
  }

  private mapChatMessage(message: {
    id: string;
    booking_id: string;
    author_id: string;
    body: string;
    created_at: Date;
    author: { id: string; first_name: string; last_name: string };
    document: {
      id: string;
      url: string;
      original_name: string;
      file_name: string;
      mime_type: string;
      size_bytes: number;
      created_at: Date;
    } | null;
  }) {
    return {
      messageId: message.id,
      bookingId: message.booking_id,
      authorId: message.author_id,
      authorName: `${message.author.first_name} ${message.author.last_name}`,
      body: message.body,
      createdAt: message.created_at.toISOString(),
      document: message.document ? this.mapSessionDocument(message.document) : null,
    };
  }

  private mapSessionDocument(document: {
    id: string;
    url: string;
    original_name: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
    created_at: Date;
  }) {
    return {
      documentId: document.id,
      url: document.url,
      originalName: document.original_name,
      fileName: document.file_name,
      mimeType: document.mime_type,
      sizeBytes: document.size_bytes,
      createdAt: document.created_at.toISOString(),
    };
  }

  private mapTranscript(transcript: {
    booking_id?: string;
    booking_call_session_id?: string;
    provider: string;
    status: string;
    language: string | null;
    full_text: string | null;
    summary_text: string | null;
    segments_json: unknown;
    updated_at: Date;
  }) {
    return {
      bookingId: transcript.booking_id ?? null,
      callSessionId: transcript.booking_call_session_id ?? null,
      provider: transcript.provider,
      status: transcript.status,
      language: transcript.language,
      fullText: transcript.full_text,
      summaryText: transcript.summary_text,
      segments: Array.isArray(transcript.segments_json)
        ? transcript.segments_json
        : [],
      updatedAt: transcript.updated_at.toISOString(),
    };
  }

  private combineDateAndTime(date: Date, time: string) {
    const [hours, minutes] = time.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  }

  private async findCallFromWebhook(bookingId?: string, providerRoomId?: string) {
    if (providerRoomId) {
      const byRoom = await this.prisma.booking_call_sessions.findFirst({
        where: { provider_room_id: providerRoomId },
      });
      if (byRoom) {
        return byRoom;
      }
    }

    if (bookingId) {
      return this.prisma.booking_call_sessions.findFirst({
        where: {
          booking_id: bookingId,
          status: { in: ['initiated', 'waiting', 'live'] },
        },
        orderBy: { created_at: 'desc' },
      });
    }

    return null;
  }

  private async findSessionForTranscriptWebhook(payload: TranscriptWebhookPayload) {
    if (payload.callSessionId) {
      const byCallId = await this.prisma.booking_call_sessions.findUnique({
        where: { id: payload.callSessionId },
      });
      if (byCallId) {
        return byCallId;
      }
    }

    if (payload.providerJobId) {
      const byJob = await this.prisma.booking_call_sessions.findFirst({
        where: { transcript_provider_job_id: payload.providerJobId },
      });
      if (byJob) {
        return byJob;
      }
    }

    if (payload.providerRoomId) {
      const byRoom = await this.prisma.booking_call_sessions.findFirst({
        where: { provider_room_id: payload.providerRoomId },
      });
      if (byRoom) {
        return byRoom;
      }
    }

    if (payload.bookingId) {
      return this.prisma.booking_call_sessions.findFirst({
        where: { booking_id: payload.bookingId },
        orderBy: { created_at: 'desc' },
      });
    }

    return null;
  }

  private mapVideoEventType(eventType: string) {
    switch (eventType) {
      case 'participant_joined':
        return 'participant_joined';
      case 'participant_left':
        return 'participant_left';
      case 'room_started':
        return 'room_started';
      case 'room_finished':
        return 'room_ended';
      default:
        return 'webhook_received';
    }
  }

  private async getActiveCallForBooking(bookingId: string) {
    const candidates = await this.prisma.booking_call_sessions.findMany({
      where: {
        booking_id: bookingId,
        status: { in: ['initiated', 'waiting', 'live'] },
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    for (const candidate of candidates) {
      const normalized = await this.ensureCallNotExpired(candidate);
      if (['initiated', 'waiting', 'live'].includes(normalized.status)) {
        return normalized;
      }
    }

    return null;
  }

  private async getSyncedActiveCallForBooking(bookingId: string) {
    const activeCall = await this.getActiveCallForBooking(bookingId);
    if (!activeCall) {
      return null;
    }

    return this.syncCallParticipantsWithProvider(activeCall);
  }

  private async ensureCallNotExpired<T extends {
    id: string;
    booking_id: string;
    provider_room_id: string | null;
    status: string;
    created_at: Date;
    ended_at: Date | null;
  }>(call: T): Promise<T> {
    if (!['initiated', 'waiting'].includes(call.status)) {
      return call;
    }

    const deadline = new Date(
      call.created_at.getTime() + this.unansweredCallMinutes * 60 * 1000,
    );
    if (deadline > new Date()) {
      return call;
    }

    const updated = await this.prisma.booking_call_sessions.update({
      where: { id: call.id },
      data: {
        status: 'missed',
        ended_at: call.ended_at ?? new Date(),
      },
    });

    await this.terminateCallInfrastructure(updated);
    await this.logSessionEvent(call.id, call.booking_id, 'room_ended', null, {
      type: 'call.missed',
    });

    return updated as unknown as T;
  }

  private getParticipantIdentities(value: unknown) {
    return Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === 'string')
      : [];
  }

  private async syncCallParticipantsWithProvider<T extends {
    id: string;
    booking_id: string;
    provider_room_id: string | null;
    status: string;
    started_at?: Date | null;
    ended_at?: Date | null;
    participant_identities_json: unknown;
  }>(call: T): Promise<T> {
    if (!call.provider_room_id || !['initiated', 'waiting', 'live'].includes(call.status)) {
      return call;
    }

    try {
      const providerParticipantIds = await this.sessionProvider.listParticipantIdentities(call.provider_room_id);
      const storedParticipantIds = this.getParticipantIdentities(call.participant_identities_json);

      const sameParticipants =
        providerParticipantIds.length === storedParticipantIds.length &&
        providerParticipantIds.every((participantId) => storedParticipantIds.includes(participantId));

      const nextStatus =
        providerParticipantIds.length >= 2
          ? 'live'
          : providerParticipantIds.length === 1
            ? 'waiting'
            : call.status === 'initiated'
              ? 'initiated'
              : 'waiting';

      if (sameParticipants && nextStatus === call.status) {
        return call;
      }

      const updated = await this.prisma.booking_call_sessions.update({
        where: { id: call.id },
        data: {
          participant_identities_json: this.toJsonValue(providerParticipantIds),
          status: nextStatus,
          started_at:
            providerParticipantIds.length >= 2 && !call.started_at
              ? new Date()
              : undefined,
        },
      });

      return updated as unknown as T;
    } catch (error) {
      this.logger.warn(
        `Unable to sync call participants for ${call.id}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return call;
    }
  }

  private async maybeStartCallRecording(call: {
    id: string;
    booking_id: string;
    call_token: string;
    provider_room_id: string | null;
    transcript_capture_status: string;
    transcript_consent_status: string;
  }) {
    if (
      call.transcript_consent_status !== 'accepted' ||
      call.transcript_capture_status !== 'not_started' ||
      !call.provider_room_id
    ) {
      return;
    }

    const objectKey = this.sessionProvider.buildTranscriptObjectKey(
      call.booking_id,
      call.call_token,
    );
    const capture = await this.sessionProvider.startAudioRecording(
      call.provider_room_id,
      objectKey,
    );

    await this.prisma.booking_call_sessions.update({
      where: { id: call.id },
      data: {
        transcript_capture_status: 'recording',
        transcript_capture_provider_id: capture.egressId,
        transcript_source_url: `s3://${process.env.S3_BUCKET}/${objectKey}`,
        transcript_error_message: null,
      },
    });
  }

  private async terminateCallInfrastructure(call: {
    provider_room_id: string | null;
    transcript_capture_provider_id?: string | null;
  }) {
    if (call.transcript_capture_provider_id) {
      try {
        await this.sessionProvider.stopAudioRecording(call.transcript_capture_provider_id);
      } catch (error) {
        this.logger.warn(`Unable to stop egress: ${String(error)}`);
      }
    }

    if (call.provider_room_id) {
      try {
        await this.sessionProvider.endRoom(call.provider_room_id);
      } catch (error) {
        this.logger.warn(`Unable to end room ${call.provider_room_id}: ${String(error)}`);
      }
    }
  }

  private async logSessionEvent(
    callSessionId: string,
    bookingId: string,
    eventType:
      | 'room_created'
      | 'participant_joined'
      | 'participant_left'
      | 'room_started'
      | 'room_ended'
      | 'transcript_requested'
      | 'transcript_completed'
      | 'transcript_failed'
      | 'webhook_received'
      | 'error',
    actorId: string | null,
    payload: Record<string, unknown>,
    providerEventId?: string,
  ) {
    try {
      await this.prisma.session_events.create({
        data: {
          booking_call_session_id: callSessionId,
          booking_id: bookingId,
          actor_id: actorId,
          event_type: eventType,
          payload: this.toJsonValue(payload),
          provider_event_id: providerEventId ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Unable to persist session event ${eventType} for booking ${bookingId}: ${String(error)}`,
      );
    }
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

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private resolveTranscriptStatusForUpdate(session: {
    transcript_consent_status?: string;
    transcript_status: string;
  }): transcript_job_status {
    if (session.transcript_consent_status === 'pending') {
      return 'not_requested';
    }

    return session.transcript_status as transcript_job_status;
  }

  private resolveTranscriptDisplayStatus(
    session:
      | {
          transcript_consent_status?: string;
          transcript_status: string;
        }
      | null
      | undefined,
  ) {
    if (!session) {
      return 'not_requested';
    }
    if (session.transcript_consent_status === 'declined') {
      return 'declined';
    }
    if (session.transcript_consent_status === 'pending') {
      return 'pending_consent';
    }
    return session.transcript_status;
  }

  private extractEgressInfo(payload?: Record<string, unknown>) {
    const egressInfo = payload?.egressInfo;
    if (!egressInfo || typeof egressInfo !== 'object') {
      return null;
    }
    return egressInfo as {
      egressId?: string;
      fileResults?: Array<{ location?: string }>;
    };
  }

  private async queueTranscriptJob(session: {
    id: string;
    booking_id: string;
    provider_room_id: string | null;
    transcript_source_url: string | null;
  }) {
    if (!session.provider_room_id || !session.transcript_source_url) {
      return;
    }

    const jobId = randomUUID();
    const payload: TranscriptJobPayload = {
      jobId,
      bookingId: session.booking_id,
      callSessionId: session.id,
      sourceUrl: session.transcript_source_url,
      providerRoomId: session.provider_room_id,
    };

    await this.transcriptQueue.enqueue(payload);
    await this.prisma.booking_call_sessions.update({
      where: { id: session.id },
      data: {
        transcript_status: 'queued',
        transcript_provider_job_id: jobId,
      },
    });
  }
}
