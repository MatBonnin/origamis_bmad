import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MentorSettings } from '../MentorSettings';

describe('MentorSettings', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const existingProfile = {
    mentorId: 'mentor-1',
    fullName: 'Alice Martin',
    bio: 'Mentor frontend',
    bannerUrl: 'https://cdn.origami.app/banner.png',
    about: 'Mentor frontend orientee projets',
    professionalLinks: ['https://www.linkedin.com/in/alice-martin'],
    domain: 'informatique',
    expertiseTags: ['react'],
    supportedLevels: ['intermediaire'],
    languages: ['fr'],
    certifications: ['coach'],
    tariffs: { min: 30, max: 45, currency: 'EUR' },
    availability: {
      isAvailable: true,
      nextAvailableAt: '2026-02-20T09:00:00.000Z',
      slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }],
    },
    isPublished: true,
    updatedAt: '2026-02-16T10:00:00.000Z',
  };

  const okResponse = (data: unknown, status = 200) =>
    ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => ({ data, error: null }),
    }) as Response;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  const getDomainCombobox = () => {
    const domainLabel = screen.getByText('Domaine', { selector: 'span' });
    const container = domainLabel.parentElement;
    if (!container) {
      throw new Error('Domaine container not found');
    }

    const combobox = container.querySelector('[role=\"combobox\"]');
    if (!(combobox instanceof HTMLElement)) {
      throw new Error('Domaine combobox not found');
    }

    return combobox;
  };

  it('loads existing profile and allows patch update', async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.endsWith('/mentors/me') && method === 'GET') {
        return okResponse({ profile: existingProfile });
      }
      if (url.endsWith('/mentors/me') && method === 'PATCH') {
        return okResponse({ profile: existingProfile });
      }

      return okResponse({});
    });

    render(<MentorSettings accessToken="token-1" />);

    expect(await screen.findByRole('heading', { name: 'Mon profil mentor' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Banniere (URL)' })).toHaveValue(
      'https://cdn.origami.app/banner.png',
    );
    expect(screen.getByRole('textbox', { name: 'Liens professionnels' })).toHaveValue(
      'https://www.linkedin.com/in/alice-martin',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Mettre a jour mon profil mentor' }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find((call) =>
        String(call[0]).endsWith('/mentors/me') &&
        typeof call[1] === 'object' &&
        call[1] !== null &&
        'method' in call[1] &&
        (call[1] as RequestInit).method === 'PATCH',
      );
      expect(patchCall).toBeDefined();
    });
  });

  it('creates profile when no existing mentor profile is found', async () => {
    let profileCreated = false;

    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.includes('/references/domains')) {
        return okResponse([{ slug: 'informatique', label: 'Informatique' }]);
      }
      if (url.includes('/references/skills')) {
        return okResponse([{ slug: 'react', label: 'React' }]);
      }
      if (url.endsWith('/mentors/me') && method === 'GET') {
        if (!profileCreated) {
          return {
            ok: false,
            status: 404,
            json: async () => ({
              data: null,
              error: { message: 'Profil mentor introuvable' },
            }),
          } as Response;
        }

        return okResponse({ profile: existingProfile });
      }
      if (url.endsWith('/mentors/me') && method === 'POST') {
        profileCreated = true;
        return okResponse({ profile: existingProfile });
      }

      return okResponse({});
    });

    render(<MentorSettings accessToken="token-1" />);

    await screen.findByRole('heading', { name: 'Mon profil mentor' });

    await userEvent.click(getDomainCombobox());
    await userEvent.click(await screen.findByText('Informatique'));

    await userEvent.click(screen.getByRole('textbox', { name: 'Competences' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Competences' }), 'rea');
    await userEvent.click(await screen.findByText('React'));

    await userEvent.click(screen.getByRole('button', { name: 'Publier mon profil mentor' }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find((call) =>
        String(call[0]).endsWith('/mentors/me') &&
        typeof call[1] === 'object' &&
        call[1] !== null &&
        'method' in call[1] &&
        (call[1] as RequestInit).method === 'POST',
      );
      expect(postCall).toBeDefined();
    });
  });

  it('shows validation error when tariff range is invalid', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes('/references/domains')) {
        return okResponse([{ slug: 'informatique', label: 'Informatique' }]);
      }
      if (url.includes('/references/skills')) {
        return okResponse([{ slug: 'react', label: 'React' }]);
      }
      if (url.endsWith('/mentors/me')) {
        return {
          ok: false,
          status: 404,
          json: async () => ({
            data: null,
            error: { message: 'Profil mentor introuvable' },
          }),
        } as Response;
      }

      return okResponse({});
    });

    render(<MentorSettings accessToken="token-1" />);

    await screen.findByRole('heading', { name: 'Mon profil mentor' });

    await userEvent.click(getDomainCombobox());
    await userEvent.click(await screen.findByText('Informatique'));

    await userEvent.click(screen.getByRole('textbox', { name: 'Competences' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Competences' }), 'rea');
    await userEvent.click(await screen.findByText('React'));

    const minInput = screen.getByRole('spinbutton', { name: 'Tarif min (EUR/h)' });
    const maxInput = screen.getByRole('spinbutton', { name: 'Tarif max (EUR/h)' });
    await userEvent.clear(minInput);
    await userEvent.type(minInput, '50');
    await userEvent.clear(maxInput);
    await userEvent.type(maxInput, '40');

    await userEvent.click(screen.getByRole('button', { name: 'Publier mon profil mentor' }));

    expect(
      await screen.findByText('Le tarif minimum doit etre strictement inferieur au maximum'),
    ).toBeInTheDocument();
  });
});
