import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModerationDashboard } from '../ModerationDashboard';

describe('ModerationDashboard', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('prompt', vi.fn(() => 'Violation charte'));
  });

  it('loads pending reports and applies action', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            reports: [
              {
                id: 'report-1',
                targetType: 'post',
                targetId: 'post-1',
                reason: 'Spam',
                status: 'new',
                createdAt: '2026-02-11T09:00:00.000Z',
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
            action: { reportId: 'report-1', actionType: 'hide' },
            audit: { entity: 'report' },
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { reports: [] }, error: null }),
      } as Response);

    render(<ModerationDashboard accessToken="token" />);

    expect(await screen.findByText('report-1')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Masquer' }));

    await waitFor(() => {
      const actionCall = fetchMock.mock.calls.find((call) =>
        String(call[0]).includes('/reports/report-1/actions'),
      );
      expect(actionCall).toBeDefined();
    });
  });
});
