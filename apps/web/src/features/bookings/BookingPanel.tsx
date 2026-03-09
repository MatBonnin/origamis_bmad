'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './BookingPanel.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const DAY_LABELS_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

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
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Selection state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [newBookingId, setNewBookingId] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const headers = { Authorization: `Bearer ${accessToken}` };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Load Slots ─────────────────────────────────────────────────────────────

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/mentors/${mentorId}/slots`, { headers, cache: 'no-store' });
      const result = await res.json();
      if (!res.ok || result.error) {
        showToast('error', result.error?.message || 'Impossible de charger les disponibilités');
        return;
      }
      setSlotsData(result.data as AvailableSlotsResponse);
    } catch {
      showToast('error', 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentorId]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  // ─── Derived Data ───────────────────────────────────────────────────────────

  const slotsByDate = useMemo(() => {
    if (!slotsData) return new Map<string, AvailableSlot[]>();
    const map = new Map<string, AvailableSlot[]>();
    for (const slot of slotsData.slots) {
      if (!map.has(slot.date)) map.set(slot.date, []);
      map.get(slot.date)!.push(slot);
    }
    return map;
  }, [slotsData]);

  const availableDates = useMemo(() => {
    const dates: string[] = [];
    slotsByDate.forEach((slots, date) => {
      if (slots.some((s) => s.isAvailable)) dates.push(date);
    });
    return dates.sort();
  }, [slotsByDate]);

  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return slotsByDate.get(selectedDate) ?? [];
  }, [selectedDate, slotsByDate]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep(2);
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    if (slot.isAvailable) {
      setSelectedSlot(slot);
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 3) {
      setSelectedSlot(null);
      setStep(2);
    } else if (step === 2) {
      setSelectedDate(null);
      setStep(1);
    }
  };

  const submitBooking = async () => {
    if (!selectedSlot || !selectedDate) {
      showToast('error', 'Veuillez sélectionner une date et un créneau');
      return;
    }

    setSaving(true);
    try {
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
        showToast('error', result.error?.message || 'Erreur lors de la réservation');
        return;
      }
      const createdBookingId = (result.data as { bookingId?: string })?.bookingId ?? null;
      setNewBookingId(createdBookingId);
      showToast('success', 'Réservation créée avec succès !');
    } catch {
      showToast('error', 'Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return {
      dayShort: DAY_LABELS[date.getDay()],
      dayFull: DAY_LABELS_FULL[date.getDay()],
      day: date.getDate(),
      month: MONTH_LABELS[date.getMonth()],
      full: `${DAY_LABELS_FULL[date.getDay()]} ${date.getDate()} ${MONTH_LABELS[date.getMonth()]}`,
    };
  };

  const getDurationLabel = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}` : `${h}h`;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.loadingPulse} />
          <span className={styles.loadingText}>Chargement des disponibilités...</span>
        </div>
      </div>
    );
  }

  if (!slotsData || slotsData.slots.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📅</span>
          <h2 className={styles.emptyTitle}>Aucune disponibilité</h2>
          <p className={styles.emptyText}>
            {mentorName} n'a pas de créneaux disponibles pour le moment.
          </p>
          <Link href={`/mentors/${mentorId}`} className={styles.backLink}>
            ← Retour au profil
          </Link>
        </div>
      </div>
    );
  }

  // Success state after booking
  if (newBookingId) {
    return (
      <div className={styles.container}>
        <div className={styles.successState}>
          <div className={styles.successIcon}>✓</div>
          <h2 className={styles.successTitle}>Réservation créée !</h2>
          <p className={styles.successText}>
            Votre session avec {mentorName} est en attente de paiement.
          </p>
          <div className={styles.successActions}>
            <Link href={`/paiement?bookingId=${newBookingId}`} className={styles.payButton}>
              Payer maintenant →
            </Link>
            <Link href="/bookings" className={styles.secondaryLink}>
              Voir mes réservations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`} role="alert">
          <span className={styles.toastIcon}>{toast.type === 'success' ? '✓' : '!'}</span>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className={styles.header}>
        <Link href={`/mentors/${mentorId}`} className={styles.backBtn}>
          ← Retour
        </Link>
        <div className={styles.headerContent}>
          <div className={styles.mentorBadge}>
            <span className={styles.mentorInitial}>{mentorName.charAt(0)}</span>
          </div>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Réserver avec {mentorName}</h1>
            <div className={styles.sessionMeta}>
              <span className={styles.metaItem}>
                <span className={styles.metaIcon}>⏱</span>
                {getDurationLabel(slotsData.sessionDuration)}
              </span>
              <span className={styles.metaItem}>
                <span className={styles.metaIcon}>🌍</span>
                {slotsData.timezone}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className={styles.progress}>
        <div className={`${styles.progressStep} ${step >= 1 ? styles.stepActive : ''} ${step > 1 ? styles.stepDone : ''}`}>
          <span className={styles.stepNumber}>{step > 1 ? '✓' : '1'}</span>
          <span className={styles.stepLabel}>Date</span>
        </div>
        <div className={styles.progressLine} data-active={step >= 2} />
        <div className={`${styles.progressStep} ${step >= 2 ? styles.stepActive : ''} ${step > 2 ? styles.stepDone : ''}`}>
          <span className={styles.stepNumber}>{step > 2 ? '✓' : '2'}</span>
          <span className={styles.stepLabel}>Heure</span>
        </div>
        <div className={styles.progressLine} data-active={step >= 3} />
        <div className={`${styles.progressStep} ${step >= 3 ? styles.stepActive : ''}`}>
          <span className={styles.stepNumber}>3</span>
          <span className={styles.stepLabel}>Confirmer</span>
        </div>
      </div>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Step 1: Date Selection */}
        {step === 1 && (
          <section className={styles.stepSection}>
            <h2 className={styles.sectionTitle}>Choisissez une date</h2>
            <p className={styles.sectionDesc}>{availableDates.length} dates disponibles</p>

            <div className={styles.dateGrid}>
              {availableDates.map((date) => {
                const { dayShort, day, month } = formatDate(date);
                const slotsCount = slotsByDate.get(date)?.filter((s) => s.isAvailable).length ?? 0;

                return (
                  <button
                    key={date}
                    type="button"
                    className={styles.dateCard}
                    onClick={() => handleDateSelect(date)}
                  >
                    <span className={styles.dateDayName}>{dayShort}</span>
                    <span className={styles.dateDay}>{day}</span>
                    <span className={styles.dateMonth}>{month}</span>
                    <span className={styles.dateSlots}>
                      {slotsCount} créneau{slotsCount > 1 ? 'x' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Step 2: Time Selection */}
        {step === 2 && selectedDate && (
          <section className={styles.stepSection}>
            <button type="button" className={styles.backStep} onClick={handleBack}>
              ← Changer la date
            </button>

            <div className={styles.selectedDateBanner}>
              <span className={styles.bannerIcon}>📅</span>
              <span className={styles.bannerText}>{formatDate(selectedDate).full}</span>
            </div>

            <h2 className={styles.sectionTitle}>Choisissez un horaire</h2>
            <p className={styles.sectionDesc}>
              {slotsForSelectedDate.filter((s) => s.isAvailable).length} créneaux disponibles
            </p>

            <div className={styles.timeGrid}>
              {slotsForSelectedDate.map((slot, idx) => {
                const isDisabled = !slot.isAvailable;

                return (
                  <button
                    key={`${slot.date}-${slot.startTime}-${idx}`}
                    type="button"
                    className={`${styles.timeSlot} ${isDisabled ? styles.timeDisabled : ''}`}
                    onClick={() => handleSlotSelect(slot)}
                    disabled={isDisabled}
                  >
                    <span className={styles.timeStart}>{slot.startTime}</span>
                    <span className={styles.timeSep}>→</span>
                    <span className={styles.timeEnd}>{slot.endTime}</span>
                    {isDisabled && <span className={styles.timeBooked}>Réservé</span>}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && selectedDate && selectedSlot && (
          <section className={styles.stepSection}>
            <button type="button" className={styles.backStep} onClick={handleBack}>
              ← Changer l'horaire
            </button>

            <h2 className={styles.sectionTitle}>Confirmer votre réservation</h2>

            <div className={styles.confirmCard}>
              <div className={styles.confirmHeader}>
                <div className={styles.confirmIcon}>🎯</div>
                <div className={styles.confirmTitle}>Récapitulatif</div>
              </div>

              <div className={styles.confirmDetails}>
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>Mentor</span>
                  <span className={styles.confirmValue}>{mentorName}</span>
                </div>
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>Date</span>
                  <span className={styles.confirmValue}>{formatDate(selectedDate).full}</span>
                </div>
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>Horaire</span>
                  <span className={styles.confirmValue}>
                    {selectedSlot.startTime} - {selectedSlot.endTime}
                  </span>
                </div>
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>Durée</span>
                  <span className={styles.confirmValue}>{getDurationLabel(slotsData.sessionDuration)}</span>
                </div>
              </div>

              <div className={styles.notesSection}>
                <label className={styles.notesLabel} htmlFor="booking-notes">
                  Notes pour le mentor (optionnel)
                </label>
                <textarea
                  id="booking-notes"
                  className={styles.notesInput}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Décrivez brièvement ce que vous souhaitez aborder..."
                  rows={3}
                />
              </div>

              <button
                type="button"
                className={styles.confirmBtn}
                onClick={() => void submitBooking()}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className={styles.spinner} />
                    Réservation en cours...
                  </>
                ) : (
                  'Confirmer la réservation →'
                )}
              </button>

              <p className={styles.paymentNote}>
                💳 Vous serez redirigé vers le paiement après confirmation
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
