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
  SearchableSelect,
  MultiSearchSelect,
  LanguageSelect,
  FileUpload,
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
    bannerUrl: string | null;
    about: string | null;
    professionalLinks: string[];
    educationLevel: string | null;
    degrees: string[];
    keywords: string[];
    domain: string;
    expertiseTags: string[];
    supportedLevels: string[];
    supportTypes: Array<'ponctuel' | 'suivi_regulier' | 'long_uniquement'>;
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

interface MentorDocument {
  documentId: string;
  type: 'diploma' | 'certificate';
  url: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
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

const SUPPORT_TYPE_OPTIONS = [
  { value: 'ponctuel', label: 'Ponctuel' },
  { value: 'suivi_regulier', label: 'Suivi regulier' },
  { value: 'long_uniquement', label: 'Long uniquement' },
] as const;

const EDUCATION_OPTIONS = [
  { value: '', label: 'Non renseigne' },
  { value: 'bac', label: 'Bac' },
  { value: 'bac+2', label: 'Bac+2' },
  { value: 'bac+3', label: 'Bac+3' },
  { value: 'bac+5', label: 'Bac+5' },
  { value: 'doctorat', label: 'Doctorat' },
  { value: 'autre', label: 'Autre' },
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

const REQUIREMENT_LABELS: Record<string, string> = {
  about: 'Description "A propos"',
  banner_or_avatar: 'Photo de profil ou banniere',
  domain: 'Domaine d\'expertise',
  expertise_tags: 'Au moins une competence',
  support_types: 'Au moins un type d\'accompagnement',
  tariff: 'Tarif horaire',
  profile: 'Profil mentor',
};

function translateRequirement(key: string): string {
  return REQUIREMENT_LABELS[key] || key;
}

export function MentorSettings({ accessToken }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [domain, setDomain] = useState('');
  const [domainLabel, setDomainLabel] = useState('');
  const [bio, setBio] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [about, setAbout] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [degreesInput, setDegreesInput] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [professionalLinksInput, setProfessionalLinksInput] = useState('');
  const [expertiseTags, setExpertiseTags] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [certificationsInput, setCertificationsInput] = useState('');
  const [supportedLevels, setSupportedLevels] = useState<string[]>([]);
  const [supportTypes, setSupportTypes] = useState<string[]>([]);
  const [tariffMin, setTariffMin] = useState('30');
  const [tariffMax, setTariffMax] = useState('45');
  const [currency, setCurrency] = useState('EUR');
  const [isAvailable, setIsAvailable] = useState(true);
  const [nextAvailableAt, setNextAvailableAt] = useState('');
  const [slots, setSlots] = useState<AvailabilitySlot[]>([EMPTY_SLOT]);
  const [documents, setDocuments] = useState<MentorDocument[]>([]);
  const [docType, setDocType] = useState<'diploma' | 'certificate'>('diploma');
  const [docUrl, setDocUrl] = useState('');
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [missingRequirements, setMissingRequirements] = useState<string[]>([]);

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
      setDomainLabel(data.profile.domain);
      setBio(data.profile.bio ?? '');
      setBannerUrl(data.profile.bannerUrl ?? '');
      setAbout(data.profile.about ?? '');
      setEducationLevel(data.profile.educationLevel ?? '');
      setDegreesInput((data.profile.degrees ?? []).join(', '));
      setKeywordsInput((data.profile.keywords ?? []).join(', '));
      setProfessionalLinksInput((data.profile.professionalLinks ?? []).join(', '));
      setExpertiseTags(data.profile.expertiseTags ?? []);
      setLanguages(data.profile.languages ?? []);
      setCertificationsInput(data.profile.certifications.join(', '));
      setSupportedLevels(data.profile.supportedLevels);
      setSupportTypes(data.profile.supportTypes ?? []);
      setTariffMin(String(data.profile.tariffs.min));
      setTariffMax(String(data.profile.tariffs.max));
      setCurrency(data.profile.tariffs.currency);
      setIsAvailable(data.profile.availability.isAvailable);
      setNextAvailableAt(toLocalDateTime(data.profile.availability.nextAvailableAt));
      setSlots(data.profile.availability.slots.length > 0 ? data.profile.availability.slots : [EMPTY_SLOT]);

      // Charger le statut de publication
      const readinessResponse = await fetch(`${API_URL}/mentors/me/publish-readiness`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (readinessResponse.ok) {
        const readinessResult = await readinessResponse.json();
        if (readinessResult.data) {
          setMissingRequirements(readinessResult.data.missingRequirements ?? []);
        }
      }

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
      degrees: toList(degreesInput),
      keywords: toList(keywordsInput),
      certifications: toList(certificationsInput),
      professionalLinks: toList(professionalLinksInput),
    };
  }, [certificationsInput, degreesInput, keywordsInput, professionalLinksInput]);

  const validateClient = () => {
    if (!domain.trim()) {
      setError('Le domaine est requis');
      return false;
    }
    if (expertiseTags.length === 0) {
      setError('Au moins une competence est requise');
      return false;
    }
    if (about.length > 1200) {
      setError('La section A propos ne peut pas depasser 1200 caracteres');
      return false;
    }
    const invalidLink = normalizedSummary.professionalLinks.find((value) => {
      try {
        const url = new URL(value);
        const host = url.hostname.toLowerCase();
        return !(host === 'linkedin.com' || host.endsWith('.linkedin.com'));
      } catch {
        return true;
      }
    });
    if (invalidLink) {
      setError('Les liens professionnels doivent etre des URLs LinkedIn valides');
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
      bannerUrl: bannerUrl.trim() || undefined,
      about: about.trim() || undefined,
      educationLevel: educationLevel || undefined,
      degrees: normalizedSummary.degrees,
      keywords: normalizedSummary.keywords,
      professionalLinks: normalizedSummary.professionalLinks,
      expertiseTags,
      supportedLevels,
      supportTypes,
      languages,
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

  const uploadDocument = async () => {
    if (!docUrl.trim()) {
      setError('URL document requise');
      return;
    }
    setError('');
    const response = await fetch(`${API_URL}/mentors/me/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: docType, fileUrl: docUrl.trim() }),
    });
    const result = await response.json();
    if (!response.ok || result.error) {
      setError(result.error?.message || 'Upload document impossible');
      return;
    }
    setDocUrl('');
    await loadProfile();
  };

  const connectGoogleCalendar = async () => {
    const response = await fetch(`${API_URL}/mentors/me/calendar/google/connect`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    const result = await response.json();
    if (!response.ok || result.error) {
      setError(result.error?.message || 'Connexion Google impossible');
      return;
    }
    setCalendarConnected(true);
  };

  const disconnectGoogleCalendar = async () => {
    const response = await fetch(`${API_URL}/mentors/me/calendar/google/disconnect`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const result = await response.json();
    if (!response.ok || result.error) {
      setError(result.error?.message || 'Deconnexion Google impossible');
      return;
    }
    setCalendarConnected(false);
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
          <CardTitle>Statut de publication</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasExistingProfile ? (
            <div className={styles.publishStatus}>
              <span className={styles.statusBadgeWarning}>Non cree</span>
              <p>Remplissez le formulaire pour creer votre profil mentor.</p>
            </div>
          ) : missingRequirements.length === 0 ? (
            <div className={styles.publishStatus}>
              <span className={styles.statusBadgeSuccess}>Profil visible</span>
              <p>Votre profil est publie et visible dans la recherche des etudiants.</p>
            </div>
          ) : (
            <div className={styles.publishStatus}>
              <span className={styles.statusBadgeWarning}>Profil incomplet</span>
              <p>Completez les elements suivants pour apparaitre dans la recherche :</p>
              <ul className={styles.missingList}>
                {missingRequirements.map((item) => (
                  <li key={item}>{translateRequirement(item)}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resume mentor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.gridTwo}>
            <SearchableSelect
              name="domain"
              label="Domaine"
              placeholder="Rechercher un domaine..."
              fetchUrl="/references/domains"
              value={domain}
              valueLabel={domainLabel}
              onChange={(value, label) => {
                setDomain(value);
                setDomainLabel(label);
              }}
            />
            <MultiSearchSelect
              name="expertise"
              label="Competences"
              placeholder="Rechercher une competence..."
              fetchUrl="/references/skills"
              domainFilter={domain || undefined}
              values={expertiseTags}
              onChange={setExpertiseTags}
              maxItems={12}
            />
            <LanguageSelect
              label="Langues"
              values={languages}
              onChange={setLanguages}
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

          <FileUpload
            label="Banniere"
            accept="image"
            accessToken={accessToken}
            value={bannerUrl || undefined}
            onChange={(url) => setBannerUrl(url || '')}
            placeholder="Glissez votre photo de banniere"
          />

          <Input
            name="about"
            label="A propos"
            value={about}
            onChange={(event) => setAbout(event.target.value)}
            placeholder="Votre approche, votre posture, vos domaines de specialisation"
          />

          <Select
            name="educationLevel"
            label="Niveau d etudes"
            value={educationLevel}
            options={EDUCATION_OPTIONS}
            onChange={(event) => setEducationLevel(event.target.value)}
          />

          <Input
            name="degrees"
            label="Diplomes"
            value={degreesInput}
            onChange={(event) => setDegreesInput(event.target.value)}
            placeholder="Master informatique, MBA..."
          />

          <Input
            name="keywords"
            label="Mots-cles"
            value={keywordsInput}
            onChange={(event) => setKeywordsInput(event.target.value)}
            placeholder="gestion de projet, memoire, digital..."
          />

          <Input
            name="professionalLinks"
            label="Liens professionnels"
            value={professionalLinksInput}
            onChange={(event) => setProfessionalLinksInput(event.target.value)}
            placeholder="https://www.linkedin.com/in/..., https://www.linkedin.com/in/..."
          />

          <div className={styles.levels}>
            <p className={styles.groupTitle}>Types d accompagnement</p>
            <div className={styles.levelsGrid}>
              {SUPPORT_TYPE_OPTIONS.map((option) => {
                const checked = supportTypes.includes(option.value);
                return (
                  <label key={option.value} className={styles.checkboxLine}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setSupportTypes((previous) =>
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
          <CardTitle>Legitimite & documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.documentsSection}>
            <div className={styles.documentUploadRow}>
              <Select
                name="docType"
                label="Type de document"
                value={docType}
                options={[
                  { value: 'diploma', label: 'Diplome' },
                  { value: 'certificate', label: 'Certification' },
                ]}
                onChange={(event) => setDocType(event.target.value as 'diploma' | 'certificate')}
              />
              <FileUpload
                label="Document (PDF, image)"
                accept="document"
                accessToken={accessToken}
                value={docUrl || undefined}
                onChange={(url) => setDocUrl(url || '')}
                placeholder="Glissez un diplome ou certificat"
              />
            </div>
            {docUrl && (
              <Button type="button" variant="outline" onClick={() => void uploadDocument()}>
                Enregistrer ce document
              </Button>
            )}
          </div>

          {documents.length > 0 && (
            <div className={styles.documentsList}>
              <p className={styles.groupTitle}>Documents enregistres</p>
              <ul className={styles.documentsGrid}>
                {documents.map((doc) => (
                  <li key={doc.documentId} className={styles.documentItem}>
                    <span className={styles.documentType}>
                      {doc.type === 'diploma' ? 'Diplome' : 'Certification'}
                    </span>
                    <span className={styles.documentStatus} data-status={doc.verificationStatus}>
                      {doc.verificationStatus === 'pending' && 'En attente'}
                      {doc.verificationStatus === 'verified' && 'Verifie'}
                      {doc.verificationStatus === 'rejected' && 'Rejete'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agenda Google</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{calendarConnected ? 'Connecte' : 'Non connecte'}</p>
          <div className={styles.actions}>
            {!calendarConnected ? (
              <Button type="button" variant="outline" onClick={() => void connectGoogleCalendar()}>
                Connecter Google
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => void disconnectGoogleCalendar()}>
                Deconnecter Google
              </Button>
            )}
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
              <dt>Banniere</dt>
              <dd>{bannerUrl || 'Non renseigne'}</dd>
            </div>
            <div>
              <dt>Competences</dt>
              <dd>{expertiseTags.join(', ') || 'Non renseigne'}</dd>
            </div>
            <div>
              <dt>Niveau d etudes</dt>
              <dd>{educationLevel || 'Non renseigne'}</dd>
            </div>
            <div>
              <dt>Diplomes</dt>
              <dd>{normalizedSummary.degrees.join(', ') || 'Non renseigne'}</dd>
            </div>
            <div>
              <dt>Mots-cles</dt>
              <dd>{normalizedSummary.keywords.join(', ') || 'Non renseigne'}</dd>
            </div>
            <div>
              <dt>Liens professionnels</dt>
              <dd>{normalizedSummary.professionalLinks.join(', ') || 'Non renseigne'}</dd>
            </div>
            <div>
              <dt>Accompagnement</dt>
              <dd>{supportTypes.join(', ') || 'Non renseigne'}</dd>
            </div>
            <div>
              <dt>Langues</dt>
              <dd>{languages.join(', ') || 'Non renseigne'}</dd>
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
