import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MyBookings } from '../MyBookings';

describe('MyBookings', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  const mockBookings = (bookings: unknown[]) =>
    ({
      ok: true,
      json: async () => ({ data: { bookings }, error: null }),
    }) as Response;

  const confirmedBooking = {
    bookingId: 'b-1',
    mentorId: 'mentor-1',
    bookingDate: '2026-03-04',
    startTime: '14:00',
    endTime: '16:00',
    status: 'confirmed',
    notes: null,
    student: { id: 'student-1', firstName: 'Alice', lastName: 'Dupont' },
    mentor: { id: 'mentor-1', firstName: 'Marc', lastName: 'Martin' },
  };

  it('loads and displays bookings', async () => {
    fetchMock.mockResolvedValueOnce(mockBookings([confirmedBooking]));

    render(<MyBookings accessToken="token-1" userId="student-1" />);

    expect(await screen.findByText('14:00 - 16:00')).toBeInTheDocument();
    expect(screen.getByText('avec Marc Martin')).toBeInTheDocument();
    expect(screen.getByText('Confirme')).toBeInTheDocument();
  });

  it('opens cancel dialog and confirms cancellation', async () => {
    fetchMock
      .mockResolvedValueOnce(mockBookings([confirmedBooking]))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { booking: { bookingId: 'b-1', status: 'cancelled' } },
          error: null,
        }),
      } as Response);

    render(<MyBookings accessToken="token-1" userId="student-1" />);

    await screen.findByText('Confirme');

    // Click the Annuler button on the booking card
    await userEvent.click(screen.getByRole('button', { name: /Annuler/i }));

    // Dialog should appear
    expect(
      await screen.findByRole('heading', { name: "Confirmer l'annulation" }),
    ).toBeInTheDocument();

    // Confirm cancellation
    await userEvent.click(
      screen.getByRole('button', { name: "Confirmer l'annulation" }),
    );

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

  it('opens reschedule dialog', async () => {
    fetchMock
      .mockResolvedValueOnce(mockBookings([confirmedBooking]))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            isAvailable: true,
            timezone: 'Europe/Paris',
            slots: [
              {
                slotId: 'slot-2',
                dayOfWeek: 4,
                startTime: '10:00',
                endTime: '12:00',
              },
            ],
          },
          error: null,
        }),
      } as Response);

    render(<MyBookings accessToken="token-1" userId="student-1" />);

    await screen.findByText('Confirme');

    // Click the Reporter button
    await userEvent.click(screen.getByRole('button', { name: /Reporter/i }));

    // Reschedule dialog should appear
    expect(
      await screen.findByText('Reporter le rendez-vous'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nouveau creneau')).toBeInTheDocument();
    expect(screen.getByLabelText('Nouvelle date')).toBeInTheDocument();
  });

  it('submits reschedule successfully', async () => {
    fetchMock
      .mockResolvedValueOnce(mockBookings([confirmedBooking]))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            isAvailable: true,
            timezone: 'Europe/Paris',
            slots: [
              {
                slotId: 'slot-2',
                dayOfWeek: 4,
                startTime: '10:00',
                endTime: '12:00',
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
            booking: {
              bookingId: 'b-1',
              slotId: 'slot-2',
              startTime: '10:00',
              endTime: '12:00',
            },
          },
          error: null,
        }),
      } as Response)
      // reload bookings after reschedule
      .mockResolvedValue(mockBookings([{ ...confirmedBooking, startTime: '10:00', endTime: '12:00' }]));

    render(<MyBookings accessToken="token-1" userId="student-1" />);

    await screen.findByText('Confirme');
    await userEvent.click(screen.getByRole('button', { name: /Reporter/i }));
    await screen.findByText('Reporter le rendez-vous');

    // Select new slot and date
    await userEvent.selectOptions(
      screen.getByLabelText('Nouveau creneau'),
      'slot-2',
    );
    await userEvent.type(screen.getByLabelText('Nouvelle date'), '2026-03-05');

    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmer le report' }),
    );

    expect(await screen.findByText('Rendez-vous reporte')).toBeInTheDocument();
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
