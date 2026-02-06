import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationPreferencesForm } from '../NotificationPreferencesForm';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('NotificationPreferencesForm', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('loads preferences and saves updated values with success feedback', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            preferences: [
              { channel: 'email', category: 'messages', enabled: true },
              { channel: 'push', category: 'messages', enabled: false },
            ],
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            preferences: [
              { channel: 'email', category: 'messages', enabled: false },
              { channel: 'push', category: 'messages', enabled: false },
            ],
          },
          error: null,
        }),
      } as Response);

    render(<NotificationPreferencesForm accessToken="token-1" />);

    expect(
      await screen.findByText('Preferences de notifications'),
    ).toBeInTheDocument();

    const emailMessagesToggle = screen.getByRole('checkbox', {
      name: 'messages-email',
    });
    await userEvent.click(emailMessagesToggle);
    await userEvent.click(screen.getByRole('button', { name: /enregistrer mes preferences/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const patchCall = fetchMock.mock.calls[1];
    expect(patchCall[0]).toContain('/users/me/notification-preferences');
    expect(patchCall[1]).toMatchObject({ method: 'PATCH' });

    expect(
      await screen.findByText('Preferences enregistrees avec succes'),
    ).toBeInTheDocument();
  });
});
