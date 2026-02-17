import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications';
import { PrismaService } from '../prisma';
import { MessagingService } from './messaging.service';

describe('MessagingService – mentor flows', () => {
  let service: MessagingService;

  const mockPrisma = {
    users: { findUnique: jest.fn() },
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
    read_status: { upsert: jest.fn() },
  };

  const mockNotifications = { emitNotification: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
    jest.clearAllMocks();
  });

  it('sends a message from mentor to student', async () => {
    mockPrisma.users.findUnique
      .mockResolvedValueOnce({
        id: 'mentor-1',
        first_name: 'Alice',
        last_name: 'Martin',
        user_roles: [{ role: { name: 'mentor' } }],
      })
      .mockResolvedValueOnce({
        id: 'student-1',
        first_name: 'Nina',
        last_name: 'Dupont',
        user_roles: [{ role: { name: 'etudiant' } }],
      });

    mockPrisma.conversations.findUnique.mockResolvedValue({
      id: 'conv-1',
      mentor_id: 'mentor-1',
      student_id: 'student-1',
    });
    mockPrisma.messages.findFirst.mockResolvedValue(null);
    mockPrisma.messages.create.mockResolvedValue({
      id: 'msg-1',
      conversation_id: 'conv-1',
      sender_id: 'mentor-1',
      receiver_id: 'student-1',
      body: 'Bonjour Nina',
      metadata: {},
      client_message_id: 'mentor-1-1',
      created_at: new Date('2026-02-17T10:00:00.000Z'),
    });
    mockPrisma.read_status.upsert.mockResolvedValue({
      id: 'rs-1',
      last_read_message_id: 'msg-1',
      updated_at: new Date(),
    });
    mockNotifications.emitNotification.mockResolvedValue({ sent: true });

    const result = await service.sendMessage('mentor-1', {
      receiverId: 'student-1',
      body: 'Bonjour Nina',
      clientMessageId: 'mentor-1-1',
      notifyChannel: 'in_app',
    });

    expect(result.conversationId).toBe('conv-1');
    expect(result.message.senderId).toBe('mentor-1');
    expect(result.message.receiverId).toBe('student-1');
    expect(mockNotifications.emitNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'student-1' }),
    );
  });

  it('rejects mentor-to-mentor messaging', async () => {
    mockPrisma.users.findUnique
      .mockResolvedValueOnce({
        id: 'mentor-1',
        first_name: 'Alice',
        last_name: 'Martin',
        user_roles: [{ role: { name: 'mentor' } }],
      })
      .mockResolvedValueOnce({
        id: 'mentor-2',
        first_name: 'Bob',
        last_name: 'Leroy',
        user_roles: [{ role: { name: 'mentor' } }],
      });

    await expect(
      service.sendMessage('mentor-1', {
        receiverId: 'mentor-2',
        body: 'Salut collegue',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lists conversations where mentor is a participant', async () => {
    mockPrisma.users.findUnique.mockResolvedValue({ id: 'mentor-1' });
    mockPrisma.conversations.findMany.mockResolvedValue([
      {
        id: 'conv-1',
        student_id: 'student-1',
        mentor_id: 'mentor-1',
        last_message_at: new Date('2026-02-17T10:00:00.000Z'),
        mentor: { id: 'mentor-1', first_name: 'Alice', last_name: 'Martin' },
        student: { id: 'student-1', first_name: 'Nina', last_name: 'Dupont' },
        messages: [
          {
            id: 'msg-1',
            body: 'Question',
            sender_id: 'student-1',
            created_at: new Date('2026-02-17T10:00:00.000Z'),
          },
        ],
        read_statuses: [{ last_read_message_id: null }],
      },
    ]);

    const result = await service.listConversations('mentor-1');

    expect(result.conversations).toHaveLength(1);
    expect(result.conversations[0].peer.fullName).toBe('Nina Dupont');
    expect(result.conversations[0].peer.role).toBe('etudiant');
    expect(result.conversations[0].unreadCount).toBe(1);
  });

  it('allows mentor to read conversation messages', async () => {
    mockPrisma.conversations.findUnique.mockResolvedValue({
      id: 'conv-1',
      student_id: 'student-1',
      mentor_id: 'mentor-1',
    });
    mockPrisma.messages.findMany.mockResolvedValue([
      {
        id: 'msg-1',
        conversation_id: 'conv-1',
        sender_id: 'student-1',
        receiver_id: 'mentor-1',
        body: 'Question',
        metadata: {},
        client_message_id: null,
        created_at: new Date('2026-02-17T10:00:00.000Z'),
      },
    ]);

    const result = await service.getConversationMessages('mentor-1', 'conv-1', { limit: 20 });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].senderId).toBe('student-1');
  });

  it('creates conversation when mentor messages student for first time', async () => {
    mockPrisma.users.findUnique
      .mockResolvedValueOnce({
        id: 'mentor-1',
        first_name: 'Alice',
        last_name: 'Martin',
        user_roles: [{ role: { name: 'mentor' } }],
      })
      .mockResolvedValueOnce({
        id: 'student-2',
        first_name: 'Marc',
        last_name: 'Duval',
        user_roles: [{ role: { name: 'etudiant' } }],
      });

    mockPrisma.conversations.findUnique.mockResolvedValue(null);
    mockPrisma.conversations.create.mockResolvedValue({
      id: 'conv-new',
      mentor_id: 'mentor-1',
      student_id: 'student-2',
    });
    mockPrisma.messages.findFirst.mockResolvedValue(null);
    mockPrisma.messages.create.mockResolvedValue({
      id: 'msg-new',
      conversation_id: 'conv-new',
      sender_id: 'mentor-1',
      receiver_id: 'student-2',
      body: 'Bienvenue',
      metadata: {},
      client_message_id: null,
      created_at: new Date('2026-02-17T11:00:00.000Z'),
    });
    mockPrisma.read_status.upsert.mockResolvedValue({
      id: 'rs-new',
      last_read_message_id: 'msg-new',
      updated_at: new Date(),
    });
    mockNotifications.emitNotification.mockResolvedValue({ sent: true });

    const result = await service.sendMessage('mentor-1', {
      receiverId: 'student-2',
      body: 'Bienvenue',
    });

    expect(result.conversationId).toBe('conv-new');
    expect(mockPrisma.conversations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mentor_id: 'mentor-1',
          student_id: 'student-2',
        }),
      }),
    );
  });

  it('rejects empty body from mentor', async () => {
    await expect(
      service.sendMessage('mentor-1', {
        receiverId: 'student-1',
        body: '   ',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
