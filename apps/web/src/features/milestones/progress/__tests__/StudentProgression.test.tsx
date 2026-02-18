import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentProgression } from '../StudentProgression';

describe('StudentProgression', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('loads milestones and metadata', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          milestones: [
            {
              id: 'booking:b-1',
              type: 'rdv',
              status: 'in-progress',
              title: 'Rendez-vous mentorat',
              dueAt: '2026-02-10T10:00:00.000Z',
              notes: null,
            },
          ],
          metadata: {
            total: 1,
            totalCompleted: 0,
            totalPending: 1,
            completionRate: 0,
          },
        },
        error: null,
      }),
    } as Response);

    render(<StudentProgression accessToken="token" userId="student-1" />);

    expect(await screen.findByText('Rendez-vous mentorat')).toBeInTheDocument();
    expect(screen.getByText('0/1 jalons termines')).toBeInTheDocument();
  });

  it('filters by visio', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { milestones: [], metadata: { total: 0, totalCompleted: 0, totalPending: 0, completionRate: 0 } }, error: null }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { milestones: [], metadata: { total: 0, totalCompleted: 0, totalPending: 0, completionRate: 0 } }, error: null }),
      } as Response);

    render(<StudentProgression accessToken="token" userId="student-1" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Visio' }));

    await waitFor(() => {
      const hasVisioCall = fetchMock.mock.calls.some((call) =>
        String(call[0]).includes('type=visio'),
      );
      expect(hasVisioCall).toBe(true);
    });
  });

  it('requests milestone completion with confirmation', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            milestones: [
              {
                id: 'booking:b-1',
                type: 'rdv',
                status: 'in-progress',
                title: 'Rendez-vous mentorat',
                dueAt: '2026-02-10T10:00:00.000Z',
                notes: null,
              },
            ],
            metadata: { total: 1, totalCompleted: 0, totalPending: 1, completionRate: 0 },
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            milestone: { id: 'booking:b-1', status: 'review' },
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            milestones: [
              {
                id: 'booking:b-1',
                type: 'rdv',
                status: 'review',
                title: 'Rendez-vous mentorat',
                dueAt: '2026-02-10T10:00:00.000Z',
                notes: null,
              },
            ],
            metadata: { total: 1, totalCompleted: 0, totalPending: 1, completionRate: 0 },
          },
          error: null,
        }),
      } as Response);

    render(<StudentProgression accessToken="token" userId="student-1" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Marquer termine' }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        (call) =>
          String(call[0]).includes('/milestones/booking:b-1/status') &&
          String((call[1] as RequestInit).method) === 'PATCH',
      );
      expect(patchCall).toBeDefined();
    });
  });
});
