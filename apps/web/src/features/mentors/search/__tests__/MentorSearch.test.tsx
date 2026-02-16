import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MentorSearch } from '../MentorSearch';

describe('MentorSearch', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
  });

  it('renders mentors from API search endpoint', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            domains: ['informatique'],
            price_ranges: { min: 20, max: 100, presets: [] },
            availabilities: ['available'],
            rating_thresholds: [4],
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
                mentorId: 'mentor-1',
                firstName: 'Alice',
                lastName: 'Martin',
                domain: 'informatique',
                expertiseTags: ['react'],
                hourlyRate: 40,
                rating: 4.8,
                isAvailable: true,
              },
            ],
            metadata: {
              total: 1,
              applied_filters: {},
              next_cursor: null,
            },
          },
          error: null,
        }),
      } as Response);

    await act(async () => {
      render(<MentorSearch accessToken="token-1" />);
    });

    expect(await screen.findByText('Alice Martin')).toBeInTheDocument();
    expect(screen.getByText('1 mentor(s) trouve(s)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir profil' })).toHaveAttribute(
      'href',
      '/mentors/mentor-1',
    );
  });

  it('updates query and calls search endpoint with q parameter', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            domains: [],
            price_ranges: { min: null, max: null, presets: [] },
            availabilities: [],
            rating_thresholds: [],
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            mentors: [],
            metadata: {
              total: 0,
              applied_filters: {},
              next_cursor: null,
            },
          },
          error: null,
        }),
      } as Response);

    render(<MentorSearch accessToken="token-1" />);

    const input = await screen.findByRole('textbox', { name: 'Rechercher un mentor' });
    await userEvent.type(input, 'react');

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      const lastSearchCall = fetchMock.mock.calls
        .map((call) => String(call[0]))
        .filter((url) => url.includes('/mentors/search'))
        .pop();
      expect(lastSearchCall).toContain('q=react');
    });
  });

  it('shows empty state when search returns no results', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            domains: [],
            price_ranges: { min: null, max: null, presets: [] },
            availabilities: [],
            rating_thresholds: [],
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            mentors: [],
            metadata: {
              total: 0,
              applied_filters: {},
              next_cursor: null,
            },
          },
          error: null,
        }),
      } as Response);

    render(<MentorSearch accessToken="token-1" />);

    expect(await screen.findByText('Aucun mentor ne correspond a votre recherche.')).toBeInTheDocument();
  });

  it('opens and closes mobile filter drawer', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            domains: ['informatique'],
            price_ranges: { min: 20, max: 100, presets: [] },
            availabilities: ['available'],
            rating_thresholds: [4],
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            mentors: [],
            metadata: {
              total: 0,
              applied_filters: {},
              next_cursor: null,
            },
          },
          error: null,
        }),
      } as Response);

    render(<MentorSearch accessToken="token-1" />);

    await screen.findByText('Trouver un mentor');
    await userEvent.click(screen.getByRole('button', { name: 'Filtres' }));
    expect(screen.getByRole('heading', { name: 'Filtres' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Filtres' })).not.toBeInTheDocument();
    });
  });
});
