import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingWizard } from '../OnboardingWizard';

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock('@/app/assets/logo.png', () => ({
  default: '/logo.png',
}));

describe('OnboardingWizard', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('loads onboarding state and autosaves next step progression', async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method || 'GET';

      if (url.includes('/onboarding/me')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              step: 2,
              answers: {
                profileType: 'etudiant',
                domain: 'informatique',
                level: 'intermediaire',
                year: 'M1',
              },
              completed: false,
            },
            error: null,
          }),
        } as Response;
      }

      if (url.includes('/onboarding/step') && method === 'PATCH') {
        return {
          ok: true,
          json: async () => ({
            data: {
              step: 3,
              answers: {
                profileType: 'etudiant',
                domain: 'informatique',
                level: 'intermediaire',
                year: 'M1',
              },
            },
            error: null,
          }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({ data: {}, error: null }),
      } as Response;
    });

    render(<OnboardingWizard accessToken="token-1" />);

    expect(await screen.findByRole('heading', { name: /onboarding etudiant/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /suivant/i }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            String(input).includes('/onboarding/step') && (init?.method || 'GET') === 'PATCH',
        ),
      ).toBe(true);
    });
  });

  it('completes onboarding and redirects to dashboard', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            step: 4,
            answers: {
              profileType: 'etudiant',
              domain: 'informatique',
              level: 'intermediaire',
              year: 'M1',
              objectives: ['progression'],
            },
            completed: false,
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            step: 4,
            answers: {
              profileType: 'etudiant',
              domain: 'informatique',
              level: 'intermediaire',
              year: 'M1',
              objectives: ['progression'],
            },
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { completed: true }, error: null }),
      } as Response);

    render(<OnboardingWizard accessToken="token-2" />);

    expect(await screen.findByRole('button', { name: /terminer/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /terminer/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
  });
});
