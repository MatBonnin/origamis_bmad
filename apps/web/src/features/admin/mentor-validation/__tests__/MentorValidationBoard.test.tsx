import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MentorValidationBoard } from '../MentorValidationBoard';

describe('MentorValidationBoard', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('prompt', vi.fn(() => 'Profil conforme'));
  });

  it('loads pending mentors and validates one profile', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            mentors: [
              {
                mentorId: 'mentor-1',
                fullName: 'Alice Martin',
                email: 'alice@example.com',
                domain: 'informatique',
                status: 'pending_review',
                notes: '',
                updatedAt: '2026-02-12T10:00:00.000Z',
              },
            ],
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { mentor: { mentorId: 'mentor-1', status: 'validated' } },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { mentors: [] }, error: null }),
      } as Response);

    render(<MentorValidationBoard accessToken="token" />);

    expect(await screen.findByRole('heading', { name: 'Alice Martin' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Valider' }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find((entry) =>
        String(entry[0]).includes('/mentors/mentor-1/validate'),
      );
      expect(call).toBeDefined();
    });
  });
});
