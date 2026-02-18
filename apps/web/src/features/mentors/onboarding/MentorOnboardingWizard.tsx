'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from '@/components/ui';
import styles from './MentorOnboardingWizard.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface MentorDocument {
  documentId: string;
  type: 'diploma' | 'certificate';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  url: string;
}

interface MentorSettingsPayload {
  profile: {
    domain: string;
    bio: string | null;
    bannerUrl: string | null;
    about: string | null;
    professionalLinks: string[];
    educationLevel: string | null;
    degrees: string[];
    keywords: string[];
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

const SUPPORT_TYPE_OPTIONS = [
  { value: 'ponctuel', label: 'Ponctuel' },
  { value: 'suivi_regulier', label: 'Suivi regulier' },
  { value: 'long_uniquement', label: 'Long terme' },
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

const STEPS = ['Identite', 'Offre', 'Disponibilites', 'Finalisation'];

function toIsoUtc(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function toLocalDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function toArray(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function MentorOnboardingWizard({ accessToken }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step 0 — Identite
  const [domain, setDomain] = useState('');
  const [domainLabel, setDomainLabel] = useState('');
  const [bio, setBio] = useState('');
  const [about, setAbout] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [expertiseTags, setExpertiseTags] = useState<string[]>([]);
  const [supportedLevels, setSupportedLevels] = useState<string[]>([]);

  // Step 1 — Offre
  const [supportTypes, setSupportTypes] = useState<string[]>([]);
  const [tariffMin, setTariffMin] = useState('30');
  const [tariffMax, setTariffMax] = useState('45');
  const [currency, setCurrency] = useState('EUR');
  const [languages, setLanguages] = useState<string[]>([]);
  const [certificationsInput, setCertificationsInput] = useState('');

  // Step 2 — Disponibilités
  const [isAvailable, setIsAvailable] = useState(true);
  const [nextAvailableAt, setNextAvailableAt] = useState('');
  const [slots, setSlots] = useState<AvailabilitySlot[]>([EMPTY_SLOT]);

  // Step 3 — Finalisation
  const [professionalLinksInput, setProfessionalLinksInput] = useState('');
  const [degreesInput, setDegreesInput] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [docType, setDocType] = useState<'diploma' | 'certificate'>('diploma');
  const [docUrl, setDocUrl] = useState('');
  const [documents, setDocuments] = useState<MentorDocument[]>([]);
  const [missingRequirements, setMissingRequirements] = useState<string[]>([]);

  const profileCompletion = useMemo(() => {
    const checks = [
      Boolean(domain.trim()),
      expertiseTags.length > 0,
      Boolean(about.trim()),
      supportTypes.length > 0,
      Number(tariffMin) > 0 && Number(tariffMax) > Number(tariffMin),
      toArray(professionalLinksInput).length > 0,
      documents.length > 0,
    ];

    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [about, documents.length, domain, expertiseTags.length, professionalLinksInput, supportTypes.length, tariffMax, tariffMin]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [profileRes, docsRes, readinessRes] = await Promise.all([
        fetch(`${API_URL}/mentors/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        }),
        fetch(`${API_URL}/mentors/me/documents`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        }),
        fetch(`${API_URL}/mentors/me/publish-readiness`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        }),
      ]);

      const profileResult = await profileRes.json();
      const docsResult = await docsRes.json();
      const readinessResult = await readinessRes.json();

      if (profileRes.ok && !profileResult.error) {
        const data = profileResult.data as MentorSettingsPayload;
        setHasExistingProfile(true);
        setDomain(data.profile.domain);
        setBio(data.profile.bio ?? '');
        setAbout(data.profile.about ?? '');
        setEducationLevel(data.profile.educationLevel ?? '');
        setExpertiseTags(data.profile.expertiseTags ?? []);
        setSupportedLevels(data.profile.supportedLevels ?? []);
        setSupportTypes(data.profile.supportTypes ?? []);
        setTariffMin(String(data.profile.tariffs.min));
        setTariffMax(String(data.profile.tariffs.max));
        setCurrency(data.profile.tariffs.currency || 'EUR');
        setLanguages(data.profile.languages ?? []);
        setCertificationsInput((data.profile.certifications ?? []).join(', '));
        setIsAvailable(data.profile.availability.isAvailable);
        setNextAvailableAt(toLocalDateTime(data.profile.availability.nextAvailableAt));
        setSlots(
          data.profile.availability.slots.length > 0 ? data.profile.availability.slots : [EMPTY_SLOT],
        );
        setProfessionalLinksInput((data.profile.professionalLinks ?? []).join(', '));
        setDegreesInput((data.profile.degrees ?? []).join(', '));
        setKeywordsInput((data.profile.keywords ?? []).join(', '));
      } else if (profileRes.status !== 404) {
        setError(profileResult.error?.message || 'Impossible de charger le profil mentor');
      }

      if (docsRes.ok && !docsResult.error) {
        setDocuments((docsResult.data?.documents ?? []) as MentorDocument[]);
      }

      if (readinessRes.ok && !readinessResult.error) {
        setMissingRequirements((readinessResult.data?.missingRequirements ?? []) as string[]);
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

  const validateCurrentStep = () => {
    if (step === 0) {
      if (!domain.trim()) return 'Le domaine principal est requis';
      if (expertiseTags.length === 0) return 'Ajoutez au moins une competence';
      if (!about.trim()) return 'La section A propos est requise';
    }

    if (step === 1) {
      const min = Number(tariffMin);
      const max = Number(tariffMax);
      if (!Number.isInteger(min) || !Number.isInteger(max) || min <= 0 || max <= 0) {
        return 'Les tarifs doivent etre des entiers positifs';
      }
      if (min >= max) {
        return 'Le tarif minimum doit etre inferieur au tarif maximum';
      }
      if (supportTypes.length === 0) {
        return 'Selectionnez au moins un type d accompagnement';
      }
    }

    if (step === 2) {
      const invalidSlot = slots.some((slot) => slot.startTime >= slot.endTime);
      if (invalidSlot) {
        return 'Chaque plage doit avoir une heure de debut inferieure a la fin';
      }
    }

    return '';
  };

  const upsertProfile = async () => {
    const validationMessage = validateCurrentStep();
    if (validationMessage) {
      setError(validationMessage);
      return false;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      domain: domain.trim(),
      bio: bio.trim() || undefined,
      about: about.trim() || undefined,
      educationLevel: educationLevel || undefined,
      degrees: toArray(degreesInput),
      keywords: toArray(keywordsInput),
      professionalLinks: toArray(professionalLinksInput),
      expertiseTags,
      supportedLevels,
      supportTypes,
      languages,
      certifications: toArray(certificationsInput),
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

    try {
      const response = await fetch(`${API_URL}/mentors/me`, {
        method: hasExistingProfile ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error?.message || 'Impossible de sauvegarder le profil mentor');
        return false;
      }

      setHasExistingProfile(true);
      setSuccess('Profil mentor sauvegarde');
      await loadProfile();
      return true;
    } catch {
      setError('Erreur de connexion au serveur');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const uploadDocument = async () => {
    if (!docUrl.trim()) {
      setError('Ajoutez une URL de document');
      return;
    }

    setUploading(true);
    setError('');
    try {
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
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setUploading(false);
    }
  };

  const goNext = () => {
    const validationMessage = validateCurrentStep();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    setError('');
    setSuccess('');
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError('');
    setSuccess('');
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const finishOnboarding = async () => {
    const saved = await upsertProfile();
    if (!saved) return;
    router.push('/dashboard?mentorOnboarding=done');
    router.refresh();
  };

  if (loading) {
    return (
      <section className={styles.container} aria-labelledby="mentor-onboarding-title">
        <h1 id="mentor-onboarding-title" className={styles.title}>Onboarding mentor</h1>
        <p className={styles.subtitle}>Chargement de votre espace mentor...</p>
      </section>
    );
  }

  return (
    <section className={styles.container} aria-labelledby="mentor-onboarding-title">
      <div className={styles.hero}>
        <h1 id="mentor-onboarding-title" className={styles.title}>Construisons votre profil mentor</h1>
        <p className={styles.subtitle}>
          Etape {step + 1}/{STEPS.length} — {STEPS[step]}
        </p>
        <div className={styles.progressTrack} aria-hidden="true">
          <div className={styles.progressFill} style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <div className={styles.stepPills}>
        {STEPS.map((label, index) => (
          <div
            key={label}
            className={`${styles.stepPill} ${index === step ? styles.stepPillActive : ''} ${index < step ? styles.stepPillDone : ''}`}
            aria-current={index === step ? 'step' : undefined}
          >
            <span className={styles.stepNumber}>{index < step ? '✓' : index + 1}</span>
            {label}
          </div>
        ))}
      </div>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Progression du profil: {profileCompletion}%</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className={styles.feedbackError}>{error}</div>}
          {success && <div className={styles.feedbackSuccess}>{success}</div>}

          {/* ── Étape 0 : Identité ─────────────────────────────────── */}
          {step === 0 && (
            <div className={styles.grid}>
              <SearchableSelect
                label="Domaine principal"
                placeholder="Rechercher un domaine…"
                fetchUrl="/references/domains"
                value={domain}
                valueLabel={domainLabel}
                onChange={(val, lbl) => { setDomain(val); setDomainLabel(lbl); }}
              />
              <MultiSearchSelect
                label="Compétences (sélectionnez dans la liste)"
                placeholder="Rechercher une compétence…"
                fetchUrl="/references/skills"
                domainFilter={domain || undefined}
                values={expertiseTags}
                onChange={setExpertiseTags}
                maxItems={12}
              />
              <Input
                name="bio"
                label="Bio courte"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Votre promesse en une phrase"
              />
              <Input
                name="about"
                label="A propos"
                value={about}
                onChange={(event) => setAbout(event.target.value)}
                placeholder="Votre posture, vos experiences, votre methode"
              />
              <Select
                name="education-level"
                label="Niveau d etudes"
                value={educationLevel}
                options={EDUCATION_OPTIONS}
                onChange={(event) => setEducationLevel(event.target.value)}
              />
              <div>
                <p className={styles.groupTitle}>Niveaux accompagnes</p>
                <div className={styles.optionWrap}>
                  {LEVEL_OPTIONS.map((option) => {
                    const checked = supportedLevels.includes(option.value);
                    return (
                      <label key={option.value} className={styles.checkLine}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            setSupportedLevels((previous) =>
                              event.target.checked
                                ? [...new Set([...previous, option.value])]
                                : previous.filter((item) => item !== option.value),
                            )
                          }
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Étape 1 : Offre ──────────────────────────────────────── */}
          {step === 1 && (
            <div className={styles.grid}>
              <div>
                <p className={styles.groupTitle}>Types d accompagnement</p>
                <div className={styles.optionWrap}>
                  {SUPPORT_TYPE_OPTIONS.map((option) => {
                    const checked = supportTypes.includes(option.value);
                    return (
                      <label key={option.value} className={styles.checkLine}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            setSupportTypes((previous) =>
                              event.target.checked
                                ? [...new Set([...previous, option.value])]
                                : previous.filter((item) => item !== option.value),
                            )
                          }
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <Input
                type="number"
                name="tariff-min"
                label="Tarif min (EUR/h)"
                value={tariffMin}
                onChange={(event) => setTariffMin(event.target.value)}
                min={1}
              />
              <Input
                type="number"
                name="tariff-max"
                label="Tarif max (EUR/h)"
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
              />
              <LanguageSelect
                label="Langues parlées"
                values={languages}
                onChange={setLanguages}
              />
              <Input
                name="certifications"
                label="Certifications"
                value={certificationsInput}
                onChange={(event) => setCertificationsInput(event.target.value)}
                placeholder="scrum, aws, pedagogie"
              />
            </div>
          )}

          {/* ── Étape 2 : Disponibilités ────────────────────────────── */}
          {step === 2 && (
            <div className={styles.grid}>
              <label className={styles.checkLine}>
                <input type="checkbox" checked={isAvailable} onChange={(event) => setIsAvailable(event.target.checked)} />
                <span>Disponible immediatement</span>
              </label>
              <Input
                name="next-available"
                type="datetime-local"
                label="Prochaine disponibilite"
                value={nextAvailableAt}
                onChange={(event) => setNextAvailableAt(event.target.value)}
              />
              <div className={styles.slotHeader}>
                <p className={styles.groupTitle}>Plages de disponibilite hebdomadaires</p>
                <Button type="button" variant="outline" onClick={() => setSlots((previous) => [...previous, { ...EMPTY_SLOT }])}>
                  Ajouter
                </Button>
              </div>
              <div className={styles.slotList}>
                {slots.map((slot, index) => (
                  <div key={`${slot.dayOfWeek}-${index}`} className={styles.slotRow}>
                    <Select
                      label="Jour"
                      name={`slot-day-${index}`}
                      value={String(slot.dayOfWeek)}
                      options={DAY_OPTIONS}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setSlots((previous) =>
                          previous.map((item, itemIndex) => (itemIndex === index ? { ...item, dayOfWeek: value } : item)),
                        );
                      }}
                    />
                    <Input
                      name={`slot-start-${index}`}
                      type="time"
                      label="Debut"
                      value={slot.startTime}
                      onChange={(event) =>
                        setSlots((previous) =>
                          previous.map((item, itemIndex) => (itemIndex === index ? { ...item, startTime: event.target.value } : item)),
                        )
                      }
                    />
                    <Input
                      name={`slot-end-${index}`}
                      type="time"
                      label="Fin"
                      value={slot.endTime}
                      onChange={(event) =>
                        setSlots((previous) =>
                          previous.map((item, itemIndex) => (itemIndex === index ? { ...item, endTime: event.target.value } : item)),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setSlots((previous) =>
                          previous.length > 1 ? previous.filter((_, itemIndex) => itemIndex !== index) : previous,
                        )
                      }
                    >
                      Supprimer
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Étape 3 : Finalisation ──────────────────────────────── */}
          {step === 3 && (
            <div className={styles.grid}>
              <Input
                name="professional-links"
                label="Liens professionnels (LinkedIn)"
                value={professionalLinksInput}
                onChange={(event) => setProfessionalLinksInput(event.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
              <Input
                name="degrees"
                label="Diplomes"
                value={degreesInput}
                onChange={(event) => setDegreesInput(event.target.value)}
                placeholder="Master 2 IA, MBA..."
              />
              <Input
                name="keywords"
                label="Mots-cles"
                value={keywordsInput}
                onChange={(event) => setKeywordsInput(event.target.value)}
                placeholder="portfolio, soutenance, data"
              />

              <div className={styles.documentBox}>
                <p className={styles.groupTitle}>Justificatifs</p>
                <div className={styles.documentRow}>
                  <Select
                    name="doc-type"
                    label="Type"
                    value={docType}
                    options={[
                      { value: 'diploma', label: 'Diplome' },
                      { value: 'certificate', label: 'Certification' },
                    ]}
                    onChange={(event) => setDocType(event.target.value as 'diploma' | 'certificate')}
                  />
                  <Input
                    name="doc-url"
                    label="URL du document"
                    value={docUrl}
                    onChange={(event) => setDocUrl(event.target.value)}
                    placeholder="https://..."
                  />
                  <Button type="button" variant="outline" isLoading={uploading} onClick={() => void uploadDocument()}>
                    Ajouter
                  </Button>
                </div>
                <ul className={styles.documentList}>
                  {documents.map((doc) => (
                    <li key={doc.documentId}>
                      {doc.type} - {doc.verificationStatus}
                    </li>
                  ))}
                  {documents.length === 0 && <li>Aucun document ajoute</li>}
                </ul>
              </div>

              <div className={styles.readinessBox}>
                <p className={styles.groupTitle}>Readiness publication</p>
                {missingRequirements.length === 0 ? (
                  <p className={styles.ready}>Profil publiable</p>
                ) : (
                  <ul className={styles.readinessList}>
                    {missingRequirements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className={styles.actions}>
        {step > 0 && (
          <Button type="button" variant="ghost" onClick={goBack}>
            Retour
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button type="button" variant="secondary" onClick={goNext}>
            Suivant →
          </Button>
        ) : (
          <Button type="button" isLoading={saving} onClick={() => void finishOnboarding()}>
            Enregistrer mon profil
          </Button>
        )}
      </div>
    </section>
  );
}
