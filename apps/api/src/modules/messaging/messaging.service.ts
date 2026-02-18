import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsService } from '../notifications';
import { PrismaService } from '../prisma';
import { SendMessageDto } from './dto';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

interface MessageCursor {
  createdAt: string;
  id: string;
}

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listConversations(userId: string) {
    await this.assertUserExists(userId);

    const conversations = await this.prisma.conversations.findMany({
      where: {
        OR: [{ student_id: userId }, { mentor_id: userId }],
      },
      include: {
        student: { select: { id: true, first_name: true, last_name: true } },
        mentor: { select: { id: true, first_name: true, last_name: true } },
        messages: {
          take: 1,
          orderBy: { created_at: 'desc' },
        },
        read_statuses: {
          where: { user_id: userId },
          select: { last_read_message_id: true },
        },
      },
      orderBy: { last_message_at: 'desc' },
    });

    return {
      conversations: conversations.map((conversation) => {
        const peer =
          conversation.student_id === userId
            ? conversation.mentor
            : conversation.student;
        const lastMessage = conversation.messages[0] ?? null;
        const lastReadMessageId =
          conversation.read_statuses[0]?.last_read_message_id ?? null;

        return {
          conversationId: conversation.id,
          peer: {
            userId: peer.id,
            fullName: `${peer.first_name} ${peer.last_name}`,
            role: conversation.student_id === userId ? 'mentor' : 'etudiant',
          },
          lastMessage: lastMessage
            ? {
                messageId: lastMessage.id,
                body: lastMessage.body,
                senderId: lastMessage.sender_id,
                createdAt: lastMessage.created_at.toISOString(),
              }
            : null,
          unreadCount:
            lastMessage && lastMessage.id !== lastReadMessageId ? 1 : 0,
          lastMessageAt: conversation.last_message_at.toISOString(),
        };
      }),
    };
  }

  async getConversationMessages(
    userId: string,
    conversationId: string,
    input: { cursor?: string; limit?: number },
  ) {
    const conversation = await this.assertConversationAccess(
      userId,
      conversationId,
    );

    const limit = Math.max(
      1,
      Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT),
    );
    const cursor = this.decodeCursor(input.cursor);

    const messages = await this.prisma.messages.findMany({
      where: {
        conversation_id: conversation.id,
        ...(cursor
          ? {
              OR: [
                { created_at: { lt: new Date(cursor.createdAt) } },
                {
                  created_at: new Date(cursor.createdAt),
                  id: { lt: cursor.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: limit,
    });

    const ordered = [...messages].reverse();
    const nextSource = messages[messages.length - 1];

    return {
      messages: ordered.map((message) => this.mapMessage(message)),
      metadata: {
        next_cursor: nextSource
          ? this.encodeCursor({
              createdAt: nextSource.created_at.toISOString(),
              id: nextSource.id,
            })
          : null,
      },
    };
  }

  async sendMessage(userId: string, dto: SendMessageDto) {
    const normalizedBody = dto.body.trim();
    if (!normalizedBody) {
      throw new BadRequestException({
        code: 'MESSAGE_BODY_REQUIRED',
        message: 'Le contenu du message est requis',
      });
    }

    if (dto.receiverId === userId) {
      throw new BadRequestException({
        code: 'INVALID_RECEIVER',
        message: 'Vous ne pouvez pas vous envoyer un message',
      });
    }

    const sender = await this.loadUserWithRoles(userId);
    const receiver = await this.loadUserWithRoles(dto.receiverId);

    const isSenderStudent = sender.user_roles.some(
      (entry) => entry.role.name === 'etudiant',
    );
    const isSenderMentor = sender.user_roles.some(
      (entry) => entry.role.name === 'mentor',
    );

    const isReceiverStudent = receiver.user_roles.some(
      (entry) => entry.role.name === 'etudiant',
    );
    const isReceiverMentor = receiver.user_roles.some(
      (entry) => entry.role.name === 'mentor',
    );

    if (
      (isSenderStudent && !isReceiverMentor) ||
      (isSenderMentor && !isReceiverStudent)
    ) {
      throw new ForbiddenException({
        code: 'MESSAGING_ROLE_MISMATCH',
        message:
          'Seuls les echanges etudiant/mentor sont autorises dans cette conversation',
      });
    }

    const studentId = isSenderStudent ? sender.id : receiver.id;
    const mentorId = isSenderMentor ? sender.id : receiver.id;

    let conversation = await this.prisma.conversations.findUnique({
      where: {
        mentor_id_student_id: {
          mentor_id: mentorId,
          student_id: studentId,
        },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversations.create({
        data: {
          mentor_id: mentorId,
          student_id: studentId,
          last_message_at: new Date(),
        },
      });
    }

    if (dto.clientMessageId) {
      const duplicated = await this.prisma.messages.findFirst({
        where: {
          conversation_id: conversation.id,
          sender_id: sender.id,
          client_message_id: dto.clientMessageId,
        },
      });

      if (duplicated) {
        return {
          message: this.mapMessage(duplicated),
          conversationId: conversation.id,
        };
      }
    }

    const message = await this.prisma.messages.create({
      data: {
        conversation_id: conversation.id,
        sender_id: sender.id,
        receiver_id: receiver.id,
        body: normalizedBody,
        client_message_id: dto.clientMessageId,
        metadata: {
          notifyChannel: dto.notifyChannel ?? 'in_app',
        },
      },
    });

    await this.prisma.conversations.update({
      where: { id: conversation.id },
      data: { last_message_at: message.created_at },
    });

    await this.prisma.read_status.upsert({
      where: {
        conversation_id_user_id: {
          conversation_id: conversation.id,
          user_id: sender.id,
        },
      },
      create: {
        conversation_id: conversation.id,
        user_id: sender.id,
        last_read_message_id: message.id,
      },
      update: {
        last_read_message_id: message.id,
      },
    });

    await this.notificationsService.emitNotification({
      userId: receiver.id,
      channel: dto.notifyChannel ?? 'in_app',
      category: 'messages',
      title: 'Nouveau message',
      message: `Nouveau message de ${sender.first_name} ${sender.last_name}`,
    });

    return {
      conversationId: conversation.id,
      message: this.mapMessage(message),
    };
  }

  async markConversationRead(
    userId: string,
    conversationId: string,
    lastReadMessageId?: string,
  ) {
    await this.assertConversationAccess(userId, conversationId);

    if (lastReadMessageId) {
      const message = await this.prisma.messages.findUnique({
        where: { id: lastReadMessageId },
      });
      if (!message || message.conversation_id !== conversationId) {
        throw new BadRequestException({
          code: 'INVALID_LAST_READ_MESSAGE',
          message: 'lastReadMessageId ne correspond pas a la conversation',
        });
      }
    }

    const readStatus = await this.prisma.read_status.upsert({
      where: {
        conversation_id_user_id: {
          conversation_id: conversationId,
          user_id: userId,
        },
      },
      create: {
        conversation_id: conversationId,
        user_id: userId,
        last_read_message_id: lastReadMessageId,
      },
      update: {
        last_read_message_id: lastReadMessageId,
      },
    });

    return {
      conversationId,
      userId,
      lastReadMessageId: readStatus.last_read_message_id,
      updatedAt: readStatus.updated_at.toISOString(),
    };
  }

  private async assertConversationAccess(
    userId: string,
    conversationId: string,
  ) {
    const conversation = await this.prisma.conversations.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException({
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Conversation introuvable',
      });
    }

    if (
      conversation.student_id !== userId &&
      conversation.mentor_id !== userId
    ) {
      throw new ForbiddenException({
        code: 'CONVERSATION_FORBIDDEN',
        message: 'Acces refuse a cette conversation',
      });
    }

    return conversation;
  }

  private mapMessage(message: {
    id: string;
    conversation_id: string;
    sender_id: string;
    receiver_id: string;
    body: string;
    metadata: unknown;
    client_message_id: string | null;
    created_at: Date;
  }) {
    return {
      messageId: message.id,
      conversationId: message.conversation_id,
      senderId: message.sender_id,
      receiverId: message.receiver_id,
      body: message.body,
      metadata: message.metadata,
      clientMessageId: message.client_message_id,
      createdAt: message.created_at.toISOString(),
    };
  }

  private encodeCursor(cursor: MessageCursor): string {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
  }

  private decodeCursor(cursor?: string): MessageCursor | null {
    if (!cursor) {
      return null;
    }

    try {
      const parsed = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as MessageCursor;
      if (!parsed.createdAt || !parsed.id) {
        return null;
      }
      return parsed;
    } catch {
      throw new BadRequestException({
        code: 'INVALID_CURSOR',
        message: 'Cursor de pagination invalide',
      });
    }
  }

  private async loadUserWithRoles(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        user_roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouve',
      });
    }

    return user;
  }

  private async assertUserExists(userId: string): Promise<void> {
    const exists = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouve',
      });
    }
  }
}
