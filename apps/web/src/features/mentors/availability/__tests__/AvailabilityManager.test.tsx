import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AvailabilityManager } from '../AvailabilityManager';

describe('AvailabilityManager', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  const mockAvailability = (slots: unknown[] = [], isAvailable = true) =>
    ({
      ok: true,
      json: async () => ({
        data: { isAvailable, timezone: 'Europe/Paris', slots },
        error: null,
      }),
    }) as Response;

  const mockSuccess = (data: unknown = { success: true }) =>
    ({
      ok: true,
      json: async () => ({ data, error: null }),
    }) as Response;

  it('loads and displays availability with slots', async () => {
    fetchMock.mockResolvedValueOnce(
      mockAvailability([
        {
          slotId: 'slot-1',
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '12:00',
          isRecurring: true,
          status: 'published',
        },
      ]),
    );

    render(<AvailabilityManager accessToken="token-1" />);

    expect(
      await screen.findByRole('heading', { name: 'Lundi' }),
    ).toBeInTheDocument();
    expect(screen.getByText('09:00 - 12:00')).toBeInTheDocument();
    expect(screen.getByText('published')).toBeInTheDocument();
  });

  it('adds a new slot', async () => {
    fetchMock
      .mockResolvedValueOnce(mockAvailability([]))
      .mockResolvedValueOnce(
        mockSuccess({
          slot: {
            slotId: 'slot-new',
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '12:00',
            isRecurring: true,
            status: 'published',
          },
        }),
      );

    render(<AvailabilityManager accessToken="token-1" />);

    await screen.findByText('Aucun creneau configure.');
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }));

    expect(await screen.findByText('Creneau ajoute')).toBeInTheDocument();
    expect(screen.getByText('09:00 - 12:00')).toBeInTheDocument();
  });

  it('deletes a slot', async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockAvailability([
          {
            slotId: 'slot-1',
            dayOfWeek: 3,
            startTime: '14:00',
            endTime: '17:00',
            isRecurring: true,
            status: 'published',
          },
        ]),
      )
      .mockResolvedValueOnce(mockSuccess());

    render(<AvailabilityManager accessToken="token-1" />);

    await screen.findByRole('heading', { name: 'Mercredi' });
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Supprimer le creneau Mercredi 14:00-17:00',
      }),
    );

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        (call) =>
          String(call[0]).includes('/availability/slot-1') &&
          (call[1] as RequestInit)?.method === 'DELETE',
      );
      expect(deleteCall).toBeDefined();
    });

    expect(await screen.findByText('Creneau supprime')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    fetchMock.mockResolvedValueOnce(mockAvailability([]));

    render(<AvailabilityManager accessToken="token-1" />);

    expect(
      await screen.findByText('Aucun creneau configure.'),
    ).toBeInTheDocument();
  });

  it('shows error on network failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    render(<AvailabilityManager accessToken="token-1" />);

    expect(
      await screen.findByText('Erreur de connexion au serveur'),
    ).toBeInTheDocument();
  });
});
