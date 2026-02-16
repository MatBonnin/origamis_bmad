import { MessagingGateway } from './messaging.gateway';
import { MessagingService } from './messaging.service';

describe('MessagingGateway', () => {
  const mockMessagingService = {
    sendMessage: jest.fn(),
    markConversationRead: jest.fn(),
  };

  const makeSocket = (userId?: string) =>
    ({
      data: {},
      handshake: {
        auth: userId ? { userId } : {},
        query: {},
      },
      join: jest.fn(),
      disconnect: jest.fn(),
    }) as never;

  let gateway: MessagingGateway;

  beforeEach(() => {
    gateway = new MessagingGateway(
      mockMessagingService as unknown as MessagingService,
    );
    gateway.server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    } as never;
    jest.clearAllMocks();
  });

  it('joins user room on connection when user id is present', () => {
    const socket = makeSocket('student-1');

    gateway.handleConnection(socket);

    expect(socket.data.userId).toBe('student-1');
    expect(socket.join).toHaveBeenCalledWith('user:student-1');
  });

  it('disconnects socket when user id is absent', () => {
    const socket = makeSocket();

    gateway.handleConnection(socket);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('handles message.send and emits message events', async () => {
    const socket = makeSocket('student-1');
    gateway.handleConnection(socket);

    mockMessagingService.sendMessage.mockResolvedValue({
      conversationId: 'conv-1',
      message: {
        messageId: 'msg-1',
        senderId: 'student-1',
        receiverId: 'mentor-1',
      },
    });

    const response = await gateway.handleMessageSend(socket, {
      receiverId: 'mentor-1',
      body: 'hello',
    });

    expect(mockMessagingService.sendMessage).toHaveBeenCalledWith('student-1', {
      receiverId: 'mentor-1',
      body: 'hello',
    });
    expect(response).toEqual({
      conversationId: 'conv-1',
      message: {
        messageId: 'msg-1',
        senderId: 'student-1',
        receiverId: 'mentor-1',
      },
    });
  });

  it('handles message.read and delegates to service', async () => {
    const socket = makeSocket('student-1');
    gateway.handleConnection(socket);

    mockMessagingService.markConversationRead.mockResolvedValue({
      conversationId: 'conv-1',
      userId: 'student-1',
      lastReadMessageId: 'msg-1',
      updatedAt: '2026-02-16T10:00:00.000Z',
    });

    const response = await gateway.handleMessageRead(socket, {
      conversationId: 'conv-1',
      lastReadMessageId: 'msg-1',
    });

    expect(mockMessagingService.markConversationRead).toHaveBeenCalledWith(
      'student-1',
      'conv-1',
      'msg-1',
    );
    expect(response).toHaveProperty('conversationId', 'conv-1');
  });
});
