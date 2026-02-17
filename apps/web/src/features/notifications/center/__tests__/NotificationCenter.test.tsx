import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationCenter } from '../NotificationCenter';

describe('NotificationCenter', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  const mockNotifications = (notifications: unknown[]) => ({
    ok: true,
    json: async () => ({ data: { notifications }, error: null }),
  }) as Response;

  const mockUnreadCount = (count: number) => ({
    ok: true,
    json: async () => ({ data: { unreadCount: count }, error: null }),
  }) as Response;

  it('loads and displays notifications with unread badge', async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockNotifications([
          {
            notificationId: 'n-1',
            category: 'messages',
            channel: 'in_app',
            title: 'Nouveau message',
            message: 'De Alice Martin',
            payload: {},
            readAt: null,
            createdAt: '2026-02-17T10:00:00.000Z',
          },
        ]),
      )
      .mockResolvedValueOnce(mockUnreadCount(1));

    render(<NotificationCenter accessToken="token-1" />);

    expect(await screen.findByText('Nouveau message')).toBeInTheDocument();
    expect(screen.getByText('De Alice Martin')).toBeInTheDocument();
    expect(screen.getByLabelText('1 non lues')).toBeInTheDocument();
  });

  it('marks notification as read', async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockNotifications([
          {
            notificationId: 'n-1',
            category: 'messages',
            channel: 'in_app',
            title: 'Nouveau message',
            message: 'De Alice',
            payload: {},
            readAt: null,
            createdAt: '2026-02-17T10:00:00.000Z',
          },
        ]),
      )
      .mockResolvedValueOnce(mockUnreadCount(1))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { success: true }, error: null }),
      } as Response);

    render(<NotificationCenter accessToken="token-1" />);

    await screen.findByText('Nouveau message');
    await userEvent.click(screen.getByRole('button', { name: 'Marquer comme lu' }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        (call) => String(call[0]).includes('/notifications/n-1/read'),
      );
      expect(patchCall).toBeDefined();
    });
  });

  it('filters by category', async () => {
    fetchMock
      .mockResolvedValueOnce(mockNotifications([]))
      .mockResolvedValueOnce(mockUnreadCount(0))
      .mockResolvedValueOnce(mockNotifications([]))
      .mockResolvedValueOnce(mockUnreadCount(0));

    render(<NotificationCenter accessToken="token-1" />);

    await screen.findByText('Aucune notification.');
    await userEvent.click(screen.getByRole('button', { name: 'Rendez-vous' }));

    await waitFor(() => {
      const rdvCall = fetchMock.mock.calls.find(
        (call) => String(call[0]).includes('category=rdv'),
      );
      expect(rdvCall).toBeDefined();
    });
  });

  it('shows empty state', async () => {
    fetchMock
      .mockResolvedValueOnce(mockNotifications([]))
      .mockResolvedValueOnce(mockUnreadCount(0));

    render(<NotificationCenter accessToken="token-1" />);

    expect(await screen.findByText('Aucune notification.')).toBeInTheDocument();
  });

  it('shows error on network failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    render(<NotificationCenter accessToken="token-1" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Erreur de connexion au serveur');
  });
});
