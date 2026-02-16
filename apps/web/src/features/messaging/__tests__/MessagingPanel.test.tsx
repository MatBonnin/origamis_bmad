import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessagingPanel } from '../MessagingPanel';

describe('MessagingPanel', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('loads conversation list and current messages', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            conversations: [
              {
                conversationId: 'conv-1',
                peer: { userId: 'mentor-1', fullName: 'Alice Martin', role: 'mentor' },
                lastMessage: {
                  messageId: 'msg-1',
                  body: 'Bonjour',
                  senderId: 'mentor-1',
                  createdAt: '2026-02-16T10:00:00.000Z',
                },
                unreadCount: 1,
                lastMessageAt: '2026-02-16T10:00:00.000Z',
              },
            ],
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            messages: [
              {
                messageId: 'msg-1',
                conversationId: 'conv-1',
                senderId: 'mentor-1',
                receiverId: 'student-1',
                body: 'Bonjour',
                createdAt: '2026-02-16T10:00:00.000Z',
              },
            ],
            metadata: { next_cursor: null },
          },
          error: null,
        }),
      } as Response);

    render(<MessagingPanel accessToken="token-1" currentUserId="student-1" />);

    expect(
      await screen.findByRole('heading', { name: 'Alice Martin' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Bonjour')).toBeInTheDocument();
  });

  it('sends a message with selected push channel', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            conversations: [
              {
                conversationId: 'conv-1',
                peer: { userId: 'mentor-1', fullName: 'Alice Martin', role: 'mentor' },
                lastMessage: null,
                unreadCount: 0,
                lastMessageAt: '2026-02-16T10:00:00.000Z',
              },
            ],
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            messages: [],
            metadata: { next_cursor: null },
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            conversationId: 'conv-1',
            message: {
              messageId: 'msg-2',
              conversationId: 'conv-1',
              senderId: 'student-1',
              receiverId: 'mentor-1',
              body: 'Salut Alice',
              createdAt: '2026-02-16T10:05:00.000Z',
            },
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            conversations: [
              {
                conversationId: 'conv-1',
                peer: { userId: 'mentor-1', fullName: 'Alice Martin', role: 'mentor' },
                lastMessage: {
                  messageId: 'msg-2',
                  body: 'Salut Alice',
                  senderId: 'student-1',
                  createdAt: '2026-02-16T10:05:00.000Z',
                },
                unreadCount: 0,
                lastMessageAt: '2026-02-16T10:05:00.000Z',
              },
            ],
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            messages: [
              {
                messageId: 'msg-2',
                conversationId: 'conv-1',
                senderId: 'student-1',
                receiverId: 'mentor-1',
                body: 'Salut Alice',
                createdAt: '2026-02-16T10:05:00.000Z',
              },
            ],
            metadata: { next_cursor: null },
          },
          error: null,
        }),
      } as Response);

    render(<MessagingPanel accessToken="token-1" currentUserId="student-1" />);

    await screen.findByRole('heading', { name: 'Alice Martin' });
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Canal de notification' }), 'push');
    await userEvent.type(screen.getByRole('textbox', { name: 'Votre message' }), 'Salut Alice');
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        (call) => String(call[0]).endsWith('/messages') && (call[1] as RequestInit)?.method === 'POST',
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse((postCall?.[1] as RequestInit).body as string) as {
        notifyChannel: string;
      };
      expect(body.notifyChannel).toBe('push');
    });
  });

});
