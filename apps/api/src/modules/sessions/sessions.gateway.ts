import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SessionsService } from './sessions.service';

interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
  };
}

@WebSocketGateway({ namespace: '/session-room', cors: { origin: '*' } })
export class SessionsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly sessionsService: SessionsService) {}

  emitChatMessageCreated(payload: unknown, bookingId: string) {
    this.server.to(`booking:${bookingId}`).emit('session.chat.created', payload);
  }

  handleConnection(client: AuthenticatedSocket) {
    const handshakeUserId =
      (client.handshake.auth?.userId as string | undefined) ??
      (client.handshake.query.userId as string | undefined);

    if (!handshakeUserId) {
      client.disconnect(true);
      return;
    }

    client.data.userId = handshakeUserId;
  }

  @SubscribeMessage('session.join')
  async handleSessionJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { bookingId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return { ok: false };
    }

    await this.sessionsService.assertSessionParticipant(userId, payload.bookingId);
    client.join(`booking:${payload.bookingId}`);
    return { ok: true };
  }
}
