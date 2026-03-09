'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
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

const MONTH_LABELS = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface AvailableSlot {
  date: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface AvailableSlotsResponse {
  mentorId: string;
  timezone: string;
  sessionDuration: number;
  slots: AvailableSlot[];
  dateRange: {
    start: string;
    end: string;
  };
}

interface Props {
  accessToken: string;
  mentorId: string;
  mentorName: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BookingPanel({ accessToken, mentorId, mentorName }: Props) {
  const [slotsData, setSlotsData] = useState<AvailableSlotsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selection state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [newBookingId, setNewBookingId] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${accessToken}` };

  // ─── Load Slots ─────────────────────────────────────────────────────────────

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${API_URL}/mentors/${mentorId}/slots`,
        { headers, cache: 'no-store' },
      );
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(
          result.error?.message || 'Impossible de charger les disponibilites',
        );
        return;
      }
      setSlotsData(result.data as AvailableSlotsResponse);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentorId]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  // ─── Derived Data ───────────────────────────────────────────────────────────

  // Group slots by date
  const slotsByDate = useMemo(() => {
    if (!slotsData) return new Map<string, AvailableSlot[]>();

    const map = new Map<string, AvailableSlot[]>();
    for (const slot of slotsData.slots) {
      if (!map.has(slot.date)) {
        map.set(slot.date, []);
      }
      map.get(slot.date)!.push(slot);
    }
    return map;
  }, [slotsData]);

  // Get available dates (dates that have at least one available slot)
  const availableDates = useMemo(() => {
    const dates: string[] = [];
    slotsByDate.forEach((slots, date) => {
      if (slots.some((s) => s.isAvailable)) {
        dates.push(date);
      }
    });
    return dates.sort();
  }, [slotsByDate]);

  // Slots for selected date
  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return slotsByDate.get(selectedDate) ?? [];
  }, [selectedDate, slotsByDate]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    if (slot.isAvailable) {
      setSelectedSlot(slot);
    }
  };

  const submitBooking = async () => {
    if (!selectedSlot || !selectedDate) {
      setError('Veuillez selectionner une date et un creneau');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      // Use the new V2 booking endpoint
      const res = await fetch(`${API_URL}/bookings/v2`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorId,
          date: selectedDate,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
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
      setSuccess('Reservation creee. Paiement requis pour confirmation.');
      setSelectedSlot(null);
      setSelectedDate(null);
      setNotes('');
      // Reload slots to update availability
      void loadSlots();
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render Helpers ─────────────────────────────────────────────────────────

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const dayName = DAY_LABELS[date.getDay()];
    const day = date.getDate();
    const month = MONTH_LABELS[date.getMonth()];
    return { dayName, day, month, full: `${dayName} ${day} ${month}` };
  };

  const renderDateSelector = () => {
    if (availableDates.length === 0) {
      return (
        <p className={styles.empty}>
          Aucune date disponible pour ce mentor.
        </p>
      );
    }

    return (
      <div className={styles.dateGrid}>
        {availableDates.map((date) => {
          const { dayName, day, month } = formatDate(date);
          const isSelected = selectedDate === date;
          const slotsCount = slotsByDate.get(date)?.filter((s) => s.isAvailable).length ?? 0;

          return (
            <button
              key={date}
              type="button"
              className={`${styles.dateCard} ${isSelected ? styles.dateSelected : ''}`}
              onClick={() => handleDateSelect(date)}
              aria-pressed={isSelected}
            >
              <span className={styles.dateDayName}>{dayName}</span>
              <span className={styles.dateDay}>{day}</span>
              <span className={styles.dateMonth}>{month}</span>
              <span className={styles.dateSlots}>{slotsCount} creneau{slotsCount > 1 ? 'x' : ''}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderTimeSlots = () => {
    if (!selectedDate) {
      return (
        <p className={styles.hint}>Selectionnez une date pour voir les creneaux disponibles.</p>
      );
    }

    if (slotsForSelectedDate.length === 0) {
      return (
        <p className={styles.empty}>Aucun creneau pour cette date.</p>
      );
    }

    const { full } = formatDate(selectedDate);

    return (
      <>
        <h3 className={styles.timeSlotsTitle}>Creneaux pour {full}</h3>
        <div className={styles.timeGrid}>
          {slotsForSelectedDate.map((slot, idx) => {
            const isSelected = selectedSlot?.startTime === slot.startTime && selectedSlot?.date === slot.date;
            const isDisabled = !slot.isAvailable;

            return (
              <button
                key={`${slot.date}-${slot.startTime}-${idx}`}
                type="button"
                className={`${styles.timeSlot} ${isSelected ? styles.timeSelected : ''} ${isDisabled ? styles.timeDisabled : ''}`}
                onClick={() => handleSlotSelect(slot)}
                disabled={isDisabled}
                aria-pressed={isSelected}
                aria-disabled={isDisabled}
              >
                <span className={styles.timeRange}>
                  {slot.startTime} - {slot.endTime}
                </span>
                {isDisabled && <span className={styles.timeBooked}>Reserve</span>}
              </button>
            );
          })}
        </div>
      </>
    );
  };

  // ─── Main Render ────────────────────────────────────────────────────────────

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
          Choisissez une date et un creneau pour planifier votre session.
        </p>
        {slotsData && (
          <div className={styles.sessionInfo}>
            <span>Duree: {slotsData.sessionDuration} min</span>
            <span>Fuseau: {slotsData.timezone}</span>
          </div>
        )}
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
      ) : !slotsData || slotsData.slots.length === 0 ? (
        <Card>
          <CardContent>
            <p className={styles.empty}>
              Ce mentor n&apos;est pas disponible actuellement.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle>1. Choisissez une date</CardTitle>
            </CardHeader>
            <CardContent>
              {renderDateSelector()}
            </CardContent>
          </Card>

          {/* Time Selection */}
          <Card>
            <CardHeader>
              <CardTitle>2. Choisissez un creneau</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTimeSlots()}
            </CardContent>
          </Card>

          {/* Confirmation */}
          {selectedSlot && selectedDate && (
            <Card className={styles.confirmCard}>
              <CardHeader>
                <CardTitle>3. Confirmer votre reservation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={styles.summary}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Date:</span>
                    <span className={styles.summaryValue}>{formatDate(selectedDate).full}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Heure:</span>
                    <span className={styles.summaryValue}>{selectedSlot.startTime} - {selectedSlot.endTime}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Duree:</span>
                    <span className={styles.summaryValue}>{slotsData.sessionDuration} minutes</span>
                  </div>
                </div>

                <Input
                  name="notes"
                  label="Notes pour le mentor (optionnel)"
                  value={notes}
                  placeholder="Decrivez brievement ce que vous souhaitez aborder..."
                  onChange={(e) => setNotes(e.target.value)}
                />

                <Button
                  type="button"
                  onClick={() => void submitBooking()}
                  isLoading={saving}
                  className={styles.confirmBtn}
                >
                  Confirmer la reservation
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </section>
  );
}
