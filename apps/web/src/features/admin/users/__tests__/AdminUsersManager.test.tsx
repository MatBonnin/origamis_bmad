import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminUsersManager } from '../AdminUsersManager';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('AdminUsersManager', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('allows admin to update another user roles and shows success feedback', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            users: [
              {
                id: 'user-2',
                email: 'mentor@example.com',
                firstName: 'Alice',
                lastName: 'Mentor',
                roles: ['etudiant'],
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
            user: {
              id: 'user-2',
              email: 'mentor@example.com',
              firstName: 'Alice',
              lastName: 'Mentor',
              roles: ['etudiant', 'mentor'],
            },
          },
          error: null,
        }),
      } as Response);

    render(<AdminUsersManager accessToken="token-1" currentUserId="admin-1" />);

    expect(await screen.findByText('Alice Mentor')).toBeInTheDocument();

    const mentorCheckbox = screen.getByRole('checkbox', { name: 'mentor' });
    await userEvent.click(mentorCheckbox);
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const secondCall = fetchMock.mock.calls[1];
    expect(secondCall[0]).toContain('/admin/users/user-2/roles');
    expect(secondCall[1]).toMatchObject({ method: 'PATCH' });
    expect(String((secondCall[1] as RequestInit).body)).toContain('mentor');

    expect(
      await screen.findByText('Roles de Alice Mentor mis a jour'),
    ).toBeInTheDocument();
  });
});
