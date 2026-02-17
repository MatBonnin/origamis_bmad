import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationsService } from './notifications.service';

interface AuthenticatedSocket extends Socket {
  data: { userId?: string };
}

@WebSocketGateway({ namespace: '/notifications', cors: { origin: '*' } })
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly notificationsService: NotificationsService) {}

  afterInit() {
    this.notificationsService.registerWsEmitter(
      (userId: string, notification: unknown) => {
        this.server
          .to(`user:${userId}`)
          .emit('notification.push', notification);
      },
    );
  }

  handleConnection(client: AuthenticatedSocket) {
    const userId =
      (client.handshake.auth?.userId as string | undefined) ??
      (client.handshake.query.userId as string | undefined);

    if (!userId) {
      client.disconnect(true);
      return;
    }

    client.data.userId = userId;
    client.join(`user:${userId}`);
  }
}
