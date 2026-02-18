import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsDashboard } from '../AnalyticsDashboard';

describe('AnalyticsDashboard', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('loads metrics and generates csv report', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { metrics: { users: 12, bookings: 8 } }, error: null }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { reportId: 'report-1' }, error: null }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { report: { downloadUrl: 'data:text/csv;base64,abc' } }, error: null }),
      } as Response);

    render(<AnalyticsDashboard accessToken="token" />);

    expect(await screen.findByText('users')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

    await waitFor(() => {
      const reportCall = fetchMock.mock.calls.find((entry) =>
        String(entry[0]).includes('/analytics/reports/report-1'),
      );
      expect(reportCall).toBeDefined();
    });
  });
});
