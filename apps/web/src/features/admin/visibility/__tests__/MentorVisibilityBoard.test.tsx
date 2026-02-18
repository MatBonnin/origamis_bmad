import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MentorVisibilityBoard } from '../MentorVisibilityBoard';

describe('MentorVisibilityBoard', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('prompt', vi.fn(() => ''));
  });

  it('loads visibility rules and updates one mentor', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            visibilityRules: [
              {
                mentorId: 'mentor-1',
                domain: 'informatique',
                status: 'visible',
                effectiveFrom: null,
                notes: '',
              },
            ],
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { mentor: { mentorId: 'mentor-1', visibility: 'priority' } },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { visibilityRules: [] }, error: null }),
      } as Response);

    render(<MentorVisibilityBoard accessToken="token" />);

    expect(await screen.findByText('mentor-1')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Visibilite mentor-1'), 'priority');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find((entry) =>
        String(entry[0]).includes('/mentors/mentor-1/visibility'),
      );
      expect(call).toBeDefined();
    });
  });
});
