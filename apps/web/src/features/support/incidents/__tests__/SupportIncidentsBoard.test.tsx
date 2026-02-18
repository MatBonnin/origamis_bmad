import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupportIncidentsBoard } from '../SupportIncidentsBoard';

describe('SupportIncidentsBoard', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('loads incidents and updates status', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            incidents: [
              {
                id: 'incident-1',
                sessionId: 'booking-1',
                type: 'visio',
                details: 'Coupure audio',
                status: 'open',
                severity: 'high',
                createdAt: '2026-02-18T10:00:00.000Z',
              },
            ],
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { incident: { id: 'incident-1' } }, error: null }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { incidents: [] }, error: null }),
      } as Response);

    render(<SupportIncidentsBoard accessToken="token" />);

    expect(await screen.findByText('incident-1')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Resolu' }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find((entry) =>
        String(entry[0]).includes('/incidents/incident-1/status'),
      );
      expect(call).toBeDefined();
    });
  });
});
