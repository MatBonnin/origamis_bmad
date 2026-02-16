import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';

describe('MessagingController', () => {
  const mockMessagingService = {
    listConversations: jest.fn(),
    getConversationMessages: jest.fn(),
    sendMessage: jest.fn(),
  };

  let controller: MessagingController;

  beforeEach(() => {
    controller = new MessagingController(
      mockMessagingService as unknown as MessagingService,
    );
    jest.clearAllMocks();
  });

  it('returns conversations with envelope', async () => {
    mockMessagingService.listConversations.mockResolvedValue({
      conversations: [{ conversationId: 'conv-1' }],
    });

    await expect(
      controller.getConversations({ id: 'student-1' } as never),
    ).resolves.toEqual({
      data: { conversations: [{ conversationId: 'conv-1' }] },
      error: null,
    });

    expect(mockMessagingService.listConversations).toHaveBeenCalledWith(
      'student-1',
    );
  });

  it('returns paginated conversation messages with envelope', async () => {
    mockMessagingService.getConversationMessages.mockResolvedValue({
      messages: [{ messageId: 'msg-1' }],
      metadata: { next_cursor: null },
    });

    await expect(
      controller.getConversationMessages(
        { id: 'student-1' } as never,
        'conv-1',
        { cursor: 'abc', limit: 10 },
      ),
    ).resolves.toEqual({
      data: {
        messages: [{ messageId: 'msg-1' }],
        metadata: { next_cursor: null },
      },
      error: null,
    });

    expect(mockMessagingService.getConversationMessages).toHaveBeenCalledWith(
      'student-1',
      'conv-1',
      { cursor: 'abc', limit: 10 },
    );
  });

  it('sends message with envelope', async () => {
    mockMessagingService.sendMessage.mockResolvedValue({
      conversationId: 'conv-1',
      message: { messageId: 'msg-1' },
    });

    await expect(
      controller.sendMessage(
        { id: 'student-1' } as never,
        { receiverId: 'mentor-1', body: 'Salut mentor' },
      ),
    ).resolves.toEqual({
      data: {
        conversationId: 'conv-1',
        message: { messageId: 'msg-1' },
      },
      error: null,
    });

    expect(mockMessagingService.sendMessage).toHaveBeenCalledWith('student-1', {
      receiverId: 'mentor-1',
      body: 'Salut mentor',
    });
  });
});
