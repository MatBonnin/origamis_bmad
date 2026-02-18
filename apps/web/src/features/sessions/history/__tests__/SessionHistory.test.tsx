import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionHistory } from '../SessionHistory';

describe('SessionHistory', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('renders merged timeline entries on all filter', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { sessions: [{ id: 'm-1', type: 'message', startedAt: '2026-01-10T10:00:00.000Z', endedAt: '2026-01-10T10:00:00.000Z', mentorId: 'mentor-1', status: 'completed', notes: null }] }, error: null }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { sessions: [{ id: 'b-1', type: 'rdv', startedAt: '2026-01-09T10:00:00.000Z', endedAt: '2026-01-09T10:00:00.000Z', mentorId: 'mentor-1', status: 'completed', notes: null }] }, error: null }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { sessions: [] }, error: null }),
      } as Response);

    render(<SessionHistory accessToken="token" userId="user-1" />);

    expect(await screen.findByText('Messages')).toBeInTheDocument();
    expect(screen.getAllByText('RDV').length).toBeGreaterThan(0);
  });

  it('loads filtered type when clicking Visio', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { sessions: [] }, error: null }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { sessions: [] }, error: null }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { sessions: [] }, error: null }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { sessions: [{ id: 'v-1', type: 'visio', startedAt: '2026-01-11T10:00:00.000Z', endedAt: '2026-01-11T10:00:00.000Z', mentorId: 'mentor-1', status: 'completed', notes: null, replayAvailable: true }] }, error: null }),
      } as Response);

    render(<SessionHistory accessToken="token" userId="user-1" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Visio' }));

    await waitFor(() => {
      const visioCall = fetchMock.mock.calls.find((call) =>
        String(call[0]).includes('category=visio'),
      );
      expect(visioCall).toBeDefined();
    });
  });

  it('requests csv export', async () => {
    const windowOpenSpy = vi.fn();
    vi.stubGlobal('open', windowOpenSpy);

    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { sessions: [] }, error: null }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { sessions: [] }, error: null }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { sessions: [] }, error: null }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { exportUrl: 'data:text/csv;base64,Zm9v' }, error: null }),
      } as Response);

    render(<SessionHistory accessToken="token" userId="user-1" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Export CSV' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/history/export'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
    expect(windowOpenSpy).toHaveBeenCalledWith(
      'data:text/csv;base64,Zm9v',
      '_blank',
      'noopener,noreferrer',
    );
  });
});
