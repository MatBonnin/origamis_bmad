import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingPanel } from '../BookingPanel';

describe('BookingPanel', () => {
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

  const mockBookingSuccess = () =>
    ({
      ok: true,
      json: async () => ({
        data: {
          booking: {
            bookingId: 'b-1',
            status: 'confirmed',
            bookingDate: '2026-03-04',
            startTime: '14:00',
            endTime: '16:00',
          },
        },
        error: null,
      }),
    }) as Response;

  it('shows available slots and booking form', async () => {
    fetchMock.mockResolvedValueOnce(
      mockAvailability([
        {
          slotId: 'slot-1',
          dayOfWeek: 3,
          startTime: '14:00',
          endTime: '16:00',
          isRecurring: true,
          status: 'published',
        },
      ]),
    );

    render(
      <BookingPanel
        accessToken="token-1"
        mentorId="mentor-1"
        mentorName="Dr. Martin"
      />,
    );

    expect(
      await screen.findByText('Reserver avec Dr. Martin'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Mercredi' }),
    ).toBeInTheDocument();
    expect(screen.getByText('14:00 - 16:00')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Confirmer la reservation' }),
    ).toBeInTheDocument();
  });

  it('submits a booking successfully', async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockAvailability([
          {
            slotId: 'slot-1',
            dayOfWeek: 3,
            startTime: '14:00',
            endTime: '16:00',
            isRecurring: true,
            status: 'published',
          },
        ]),
      )
      .mockResolvedValueOnce(mockBookingSuccess());

    render(
      <BookingPanel
        accessToken="token-1"
        mentorId="mentor-1"
        mentorName="Dr. Martin"
      />,
    );

    await screen.findByRole('heading', { name: 'Mercredi' });

    // Select slot and date
    await userEvent.selectOptions(screen.getByLabelText('Creneau'), 'slot-1');
    await userEvent.type(screen.getByLabelText('Date'), '2026-03-04');
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmer la reservation' }),
    );

    expect(
      await screen.findByText('Reservation creee. Paiement requis pour confirmation.'),
    ).toBeInTheDocument();
  });

  it('shows unavailable state', async () => {
    fetchMock.mockResolvedValueOnce(mockAvailability([], false));

    render(
      <BookingPanel
        accessToken="token-1"
        mentorId="mentor-1"
        mentorName="Dr. Martin"
      />,
    );

    expect(
      await screen.findByText(
        "Ce mentor n'est pas disponible actuellement.",
      ),
    ).toBeInTheDocument();
  });

  it('shows error on network failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    render(
      <BookingPanel
        accessToken="token-1"
        mentorId="mentor-1"
        mentorName="Dr. Martin"
      />,
    );

    expect(
      await screen.findByText('Erreur de connexion au serveur'),
    ).toBeInTheDocument();
  });

  it('shows validation error when no slot selected', async () => {
    fetchMock.mockResolvedValueOnce(
      mockAvailability([
        {
          slotId: 'slot-1',
          dayOfWeek: 3,
          startTime: '14:00',
          endTime: '16:00',
          isRecurring: true,
          status: 'published',
        },
      ]),
    );

    render(
      <BookingPanel
        accessToken="token-1"
        mentorId="mentor-1"
        mentorName="Dr. Martin"
      />,
    );

    await screen.findByRole('heading', { name: 'Mercredi' });
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmer la reservation' }),
    );

    expect(
      await screen.findByText(
        'Veuillez selectionner un creneau et une date',
      ),
    ).toBeInTheDocument();
  });
});
