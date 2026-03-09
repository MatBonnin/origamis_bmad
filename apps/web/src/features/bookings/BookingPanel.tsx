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
import styles from './BookingPanel.module.css';

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

interface Slot {
  slotId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  status: string;
}

interface MentorAvailability {
  isAvailable: boolean;
  timezone: string;
  slots: Slot[];
}

interface Booking {
  bookingId: string;
  mentorId: string;
  slotId: string;
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
  mentorId: string;
  mentorName: string;
}

export function BookingPanel({ accessToken, mentorId, mentorName }: Props) {
  const [availability, setAvailability] = useState<MentorAvailability | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Booking form
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [notes, setNotes] = useState('');
  const [newBookingId, setNewBookingId] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${accessToken}` };

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${API_URL}/mentors/${mentorId}/availability`,
        { headers, cache: 'no-store' },
      );
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(
          result.error?.message || 'Impossible de charger les disponibilites',
        );
        return;
      }
      setAvailability(result.data as MentorAvailability);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentorId]);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  const submitBooking = async () => {
    if (!selectedSlot || !bookingDate) {
      setError('Veuillez selectionner un creneau et une date');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorId,
          slotId: selectedSlot,
          bookingDate,
          notes: notes || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || 'Erreur lors de la reservation');
        return;
      }
      const createdBookingId = (result.data as { bookingId?: string })?.bookingId ?? null;
      setNewBookingId(createdBookingId);
      setSuccess('Rendez-vous confirme !');
      setSelectedSlot('');
      setBookingDate('');
      setNotes('');
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  // Build slot options for select
  const slotOptions = (availability?.slots ?? []).map((slot) => ({
    value: slot.slotId,
    label: `${DAY_LABELS[slot.dayOfWeek]} ${slot.startTime} - ${slot.endTime}`,
  }));

  return (
    <section
      className={styles.container}
      aria-labelledby="booking-title"
    >
      <header className={styles.header}>
        <h1 id="booking-title" className={styles.title}>
          Reserver avec {mentorName}
        </h1>
        <p className={styles.subtitle}>
          Choisissez un creneau disponible pour planifier votre session.
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
          {newBookingId && (
            <div className={styles.payPrompt}>
              <span>Finalisez votre reservation en payant maintenant.</span>
              <Link
                href={`/paiement?bookingId=${newBookingId}`}
                className={styles.payLink}
              >
                Payer ma session &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className={styles.skeletonList} aria-busy="true">
          <div className={styles.skeletonItem} />
          <div className={styles.skeletonItem} />
        </div>
      ) : !availability || !availability.isAvailable ? (
        <Card>
          <CardContent>
            <p className={styles.empty}>
              Ce mentor n&apos;est pas disponible actuellement.
            </p>
          </CardContent>
        </Card>
      ) : availability.slots.length === 0 ? (
        <Card>
          <CardContent>
            <p className={styles.empty}>
              Aucun creneau disponible pour ce mentor.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Available slots overview */}
          <Card>
            <CardHeader>
              <CardTitle>
                Creneaux disponibles ({availability.slots.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.slotsGrid} role="list">
                {DAY_LABELS.map((label, idx) => {
                  const daySlots = availability.slots.filter(
                    (s) => s.dayOfWeek === idx,
                  );
                  if (daySlots.length === 0) return null;
                  return (
                    <div
                      key={idx}
                      className={styles.dayGroup}
                      role="listitem"
                    >
                      <h3 className={styles.dayTitle}>{label}</h3>
                      <ul className={styles.slotList}>
                        {daySlots.map((slot) => (
                          <li key={slot.slotId} className={styles.slotItem}>
                            <span className={styles.slotTime}>
                              {slot.startTime} - {slot.endTime}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Booking form */}
          <Card>
            <CardHeader>
              <CardTitle>Reserver un creneau</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.bookingForm}>
                <Select
                  name="slot"
                  label="Creneau"
                  value={selectedSlot}
                  placeholder="Selectionnez un creneau"
                  options={slotOptions}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                />
                <Input
                  name="booking-date"
                  label="Date"
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                />
                <Input
                  name="notes"
                  label="Notes (optionnel)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <Button
                  type="button"
                  onClick={() => void submitBooking()}
                  isLoading={saving}
                >
                  Confirmer la reservation
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}
