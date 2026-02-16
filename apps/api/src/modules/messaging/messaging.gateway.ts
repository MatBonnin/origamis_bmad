import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SendMessageDto } from './dto';
import { MessagingService } from './messaging.service';

interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
  };
}

@WebSocketGateway({ namespace: '/messages', cors: { origin: '*' } })
export class MessagingGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly messagingService: MessagingService) {}

  handleConnection(client: AuthenticatedSocket) {
    const handshakeUserId =
      (client.handshake.auth?.userId as string | undefined) ??
      (client.handshake.query.userId as string | undefined);

    if (!handshakeUserId) {
      client.disconnect(true);
      return;
    }

    client.data.userId = handshakeUserId;
    client.join(`user:${handshakeUserId}`);
  }

  @SubscribeMessage('message.send')
  async handleMessageSend(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SendMessageDto,
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return;
    }

    const result = await this.messagingService.sendMessage(userId, payload);

    this.server.to(`user:${result.message.receiverId}`).emit('message.received', result);
    this.server.to(`user:${result.message.senderId}`).emit('message.new', result);

    return result;
  }

  @SubscribeMessage('message.read')
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string; lastReadMessageId?: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return;
    }

    const result = await this.messagingService.markConversationRead(
      userId,
      payload.conversationId,
      payload.lastReadMessageId,
    );

    this.server.to(`user:${userId}`).emit('message.read', result);
    return result;
  }

  @SubscribeMessage('message.typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: { conversationId: string; toUserId: string; isTyping: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return;
    }

    this.server.to(`user:${payload.toUserId}`).emit('message.typing', {
      conversationId: payload.conversationId,
      fromUserId: userId,
      isTyping: payload.isTyping,
    });

    return {
      ok: true,
    };
  }
}
