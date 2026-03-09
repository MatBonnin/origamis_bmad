'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './AvailabilityManager.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const DAYS = [
  { key: 0, short: 'Dim', full: 'Dimanche' },
  { key: 1, short: 'Lun', full: 'Lundi' },
  { key: 2, short: 'Mar', full: 'Mardi' },
  { key: 3, short: 'Mer', full: 'Mercredi' },
  { key: 4, short: 'Jeu', full: 'Jeudi' },
  { key: 5, short: 'Ven', full: 'Vendredi' },
  { key: 6, short: 'Sam', full: 'Samedi' },
];

const DURATION_PRESETS = [
  { value: 30, label: '30m', icon: '⚡' },
  { value: 45, label: '45m', icon: '☕' },
  { value: 60, label: '1h', icon: '💬' },
  { value: 90, label: '1h30', icon: '🎯' },
  { value: 120, label: '2h', icon: '🚀' },
];

const BUFFER_PRESETS = [0, 5, 10, 15, 30];
const NOTICE_PRESETS = [
  { hours: 1, label: '1h' },
  { hours: 4, label: '4h' },
  { hours: 24, label: '24h' },
  { hours: 48, label: '48h' },
  { hours: 168, label: '1 sem' },
];
const WINDOW_PRESETS = [
  { days: 7, label: '1 sem' },
  { days: 14, label: '2 sem' },
  { days: 30, label: '1 mois' },
  { days: 60, label: '2 mois' },
  { days: 90, label: '3 mois' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimeWindow {
  start: string;
  end: string;
}

interface DaySchedule {
  dayOfWeek: number;
  dayName: string;
  isAvailable: boolean;
  timeWindows: TimeWindow[];
}

interface DateOverride {
  id: string;
  date: string;
  overrideType: 'unavailable' | 'custom_hours';
  timeWindows: TimeWindow[] | null;
  reason: string | null;
}

interface SchedulingSettings {
  sessionDuration: number;
  bufferBefore: number;
  bufferAfter: number;
  minNoticeHours: number;
  maxDaysAhead: number;
  startTimeIncrement: number;
  dailyLimit: number | null;
  weeklyLimit: number | null;
  timezone: string;
}

interface FullAvailability {
  isAvailable: boolean;
  nextAvailableAt: string | null;
  settings: SchedulingSettings;
  weeklySchedule: DaySchedule[];
  dateOverrides: DateOverride[];
}

interface Props {
  accessToken: string;
}

type ViewType = 'schedule' | 'settings' | 'exceptions';

// ─── Component ────────────────────────────────────────────────────────────────

export function AvailabilityManager({ accessToken }: Props) {
  const [activeView, setActiveView] = useState<ViewType>('schedule');
  const [availability, setAvailability] = useState<FullAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Override form
  const [newOverrideDate, setNewOverrideDate] = useState('');
  const [newOverrideType, setNewOverrideType] = useState<'unavailable' | 'custom_hours'>('unavailable');
  const [newOverrideReason, setNewOverrideReason] = useState('');
  const [newOverrideWindows, setNewOverrideWindows] = useState<TimeWindow[]>([{ start: '09:00', end: '12:00' }]);

  const headers = { Authorization: `Bearer ${accessToken}` };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── Load Data ────────────────────────────────────────────────────────────

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/mentors/me/availability`, { headers, cache: 'no-store' });
      const result = await res.json();
      if (!res.ok || result.error) {
        showToast('error', result.error?.message || 'Erreur de chargement');
        return;
      }
      setAvailability(result.data as FullAvailability);
    } catch {
      showToast('error', 'Connexion impossible');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  // ─── API Calls ────────────────────────────────────────────────────────────

  const updateGeneral = async (isAvailable: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/mentors/me/availability/general`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        showToast('error', result.error?.message || 'Erreur');
        return;
      }
      setAvailability((prev) => prev ? { ...prev, isAvailable: result.data.isAvailable } : prev);
      showToast('success', isAvailable ? 'Vous êtes maintenant disponible' : 'Réservations désactivées');
    } catch {
      showToast('error', 'Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = async (settings: Partial<SchedulingSettings>) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/mentors/me/availability/settings`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        showToast('error', result.error?.message || 'Erreur');
        return;
      }
      setAvailability((prev) => prev ? { ...prev, settings: result.data } : prev);
      showToast('success', 'Paramètres enregistrés');
    } catch {
      showToast('error', 'Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const updateDaySchedule = async (dayOfWeek: number, isAvailable: boolean, timeWindows: TimeWindow[]) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/mentors/me/availability/schedule/${dayOfWeek}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable, timeWindows }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        showToast('error', result.error?.message || 'Erreur');
        return;
      }
      setAvailability((prev) => {
        if (!prev) return prev;
        const newSchedule = [...prev.weeklySchedule];
        const idx = newSchedule.findIndex((d) => d.dayOfWeek === dayOfWeek);
        if (idx >= 0) newSchedule[idx] = result.data;
        return { ...prev, weeklySchedule: newSchedule };
      });
      showToast('success', `${DAYS[dayOfWeek].full} mis à jour`);
    } catch {
      showToast('error', 'Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const createOverride = async () => {
    if (!newOverrideDate) {
      showToast('error', 'Sélectionnez une date');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/mentors/me/availability/overrides`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newOverrideDate,
          overrideType: newOverrideType,
          timeWindows: newOverrideType === 'custom_hours' ? newOverrideWindows : undefined,
          reason: newOverrideReason || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        showToast('error', result.error?.message || 'Erreur');
        return;
      }
      setAvailability((prev) => prev ? {
        ...prev,
        dateOverrides: [...prev.dateOverrides, result.data].sort((a, b) => a.date.localeCompare(b.date)),
      } : prev);
      setNewOverrideDate('');
      setNewOverrideReason('');
      setNewOverrideType('unavailable');
      setNewOverrideWindows([{ start: '09:00', end: '12:00' }]);
      showToast('success', 'Exception ajoutée');
    } catch {
      showToast('error', 'Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const deleteOverride = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/mentors/me/availability/overrides/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setAvailability((prev) => prev ? {
          ...prev,
          dateOverrides: prev.dateOverrides.filter((o) => o.id !== id),
        } : prev);
        showToast('success', 'Exception supprimée');
      }
    } catch {
      showToast('error', 'Erreur');
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const timeToPercent = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return ((h * 60 + m) / (24 * 60)) * 100;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingPulse} />
        <span className={styles.loadingText}>Chargement de vos disponibilités...</span>
      </div>
    );
  }

  if (!availability) {
    return (
      <div className={styles.errorContainer}>
        <span className={styles.errorIcon}>⚠️</span>
        <p>Impossible de charger vos disponibilités</p>
        <button onClick={() => void loadAvailability()} className={styles.retryBtn}>
          Réessayer
        </button>
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
        <div className={styles.headerContent}>
          <div className={styles.titleArea}>
            <h1 className={styles.title}>Disponibilités</h1>
            <p className={styles.subtitle}>Définissez quand vos étudiants peuvent réserver</p>
          </div>

          {/* Master Toggle */}
          <button
            type="button"
            className={`${styles.masterToggle} ${availability.isAvailable ? styles.toggleOn : styles.toggleOff}`}
            onClick={() => void updateGeneral(!availability.isAvailable)}
            disabled={saving}
            aria-pressed={availability.isAvailable}
          >
            <span className={styles.toggleTrack}>
              <span className={styles.toggleThumb} />
            </span>
            <span className={styles.toggleLabel}>
              {availability.isAvailable ? 'Disponible' : 'Indisponible'}
            </span>
          </button>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          <button
            type="button"
            className={`${styles.navItem} ${activeView === 'schedule' ? styles.navActive : ''}`}
            onClick={() => setActiveView('schedule')}
          >
            <span className={styles.navIcon}>📅</span>
            <span className={styles.navLabel}>Planning</span>
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${activeView === 'settings' ? styles.navActive : ''}`}
            onClick={() => setActiveView('settings')}
          >
            <span className={styles.navIcon}>⚙️</span>
            <span className={styles.navLabel}>Paramètres</span>
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${activeView === 'exceptions' ? styles.navActive : ''}`}
            onClick={() => setActiveView('exceptions')}
          >
            <span className={styles.navIcon}>🚫</span>
            <span className={styles.navLabel}>Exceptions</span>
            {availability.dateOverrides.length > 0 && (
              <span className={styles.navBadge}>{availability.dateOverrides.length}</span>
            )}
          </button>
        </nav>
      </header>

      {/* Content */}
      <main className={styles.main}>
        {/* Schedule View */}
        {activeView === 'schedule' && (
          <div className={styles.scheduleView}>
            <div className={styles.scheduleHeader}>
              <h2 className={styles.sectionTitle}>Planning hebdomadaire</h2>
              <p className={styles.sectionDesc}>Cliquez sur un jour pour le configurer</p>
            </div>

            {/* Timeline Grid */}
            <div className={styles.timelineContainer}>
              {/* Time markers */}
              <div className={styles.timeMarkers}>
                {[0, 6, 12, 18, 24].map((h) => (
                  <span key={h} className={styles.timeMarker}>{h}h</span>
                ))}
              </div>

              {/* Days */}
              <div className={styles.daysGrid}>
                {DAYS.map((day) => {
                  const schedule = availability.weeklySchedule.find((d) => d.dayOfWeek === day.key);
                  const isActive = schedule?.isAvailable ?? false;
                  const windows = schedule?.timeWindows ?? [];
                  const isSelected = selectedDay === day.key;

                  return (
                    <div
                      key={day.key}
                      className={`${styles.dayRow} ${isActive ? styles.dayActive : styles.dayInactive} ${isSelected ? styles.daySelected : ''}`}
                      onClick={() => setSelectedDay(isSelected ? null : day.key)}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                    >
                      <div className={styles.dayLabel}>
                        <span className={styles.dayShort}>{day.short}</span>
                        <span className={styles.dayStatus}>
                          {isActive ? `${windows.length} plage${windows.length > 1 ? 's' : ''}` : 'Fermé'}
                        </span>
                      </div>

                      <div className={styles.dayTimeline}>
                        <div className={styles.timelineTrack} />
                        {windows.map((w, i) => (
                          <div
                            key={i}
                            className={styles.timeBlock}
                            style={{
                              left: `${timeToPercent(w.start)}%`,
                              width: `${timeToPercent(w.end) - timeToPercent(w.start)}%`,
                            }}
                            title={`${w.start} - ${w.end}`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Day Editor */}
            {selectedDay !== null && (
              <DayEditor
                day={DAYS[selectedDay]}
                schedule={availability.weeklySchedule.find((d) => d.dayOfWeek === selectedDay)!}
                saving={saving}
                onSave={(isAvailable, windows) => {
                  void updateDaySchedule(selectedDay, isAvailable, windows);
                }}
                onClose={() => setSelectedDay(null)}
              />
            )}
          </div>
        )}

        {/* Settings View */}
        {activeView === 'settings' && (
          <div className={styles.settingsView}>
            {/* Session Duration */}
            <section className={styles.settingSection}>
              <div className={styles.settingHeader}>
                <span className={styles.settingIcon}>⏱️</span>
                <div>
                  <h3 className={styles.settingTitle}>Durée des sessions</h3>
                  <p className={styles.settingDesc}>Combien de temps dure une session de mentorat ?</p>
                </div>
              </div>
              <div className={styles.durationGrid}>
                {DURATION_PRESETS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    className={`${styles.durationBtn} ${availability.settings.sessionDuration === d.value ? styles.durationActive : ''}`}
                    onClick={() => void updateSettings({ sessionDuration: d.value })}
                  >
                    <span className={styles.durationIcon}>{d.icon}</span>
                    <span className={styles.durationLabel}>{d.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Buffer Time */}
            <section className={styles.settingSection}>
              <div className={styles.settingHeader}>
                <span className={styles.settingIcon}>☕</span>
                <div>
                  <h3 className={styles.settingTitle}>Temps de pause</h3>
                  <p className={styles.settingDesc}>Pause entre les sessions pour vous préparer</p>
                </div>
              </div>
              <div className={styles.bufferGrid}>
                <div className={styles.bufferGroup}>
                  <label className={styles.bufferLabel}>Avant</label>
                  <div className={styles.bufferOptions}>
                    {BUFFER_PRESETS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        className={`${styles.bufferBtn} ${availability.settings.bufferBefore === b ? styles.bufferActive : ''}`}
                        onClick={() => void updateSettings({ bufferBefore: b })}
                      >
                        {b === 0 ? '0' : `${b}m`}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.bufferGroup}>
                  <label className={styles.bufferLabel}>Après</label>
                  <div className={styles.bufferOptions}>
                    {BUFFER_PRESETS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        className={`${styles.bufferBtn} ${availability.settings.bufferAfter === b ? styles.bufferActive : ''}`}
                        onClick={() => void updateSettings({ bufferAfter: b })}
                      >
                        {b === 0 ? '0' : `${b}m`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Booking Rules */}
            <section className={styles.settingSection}>
              <div className={styles.settingHeader}>
                <span className={styles.settingIcon}>📋</span>
                <div>
                  <h3 className={styles.settingTitle}>Règles de réservation</h3>
                  <p className={styles.settingDesc}>Contrôlez quand les étudiants peuvent réserver</p>
                </div>
              </div>
              <div className={styles.rulesGrid}>
                <div className={styles.ruleGroup}>
                  <label className={styles.ruleLabel}>Préavis minimum</label>
                  <div className={styles.ruleOptions}>
                    {NOTICE_PRESETS.map((n) => (
                      <button
                        key={n.hours}
                        type="button"
                        className={`${styles.ruleBtn} ${availability.settings.minNoticeHours === n.hours ? styles.ruleActive : ''}`}
                        onClick={() => void updateSettings({ minNoticeHours: n.hours })}
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.ruleGroup}>
                  <label className={styles.ruleLabel}>Fenêtre de réservation</label>
                  <div className={styles.ruleOptions}>
                    {WINDOW_PRESETS.map((w) => (
                      <button
                        key={w.days}
                        type="button"
                        className={`${styles.ruleBtn} ${availability.settings.maxDaysAhead === w.days ? styles.ruleActive : ''}`}
                        onClick={() => void updateSettings({ maxDaysAhead: w.days })}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Limits */}
            <section className={styles.settingSection}>
              <div className={styles.settingHeader}>
                <span className={styles.settingIcon}>🎯</span>
                <div>
                  <h3 className={styles.settingTitle}>Limites</h3>
                  <p className={styles.settingDesc}>Évitez le surmenage en limitant vos sessions</p>
                </div>
              </div>
              <div className={styles.limitsGrid}>
                <div className={styles.limitGroup}>
                  <label className={styles.limitLabel}>Max par jour</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    placeholder="∞"
                    value={availability.settings.dailyLimit ?? ''}
                    onChange={(e) => void updateSettings({ dailyLimit: e.target.value ? Number(e.target.value) : null })}
                    className={styles.limitInput}
                  />
                </div>
                <div className={styles.limitGroup}>
                  <label className={styles.limitLabel}>Max par semaine</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    placeholder="∞"
                    value={availability.settings.weeklyLimit ?? ''}
                    onChange={(e) => void updateSettings({ weeklyLimit: e.target.value ? Number(e.target.value) : null })}
                    className={styles.limitInput}
                  />
                </div>
              </div>
            </section>

            {/* Timezone */}
            <section className={styles.settingSection}>
              <div className={styles.settingHeader}>
                <span className={styles.settingIcon}>🌍</span>
                <div>
                  <h3 className={styles.settingTitle}>Fuseau horaire</h3>
                  <p className={styles.settingDesc}>Tous les horaires sont affichés dans ce fuseau</p>
                </div>
              </div>
              <input
                type="text"
                value={availability.settings.timezone}
                onChange={(e) => void updateSettings({ timezone: e.target.value })}
                className={styles.timezoneInput}
                placeholder="Europe/Paris"
              />
            </section>
          </div>
        )}

        {/* Exceptions View */}
        {activeView === 'exceptions' && (
          <div className={styles.exceptionsView}>
            {/* Add Exception */}
            <section className={styles.addException}>
              <h2 className={styles.sectionTitle}>Ajouter une exception</h2>
              <p className={styles.sectionDesc}>Bloquez un jour ou modifiez vos horaires ponctuellement</p>

              <div className={styles.exceptionForm}>
                <div className={styles.exceptionRow}>
                  <input
                    type="date"
                    value={newOverrideDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setNewOverrideDate(e.target.value)}
                    className={styles.dateInput}
                  />
                  <div className={styles.typeToggle}>
                    <button
                      type="button"
                      className={`${styles.typeBtn} ${newOverrideType === 'unavailable' ? styles.typeActive : ''}`}
                      onClick={() => setNewOverrideType('unavailable')}
                    >
                      🚫 Indisponible
                    </button>
                    <button
                      type="button"
                      className={`${styles.typeBtn} ${newOverrideType === 'custom_hours' ? styles.typeActive : ''}`}
                      onClick={() => setNewOverrideType('custom_hours')}
                    >
                      🕐 Horaires modifiés
                    </button>
                  </div>
                </div>

                {newOverrideType === 'custom_hours' && (
                  <div className={styles.customHours}>
                    {newOverrideWindows.map((w, i) => (
                      <div key={i} className={styles.windowRow}>
                        <input
                          type="time"
                          value={w.start}
                          onChange={(e) => {
                            const updated = [...newOverrideWindows];
                            updated[i] = { ...updated[i], start: e.target.value };
                            setNewOverrideWindows(updated);
                          }}
                          className={styles.timeInput}
                        />
                        <span className={styles.timeSep}>→</span>
                        <input
                          type="time"
                          value={w.end}
                          onChange={(e) => {
                            const updated = [...newOverrideWindows];
                            updated[i] = { ...updated[i], end: e.target.value };
                            setNewOverrideWindows(updated);
                          }}
                          className={styles.timeInput}
                        />
                        {newOverrideWindows.length > 1 && (
                          <button
                            type="button"
                            className={styles.removeBtn}
                            onClick={() => setNewOverrideWindows(newOverrideWindows.filter((_, j) => j !== i))}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className={styles.addWindowBtn}
                      onClick={() => setNewOverrideWindows([...newOverrideWindows, { start: '14:00', end: '18:00' }])}
                    >
                      + Ajouter une plage
                    </button>
                  </div>
                )}

                <input
                  type="text"
                  value={newOverrideReason}
                  onChange={(e) => setNewOverrideReason(e.target.value)}
                  placeholder="Raison (optionnel) : Vacances, RDV médical..."
                  className={styles.reasonInput}
                />

                <button
                  type="button"
                  className={styles.submitBtn}
                  onClick={() => void createOverride()}
                  disabled={saving || !newOverrideDate}
                >
                  {saving ? 'Enregistrement...' : 'Ajouter l\'exception'}
                </button>
              </div>
            </section>

            {/* Exceptions List */}
            <section className={styles.exceptionsList}>
              <h3 className={styles.listTitle}>
                Exceptions planifiées
                <span className={styles.listCount}>{availability.dateOverrides.length}</span>
              </h3>

              {availability.dateOverrides.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>📭</span>
                  <p>Aucune exception configurée</p>
                </div>
              ) : (
                <ul className={styles.exceptionItems}>
                  {availability.dateOverrides.map((override) => (
                    <li key={override.id} className={styles.exceptionItem}>
                      <div className={styles.exceptionDate}>
                        <span className={styles.dateText}>{formatDate(override.date)}</span>
                        <span className={`${styles.exceptionType} ${styles[override.overrideType]}`}>
                          {override.overrideType === 'unavailable' ? '🚫 Indisponible' : '🕐 Modifié'}
                        </span>
                      </div>
                      {override.reason && <span className={styles.exceptionReason}>{override.reason}</span>}
                      {override.timeWindows && (
                        <span className={styles.exceptionHours}>
                          {override.timeWindows.map((w) => `${w.start}-${w.end}`).join(', ')}
                        </span>
                      )}
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => void deleteOverride(override.id)}
                        aria-label="Supprimer"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Day Editor Component ───────────────────────────────────────────────────

interface DayEditorProps {
  day: { key: number; short: string; full: string };
  schedule: DaySchedule;
  saving: boolean;
  onSave: (isAvailable: boolean, windows: TimeWindow[]) => void;
  onClose: () => void;
}

function DayEditor({ day, schedule, saving, onSave, onClose }: DayEditorProps) {
  const [isAvailable, setIsAvailable] = useState(schedule.isAvailable);
  const [windows, setWindows] = useState<TimeWindow[]>(
    schedule.timeWindows.length > 0 ? [...schedule.timeWindows] : [{ start: '09:00', end: '17:00' }]
  );
  const [isDirty, setIsDirty] = useState(false);

  const handleSave = () => {
    onSave(isAvailable, isAvailable ? windows : []);
    setIsDirty(false);
  };

  return (
    <div className={styles.dayEditor}>
      <div className={styles.editorHeader}>
        <h3 className={styles.editorTitle}>{day.full}</h3>
        <button type="button" className={styles.closeBtn} onClick={onClose}>×</button>
      </div>

      <div className={styles.editorContent}>
        <label className={styles.availableToggle}>
          <input
            type="checkbox"
            checked={isAvailable}
            onChange={(e) => {
              setIsAvailable(e.target.checked);
              setIsDirty(true);
            }}
            className={styles.toggleCheckbox}
          />
          <span className={styles.toggleSwitch} />
          <span>{isAvailable ? 'Disponible' : 'Fermé'}</span>
        </label>

        {isAvailable && (
          <div className={styles.windowsEditor}>
            {windows.map((w, i) => (
              <div key={i} className={styles.windowEdit}>
                <input
                  type="time"
                  value={w.start}
                  onChange={(e) => {
                    const updated = [...windows];
                    updated[i] = { ...updated[i], start: e.target.value };
                    setWindows(updated);
                    setIsDirty(true);
                  }}
                  className={styles.timeEditInput}
                />
                <span className={styles.timeTo}>à</span>
                <input
                  type="time"
                  value={w.end}
                  onChange={(e) => {
                    const updated = [...windows];
                    updated[i] = { ...updated[i], end: e.target.value };
                    setWindows(updated);
                    setIsDirty(true);
                  }}
                  className={styles.timeEditInput}
                />
                {windows.length > 1 && (
                  <button
                    type="button"
                    className={styles.removeWindowBtn}
                    onClick={() => {
                      setWindows(windows.filter((_, j) => j !== i));
                      setIsDirty(true);
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className={styles.addSlotBtn}
              onClick={() => {
                setWindows([...windows, { start: '14:00', end: '18:00' }]);
                setIsDirty(true);
              }}
            >
              + Ajouter une plage horaire
            </button>
          </div>
        )}
      </div>

      <div className={styles.editorFooter}>
        <button type="button" className={styles.cancelBtn} onClick={onClose}>
          Annuler
        </button>
        <button
          type="button"
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving || !isDirty}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}
