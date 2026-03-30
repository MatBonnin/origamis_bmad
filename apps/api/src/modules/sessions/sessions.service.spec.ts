import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications';
import { PrismaService } from '../prisma';
import { SessionProviderService } from './session-provider.service';
import { SessionsService } from './sessions.service';
import { TranscriptQueueService } from './transcript-queue.service';

describe('SessionsService', () => {
  let service: SessionsService;

  const mockPrisma = {
    bookings: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    conversations: {
      findMany: jest.fn(),
    },
    consents: {
      findFirst: jest.fn(),
    },
    booking_sessions: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    session_transcripts: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    session_chat_messages: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    session_documents: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    session_events: {
      create: jest.fn(),
    },
    session_notes: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    session_feedback: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    student_program_milestones: {
      findUnique: jest.fn(),
    },
  };
  const mockNotifications = {
    emitNotification: jest.fn(),
  };
  const mockTranscriptQueue = {
    enqueue: jest.fn(),
  };
  const mockProvider = {
    getVideoProviderName: jest.fn(() => 'livekit'),
    getTranscriptProviderName: jest.fn(() => 'faster-whisper'),
    buildRoomId: jest.fn((bookingId: string) => `booking-${bookingId}`),
    getLiveKitServerUrl: jest.fn(() => 'wss://origami.livekit.cloud'),
    buildParticipantToken: jest.fn(() => 'lk-token'),
    ensureRoom: jest.fn(),
    endRoom: jest.fn(),
    buildTranscriptObjectKey: jest.fn(() => 'transcripts/booking-1/session.mp3'),
    startAudioRecording: jest.fn().mockResolvedValue({ egressId: 'egress-1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: SessionProviderService, useValue: mockProvider },
        { provide: TranscriptQueueService, useValue: mockTranscriptQueue },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    jest.clearAllMocks();
    mockPrisma.consents.findFirst.mockResolvedValue(null);
  });

  it('blocks access when user_id does not match authenticated user', async () => {
    await expect(
      service.getHistory('user-1', { userId: 'user-2' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns empty history when RGPD anonymization is active', async () => {
    mockPrisma.consents.findFirst.mockResolvedValue({
      user_id: 'user-1',
      withdrawn_at: new Date('2026-01-10T10:00:00.000Z'),
    });

    const result = await service.getHistory('user-1', { category: 'rdv' });

    expect(result.sessions).toEqual([]);
    expect('rgpdRestricted' in result.metadata && result.metadata.rgpdRestricted).toBe(true);
  });

  it('supports rdv filter and cursor pagination', async () => {
    mockPrisma.bookings.findMany.mockResolvedValue([
      {
        id: 'b-2',
        student_id: 'user-1',
        mentor_id: 'mentor-1',
        booking_date: new Date('2026-01-10T10:00:00.000Z'),
        start_time: '10:00',
        end_time: '10:30',
        status: 'completed',
        notes: null,
        session: null,
      },
      {
        id: 'b-1',
        student_id: 'user-1',
        mentor_id: 'mentor-1',
        booking_date: new Date('2026-01-09T10:00:00.000Z'),
        start_time: '10:00',
        end_time: '10:30',
        status: 'completed',
        notes: null,
        session: null,
      },
    ]);

    const result = await service.getHistory('user-1', {
      userId: 'user-1',
      category: 'rdv',
      cursor: 'b-2',
      limit: 1,
    });

    expect(mockPrisma.bookings.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 2,
        cursor: { id: 'b-2' },
        skip: 1,
      }),
    );

    expect(result.sessions).toHaveLength(1);
    expect(result.metadata.hasMore).toBe(true);
    expect(result.metadata.nextCursor).toBe('b-2');
  });

  it('supports message category filter', async () => {
    mockPrisma.conversations.findMany.mockResolvedValue([
      {
        id: 'c-1',
        mentor_id: 'mentor-1',
        student_id: 'user-1',
        last_message_at: new Date('2026-01-10T10:00:00.000Z'),
      },
    ]);

    const result = await service.getHistory('user-1', {
      category: 'message',
      limit: 10,
    });

    expect(result.sessions[0].type).toBe('message');
    expect(result.metadata.hasMore).toBe(false);
  });

  it('supports visio category filter via booking session relation', async () => {
    mockPrisma.bookings.findMany.mockResolvedValue([
      {
        id: 'b-visio-1',
        student_id: 'user-1',
        mentor_id: 'mentor-1',
        booking_date: new Date('2026-01-08T10:00:00.000Z'),
        status: 'completed',
        notes: null,
        session: {
          id: 'session-1',
          expires_at: new Date('2099-01-01T00:00:00.000Z'),
        },
      },
    ]);

    const result = await service.getHistory('user-1', {
      category: 'visio',
      limit: 10,
    });

    expect(mockPrisma.bookings.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          session: { isNot: null },
        }),
      }),
    );
    expect(result.sessions[0].type).toBe('visio');
    expect(result.sessions[0].replayAvailable).toBe(true);
  });

  it('uses rdv by default when category is omitted', async () => {
    mockPrisma.bookings.findMany.mockResolvedValue([]);

    await service.getHistory('user-1', {});

    expect(mockPrisma.bookings.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.conversations.findMany).not.toHaveBeenCalled();
  });

  it('caps limit between 1 and 50', async () => {
    mockPrisma.bookings.findMany.mockResolvedValue([]);

    await service.getHistory('user-1', { limit: 0 });
    expect(mockPrisma.bookings.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 2 }),
    );

    await service.getHistory('user-1', { limit: 999 });
    expect(mockPrisma.bookings.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 51 }),
    );
  });

  it('returns replay link for participant when not expired', async () => {
    mockPrisma.bookings.findUnique.mockResolvedValue({
      id: 'booking-1',
      student_id: 'user-1',
      mentor_id: 'mentor-1',
      session: {
        session_url: '/replay/booking-1',
        expires_at: new Date('2099-01-01T00:00:00.000Z'),
      },
    });

    const result = await service.getReplayLink('user-1', 'booking-1');

    expect(result).toEqual({ url: '/replay/booking-1' });
  });

  it('throws when replay is expired', async () => {
    mockPrisma.bookings.findUnique.mockResolvedValue({
      id: 'booking-1',
      student_id: 'user-1',
      mentor_id: 'mentor-1',
      session: {
        session_url: '/replay/booking-1',
        expires_at: new Date('2000-01-01T00:00:00.000Z'),
      },
    });

    await expect(service.getReplayLink('user-1', 'booking-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('exports history as csv data URL', async () => {
    mockPrisma.bookings.findMany.mockResolvedValue([
      {
        id: 'b-1',
        student_id: 'user-1',
        mentor_id: 'mentor-1',
        booking_date: new Date('2026-01-09T10:00:00.000Z'),
        status: 'completed',
        notes: null,
        session: null,
      },
    ]);

    const result = await service.exportHistory('user-1', {
      userId: 'user-1',
      category: 'rdv',
      format: 'csv',
    });

    expect(result.exportUrl.startsWith('data:text/csv')).toBe(true);
    expect(result.export_url).toBe(result.exportUrl);
  });

  it('terminates a live room and marks the booking as completed', async () => {
    mockPrisma.bookings.findUnique.mockResolvedValue({
      id: 'booking-1',
      student_id: 'user-1',
      mentor_id: 'mentor-1',
      booking_date: new Date('2026-01-09T10:00:00.000Z'),
      start_time: '10:00',
      end_time: '10:30',
      status: 'confirmed',
      student: { id: 'user-1', first_name: 'Ada', last_name: 'Lovelace' },
      mentor: { id: 'mentor-1', first_name: 'Alan', last_name: 'Turing' },
      session: {
        id: 'session-1',
        session_token: 'token-1',
        session_url: '/session/token-1',
        provider: 'livekit',
        provider_room_id: 'booking-booking-1',
        provider_join_url: 'wss://origami.livekit.cloud',
        status: 'live',
        transcript_consent_status: 'accepted',
        transcript_status: 'not_requested',
        transcript_capture_status: 'recording',
        transcript_capture_provider_id: 'egress-1',
        transcript_consented_at: new Date('2026-01-09T09:59:00.000Z'),
        transcript_source_url: 's3://bucket/transcripts/booking-1/session.mp3',
        transcript_error_message: null,
        started_at: new Date('2026-01-09T10:00:00.000Z'),
        ended_at: null,
        expires_at: new Date('2026-01-09T22:30:00.000Z'),
        updated_at: new Date('2026-01-09T10:01:00.000Z'),
        transcript_provider_job_id: null,
      },
    });
    mockPrisma.booking_sessions.update
      .mockResolvedValueOnce({
        id: 'session-1',
        session_token: 'token-1',
        session_url: '/session/token-1',
        provider: 'livekit',
        provider_room_id: 'booking-booking-1',
        provider_join_url: 'wss://origami.livekit.cloud',
        status: 'waiting',
        transcript_consent_status: 'accepted',
        transcript_status: 'not_requested',
        transcript_capture_status: 'recording',
        transcript_capture_provider_id: 'egress-1',
        transcript_consented_at: new Date('2026-01-09T09:59:00.000Z'),
        transcript_source_url: 's3://bucket/transcripts/booking-1/session.mp3',
        transcript_error_message: null,
        started_at: new Date('2026-01-09T10:00:00.000Z'),
        ended_at: null,
        expires_at: new Date('2026-01-09T22:30:00.000Z'),
        updated_at: new Date('2026-01-09T10:01:30.000Z'),
        transcript_provider_job_id: null,
      })
      .mockResolvedValueOnce({
        status: 'ended',
        ended_at: new Date('2026-01-09T10:20:00.000Z'),
        transcript_status: 'not_requested',
      });

    const result = await service.terminateRoom('user-1', 'booking-1');

    expect(mockProvider.endRoom).toHaveBeenCalledWith('booking-booking-1');
    expect(mockPrisma.booking_sessions.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: 'session-1' },
        data: expect.objectContaining({ status: 'ended' }),
      }),
    );
    expect(mockPrisma.bookings.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { status: 'completed' },
    });
    expect(result.status).toBe('ended');
  });

  it('does not call the provider again when the room is already ended', async () => {
    mockPrisma.bookings.findUnique.mockResolvedValue({
      id: 'booking-1',
      student_id: 'user-1',
      mentor_id: 'mentor-1',
      booking_date: new Date('2026-01-09T10:00:00.000Z'),
      start_time: '10:00',
      end_time: '10:30',
      status: 'completed',
      student: { id: 'user-1', first_name: 'Ada', last_name: 'Lovelace' },
      mentor: { id: 'mentor-1', first_name: 'Alan', last_name: 'Turing' },
      session: {
        id: 'session-1',
        session_token: 'token-1',
        session_url: '/session/token-1',
        provider: 'livekit',
        provider_room_id: 'booking-booking-1',
        provider_join_url: 'wss://origami.livekit.cloud',
        status: 'ended',
        transcript_consent_status: 'accepted',
        transcript_status: 'queued',
        transcript_capture_status: 'uploaded',
        transcript_capture_provider_id: 'egress-1',
        transcript_consented_at: new Date('2026-01-09T09:59:00.000Z'),
        transcript_source_url: 's3://bucket/transcripts/booking-1/session.mp3',
        transcript_error_message: null,
        started_at: new Date('2026-01-09T10:00:00.000Z'),
        ended_at: new Date('2026-01-09T10:20:00.000Z'),
        expires_at: new Date('2026-01-09T22:30:00.000Z'),
        updated_at: new Date('2026-01-09T10:21:00.000Z'),
        transcript_provider_job_id: 'job-1',
      },
    });

    mockPrisma.booking_sessions.update.mockResolvedValueOnce({
      id: 'session-1',
      session_token: 'token-1',
      session_url: '/session/token-1',
      provider: 'livekit',
      provider_room_id: 'booking-booking-1',
      provider_join_url: 'wss://origami.livekit.cloud',
      status: 'ended',
      transcript_consent_status: 'accepted',
      transcript_status: 'queued',
      transcript_capture_status: 'uploaded',
      transcript_capture_provider_id: 'egress-1',
      transcript_consented_at: new Date('2026-01-09T09:59:00.000Z'),
      transcript_source_url: 's3://bucket/transcripts/booking-1/session.mp3',
      transcript_error_message: null,
      started_at: new Date('2026-01-09T10:00:00.000Z'),
      ended_at: new Date('2026-01-09T10:20:00.000Z'),
      expires_at: new Date('2026-01-09T22:30:00.000Z'),
      updated_at: new Date('2026-01-09T10:21:00.000Z'),
      transcript_provider_job_id: 'job-1',
    });

    const result = await service.terminateRoom('user-1', 'booking-1');

    expect(mockProvider.endRoom).not.toHaveBeenCalled();
    expect(mockPrisma.booking_sessions.update).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('ended');
    expect(result.transcriptStatus).toBe('queued');
  });
});
