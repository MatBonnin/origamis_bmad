'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './CalendarView.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAY_NAMES_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'warning' },
  confirmed: { label: 'Confirmé', color: 'success' },
  cancelled: { label: 'Annulé', color: 'error' },
  completed: { label: 'Terminé', color: 'blue' },
};

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

type ViewMode = 'month' | 'week';

export function CalendarView({ accessToken, userId }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [hoveredBooking, setHoveredBooking] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${accessToken}` };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Load Bookings ──────────────────────────────────────────────────────────

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

  // ─── Calendar Helpers ───────────────────────────────────────────────────────

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Adjust for Monday start (0 = Monday, 6 = Sunday)
    let startPadding = firstDay.getDay() - 1;
    if (startPadding < 0) startPadding = 6;

    const days: (Date | null)[] = [];

    // Add padding for days before month start
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    // Pad to complete the last week
    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  };

  const getWeekDays = (date: Date) => {
    const days: Date[] = [];
    const dayOfWeek = date.getDay();
    // Adjust for Monday start
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(date);
    monday.setDate(date.getDate() + mondayOffset);

    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const monthDays = useMemo(() => getMonthDays(currentDate), [currentDate]);
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const displayDays = viewMode === 'month' ? monthDays : weekDays;

  // ─── Bookings by Date ───────────────────────────────────────────────────────

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const booking of bookings) {
      const dateKey = booking.bookingDate;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(booking);
    }
    // Sort bookings by start time
    map.forEach((list) => {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return map;
  }, [bookings]);

  const getBookingsForDay = (date: Date | null) => {
    if (!date) return [];
    const dateKey = formatDateKey(date);
    return bookingsByDate.get(dateKey) ?? [];
  };

  // ─── Navigation ─────────────────────────────────────────────────────────────

  const navigatePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // ─── Formatters ─────────────────────────────────────────────────────────────

  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatMonthYear = (date: Date) => {
    return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatWeekRange = (days: Date[]) => {
    const first = days[0];
    const last = days[6];
    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()} - ${last.getDate()} ${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`;
    }
    return `${first.getDate()} ${MONTH_NAMES[first.getMonth()].slice(0, 3)} - ${last.getDate()} ${MONTH_NAMES[last.getMonth()].slice(0, 3)} ${last.getFullYear()}`;
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    return formatDateKey(date) === formatDateKey(today);
  };

  const isCurrentMonth = (date: Date | null) => {
    if (!date) return false;
    return date.getMonth() === currentDate.getMonth();
  };

  const getOtherParticipant = (booking: Booking) => {
    if (booking.student.id === userId) {
      return `${booking.mentor.firstName} ${booking.mentor.lastName}`;
    }
    return `${booking.student.firstName} ${booking.student.lastName}`;
  };

  const getParticipantInitial = (booking: Booking) => {
    if (booking.student.id === userId) {
      return booking.mentor.firstName.charAt(0);
    }
    return booking.student.firstName.charAt(0);
  };

  // ─── Day Click Handler ──────────────────────────────────────────────────────

  const handleDayClick = (date: Date | null) => {
    if (!date) return;
    setSelectedDay(selectedDay && formatDateKey(selectedDay) === formatDateKey(date) ? null : date);
  };

  // ─── Selected Day Details ───────────────────────────────────────────────────

  const selectedDayBookings = selectedDay ? getBookingsForDay(selectedDay) : [];

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const monthStats = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startKey = formatDateKey(start);
    const endKey = formatDateKey(end);

    let total = 0;
    let upcoming = 0;
    let completed = 0;

    bookings.forEach((b) => {
      if (b.bookingDate >= startKey && b.bookingDate <= endKey) {
        total++;
        if (b.status === 'confirmed' || b.status === 'pending') upcoming++;
        if (b.status === 'completed') completed++;
      }
    });

    return { total, upcoming, completed };
  }, [bookings, currentDate]);

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
            <h1 className={styles.title}>Calendrier</h1>
            <p className={styles.subtitle}>Visualisez vos sessions de mentorat</p>
          </div>
          <Link href="/bookings" className={styles.listViewBtn}>
            <span className={styles.listIcon}>☰</span>
            Vue liste
          </Link>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{monthStats.total}</span>
            <span className={styles.statLabel}>Ce mois</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{monthStats.upcoming}</span>
            <span className={styles.statLabel}>À venir</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{monthStats.completed}</span>
            <span className={styles.statLabel}>Terminées</span>
          </div>
        </div>
      </header>

      {/* Calendar Controls */}
      <div className={styles.controls}>
        <div className={styles.navigation}>
          <button type="button" className={styles.navBtn} onClick={navigatePrev} aria-label="Précédent">
            ←
          </button>
          <h2 className={styles.currentPeriod}>
            {viewMode === 'month' ? formatMonthYear(currentDate) : formatWeekRange(weekDays)}
          </h2>
          <button type="button" className={styles.navBtn} onClick={navigateNext} aria-label="Suivant">
            →
          </button>
        </div>

        <div className={styles.controlsRight}>
          <button type="button" className={styles.todayBtn} onClick={goToToday}>
            Aujourd'hui
          </button>
          <div className={styles.viewToggle}>
            <button
              type="button"
              className={`${styles.viewBtn} ${viewMode === 'month' ? styles.viewActive : ''}`}
              onClick={() => setViewMode('month')}
            >
              Mois
            </button>
            <button
              type="button"
              className={`${styles.viewBtn} ${viewMode === 'week' ? styles.viewActive : ''}`}
              onClick={() => setViewMode('week')}
            >
              Semaine
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className={styles.calendarWrapper}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingPulse} />
            <span className={styles.loadingText}>Chargement du calendrier...</span>
          </div>
        ) : (
          <>
            {/* Day Headers */}
            <div className={styles.dayHeaders}>
              {DAY_NAMES.map((day) => (
                <div key={day} className={styles.dayHeader}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className={`${styles.calendarGrid} ${viewMode === 'week' ? styles.weekView : ''}`}>
              {displayDays.map((date, idx) => {
                const dayBookings = getBookingsForDay(date);
                const hasBookings = dayBookings.length > 0;
                const isTodayDate = isToday(date);
                const isSelected = selectedDay && date && formatDateKey(selectedDay) === formatDateKey(date);
                const isOtherMonth = date && !isCurrentMonth(date);

                return (
                  <div
                    key={idx}
                    className={`${styles.dayCell} ${!date ? styles.emptyCell : ''} ${isTodayDate ? styles.today : ''} ${isSelected ? styles.selected : ''} ${isOtherMonth ? styles.otherMonth : ''} ${hasBookings ? styles.hasBookings : ''}`}
                    onClick={() => handleDayClick(date)}
                    role={date ? 'button' : undefined}
                    tabIndex={date ? 0 : undefined}
                  >
                    {date && (
                      <>
                        <span className={styles.dayNumber}>{date.getDate()}</span>
                        {hasBookings && (
                          <div className={styles.bookingDots}>
                            {dayBookings.slice(0, 3).map((booking) => (
                              <div
                                key={booking.bookingId}
                                className={`${styles.bookingDot} ${styles[`dot${STATUS_CONFIG[booking.status]?.color || 'default'}`]}`}
                                onMouseEnter={() => setHoveredBooking(booking.bookingId)}
                                onMouseLeave={() => setHoveredBooking(null)}
                              >
                                {/* Tooltip */}
                                {hoveredBooking === booking.bookingId && (
                                  <div className={styles.tooltip}>
                                    <div className={styles.tooltipHeader}>
                                      <span className={styles.tooltipTime}>
                                        {booking.startTime} - {booking.endTime}
                                      </span>
                                      <span className={`${styles.tooltipStatus} ${styles[`status${STATUS_CONFIG[booking.status]?.color || 'default'}`]}`}>
                                        {STATUS_CONFIG[booking.status]?.label || booking.status}
                                      </span>
                                    </div>
                                    <div className={styles.tooltipParticipant}>
                                      <span className={styles.tooltipAvatar}>
                                        {getParticipantInitial(booking)}
                                      </span>
                                      <span className={styles.tooltipName}>
                                        {getOtherParticipant(booking)}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                            {dayBookings.length > 3 && (
                              <span className={styles.moreCount}>+{dayBookings.length - 3}</span>
                            )}
                          </div>
                        )}
                        {viewMode === 'week' && hasBookings && (
                          <div className={styles.weekBookings}>
                            {dayBookings.map((booking) => (
                              <div
                                key={booking.bookingId}
                                className={`${styles.weekBookingItem} ${styles[`item${STATUS_CONFIG[booking.status]?.color || 'default'}`]}`}
                              >
                                <span className={styles.weekBookingTime}>{booking.startTime}</span>
                                <span className={styles.weekBookingName}>{getOtherParticipant(booking)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Selected Day Panel */}
      {selectedDay && (
        <div className={styles.dayPanel}>
          <div className={styles.dayPanelHeader}>
            <div className={styles.dayPanelDate}>
              <span className={styles.dayPanelDayName}>
                {DAY_NAMES_FULL[selectedDay.getDay() === 0 ? 6 : selectedDay.getDay() - 1]}
              </span>
              <span className={styles.dayPanelFullDate}>
                {selectedDay.getDate()} {MONTH_NAMES[selectedDay.getMonth()]} {selectedDay.getFullYear()}
              </span>
            </div>
            <button
              type="button"
              className={styles.dayPanelClose}
              onClick={() => setSelectedDay(null)}
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          {selectedDayBookings.length === 0 ? (
            <div className={styles.dayPanelEmpty}>
              <span className={styles.dayPanelEmptyIcon}>📅</span>
              <p className={styles.dayPanelEmptyText}>Aucune session ce jour</p>
              <Link href="/mentors" className={styles.dayPanelEmptyAction}>
                Réserver une session →
              </Link>
            </div>
          ) : (
            <div className={styles.dayPanelBookings}>
              {selectedDayBookings.map((booking) => {
                const statusConfig = STATUS_CONFIG[booking.status] || { label: booking.status, color: 'default' };
                return (
                  <div key={booking.bookingId} className={styles.dayPanelBooking}>
                    <div className={styles.dayPanelBookingHeader}>
                      <div className={styles.dayPanelTimeBlock}>
                        <span className={styles.dayPanelTime}>{booking.startTime}</span>
                        <span className={styles.dayPanelTimeSep}>—</span>
                        <span className={styles.dayPanelTime}>{booking.endTime}</span>
                      </div>
                      <span className={`${styles.dayPanelStatus} ${styles[`panel${statusConfig.color}`]}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className={styles.dayPanelParticipant}>
                      <div className={styles.dayPanelAvatar}>
                        {getParticipantInitial(booking)}
                      </div>
                      <div className={styles.dayPanelParticipantInfo}>
                        <span className={styles.dayPanelParticipantName}>
                          {getOtherParticipant(booking)}
                        </span>
                        <span className={styles.dayPanelParticipantRole}>
                          {booking.student.id === userId ? 'Mentor' : 'Étudiant'}
                        </span>
                      </div>
                    </div>

                    {booking.notes && (
                      <p className={styles.dayPanelNotes}>{booking.notes}</p>
                    )}

                    <div className={styles.dayPanelActions}>
                      {booking.status === 'pending' && (
                        <Link
                          href={`/paiement?bookingId=${booking.bookingId}`}
                          className={styles.dayPanelActionPrimary}
                        >
                          Payer
                        </Link>
                      )}
                      {booking.status === 'confirmed' && (
                        <Link
                          href={`/bookings`}
                          className={styles.dayPanelActionPrimary}
                        >
                          Rejoindre
                        </Link>
                      )}
                      <Link
                        href={`/bookings`}
                        className={styles.dayPanelActionSecondary}
                      >
                        Voir détails
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendTitle}>Légende :</span>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotwarning}`} />
            <span>En attente</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotsuccess}`} />
            <span>Confirmé</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotblue}`} />
            <span>Terminé</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.doterror}`} />
            <span>Annulé</span>
          </div>
        </div>
      </div>
    </div>
  );
}
