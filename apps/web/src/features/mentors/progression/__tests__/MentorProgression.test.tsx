import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MentorProgression } from '../MentorProgression';

describe('MentorProgression', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('loads mentor insights and milestones', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            milestones: [
              {
                id: 'booking:b-1',
                title: 'Rendez-vous mentorat',
                type: 'rdv',
                status: 'review',
                dueAt: '2026-02-12T10:00:00.000Z',
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
            insights: {
              studentId: 'student-1',
              completionRate: 45,
              overdueCount: 1,
              reviewPending: 1,
              riskLevel: 'medium',
              notes: 'Surveiller la progression cette semaine.',
            },
          },
          error: null,
        }),
      } as Response);

    render(<MentorProgression accessToken="token" studentId="student-1" />);

    expect(await screen.findByText('Insights')).toBeInTheDocument();
    expect(screen.getByText('Rendez-vous mentorat')).toBeInTheDocument();
  });

  it('reviews milestone from review state', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            milestones: [
              {
                id: 'booking:b-1',
                title: 'Rendez-vous mentorat',
                type: 'rdv',
                status: 'review',
                dueAt: '2026-02-12T10:00:00.000Z',
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
            insights: {
              studentId: 'student-1',
              completionRate: 45,
              overdueCount: 1,
              reviewPending: 1,
              riskLevel: 'medium',
              notes: 'Surveiller la progression cette semaine.',
            },
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            milestone: { id: 'booking:b-1', status: 'done' },
            review: { milestoneId: 'booking:b-1', approved: true },
          },
          error: null,
        }),
      } as Response);

    render(<MentorProgression accessToken="token" studentId="student-1" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Valider' }));

    await waitFor(() => {
      const reviewCall = fetchMock.mock.calls.find(
        (call) =>
          String(call[0]).includes('/milestones/booking:b-1/review') &&
          String((call[1] as RequestInit).method) === 'POST',
      );
      expect(reviewCall).toBeDefined();
    });
  });
});
