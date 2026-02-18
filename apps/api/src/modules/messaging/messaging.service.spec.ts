import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications';
import { PrismaService } from '../prisma';
import { MessagingService } from './messaging.service';

describe('MessagingService', () => {
  let service: MessagingService;

  const mockPrismaService = {
    users: {
      findUnique: jest.fn(),
    },
    conversations: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    messages: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    read_status: {
      upsert: jest.fn(),
    },
  };

  const mockNotificationsService = {
    emitNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
    jest.clearAllMocks();
  });

  it('lists conversations for current user', async () => {
    mockPrismaService.users.findUnique.mockResolvedValue({ id: 'student-1' });
    mockPrismaService.conversations.findMany.mockResolvedValue([
      {
        id: 'conv-1',
        student_id: 'student-1',
        mentor_id: 'mentor-1',
        last_message_at: new Date('2026-02-16T10:00:00.000Z'),
        mentor: { id: 'mentor-1', first_name: 'Alice', last_name: 'Martin' },
        student: { id: 'student-1', first_name: 'Nina', last_name: 'Dupont' },
        messages: [
          {
            id: 'msg-1',
            body: 'Bonjour',
            sender_id: 'student-1',
            created_at: new Date('2026-02-16T10:00:00.000Z'),
          },
        ],
        read_statuses: [{ last_read_message_id: null }],
      },
    ]);

    const result = await service.listConversations('student-1');

    expect(result.conversations).toHaveLength(1);
    expect(result.conversations[0].peer.fullName).toBe('Alice Martin');
    expect(result.conversations[0].unreadCount).toBe(1);
  });

  it('returns paginated messages in chronological order', async () => {
    mockPrismaService.conversations.findUnique.mockResolvedValue({
      id: 'conv-1',
      student_id: 'student-1',
      mentor_id: 'mentor-1',
    });
    mockPrismaService.messages.findMany.mockResolvedValue([
      {
        id: 'msg-2',
        conversation_id: 'conv-1',
        sender_id: 'mentor-1',
        receiver_id: 'student-1',
        body: 'Reponse',
        metadata: {},
        client_message_id: null,
        created_at: new Date('2026-02-16T10:01:00.000Z'),
      },
      {
        id: 'msg-1',
        conversation_id: 'conv-1',
        sender_id: 'student-1',
        receiver_id: 'mentor-1',
        body: 'Bonjour',
        metadata: {},
        client_message_id: null,
        created_at: new Date('2026-02-16T10:00:00.000Z'),
      },
    ]);

    const result = await service.getConversationMessages(
      'student-1',
      'conv-1',
      {
        limit: 20,
      },
    );

    expect(result.messages[0].messageId).toBe('msg-1');
    expect(result.messages[1].messageId).toBe('msg-2');
    expect(result.metadata.next_cursor).toBeTruthy();
  });

  it('sends a message and creates conversation when needed', async () => {
    mockPrismaService.users.findUnique
      .mockResolvedValueOnce({
        id: 'student-1',
        first_name: 'Nina',
        last_name: 'Dupont',
        user_roles: [{ role: { name: 'etudiant' } }],
      })
      .mockResolvedValueOnce({
        id: 'mentor-1',
        first_name: 'Alice',
        last_name: 'Martin',
        user_roles: [{ role: { name: 'mentor' } }],
      });

    mockPrismaService.conversations.findUnique.mockResolvedValue(null);
    mockPrismaService.conversations.create.mockResolvedValue({
      id: 'conv-1',
      student_id: 'student-1',
      mentor_id: 'mentor-1',
    });
    mockPrismaService.messages.findFirst.mockResolvedValue(null);
    mockPrismaService.messages.create.mockResolvedValue({
      id: 'msg-1',
      conversation_id: 'conv-1',
      sender_id: 'student-1',
      receiver_id: 'mentor-1',
      body: 'Bonjour mentor',
      metadata: {},
      client_message_id: 'client-1',
      created_at: new Date('2026-02-16T10:00:00.000Z'),
    });
    mockPrismaService.read_status.upsert.mockResolvedValue({
      id: 'rs-1',
      last_read_message_id: 'msg-1',
      updated_at: new Date('2026-02-16T10:00:00.000Z'),
    });
    mockNotificationsService.emitNotification.mockResolvedValue({ sent: true });

    const result = await service.sendMessage('student-1', {
      receiverId: 'mentor-1',
      body: 'Bonjour mentor',
      clientMessageId: 'client-1',
      notifyChannel: 'push',
    });

    expect(result.conversationId).toBe('conv-1');
    expect(result.message.messageId).toBe('msg-1');
    expect(mockNotificationsService.emitNotification).toHaveBeenCalled();
  });

  it('rejects empty body', async () => {
    await expect(
      service.sendMessage('student-1', {
        receiverId: 'mentor-1',
        body: '   ',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects forbidden conversation access', async () => {
    mockPrismaService.conversations.findUnique.mockResolvedValue({
      id: 'conv-1',
      student_id: 'student-2',
      mentor_id: 'mentor-1',
    });

    await expect(
      service.getConversationMessages('student-1', 'conv-1', {}),
    ).rejects.toThrow(ForbiddenException);
  });

  it('fails when conversation does not exist', async () => {
    mockPrismaService.conversations.findUnique.mockResolvedValue(null);

    await expect(
      service.getConversationMessages('student-1', 'unknown', {}),
    ).rejects.toThrow(NotFoundException);
  });
});
