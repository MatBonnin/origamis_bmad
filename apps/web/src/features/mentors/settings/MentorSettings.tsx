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
  Select,
} from '@/components/ui';
import styles from './MentorSettings.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface MentorSettingsPayload {
  profile: {
    mentorId: string;
    fullName: string;
    bio: string | null;
    domain: string;
    expertiseTags: string[];
    supportedLevels: string[];
    languages: string[];
    certifications: string[];
    tariffs: {
      min: number;
      max: number;
      currency: string;
    };
    availability: {
      isAvailable: boolean;
      nextAvailableAt: string | null;
      slots: AvailabilitySlot[];
    };
    isPublished: boolean;
    updatedAt: string;
  };
}

interface Props {
  accessToken: string;
}

const DAY_OPTIONS = [
  { value: '1', label: 'Lundi' },
  { value: '2', label: 'Mardi' },
  { value: '3', label: 'Mercredi' },
  { value: '4', label: 'Jeudi' },
  { value: '5', label: 'Vendredi' },
  { value: '6', label: 'Samedi' },
  { value: '0', label: 'Dimanche' },
];

const LEVEL_OPTIONS = [
  { value: 'debutant', label: 'Debutant' },
  { value: 'intermediaire', label: 'Intermediaire' },
  { value: 'avance', label: 'Avance' },
];

const EMPTY_SLOT: AvailabilitySlot = {
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '12:00',
};

function toIsoUtc(value: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
}

function toLocalDateTime(value: string | null): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function MentorSettings({ accessToken }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [domain, setDomain] = useState('');
  const [bio, setBio] = useState('');
  const [expertiseInput, setExpertiseInput] = useState('');
  const [languagesInput, setLanguagesInput] = useState('');
  const [certificationsInput, setCertificationsInput] = useState('');
  const [supportedLevels, setSupportedLevels] = useState<string[]>([]);
  const [tariffMin, setTariffMin] = useState('30');
  const [tariffMax, setTariffMax] = useState('45');
  const [currency, setCurrency] = useState('EUR');
  const [isAvailable, setIsAvailable] = useState(true);
  const [nextAvailableAt, setNextAvailableAt] = useState('');
  const [slots, setSlots] = useState<AvailabilitySlot[]>([EMPTY_SLOT]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/mentors/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const result = await response.json();

      if (response.status === 404) {
        setHasExistingProfile(false);
        return;
      }

      if (!response.ok || result.error) {
        setError(result.error?.message || 'Impossible de charger votre profil mentor');
        return;
      }

      const data = result.data as MentorSettingsPayload;
      setHasExistingProfile(true);
      setDomain(data.profile.domain);
      setBio(data.profile.bio ?? '');
      setExpertiseInput(data.profile.expertiseTags.join(', '));
      setLanguagesInput(data.profile.languages.join(', '));
      setCertificationsInput(data.profile.certifications.join(', '));
      setSupportedLevels(data.profile.supportedLevels);
      setTariffMin(String(data.profile.tariffs.min));
      setTariffMax(String(data.profile.tariffs.max));
      setCurrency(data.profile.tariffs.currency);
      setIsAvailable(data.profile.availability.isAvailable);
      setNextAvailableAt(toLocalDateTime(data.profile.availability.nextAvailableAt));
      setSlots(data.profile.availability.slots.length > 0 ? data.profile.availability.slots : [EMPTY_SLOT]);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const normalizedSummary = useMemo(() => {
    const toList = (value: string) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    return {
      expertise: toList(expertiseInput),
      languages: toList(languagesInput),
      certifications: toList(certificationsInput),
    };
  }, [certificationsInput, expertiseInput, languagesInput]);

  const validateClient = () => {
    if (!domain.trim()) {
      setError('Le domaine est requis');
      return false;
    }
    if (normalizedSummary.expertise.length === 0) {
      setError('Au moins une competence est requise');
      return false;
    }

    const min = Number(tariffMin);
    const max = Number(tariffMax);

    if (!Number.isInteger(min) || !Number.isInteger(max) || min <= 0 || max <= 0) {
      setError('Les tarifs doivent etre des entiers positifs');
      return false;
    }
    if (min >= max) {
      setError('Le tarif minimum doit etre strictement inferieur au maximum');
      return false;
    }

    const hasInvalidSlot = slots.some((slot) => slot.startTime >= slot.endTime);
    if (hasInvalidSlot) {
      setError('Chaque plage de disponibilite doit avoir un debut avant la fin');
      return false;
    }

    setError('');
    return true;
  };

  const upsertProfile = async () => {
    if (!validateClient()) {
      return;
    }

    setSaving(true);
    setSuccess('');

    const payload = {
      domain: domain.trim(),
      bio: bio.trim() || undefined,
      expertiseTags: normalizedSummary.expertise,
      supportedLevels,
      languages: normalizedSummary.languages,
      certifications: normalizedSummary.certifications,
      tariffs: {
        min: Number(tariffMin),
        max: Number(tariffMax),
        currency: currency.trim().toUpperCase(),
      },
      availability: {
        isAvailable,
        nextAvailableAt: toIsoUtc(nextAvailableAt),
        slots,
      },
    };

    const method = hasExistingProfile ? 'PATCH' : 'POST';

    try {
      const response = await fetch(`${API_URL}/mentors/me`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error?.message || 'Impossible de sauvegarder le profil mentor');
        return;
      }

      setSuccess(
        hasExistingProfile
          ? 'Profil mentor mis a jour avec succes'
          : 'Profil mentor cree et publie dans la recherche',
      );
      setHasExistingProfile(true);
      await loadProfile();
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className={styles.container} aria-labelledby="mentor-settings-title">
        <h1 id="mentor-settings-title" className={styles.title}>Profil mentor</h1>
        <p className={styles.liveRegion} aria-live="polite">Chargement du profil mentor...</p>
      </section>
    );
  }

  return (
    <section className={styles.container} aria-labelledby="mentor-settings-title">
      <header className={styles.header}>
        <h1 id="mentor-settings-title" className={styles.title}>Mon profil mentor</h1>
        <Link href="/mentors" className={styles.backLink}>Retour a la recherche</Link>
      </header>

      <p className={styles.subtitle}>
        Renseignez vos expertises, tarifs et disponibilites pour etre propose aux etudiants.
      </p>

      {error && (
        <div className={styles.feedbackError} role="alert" aria-live="assertive">
          {error}
        </div>
      )}
      {success && (
        <div className={styles.feedbackSuccess} role="status" aria-live="polite">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Resume mentor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.gridTwo}>
            <Input
              name="domain"
              label="Domaine"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="ex: informatique"
            />
            <Input
              name="expertise"
              label="Competences"
              value={expertiseInput}
              onChange={(event) => setExpertiseInput(event.target.value)}
              placeholder="react, typescript, architecture"
            />
            <Input
              name="languages"
              label="Langues"
              value={languagesInput}
              onChange={(event) => setLanguagesInput(event.target.value)}
              placeholder="fr, en"
            />
            <Input
              name="certifications"
              label="Certifications"
              value={certificationsInput}
              onChange={(event) => setCertificationsInput(event.target.value)}
              placeholder="aws-cloud, scrum"
            />
          </div>

          <div className={styles.levels}>
            <p className={styles.groupTitle}>Niveaux accompagnes</p>
            <div className={styles.levelsGrid}>
              {LEVEL_OPTIONS.map((option) => {
                const checked = supportedLevels.includes(option.value);
                return (
                  <label key={option.value} className={styles.checkboxLine}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setSupportedLevels((previous) =>
                          event.target.checked
                            ? [...new Set([...previous, option.value])]
                            : previous.filter((item) => item !== option.value),
                        );
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <Input
            name="bio"
            label="Bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Presentez votre approche mentor"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tarifs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.gridThree}>
            <Input
              name="tariff-min"
              label="Tarif min (EUR/h)"
              type="number"
              value={tariffMin}
              onChange={(event) => setTariffMin(event.target.value)}
              min={1}
            />
            <Input
              name="tariff-max"
              label="Tarif max (EUR/h)"
              type="number"
              value={tariffMax}
              onChange={(event) => setTariffMax(event.target.value)}
              min={1}
            />
            <Input
              name="currency"
              label="Devise"
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              maxLength={3}
              placeholder="EUR"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Disponibilites</CardTitle>
        </CardHeader>
        <CardContent>
          <label className={styles.checkboxLine}>
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(event) => setIsAvailable(event.target.checked)}
            />
            <span>Disponible immediatement</span>
          </label>

          <Input
            name="next-available"
            label="Prochaine disponibilite"
            type="datetime-local"
            value={nextAvailableAt}
            onChange={(event) => setNextAvailableAt(event.target.value)}
          />

          <div className={styles.slotsSection}>
            <div className={styles.slotsHeader}>
              <p className={styles.groupTitle}>Plages hebdomadaires (UTC)</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSlots((previous) => [...previous, { ...EMPTY_SLOT }])}
              >
                Ajouter un slot
              </Button>
            </div>

            <div className={styles.slotsList}>
              {slots.map((slot, index) => (
                <div key={`${slot.dayOfWeek}-${index}`} className={styles.slotRow}>
                  <Select
                    label="Jour"
                    name={`slot-day-${index}`}
                    value={String(slot.dayOfWeek)}
                    options={DAY_OPTIONS}
                    onChange={(event) => {
                      const day = Number(event.target.value);
                      setSlots((previous) =>
                        previous.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, dayOfWeek: day } : item,
                        ),
                      );
                    }}
                  />
                  <Input
                    name={`slot-start-${index}`}
                    label="Debut"
                    type="time"
                    value={slot.startTime}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSlots((previous) =>
                        previous.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, startTime: value } : item,
                        ),
                      );
                    }}
                  />
                  <Input
                    name={`slot-end-${index}`}
                    label="Fin"
                    type="time"
                    value={slot.endTime}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSlots((previous) =>
                        previous.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, endTime: value } : item,
                        ),
                      );
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setSlots((previous) =>
                        previous.length > 1
                          ? previous.filter((_, itemIndex) => itemIndex !== index)
                          : previous,
                      )
                    }
                  >
                    Supprimer
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Apercu public</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className={styles.previewList}>
            <div>
              <dt>Domaine</dt>
              <dd>{domain || 'Non renseigne'}</dd>
            </div>
            <div>
              <dt>Competences</dt>
              <dd>{normalizedSummary.expertise.join(', ') || 'Non renseigne'}</dd>
            </div>
            <div>
              <dt>Langues</dt>
              <dd>{normalizedSummary.languages.join(', ') || 'Non renseigne'}</dd>
            </div>
            <div>
              <dt>Tarifs</dt>
              <dd>
                {tariffMin && tariffMax
                  ? `${tariffMin} - ${tariffMax} ${currency}/h`
                  : 'Non renseigne'}
              </dd>
            </div>
            <div>
              <dt>Disponibilite</dt>
              <dd>{isAvailable ? 'Disponible maintenant' : 'Sur reservation'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className={styles.actions}>
        <Button type="button" onClick={upsertProfile} isLoading={saving}>
          {hasExistingProfile ? 'Mettre a jour mon profil mentor' : 'Publier mon profil mentor'}
        </Button>
      </div>
    </section>
  );
}
