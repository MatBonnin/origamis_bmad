'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './MyBookings.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const DAY_LABELS_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const STATUS_CONFIG: Record<string, { label: string; icon: string }> = {
  pending: { label: 'En attente de paiement', icon: '⏳' },
  confirmed: { label: 'Confirmé', icon: '✓' },
  cancelled: { label: 'Annulé', icon: '✕' },
  completed: { label: 'Terminé', icon: '✓' },
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
  priceCents?: number | null;
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
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter state
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Reschedule dialog state
  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [mentorSlots, setMentorSlots] = useState<Slot[]>([]);
  const [newSlotId, setNewSlotId] = useState('');
  const [newDate, setNewDate] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Session link state
  const [sessionLoading, setSessionLoading] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);

  // Dismissed notes banners
  const [dismissedNotes, setDismissedNotes] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('dismissedSessionNotes');
      return new Set(stored ? (JSON.parse(stored) as string[]) : []);
    } catch {
      return new Set();
    }
  });

  const headers = { Authorization: `Bearer ${accessToken}` };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/bookings`, { headers, cache: 'no-store' });
      const result = await res.json();
      if (!res.ok || result.error) {
        showToast('error', result.error?.message || 'Impossible de charger les rendez-vous');
        return;
      }
      const data = result.data as { bookings: Booking[] };
      setBookings(data.bookings ?? []);
    } catch {
      showToast('error', 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  // ─── Filters ────────────────────────────────────────────────────────────────

  const today = new Date().toISOString().split('T')[0];

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'upcoming') {
      return b.bookingDate >= today && b.status !== 'cancelled';
    }
    if (filter === 'past') {
      return b.bookingDate < today || b.status === 'completed' || b.status === 'cancelled';
    }
    return true;
  }).sort((a, b) => {
    // Upcoming: soonest first, Past: most recent first
    if (filter === 'past') {
      return b.bookingDate.localeCompare(a.bookingDate);
    }
    return a.bookingDate.localeCompare(b.bookingDate);
  });

  // ─── Cancel Flow ────────────────────────────────────────────────────────────

  const openCancelDialog = (booking: Booking) => {
    setCancelTarget(booking);
    setCancelReason('');
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`${API_URL}/bookings/${cancelTarget.bookingId}/cancel`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason || undefined }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        showToast('error', result.error?.message || "Erreur lors de l'annulation");
        return;
      }
      setBookings((prev) =>
        prev.map((b) => (b.bookingId === cancelTarget.bookingId ? { ...b, status: 'cancelled' } : b))
      );
      showToast('success', 'Rendez-vous annulé avec succès');
    } catch {
      showToast('error', 'Erreur de connexion');
    } finally {
      setCancelLoading(false);
      setCancelTarget(null);
    }
  };

  // ─── Reschedule Flow ────────────────────────────────────────────────────────

  const openRescheduleDialog = async (booking: Booking) => {
    setRescheduleTarget(booking);
    setRescheduleReason('');
    setNewSlotId('');
    setNewDate('');
    setMentorSlots([]);

    try {
      const res = await fetch(`${API_URL}/mentors/${booking.mentorId}/availability`, {
        headers,
        cache: 'no-store',
      });
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
      showToast('error', 'Veuillez sélectionner un créneau et une date');
      return;
    }
    setRescheduleLoading(true);
    try {
      const res = await fetch(`${API_URL}/bookings/${rescheduleTarget.bookingId}/reschedule`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newSlotId,
          newBookingDate: newDate,
          reason: rescheduleReason || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        showToast('error', result.error?.message || 'Erreur lors du report');
        return;
      }
      showToast('success', 'Rendez-vous reporté avec succès');
      void loadBookings();
    } catch {
      showToast('error', 'Erreur de connexion');
    } finally {
      setRescheduleLoading(false);
      setRescheduleTarget(null);
    }
  };

  // ─── Join Session ───────────────────────────────────────────────────────────

  const joinSession = async (bookingId: string) => {
    setSessionLoading(bookingId);
    try {
      const res = await fetch(`${API_URL}/bookings/${bookingId}/session-room`, {
        headers,
        cache: 'no-store',
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        showToast('error', result.error?.message || 'Impossible de récupérer le lien de session');
        return;
      }
      const data = result.data as { sessionUrl: string; expiresAt: string };
      window.open(data.sessionUrl, '_blank', 'noopener,noreferrer');
    } catch {
      showToast('error', 'Erreur de connexion');
    } finally {
      setSessionLoading(null);
    }
  };

  const startCheckout = async (bookingId: string) => {
    setPaymentLoading(bookingId);
    try {
      const res = await fetch(`${API_URL}/payments/bookings/${bookingId}/checkout`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        showToast('error', result.error?.message || 'Impossible de creer la session de paiement');
        return;
      }
      const checkoutUrl = result.data?.checkoutUrl as string | undefined;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch {
      showToast('error', 'Erreur de connexion');
    } finally {
      setPaymentLoading(null);
    }
  };

  // ─── Notes Banner ───────────────────────────────────────────────────────────

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

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return {
      dayShort: DAY_LABELS[date.getDay()],
      dayFull: DAY_LABELS_FULL[date.getDay()],
      day: date.getDate(),
      month: MONTH_LABELS[date.getMonth()],
      year: date.getFullYear(),
      full: `${DAY_LABELS_FULL[date.getDay()]} ${date.getDate()} ${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`,
    };
  };

  const formatAmount = (amountCents: number | null | undefined) => {
    if (typeof amountCents !== 'number') return 'Prix non défini';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amountCents / 100);
  };

  const getOtherParticipant = (booking: Booking) => {
    if (booking.student.id === userId) {
      return {
        name: `${booking.mentor.firstName} ${booking.mentor.lastName}`,
        role: 'Mentor',
        initial: booking.mentor.firstName.charAt(0),
      };
    }
    return {
      name: `${booking.student.firstName} ${booking.student.lastName}`,
      role: 'Étudiant',
      initial: booking.student.firstName.charAt(0),
    };
  };

  const isActive = (status: string) => status === 'confirmed' || status === 'pending';

  const slotOptions = mentorSlots.map((slot) => ({
    value: slot.slotId,
    label: `${DAY_LABELS_FULL[slot.dayOfWeek]} ${slot.startTime} - ${slot.endTime}`,
  }));

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const upcomingCount = bookings.filter((b) => b.bookingDate >= today && b.status !== 'cancelled').length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;

  // ─── Render ─────────────────────────────────────────────────────────────────

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
        <div className={styles.headerTop}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Mes rendez-vous</h1>
            <p className={styles.subtitle}>Gérez vos sessions de mentorat</p>
          </div>
          <Link href="/mentors" className={styles.newBookingBtn}>
            <span className={styles.newBookingIcon}>+</span>
            Nouvelle réservation
          </Link>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{upcomingCount}</span>
            <span className={styles.statLabel}>À venir</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{completedCount}</span>
            <span className={styles.statLabel}>Terminées</span>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <button
            type="button"
            className={`${styles.filterBtn} ${filter === 'upcoming' ? styles.filterActive : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            À venir
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${filter === 'past' ? styles.filterActive : ''}`}
            onClick={() => setFilter('past')}
          >
            Passées
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${filter === 'all' ? styles.filterActive : ''}`}
            onClick={() => setFilter('all')}
          >
            Toutes
          </button>
        </div>
      </header>

      {/* Content */}
      <main className={styles.main}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingPulse} />
            <span className={styles.loadingText}>Chargement de vos rendez-vous...</span>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>{filter === 'upcoming' ? '📅' : '📋'}</span>
            <h2 className={styles.emptyTitle}>
              {filter === 'upcoming' ? 'Aucun rendez-vous à venir' : 'Aucun rendez-vous'}
            </h2>
            <p className={styles.emptyText}>
              {filter === 'upcoming'
                ? 'Réservez une session avec un mentor pour commencer.'
                : 'Aucun rendez-vous ne correspond à ce filtre.'}
            </p>
            {filter === 'upcoming' && (
              <Link href="/mentors" className={styles.emptyAction}>
                Trouver un mentor →
              </Link>
            )}
          </div>
        ) : (
          <div className={styles.bookingsList}>
            {filteredBookings.map((booking) => {
              const dateInfo = formatDate(booking.bookingDate);
              const participant = getOtherParticipant(booking);
              const statusConfig = STATUS_CONFIG[booking.status] ?? { label: booking.status, icon: '?' };

              return (
                <article key={booking.bookingId} className={styles.bookingCard} data-status={booking.status}>
                  {/* Date badge */}
                  <div className={styles.dateBadge}>
                    <span className={styles.dateDay}>{dateInfo.day}</span>
                    <span className={styles.dateMonth}>{dateInfo.month}</span>
                    <span className={styles.dateDayName}>{dateInfo.dayShort}</span>
                  </div>

                  {/* Content */}
                  <div className={styles.bookingContent}>
                    <div className={styles.bookingHeader}>
                      <div className={styles.participantInfo}>
                        <div className={styles.participantAvatar}>{participant.initial}</div>
                        <div className={styles.participantDetails}>
                          <span className={styles.participantName}>{participant.name}</span>
                          <span className={styles.participantRole}>{participant.role}</span>
                        </div>
                      </div>
                      <span className={`${styles.statusBadge} ${styles[`status${booking.status}`]}`}>
                        <span className={styles.statusIcon}>{statusConfig.icon}</span>
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className={styles.timeInfo}>
                      <span className={styles.timeIcon}>⏰</span>
                      <span className={styles.timeRange}>
                        {booking.startTime} — {booking.endTime}
                      </span>
                    </div>
                    <div className={styles.timeInfo}>
                      <span className={styles.timeIcon}>💶</span>
                      <span className={styles.timeRange}>{formatAmount(booking.priceCents)}</span>
                    </div>

                    {booking.notes && (
                      <div className={styles.notesPreview}>
                        <span className={styles.notesIcon}>📝</span>
                        <span className={styles.notesText}>{booking.notes}</span>
                      </div>
                    )}

                    {/* Completed banner */}
                    {booking.status === 'completed' && !dismissedNotes.has(booking.bookingId) && (
                      <div className={styles.feedbackBanner}>
                        <span className={styles.feedbackText}>Session terminée — partagez votre retour</span>
                        <div className={styles.feedbackActions}>
                          <Link href="/sessions/history" className={styles.feedbackLink}>
                            Donner mon avis
                          </Link>
                          <button
                            type="button"
                            className={styles.feedbackDismiss}
                            onClick={() => dismissNotesBanner(booking.bookingId)}
                            aria-label="Fermer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {isActive(booking.status) && (
                      <div className={styles.actions}>
                        {booking.status === 'pending' && (
                          <button
                            type="button"
                            className={styles.actionPrimary}
                            onClick={() => void startCheckout(booking.bookingId)}
                            disabled={paymentLoading === booking.bookingId}
                          >
                            {paymentLoading === booking.bookingId ? (
                              <>
                                <span className={styles.spinner} />
                                Redirection...
                              </>
                            ) : (
                              <>
                                <span className={styles.actionIcon}>💳</span>
                                Payer maintenant
                              </>
                            )}
                          </button>
                        )}
                        {booking.status === 'confirmed' && (
                          <button
                            type="button"
                            className={styles.actionPrimary}
                            onClick={() => void joinSession(booking.bookingId)}
                            disabled={sessionLoading === booking.bookingId}
                          >
                            {sessionLoading === booking.bookingId ? (
                              <>
                                <span className={styles.spinner} />
                                Chargement...
                              </>
                            ) : (
                              <>
                                <span className={styles.actionIcon}>📹</span>
                                Rejoindre la visio
                              </>
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          className={styles.actionSecondary}
                          onClick={() => void openRescheduleDialog(booking)}
                        >
                          Reporter
                        </button>
                        <button
                          type="button"
                          className={styles.actionDanger}
                          onClick={() => openCancelDialog(booking)}
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Cancel Dialog */}
      {cancelTarget && (
        <div className={styles.overlay} role="dialog" aria-modal="true" onClick={() => setCancelTarget(null)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dialogHeader}>
              <span className={styles.dialogIcon}>⚠️</span>
              <h2 className={styles.dialogTitle}>Annuler le rendez-vous ?</h2>
            </div>

            <div className={styles.dialogInfo}>
              <div className={styles.dialogInfoRow}>
                <span className={styles.dialogInfoLabel}>Date</span>
                <span className={styles.dialogInfoValue}>{formatDate(cancelTarget.bookingDate).full}</span>
              </div>
              <div className={styles.dialogInfoRow}>
                <span className={styles.dialogInfoLabel}>Horaire</span>
                <span className={styles.dialogInfoValue}>
                  {cancelTarget.startTime} — {cancelTarget.endTime}
                </span>
              </div>
            </div>

            <p className={styles.dialogWarning}>
              L'annulation est soumise à un préavis de 4h minimum. Les annulations tardives peuvent entraîner des frais.
            </p>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel} htmlFor="cancel-reason">
                Raison de l'annulation (optionnel)
              </label>
              <textarea
                id="cancel-reason"
                className={styles.inputTextarea}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Expliquez brièvement pourquoi vous annulez..."
                rows={2}
              />
            </div>

            <div className={styles.dialogActions}>
              <button type="button" className={styles.dialogCancel} onClick={() => setCancelTarget(null)}>
                Retour
              </button>
              <button
                type="button"
                className={styles.dialogConfirmDanger}
                onClick={() => void confirmCancel()}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <>
                    <span className={styles.spinner} />
                    Annulation...
                  </>
                ) : (
                  "Confirmer l'annulation"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Dialog */}
      {rescheduleTarget && (
        <div className={styles.overlay} role="dialog" aria-modal="true" onClick={() => setRescheduleTarget(null)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dialogHeader}>
              <span className={styles.dialogIcon}>📅</span>
              <h2 className={styles.dialogTitle}>Reporter le rendez-vous</h2>
            </div>

            <div className={styles.dialogInfo}>
              <div className={styles.dialogInfoRow}>
                <span className={styles.dialogInfoLabel}>Date actuelle</span>
                <span className={styles.dialogInfoValue}>{formatDate(rescheduleTarget.bookingDate).full}</span>
              </div>
              <div className={styles.dialogInfoRow}>
                <span className={styles.dialogInfoLabel}>Horaire actuel</span>
                <span className={styles.dialogInfoValue}>
                  {rescheduleTarget.startTime} — {rescheduleTarget.endTime}
                </span>
              </div>
            </div>

            <div className={styles.rescheduleForm}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel} htmlFor="new-slot">
                  Nouveau créneau
                </label>
                <select
                  id="new-slot"
                  className={styles.inputSelect}
                  value={newSlotId}
                  onChange={(e) => setNewSlotId(e.target.value)}
                >
                  <option value="">Sélectionnez un créneau</option>
                  {slotOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel} htmlFor="new-date">
                  Nouvelle date
                </label>
                <input
                  id="new-date"
                  type="date"
                  className={styles.inputDate}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={today}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel} htmlFor="reschedule-reason">
                  Raison du report (optionnel)
                </label>
                <textarea
                  id="reschedule-reason"
                  className={styles.inputTextarea}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Expliquez brièvement pourquoi vous reportez..."
                  rows={2}
                />
              </div>
            </div>

            <div className={styles.dialogActions}>
              <button type="button" className={styles.dialogCancel} onClick={() => setRescheduleTarget(null)}>
                Retour
              </button>
              <button
                type="button"
                className={styles.dialogConfirm}
                onClick={() => void confirmReschedule()}
                disabled={rescheduleLoading || !newSlotId || !newDate}
              >
                {rescheduleLoading ? (
                  <>
                    <span className={styles.spinner} />
                    Report en cours...
                  </>
                ) : (
                  'Confirmer le report'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
