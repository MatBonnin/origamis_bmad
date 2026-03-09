'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
} from '@/components/ui';
import styles from './MyBookings.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const DAY_LABELS = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
];

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirme',
  cancelled: 'Annule',
  completed: 'Termine',
};

interface Slot {
  slotId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Booking {
  bookingId: string;
  mentorId: string;
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

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Reschedule dialog state
  const [rescheduleTarget, setRescheduleTarget] = useState<string | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [mentorSlots, setMentorSlots] = useState<Slot[]>([]);
  const [newSlotId, setNewSlotId] = useState('');
  const [newDate, setNewDate] = useState('');

  // Session link state
  const [sessionLoading, setSessionLoading] = useState<string | null>(null);

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
      const data = result.data as { bookings: Booking[] };
      setBookings(data.bookings ?? []);
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

  // Cancel flow
  const openCancelDialog = (bookingId: string) => {
    setCancelTarget(bookingId);
    setCancelReason('');
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch(
        `${API_URL}/bookings/${cancelTarget}/cancel`,
        {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: cancelReason || undefined }),
        },
      );
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || "Erreur lors de l'annulation");
        return;
      }
      setBookings((prev) =>
        prev.map((b) =>
          b.bookingId === cancelTarget ? { ...b, status: 'cancelled' } : b,
        ),
      );
      setSuccess('Rendez-vous annule');
    } catch {
      setError('Erreur de connexion');
    } finally {
      setCancelTarget(null);
    }
  };

  // Reschedule flow
  const openRescheduleDialog = async (booking: Booking) => {
    setRescheduleTarget(booking.bookingId);
    setRescheduleReason('');
    setNewSlotId('');
    setNewDate('');
    setMentorSlots([]);

    try {
      const res = await fetch(
        `${API_URL}/mentors/${booking.mentorId}/availability`,
        { headers, cache: 'no-store' },
      );
      const result = await res.json();
      if (res.ok && !result.error) {
        const data = result.data as { slots: Slot[] };
        setMentorSlots(data.slots);
      }
    } catch {
      // Non-blocking
    }
  };

  const confirmReschedule = async () => {
    if (!rescheduleTarget || !newSlotId || !newDate) {
      setError('Veuillez selectionner un creneau et une date');
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await fetch(
        `${API_URL}/bookings/${rescheduleTarget}/reschedule`,
        {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newSlotId,
            newBookingDate: newDate,
            reason: rescheduleReason || undefined,
          }),
        },
      );
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || 'Erreur lors du report');
        return;
      }
      setSuccess('Rendez-vous reporte');
      void loadBookings();
    } catch {
      setError('Erreur de connexion');
    } finally {
      setRescheduleTarget(null);
    }
  };

  // Join session flow
  const joinSession = async (bookingId: string) => {
    setSessionLoading(bookingId);
    setError('');
    try {
      const res = await fetch(
        `${API_URL}/bookings/${bookingId}/session-link`,
        { headers, cache: 'no-store' },
      );
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(
          result.error?.message || 'Impossible de recuperer le lien de session',
        );
        return;
      }
      const data = result.data as { sessionUrl: string; expiresAt: string };
      window.open(data.sessionUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSessionLoading(null);
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

  const slotOptions = mentorSlots.map((slot) => ({
    value: slot.slotId,
    label: `${DAY_LABELS[slot.dayOfWeek]} ${slot.startTime} - ${slot.endTime}`,
  }));

  const isActive = (status: string) =>
    status === 'confirmed' || status === 'pending';

  const [dismissedNotes, setDismissedNotes] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('dismissedSessionNotes');
      return new Set(stored ? (JSON.parse(stored) as string[]) : []);
    } catch {
      return new Set();
    }
  });

  const dismissNotesBanner = (bookingId: string) => {
    setDismissedNotes((prev) => {
      const next = new Set(prev);
      next.add(bookingId);
      try {
        localStorage.setItem('dismissedSessionNotes', JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
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
                <CardTitle>{formatDate(booking.bookingDate)}</CardTitle>
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
                  {booking.status === 'completed' && !dismissedNotes.has(booking.bookingId) && (
                    <div className={styles.notesBanner} role="status">
                      <span>Session terminee — laissez vos notes</span>
                      <div className={styles.notesBannerActions}>
                        <Link
                          href={`/sessions/history`}
                          className={styles.notesLink}
                        >
                          Notes &amp; Retours
                        </Link>
                        <button
                          type="button"
                          className={styles.dismissButton}
                          onClick={() => dismissNotesBanner(booking.bookingId)}
                          aria-label="Fermer ce message"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  )}
                  {isActive(booking.status) && (
                    <div className={styles.actions}>
                      {booking.status === 'pending' && (
                        <Link
                          href={`/paiement?bookingId=${booking.bookingId}`}
                          className={styles.payButton}
                          aria-label={`Payer la session du ${formatDate(booking.bookingDate)}`}
                        >
                          Payer
                        </Link>
                      )}
                      {booking.status === 'confirmed' && (
                        <>
                          <Button
                            size="sm"
                            type="button"
                            onClick={() => void joinSession(booking.bookingId)}
                            disabled={sessionLoading === booking.bookingId}
                            aria-label={`Rejoindre la visio du ${formatDate(booking.bookingDate)}`}
                          >
                            {sessionLoading === booking.bookingId
                              ? 'Chargement...'
                              : 'Rejoindre visio'}
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => openCancelDialog(booking.bookingId)}
                        aria-label={`Annuler le rendez-vous du ${formatDate(booking.bookingDate)}`}
                      >
                        Annuler
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={() => void openRescheduleDialog(booking)}
                        aria-label={`Reporter le rendez-vous du ${formatDate(booking.bookingDate)}`}
                      >
                        Reporter
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cancel confirmation dialog */}
      {cancelTarget && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
        >
          <div className={styles.dialog}>
            <h2 id="cancel-dialog-title" className={styles.dialogTitle}>
              Confirmer l&apos;annulation
            </h2>
            <p className={styles.dialogText}>
              Attention : l&apos;annulation est soumise a un preavis de 4h minimum.
            </p>
            <Input
              name="cancel-reason"
              label="Raison (optionnel)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className={styles.dialogActions}>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setCancelTarget(null)}
              >
                Retour
              </Button>
              <Button
                size="sm"
                type="button"
                onClick={() => void confirmCancel()}
              >
                Confirmer l&apos;annulation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule dialog */}
      {rescheduleTarget && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-dialog-title"
        >
          <div className={styles.dialog}>
            <h2
              id="reschedule-dialog-title"
              className={styles.dialogTitle}
            >
              Reporter le rendez-vous
            </h2>
            <p className={styles.dialogText}>
              Choisissez un nouveau creneau et une nouvelle date.
            </p>
            <div className={styles.rescheduleForm}>
              <Select
                name="new-slot"
                label="Nouveau creneau"
                value={newSlotId}
                placeholder="Selectionnez un creneau"
                options={slotOptions}
                onChange={(e) => setNewSlotId(e.target.value)}
              />
              <Input
                name="new-date"
                label="Nouvelle date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
              <Input
                name="reschedule-reason"
                label="Raison (optionnel)"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
              />
            </div>
            <div className={styles.dialogActions}>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setRescheduleTarget(null)}
              >
                Retour
              </Button>
              <Button
                size="sm"
                type="button"
                onClick={() => void confirmReschedule()}
              >
                Confirmer le report
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
