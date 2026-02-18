'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import styles from './MyBookings.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirme',
  cancelled: 'Annule',
  completed: 'Termine',
};

interface Booking {
  bookingId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  student: { id: string; firstName: string; lastName: string };
  mentor: { id: string; firstName: string; lastName: string };
}

interface Props {
  accessToken: string;
  userId: string;
}

export function MyBookings({ accessToken, userId }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const headers = { Authorization: `Bearer ${accessToken}` };

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/bookings`, {
        headers,
        cache: 'no-store',
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(
          result.error?.message || 'Impossible de charger les rendez-vous',
        );
        return;
      }
      setBookings(
        (result.data as { bookings: Booking[] }).bookings,
      );
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const cancelBooking = async (bookingId: string) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || "Erreur lors de l'annulation");
        return;
      }
      setBookings((prev) =>
        prev.map((b) =>
          b.bookingId === bookingId ? { ...b, status: 'cancelled' } : b,
        ),
      );
      setSuccess('Rendez-vous annule');
    } catch {
      setError('Erreur de connexion');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getOtherParticipant = (booking: Booking) => {
    if (booking.student.id === userId) {
      return `${booking.mentor.firstName} ${booking.mentor.lastName}`;
    }
    return `${booking.student.firstName} ${booking.student.lastName}`;
  };

  return (
    <section className={styles.container} aria-labelledby="bookings-title">
      <header className={styles.header}>
        <h1 id="bookings-title" className={styles.title}>
          Mes rendez-vous
        </h1>
        <p className={styles.subtitle}>
          Consultez et gerez vos sessions planifiees.
        </p>
      </header>

      {error && (
        <div className={styles.error} role="alert" aria-live="assertive">
          {error}
        </div>
      )}
      {success && (
        <div className={styles.success} role="status" aria-live="polite">
          {success}
        </div>
      )}

      {loading ? (
        <div className={styles.skeletonList} aria-busy="true">
          <div className={styles.skeletonItem} />
          <div className={styles.skeletonItem} />
        </div>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent>
            <p className={styles.empty} aria-live="polite">
              Aucun rendez-vous pour le moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={styles.bookingsList} role="list">
          {bookings.map((booking) => (
            <Card key={booking.bookingId}>
              <CardHeader>
                <CardTitle>
                  {formatDate(booking.bookingDate)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={styles.bookingDetails} role="listitem">
                  <div className={styles.bookingInfo}>
                    <span className={styles.time}>
                      {booking.startTime} - {booking.endTime}
                    </span>
                    <span className={styles.participant}>
                      avec {getOtherParticipant(booking)}
                    </span>
                    <span
                      className={styles.status}
                      data-status={booking.status}
                    >
                      {STATUS_LABELS[booking.status] ?? booking.status}
                    </span>
                  </div>
                  {booking.notes && (
                    <p className={styles.notes}>{booking.notes}</p>
                  )}
                  {(booking.status === 'confirmed' ||
                    booking.status === 'pending') && (
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => void cancelBooking(booking.bookingId)}
                      aria-label={`Annuler le rendez-vous du ${formatDate(booking.bookingDate)}`}
                    >
                      Annuler
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
