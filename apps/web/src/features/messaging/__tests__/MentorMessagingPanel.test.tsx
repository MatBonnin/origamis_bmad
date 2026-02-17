import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock socket.io-client
const mockEmit = vi.fn();
const mockOn = vi.fn();
const mockDisconnect = vi.fn();

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: mockOn,
    emit: mockEmit,
    disconnect: mockDisconnect,
  })),
}));

import { MentorMessagingPanel } from '../MentorMessagingPanel';

describe('MentorMessagingPanel', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  const mockConversations = (conversations: unknown[]) => ({
    ok: true,
    json: async () => ({
      data: { conversations },
      error: null,
    }),
  }) as Response;

  const mockMessages = (messages: unknown[], nextCursor: string | null = null) => ({
    ok: true,
    json: async () => ({
      data: { messages, metadata: { next_cursor: nextCursor } },
      error: null,
    }),
  }) as Response;

  it('loads student conversation list with unread badges', async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockConversations([
          {
            conversationId: 'conv-1',
            peer: { userId: 'student-1', fullName: 'Nina Dupont', role: 'etudiant' },
            lastMessage: {
              messageId: 'msg-1',
              body: 'Bonjour mentor',
              senderId: 'student-1',
              createdAt: '2026-02-17T10:00:00.000Z',
            },
            unreadCount: 1,
            lastMessageAt: '2026-02-17T10:00:00.000Z',
          },
        ]),
      )
      .mockResolvedValueOnce(
        mockMessages([
          {
            messageId: 'msg-1',
            conversationId: 'conv-1',
            senderId: 'student-1',
            receiverId: 'mentor-1',
            body: 'Bonjour mentor',
            createdAt: '2026-02-17T10:00:00.000Z',
          },
        ]),
      );

    render(<MentorMessagingPanel accessToken="token-mentor" currentUserId="mentor-1" />);

    const names = await screen.findAllByText('Nina Dupont');
    expect(names.length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText('Bonjour mentor')).toBeInTheDocument();
    expect(screen.getByLabelText('1 message non lu')).toBeInTheDocument();
  });

  it('sends a message from mentor to student', async () => {
    // 1. load conversations
    fetchMock.mockResolvedValueOnce(
      mockConversations([
        {
          conversationId: 'conv-1',
          peer: { userId: 'student-1', fullName: 'Nina Dupont', role: 'etudiant' },
          lastMessage: null,
          unreadCount: 0,
          lastMessageAt: '2026-02-17T10:00:00.000Z',
        },
      ]),
    );
    // 2. load messages for selected conversation
    fetchMock.mockResolvedValueOnce(mockMessages([]));
    // 3. POST /messages
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          conversationId: 'conv-1',
          message: {
            messageId: 'msg-2',
            conversationId: 'conv-1',
            senderId: 'mentor-1',
            receiverId: 'student-1',
            body: 'Bonjour Nina',
            createdAt: '2026-02-17T10:05:00.000Z',
          },
        },
        error: null,
      }),
    } as Response);
    // 4. reload conversations after send
    fetchMock.mockResolvedValue(
      mockConversations([
        {
          conversationId: 'conv-1',
          peer: { userId: 'student-1', fullName: 'Nina Dupont', role: 'etudiant' },
          lastMessage: {
            messageId: 'msg-2',
            body: 'Bonjour Nina',
            senderId: 'mentor-1',
            createdAt: '2026-02-17T10:05:00.000Z',
          },
          unreadCount: 0,
          lastMessageAt: '2026-02-17T10:05:00.000Z',
        },
      ]),
    );

    render(<MentorMessagingPanel accessToken="token-mentor" currentUserId="mentor-1" />);

    await screen.findAllByText('Nina Dupont');
    await userEvent.type(screen.getByRole('textbox', { name: 'Votre message' }), 'Bonjour Nina');
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        (call) => String(call[0]).endsWith('/messages') && (call[1] as RequestInit)?.method === 'POST',
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse((postCall?.[1] as RequestInit).body as string) as {
        receiverId: string;
        body: string;
      };
      expect(body.receiverId).toBe('student-1');
      expect(body.body).toBe('Bonjour Nina');
    });
  });

  it('displays mentor-specific header text', async () => {
    fetchMock.mockResolvedValue(mockConversations([]));

    render(<MentorMessagingPanel accessToken="token-mentor" currentUserId="mentor-1" />);

    expect(await screen.findByText('Echangez avec vos etudiants.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Etudiants' })).toBeInTheDocument();
  });

  it('shows error state on network failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    render(<MentorMessagingPanel accessToken="token-mentor" currentUserId="mentor-1" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Erreur de connexion au serveur');
  });

  it('shows empty state when no conversations', async () => {
    fetchMock.mockResolvedValue(mockConversations([]));

    render(<MentorMessagingPanel accessToken="token-mentor" currentUserId="mentor-1" />);

    expect(
      await screen.findByText('Aucune conversation pour le moment.'),
    ).toBeInTheDocument();
  });
});
