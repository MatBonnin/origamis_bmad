import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MentorProfile } from '../MentorProfile';

describe('MentorProfile', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('renders mentor profile details and reviews', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          mentor: {
            mentorId: 'mentor-1',
            fullName: 'Alice Martin',
            bio: 'Mentor frontend',
            avatarUrl: null,
            domain: 'informatique',
            expertiseTags: ['react', 'typescript'],
            supportedLevels: ['intermediaire'],
            hourlyRate: 45,
          },
          reviews: [
            {
              reviewId: 'r1',
              rating: 4.6,
              comment: 'Super session.',
              author: 'Nina Dupont',
              source: 'session',
              createdAt: '2026-02-10T10:00:00.000Z',
            },
          ],
          availability: {
            isAvailable: true,
            nextAvailableAt: null,
          },
          rating: {
            average: 4.6,
            reviewCount: 1,
          },
        },
        error: null,
      }),
    } as Response);

    render(<MentorProfile accessToken="token-1" mentorId="mentor-1" />);

    expect(await screen.findByRole('heading', { name: 'Alice Martin' })).toBeInTheDocument();
    expect(screen.getByText('Mentor frontend')).toBeInTheDocument();
    expect(screen.getByText('Nina Dupont')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contacter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prendre RDV' })).toBeInTheDocument();
  });

  it('shows loading then empty review fallback with aria-live', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          mentor: {
            mentorId: 'mentor-1',
            fullName: 'Alice Martin',
            bio: 'Mentor frontend',
            avatarUrl: null,
            domain: 'informatique',
            expertiseTags: [],
            supportedLevels: [],
            hourlyRate: null,
          },
          reviews: [],
          availability: {
            isAvailable: false,
            nextAvailableAt: null,
          },
          rating: {
            average: 4.2,
            reviewCount: 0,
          },
        },
        error: null,
      }),
    } as Response);

    render(<MentorProfile accessToken="token-1" mentorId="mentor-1" />);

    expect(screen.getByText('Chargement du profil...')).toBeInTheDocument();
    expect(await screen.findByText('Aucun avis disponible pour le moment.')).toBeInTheDocument();
  });

  it('shows alert when API fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        data: null,
        error: { message: 'Profil introuvable' },
      }),
    } as Response);

    render(<MentorProfile accessToken="token-1" mentorId="missing" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Profil introuvable');
  });

  it('submits a new review and refreshes profile', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            mentor: {
              mentorId: 'mentor-1',
              fullName: 'Alice Martin',
              bio: 'Mentor frontend',
              avatarUrl: null,
              domain: 'informatique',
              expertiseTags: ['react'],
              supportedLevels: ['intermediaire'],
              hourlyRate: 45,
            },
            reviews: [],
            availability: { isAvailable: true, nextAvailableAt: null },
            rating: { average: 4.2, reviewCount: 0 },
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { review: { reviewId: 'review-1' } },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            mentor: {
              mentorId: 'mentor-1',
              fullName: 'Alice Martin',
              bio: 'Mentor frontend',
              avatarUrl: null,
              domain: 'informatique',
              expertiseTags: ['react'],
              supportedLevels: ['intermediaire'],
              hourlyRate: 45,
            },
            reviews: [
              {
                reviewId: 'review-1',
                rating: 5,
                comment: 'Excellent mentor',
                author: 'student-1',
                source: 'feedback',
                createdAt: '2026-02-12T10:00:00.000Z',
              },
            ],
            availability: { isAvailable: true, nextAvailableAt: null },
            rating: { average: 4.8, reviewCount: 1 },
          },
          error: null,
        }),
      } as Response);

    render(<MentorProfile accessToken="token-1" mentorId="mentor-1" />);

    expect(await screen.findByRole('heading', { name: 'Alice Martin' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Rediger un avis'), 'Excellent mentor');
    await userEvent.click(screen.getByRole('button', { name: 'Publier mon avis' }));

    await waitFor(() => {
      const reviewCall = fetchMock.mock.calls.find((call) =>
        String(call[0]).includes('/mentors/mentor-1/reviews'),
      );
      expect(reviewCall).toBeDefined();
    });
  });
});
