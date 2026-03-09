'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@/components/ui';
import styles from './AvailabilityManager.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const DAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

interface Slot {
  slotId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  status: string;
}

interface Props {
  accessToken: string;
}

export function AvailabilityManager({ accessToken }: Props) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [timezone, setTimezone] = useState('Europe/Paris');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New slot form
  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('12:00');

  const headers = { Authorization: `Bearer ${accessToken}` };

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
      const data = result.data as {
        isAvailable: boolean;
        timezone: string;
        slots: Slot[];
      };
      setIsAvailable(data.isAvailable);
      setTimezone(data.timezone);
      setSlots(data.slots);
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

  const updateGeneral = async (payload: { isAvailable?: boolean; timezone?: string }) => {
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
      const data = result.data as { isAvailable: boolean; timezone: string };
      setIsAvailable(data.isAvailable);
      setTimezone(data.timezone);
      setSuccess('Disponibilite mise a jour');
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const addSlot = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/mentors/me/availability`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayOfWeek: newDay, startTime: newStart, endTime: newEnd }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || 'Erreur lors de l ajout');
        return;
      }
      const data = result.data as { slot: Slot };
      setSlots((prev) => [...prev, data.slot].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)));
      setSuccess('Creneau ajoute');
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const deleteSlot = async (slotId: string) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/mentors/me/availability/${slotId}`, {
        method: 'DELETE',
        headers,
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || 'Erreur de suppression');
        return;
      }
      setSlots((prev) => prev.filter((s) => s.slotId !== slotId));
      setSuccess('Creneau supprime');
    } catch {
      setError('Erreur de connexion');
    }
  };

  // Group slots by day
  const slotsByDay = DAY_LABELS.map((label, idx) => ({
    label,
    dayIndex: idx,
    daySlots: slots.filter((s) => s.dayOfWeek === idx),
  })).filter((d) => d.daySlots.length > 0);

  return (
    <section className={styles.container} aria-labelledby="availability-title">
      <header className={styles.header}>
        <h1 id="availability-title" className={styles.title}>Disponibilites</h1>
        <p className={styles.subtitle}>Gerez vos creneaux pour les etudiants.</p>
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
        </div>
      ) : (
        <>
          {/* General availability */}
          <Card>
            <CardHeader>
              <CardTitle>Statut general</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.generalRow}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => void updateGeneral({ isAvailable: e.target.checked, timezone })}
                    disabled={saving}
                    className={styles.checkbox}
                  />
                  Disponible pour les reservations
                </label>
                <div className={styles.timezoneRow}>
                  <Select
                    name="timezone"
                    label="Fuseau horaire"
                    value={timezone}
                    options={[
                      { value: 'Europe/Paris', label: 'Europe/Paris (UTC+1)' },
                      { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
                      { value: 'America/New_York', label: 'America/New_York (UTC-5)' },
                      { value: 'UTC', label: 'UTC' },
                    ]}
                    onChange={(e) => {
                      const newTimezone = e.target.value;
                      setTimezone(newTimezone);
                      void updateGeneral({ isAvailable, timezone: newTimezone });
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add slot form */}
          <Card>
            <CardHeader>
              <CardTitle>Ajouter un creneau</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.addSlotForm}>
                <Select
                  name="day-of-week"
                  label="Jour"
                  value={String(newDay)}
                  options={DAY_LABELS.map((label, idx) => ({ value: String(idx), label }))}
                  onChange={(e) => setNewDay(Number(e.target.value))}
                />
                <Input
                  name="start-time"
                  label="Debut"
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                />
                <Input
                  name="end-time"
                  label="Fin"
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                />
                <Button type="button" onClick={() => void addSlot()} isLoading={saving}>
                  Ajouter
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Slots grid */}
          <Card>
            <CardHeader>
              <CardTitle>Creneaux configures ({slots.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {slots.length === 0 ? (
                <p className={styles.empty} aria-live="polite">Aucun creneau configure.</p>
              ) : (
                <div className={styles.slotsGrid} role="list">
                  {slotsByDay.map(({ label, dayIndex, daySlots }) => (
                    <div key={dayIndex} className={styles.dayGroup} role="listitem">
                      <h3 className={styles.dayTitle}>{label}</h3>
                      <ul className={styles.slotList}>
                        {daySlots.map((slot) => (
                          <li key={slot.slotId} className={styles.slotItem}>
                            <span className={styles.slotTime}>
                              {slot.startTime} - {slot.endTime}
                            </span>
                            <span className={styles.slotStatus} data-status={slot.status}>
                              {slot.status}
                            </span>
                            <button
                              type="button"
                              className={styles.deleteButton}
                              onClick={() => void deleteSlot(slot.slotId)}
                              aria-label={`Supprimer le creneau ${label} ${slot.startTime}-${slot.endTime}`}
                            >
                              &times;
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}
