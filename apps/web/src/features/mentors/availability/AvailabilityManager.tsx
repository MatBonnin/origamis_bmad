'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@/components/ui';
import styles from './AvailabilityManager.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const DAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const SESSION_DURATIONS = [
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 heure' },
  { value: '90', label: '1h30' },
  { value: '120', label: '2 heures' },
];

const BUFFER_OPTIONS = [
  { value: '0', label: 'Aucun' },
  { value: '5', label: '5 min' },
  { value: '10', label: '10 min' },
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '60', label: '1 heure' },
];

const NOTICE_OPTIONS = [
  { value: '1', label: '1 heure' },
  { value: '2', label: '2 heures' },
  { value: '4', label: '4 heures' },
  { value: '12', label: '12 heures' },
  { value: '24', label: '24 heures' },
  { value: '48', label: '48 heures' },
  { value: '72', label: '3 jours' },
  { value: '168', label: '1 semaine' },
];

const MAX_DAYS_OPTIONS = [
  { value: '7', label: '1 semaine' },
  { value: '14', label: '2 semaines' },
  { value: '30', label: '1 mois' },
  { value: '60', label: '2 mois' },
  { value: '90', label: '3 mois' },
  { value: '180', label: '6 mois' },
  { value: '365', label: '1 an' },
];

const INCREMENT_OPTIONS = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '60', label: '1 heure' },
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

type TabType = 'settings' | 'schedule' | 'overrides';

// ─── Component ────────────────────────────────────────────────────────────────

export function AvailabilityManager({ accessToken }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('schedule');
  const [availability, setAvailability] = useState<FullAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Override form state
  const [newOverrideDate, setNewOverrideDate] = useState('');
  const [newOverrideType, setNewOverrideType] = useState<'unavailable' | 'custom_hours'>('unavailable');
  const [newOverrideReason, setNewOverrideReason] = useState('');
  const [newOverrideWindows, setNewOverrideWindows] = useState<TimeWindow[]>([{ start: '09:00', end: '12:00' }]);

  const headers = { Authorization: `Bearer ${accessToken}` };

  // ─── Load Data ────────────────────────────────────────────────────────────

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/mentors/me/availability`, {
        headers,
        cache: 'no-store',
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || 'Impossible de charger les disponibilites');
        return;
      }
      setAvailability(result.data as FullAvailability);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  // ─── API Calls ────────────────────────────────────────────────────────────

  const updateGeneral = async (payload: { isAvailable?: boolean; nextAvailableAt?: string }) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/mentors/me/availability/general`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || 'Erreur de mise a jour');
        return;
      }
      setAvailability((prev) => prev ? { ...prev, isAvailable: result.data.isAvailable } : prev);
      setSuccess('Statut mis a jour');
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = async (settings: Partial<SchedulingSettings>) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/mentors/me/availability/settings`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || 'Erreur de mise a jour');
        return;
      }
      setAvailability((prev) => prev ? { ...prev, settings: result.data } : prev);
      setSuccess('Parametres mis a jour');
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const updateDaySchedule = async (dayOfWeek: number, isAvailable: boolean, timeWindows: TimeWindow[]) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/mentors/me/availability/schedule/${dayOfWeek}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable, timeWindows }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || 'Erreur de mise a jour');
        return;
      }
      setAvailability((prev) => {
        if (!prev) return prev;
        const newSchedule = [...prev.weeklySchedule];
        const idx = newSchedule.findIndex((d) => d.dayOfWeek === dayOfWeek);
        if (idx >= 0) {
          newSchedule[idx] = result.data;
        }
        return { ...prev, weeklySchedule: newSchedule };
      });
      setSuccess(`${DAY_LABELS[dayOfWeek]} mis a jour`);
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const createOverride = async () => {
    if (!newOverrideDate) {
      setError('Veuillez selectionner une date');
      return;
    }
    if (newOverrideType === 'custom_hours' && newOverrideWindows.length === 0) {
      setError('Veuillez ajouter au moins une fenetre horaire');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
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
        setError(result.error?.message || 'Erreur lors de la creation');
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
      setSuccess('Exception ajoutee');
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const deleteOverride = async (overrideId: string) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/mentors/me/availability/overrides/${overrideId}`, {
        method: 'DELETE',
        headers,
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || 'Erreur de suppression');
        return;
      }
      setAvailability((prev) => prev ? {
        ...prev,
        dateOverrides: prev.dateOverrides.filter((o) => o.id !== overrideId),
      } : prev);
      setSuccess('Exception supprimee');
    } catch {
      setError('Erreur de connexion');
    }
  };

  // ─── Render Helpers ───────────────────────────────────────────────────────

  const renderTabs = () => (
    <div className={styles.tabs} role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'schedule'}
        className={`${styles.tab} ${activeTab === 'schedule' ? styles.tabActive : ''}`}
        onClick={() => setActiveTab('schedule')}
      >
        Planning hebdomadaire
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'settings'}
        className={`${styles.tab} ${activeTab === 'settings' ? styles.tabActive : ''}`}
        onClick={() => setActiveTab('settings')}
      >
        Parametres
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'overrides'}
        className={`${styles.tab} ${activeTab === 'overrides' ? styles.tabActive : ''}`}
        onClick={() => setActiveTab('overrides')}
      >
        Exceptions ({availability?.dateOverrides.length || 0})
      </button>
    </div>
  );

  const renderSettingsTab = () => {
    if (!availability) return null;
    const { settings } = availability;

    return (
      <div className={styles.settingsGrid}>
        <Card>
          <CardHeader>
            <CardTitle>Duree des sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              name="session-duration"
              label="Duree"
              value={String(settings.sessionDuration)}
              options={SESSION_DURATIONS}
              onChange={(e) => void updateSettings({ sessionDuration: Number(e.target.value) })}
            />
            <p className={styles.hint}>Duree standard de chaque session de mentorat.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Temps tampon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.bufferRow}>
              <Select
                name="buffer-before"
                label="Avant la session"
                value={String(settings.bufferBefore)}
                options={BUFFER_OPTIONS}
                onChange={(e) => void updateSettings({ bufferBefore: Number(e.target.value) })}
              />
              <Select
                name="buffer-after"
                label="Apres la session"
                value={String(settings.bufferAfter)}
                options={BUFFER_OPTIONS}
                onChange={(e) => void updateSettings({ bufferAfter: Number(e.target.value) })}
              />
            </div>
            <p className={styles.hint}>Temps de pause entre les sessions pour vous preparer.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regles de reservation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.rulesGrid}>
              <Select
                name="min-notice"
                label="Preavis minimum"
                value={String(settings.minNoticeHours)}
                options={NOTICE_OPTIONS}
                onChange={(e) => void updateSettings({ minNoticeHours: Number(e.target.value) })}
              />
              <Select
                name="max-days"
                label="Reservable jusqu'a"
                value={String(settings.maxDaysAhead)}
                options={MAX_DAYS_OPTIONS}
                onChange={(e) => void updateSettings({ maxDaysAhead: Number(e.target.value) })}
              />
              <Select
                name="increment"
                label="Intervalles de debut"
                value={String(settings.startTimeIncrement)}
                options={INCREMENT_OPTIONS}
                onChange={(e) => void updateSettings({ startTimeIncrement: Number(e.target.value) })}
              />
            </div>
            <p className={styles.hint}>
              Les etudiants pourront reserver au minimum {settings.minNoticeHours}h a l'avance,
              jusqu'a {settings.maxDaysAhead} jours dans le futur.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limites (optionnel)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.limitsRow}>
              <Input
                name="daily-limit"
                label="Max sessions/jour"
                type="number"
                min={1}
                max={20}
                value={settings.dailyLimit?.toString() || ''}
                placeholder="Illimite"
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  void updateSettings({ dailyLimit: val });
                }}
              />
              <Input
                name="weekly-limit"
                label="Max sessions/semaine"
                type="number"
                min={1}
                max={50}
                value={settings.weeklyLimit?.toString() || ''}
                placeholder="Illimite"
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  void updateSettings({ weeklyLimit: val });
                }}
              />
            </div>
            <p className={styles.hint}>Laissez vide pour ne pas limiter le nombre de sessions.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fuseau horaire</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              name="timezone"
              label="Timezone"
              value={settings.timezone}
              onChange={(e) => void updateSettings({ timezone: e.target.value })}
              placeholder="Europe/Paris"
            />
            <p className={styles.hint}>Utilisez un fuseau horaire IANA (ex: Europe/Paris, America/New_York).</p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderScheduleTab = () => {
    if (!availability) return null;

    return (
      <div className={styles.scheduleGrid}>
        {availability.weeklySchedule.map((day) => (
          <DayScheduleCard
            key={day.dayOfWeek}
            day={day}
            saving={saving}
            onUpdate={(isAvailable, timeWindows) => updateDaySchedule(day.dayOfWeek, isAvailable, timeWindows)}
          />
        ))}
      </div>
    );
  };

  const renderOverridesTab = () => {
    if (!availability) return null;

    const today = new Date().toISOString().split('T')[0];

    return (
      <div className={styles.overridesSection}>
        <Card>
          <CardHeader>
            <CardTitle>Ajouter une exception</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.overrideForm}>
              <Input
                name="override-date"
                label="Date"
                type="date"
                min={today}
                value={newOverrideDate}
                onChange={(e) => setNewOverrideDate(e.target.value)}
              />
              <Select
                name="override-type"
                label="Type"
                value={newOverrideType}
                options={[
                  { value: 'unavailable', label: 'Indisponible toute la journee' },
                  { value: 'custom_hours', label: 'Horaires modifies' },
                ]}
                onChange={(e) => setNewOverrideType(e.target.value as 'unavailable' | 'custom_hours')}
              />
              <Input
                name="override-reason"
                label="Raison (optionnel)"
                value={newOverrideReason}
                placeholder="Ex: Vacances, RDV medical..."
                onChange={(e) => setNewOverrideReason(e.target.value)}
              />

              {newOverrideType === 'custom_hours' && (
                <div className={styles.overrideWindows}>
                  <label className={styles.windowsLabel}>Horaires disponibles ce jour-la :</label>
                  {newOverrideWindows.map((window, idx) => (
                    <div key={idx} className={styles.windowRow}>
                      <Input
                        name={`window-start-${idx}`}
                        type="time"
                        value={window.start}
                        onChange={(e) => {
                          const updated = [...newOverrideWindows];
                          updated[idx] = { ...updated[idx], start: e.target.value };
                          setNewOverrideWindows(updated);
                        }}
                      />
                      <span>a</span>
                      <Input
                        name={`window-end-${idx}`}
                        type="time"
                        value={window.end}
                        onChange={(e) => {
                          const updated = [...newOverrideWindows];
                          updated[idx] = { ...updated[idx], end: e.target.value };
                          setNewOverrideWindows(updated);
                        }}
                      />
                      {newOverrideWindows.length > 1 && (
                        <button
                          type="button"
                          className={styles.removeWindowBtn}
                          onClick={() => setNewOverrideWindows(newOverrideWindows.filter((_, i) => i !== idx))}
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setNewOverrideWindows([...newOverrideWindows, { start: '14:00', end: '17:00' }])}
                  >
                    + Ajouter une plage
                  </Button>
                </div>
              )}

              <Button type="button" onClick={() => void createOverride()} isLoading={saving}>
                Ajouter l'exception
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exceptions planifiees ({availability.dateOverrides.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {availability.dateOverrides.length === 0 ? (
              <p className={styles.empty}>Aucune exception configuree.</p>
            ) : (
              <ul className={styles.overridesList}>
                {availability.dateOverrides.map((override) => (
                  <li key={override.id} className={styles.overrideItem}>
                    <div className={styles.overrideInfo}>
                      <span className={styles.overrideDate}>
                        {new Date(override.date + 'T00:00:00').toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                      <span className={`${styles.overrideType} ${styles[override.overrideType]}`}>
                        {override.overrideType === 'unavailable' ? 'Indisponible' : 'Horaires modifies'}
                      </span>
                      {override.reason && <span className={styles.overrideReason}>{override.reason}</span>}
                      {override.timeWindows && (
                        <span className={styles.overrideWindows}>
                          {override.timeWindows.map((w) => `${w.start}-${w.end}`).join(', ')}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => void deleteOverride(override.id)}
                      aria-label="Supprimer cette exception"
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────────────────

  return (
    <section className={styles.container} aria-labelledby="availability-title">
      <header className={styles.header}>
        <h1 id="availability-title" className={styles.title}>Disponibilites</h1>
        <p className={styles.subtitle}>Configurez vos horaires et parametres de reservation.</p>
      </header>

      {error && (
        <div className={styles.error} role="alert" aria-live="assertive">{error}</div>
      )}
      {success && (
        <div className={styles.success} role="status" aria-live="polite">{success}</div>
      )}

      {loading ? (
        <div className={styles.skeletonList} aria-busy="true">
          <div className={styles.skeletonItem} />
          <div className={styles.skeletonItem} />
          <div className={styles.skeletonItem} />
        </div>
      ) : availability && (
        <>
          {/* Global toggle */}
          <Card className={styles.globalCard}>
            <CardContent>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={availability.isAvailable}
                  onChange={(e) => void updateGeneral({ isAvailable: e.target.checked })}
                  disabled={saving}
                  className={styles.checkbox}
                />
                <span className={styles.toggleText}>
                  {availability.isAvailable ? 'Disponible pour les reservations' : 'Reservations desactivees'}
                </span>
              </label>
            </CardContent>
          </Card>

          {renderTabs()}

          <div className={styles.tabContent} role="tabpanel">
            {activeTab === 'settings' && renderSettingsTab()}
            {activeTab === 'schedule' && renderScheduleTab()}
            {activeTab === 'overrides' && renderOverridesTab()}
          </div>
        </>
      )}
    </section>
  );
}

// ─── Sub-component: Day Schedule Card ───────────────────────────────────────

interface DayScheduleCardProps {
  day: DaySchedule;
  saving: boolean;
  onUpdate: (isAvailable: boolean, timeWindows: TimeWindow[]) => void;
}

function DayScheduleCard({ day, saving, onUpdate }: DayScheduleCardProps) {
  const [isAvailable, setIsAvailable] = useState(day.isAvailable);
  const [timeWindows, setTimeWindows] = useState<TimeWindow[]>(day.timeWindows.length > 0 ? day.timeWindows : []);
  const [isDirty, setIsDirty] = useState(false);

  const handleToggle = (checked: boolean) => {
    setIsAvailable(checked);
    setIsDirty(true);
  };

  const handleWindowChange = (idx: number, field: 'start' | 'end', value: string) => {
    const updated = [...timeWindows];
    updated[idx] = { ...updated[idx], [field]: value };
    setTimeWindows(updated);
    setIsDirty(true);
  };

  const addWindow = () => {
    setTimeWindows([...timeWindows, { start: '14:00', end: '18:00' }]);
    setIsDirty(true);
  };

  const removeWindow = (idx: number) => {
    setTimeWindows(timeWindows.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  const handleSave = () => {
    onUpdate(isAvailable, timeWindows);
    setIsDirty(false);
  };

  return (
    <Card className={`${styles.dayCard} ${isAvailable ? styles.dayActive : styles.dayInactive}`}>
      <CardHeader>
        <div className={styles.dayHeader}>
          <label className={styles.dayToggle}>
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => handleToggle(e.target.checked)}
              className={styles.checkbox}
            />
            <span className={styles.dayName}>{day.dayName}</span>
          </label>
        </div>
      </CardHeader>
      <CardContent>
        {isAvailable ? (
          <div className={styles.windowsContainer}>
            {timeWindows.length === 0 ? (
              <p className={styles.noWindows}>Aucune plage configuree</p>
            ) : (
              timeWindows.map((window, idx) => (
                <div key={idx} className={styles.windowRow}>
                  <input
                    type="time"
                    value={window.start}
                    onChange={(e) => handleWindowChange(idx, 'start', e.target.value)}
                    className={styles.timeInput}
                  />
                  <span className={styles.timeSeparator}>a</span>
                  <input
                    type="time"
                    value={window.end}
                    onChange={(e) => handleWindowChange(idx, 'end', e.target.value)}
                    className={styles.timeInput}
                  />
                  <button
                    type="button"
                    className={styles.removeWindowBtn}
                    onClick={() => removeWindow(idx)}
                    aria-label="Supprimer cette plage"
                  >
                    &times;
                  </button>
                </div>
              ))
            )}
            <button type="button" className={styles.addWindowBtn} onClick={addWindow}>
              + Ajouter une plage
            </button>
          </div>
        ) : (
          <p className={styles.closedText}>Ferme</p>
        )}

        {isDirty && (
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            isLoading={saving}
            className={styles.saveBtn}
          >
            Enregistrer
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
