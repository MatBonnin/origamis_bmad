import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MentorRecommendations } from '../MentorRecommendations';

describe('MentorRecommendations', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('renders mentor cards, badge and CTA from API response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          mentors: [
            {
              mentorId: 'mentor-1',
              firstName: 'Alice',
              lastName: 'Martin',
              domain: 'informatique',
              expertiseTags: ['career-guidance', 'networking'],
              hourlyRate: 45,
              rating: 4.7,
              score: 92,
              isRecommended: true,
              cta: 'Voir le mentor',
            },
          ],
          metadata: {
            scoring_signals: ['domain_match'],
            applied_filters: {},
            next_cursor: null,
          },
        },
        error: null,
      }),
    } as Response);

    render(<MentorRecommendations accessToken="token-1" />);

    expect(await screen.findByText('Alice Martin')).toBeInTheDocument();
    expect(screen.getByText('Recommande')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Voir le mentor' }),
    ).toBeInTheDocument();
  });

  it('announces loading and supports pagination action', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            mentors: [
              {
                mentorId: 'mentor-1',
                firstName: 'Alice',
                lastName: 'Martin',
                domain: 'informatique',
                expertiseTags: ['career-guidance'],
                hourlyRate: 45,
                rating: 4.7,
                score: 92,
                isRecommended: true,
                cta: 'Voir le mentor',
              },
            ],
            metadata: {
              scoring_signals: ['domain_match'],
              applied_filters: {},
              next_cursor: 'MQ==',
            },
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            mentors: [
              {
                mentorId: 'mentor-2',
                firstName: 'Nina',
                lastName: 'Dupont',
                domain: 'informatique',
                expertiseTags: ['networking'],
                hourlyRate: 40,
                rating: 4.6,
                score: 88,
                isRecommended: true,
                cta: 'Envoyer un message',
              },
            ],
            metadata: {
              scoring_signals: ['interaction_history'],
              applied_filters: {},
              next_cursor: null,
            },
          },
          error: null,
        }),
      } as Response);

    render(<MentorRecommendations accessToken="token-1" />);

    expect(await screen.findByText('Alice Martin')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Charger plus de mentors' });
    await userEvent.click(button);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('Nina Dupont')).toBeInTheDocument();
    const liveRegion = document.querySelector('p[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
  });

  it('shows accessible error feedback when API fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        data: null,
        error: { message: 'Erreur backend' },
      }),
    } as Response);

    render(<MentorRecommendations accessToken="token-1" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Erreur backend');
  });
});
