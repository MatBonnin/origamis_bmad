import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MentorSettings } from '../MentorSettings';

describe('MentorSettings', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('loads existing profile and allows patch update', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            profile: {
              mentorId: 'mentor-1',
              fullName: 'Alice Martin',
              bio: 'Mentor frontend',
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
            },
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { profile: {} },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            profile: {
              mentorId: 'mentor-1',
              fullName: 'Alice Martin',
              bio: 'Mentor frontend',
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
            },
          },
          error: null,
        }),
      } as Response);

    render(<MentorSettings accessToken="token-1" />);

    expect(await screen.findByRole('heading', { name: 'Mon profil mentor' })).toBeInTheDocument();
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
    fetchMock
      .mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: async () => ({
          data: null,
          error: { message: 'Profil mentor introuvable' },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { profile: {} },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            profile: {
              mentorId: 'mentor-1',
              fullName: 'Alice Martin',
              bio: null,
              domain: 'informatique',
              expertiseTags: ['react'],
              supportedLevels: [],
              languages: [],
              certifications: [],
              tariffs: { min: 30, max: 45, currency: 'EUR' },
              availability: {
                isAvailable: true,
                nextAvailableAt: null,
                slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }],
              },
              isPublished: true,
              updatedAt: '2026-02-16T10:00:00.000Z',
            },
          },
          error: null,
        }),
      } as Response);

    render(<MentorSettings accessToken="token-1" />);

    await screen.findByRole('heading', { name: 'Mon profil mentor' });
    await userEvent.type(screen.getByRole('textbox', { name: 'Domaine' }), 'informatique');
    await userEvent.type(screen.getByRole('textbox', { name: 'Competences' }), 'react');
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
    fetchMock.mockResolvedValueOnce({
      status: 404,
      ok: false,
      json: async () => ({
        data: null,
        error: { message: 'Profil mentor introuvable' },
      }),
    } as Response);

    render(<MentorSettings accessToken="token-1" />);

    await screen.findByRole('heading', { name: 'Mon profil mentor' });
    await userEvent.type(screen.getByRole('textbox', { name: 'Domaine' }), 'informatique');
    await userEvent.type(screen.getByRole('textbox', { name: 'Competences' }), 'react');

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
