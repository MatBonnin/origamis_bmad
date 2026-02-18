import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MyBookings } from '../MyBookings';

describe('MyBookings', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  const mockBookings = (bookings: unknown[]) =>
    ({
      ok: true,
      json: async () => ({ data: { bookings }, error: null }),
    }) as Response;

  it('loads and displays bookings', async () => {
    fetchMock.mockResolvedValueOnce(
      mockBookings([
        {
          bookingId: 'b-1',
          bookingDate: '2026-03-04',
          startTime: '14:00',
          endTime: '16:00',
          status: 'confirmed',
          notes: null,
          student: { id: 'student-1', firstName: 'Alice', lastName: 'Dupont' },
          mentor: { id: 'mentor-1', firstName: 'Marc', lastName: 'Martin' },
        },
      ]),
    );

    render(<MyBookings accessToken="token-1" userId="student-1" />);

    expect(await screen.findByText('14:00 - 16:00')).toBeInTheDocument();
    expect(screen.getByText('avec Marc Martin')).toBeInTheDocument();
    expect(screen.getByText('Confirme')).toBeInTheDocument();
  });

  it('cancels a booking', async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockBookings([
          {
            bookingId: 'b-1',
            bookingDate: '2026-03-04',
            startTime: '14:00',
            endTime: '16:00',
            status: 'confirmed',
            notes: null,
            student: {
              id: 'student-1',
              firstName: 'Alice',
              lastName: 'Dupont',
            },
            mentor: { id: 'mentor-1', firstName: 'Marc', lastName: 'Martin' },
          },
        ]),
      )
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { booking: { bookingId: 'b-1', status: 'cancelled' } },
          error: null,
        }),
      } as Response);

    render(<MyBookings accessToken="token-1" userId="student-1" />);

    await screen.findByText('Confirme');
    await userEvent.click(screen.getByRole('button', { name: /Annuler/i }));

    await waitFor(() => {
      const cancelCall = fetchMock.mock.calls.find(
        (call) =>
          String(call[0]).includes('/bookings/b-1/cancel') &&
          (call[1] as RequestInit)?.method === 'PATCH',
      );
      expect(cancelCall).toBeDefined();
    });

    expect(await screen.findByText('Rendez-vous annule')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    fetchMock.mockResolvedValueOnce(mockBookings([]));

    render(<MyBookings accessToken="token-1" userId="student-1" />);

    expect(
      await screen.findByText('Aucun rendez-vous pour le moment.'),
    ).toBeInTheDocument();
  });

  it('shows error on network failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    render(<MyBookings accessToken="token-1" userId="student-1" />);

    expect(
      await screen.findByText('Erreur de connexion au serveur'),
    ).toBeInTheDocument();
  });
});
