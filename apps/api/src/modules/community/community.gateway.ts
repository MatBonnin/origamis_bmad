import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/community', cors: { origin: '*' } })
export class CommunityGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    void client.join('community:feed');
  }

  emitPostCreated(payload: unknown) {
    this.server.to('community:feed').emit('community.post.created', payload);
  }

  emitReplyCreated(payload: unknown) {
    this.server.to('community:feed').emit('community.reply.created', payload);
  }

  @SubscribeMessage('community.ping')
  onPing(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    client.emit('community.pong', body ?? { ok: true });
  }
}
