'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Button,
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
    avatarUrl: string | null;
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

// Icônes SVG
const Icons = {
  Settings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  User: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Lock: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Mail: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  Briefcase: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  DollarSign: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  Calendar: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  FileText: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  AlertCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Trash: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Eye: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
};

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
  { value: 'debutant', label: 'Débutant', description: 'Étudiants en début de parcours' },
  { value: 'intermediaire', label: 'Intermédiaire', description: 'Étudiants avec bases solides' },
  { value: 'avance', label: 'Avancé', description: 'Étudiants confirmés' },
];

const SUPPORT_TYPE_OPTIONS = [
  { value: 'ponctuel', label: 'Ponctuel', description: 'Sessions ponctuelles selon besoin' },
  { value: 'suivi_regulier', label: 'Suivi régulier', description: 'Accompagnement hebdomadaire' },
  { value: 'long_uniquement', label: 'Long terme', description: 'Engagement sur plusieurs mois' },
] as const;

const EDUCATION_OPTIONS = [
  { value: '', label: 'Non renseigné' },
  { value: 'bac', label: 'Baccalauréat' },
  { value: 'bac+2', label: 'Bac+2 (BTS, DUT)' },
  { value: 'bac+3', label: 'Bac+3 (Licence)' },
  { value: 'bac+5', label: 'Bac+5 (Master)' },
  { value: 'doctorat', label: 'Doctorat' },
  { value: 'autre', label: 'Autre' },
];

const EMPTY_SLOT: AvailabilitySlot = {
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '12:00',
};

const REQUIREMENT_LABELS: Record<string, string> = {
  about: 'Description "À propos"',
  banner_or_avatar: 'Photo de profil ou bannière',
  domain: "Domaine d'expertise",
  expertise_tags: 'Au moins une compétence',
  support_types: "Au moins un type d'accompagnement",
  tariff: 'Tarif horaire',
  profile: 'Profil mentor',
};

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
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function translateRequirement(key: string): string {
  return REQUIREMENT_LABELS[key] || key;
}

type SectionId = 'account' | 'identity' | 'expertise' | 'pricing' | 'availability' | 'documents';

const SECTIONS: Array<{ id: SectionId; label: string; icon: () => JSX.Element }> = [
  { id: 'account', label: 'Compte', icon: Icons.Settings },
  { id: 'identity', label: 'Profil Mentor', icon: Icons.User },
  { id: 'expertise', label: 'Expertise', icon: Icons.Briefcase },
  { id: 'pricing', label: 'Tarifs', icon: Icons.DollarSign },
  { id: 'availability', label: 'Disponibilités', icon: Icons.Calendar },
  { id: 'documents', label: 'Documents', icon: Icons.FileText },
];

export function MentorSettings({ accessToken }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSection, setActiveSection] = useState<SectionId>('account');

  // Account data (user info)
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Profile data
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
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
      // Charger les infos utilisateur
      const userResponse = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (userResponse.ok) {
        const userResult = await userResponse.json();
        if (userResult.data) {
          setEmail(userResult.data.email ?? '');
          setFirstName(userResult.data.firstName ?? '');
          setLastName(userResult.data.lastName ?? '');
          setAvatarUrl(userResult.data.avatarUrl ?? '');
        }
      }

      // Charger le profil mentor
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
      setFullName(data.profile.fullName ?? '');
      if (data.profile.avatarUrl) setAvatarUrl(data.profile.avatarUrl);
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

  const saveAccountInfo = async () => {
    setError('');
    setSuccess('');
    setSavingAccount(true);

    try {
      // Valider
      if (!firstName.trim() || !lastName.trim()) {
        setError('Le prénom et le nom sont requis');
        setSavingAccount(false);
        return;
      }

      // Sauvegarder les infos de base
      const payload: Record<string, string | null> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };

      const response = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        setError(result.error?.message || 'Impossible de sauvegarder les informations');
        setSavingAccount(false);
        return;
      }

      // Changer le mot de passe si renseigné
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          setError('Les mots de passe ne correspondent pas');
          setSavingAccount(false);
          return;
        }
        if (newPassword.length < 8) {
          setError('Le mot de passe doit contenir au moins 8 caractères');
          setSavingAccount(false);
          return;
        }

        const passwordResponse = await fetch(`${API_URL}/users/me/password`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        });

        const passwordResult = await passwordResponse.json();
        if (!passwordResponse.ok || passwordResult.error) {
          setError(passwordResult.error?.message || 'Impossible de changer le mot de passe');
          setSavingAccount(false);
          return;
        }

        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      setSuccess('Informations du compte mises à jour');
      setFullName(`${firstName} ${lastName}`);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setSavingAccount(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const normalizedSummary = useMemo(() => {
    const toList = (value: string) =>
      value.split(',').map((item) => item.trim()).filter(Boolean);
    return {
      degrees: toList(degreesInput),
      keywords: toList(keywordsInput),
      certifications: toList(certificationsInput),
      professionalLinks: toList(professionalLinksInput),
    };
  }, [certificationsInput, degreesInput, keywordsInput, professionalLinksInput]);

  // Calculate profile completion
  const profileCompletion = useMemo(() => {
    let completed = 0;
    const total = 8;
    if (domain) completed++;
    if (expertiseTags.length > 0) completed++;
    if (about) completed++;
    if (bannerUrl || avatarUrl) completed++;
    if (supportTypes.length > 0) completed++;
    if (tariffMin && tariffMax) completed++;
    if (bio) completed++;
    if (languages.length > 0) completed++;
    return Math.round((completed / total) * 100);
  }, [domain, expertiseTags, about, bannerUrl, avatarUrl, supportTypes, tariffMin, tariffMax, bio, languages]);

  const validateClient = () => {
    if (!domain.trim()) {
      setError('Le domaine est requis');
      return false;
    }
    if (expertiseTags.length === 0) {
      setError('Au moins une compétence est requise');
      return false;
    }
    if (about.length > 1200) {
      setError('La section À propos ne peut pas dépasser 1200 caractères');
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
      setError('Les liens professionnels doivent être des URLs LinkedIn valides');
      return false;
    }

    const min = Number(tariffMin);
    const max = Number(tariffMax);

    if (!Number.isInteger(min) || !Number.isInteger(max) || min <= 0 || max <= 0) {
      setError('Les tarifs doivent être des entiers positifs');
      return false;
    }
    if (min >= max) {
      setError('Le tarif minimum doit être strictement inférieur au maximum');
      return false;
    }

    const hasInvalidSlot = slots.some((slot) => slot.startTime >= slot.endTime);
    if (hasInvalidSlot) {
      setError('Chaque plage de disponibilité doit avoir un début avant la fin');
      return false;
    }

    setError('');
    return true;
  };

  const upsertProfile = async () => {
    if (!validateClient()) return;

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
          ? 'Profil mentor mis à jour avec succès'
          : 'Profil mentor créé et publié dans la recherche',
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
      setError(result.error?.message || 'Déconnexion Google impossible');
      return;
    }
    setCalendarConnected(false);
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <p>Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <Link href="/mentors" className={styles.backButton}>
            <Icons.ArrowLeft />
            <span>Retour</span>
          </Link>
          <div className={styles.headerTitle}>
            <h1>Mon profil mentor</h1>
            <p>Configurez votre profil pour apparaître dans la recherche des étudiants</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.profileCompletion}>
            <div className={styles.completionInfo}>
              <span className={styles.completionLabel}>Profil complété</span>
              <span className={styles.completionValue}>{profileCompletion}%</span>
            </div>
            <div className={styles.completionBar}>
              <div
                className={styles.completionProgress}
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
          </div>
          {!hasExistingProfile ? (
            <span className={styles.statusBadgeWarning}>Non créé</span>
          ) : missingRequirements.length === 0 ? (
            <span className={styles.statusBadgeSuccess}>
              <Icons.Check /> Visible
            </span>
          ) : (
            <span className={styles.statusBadgeWarning}>
              <Icons.AlertCircle /> Incomplet
            </span>
          )}
        </div>
      </header>

      {/* Alerts */}
      {error && (
        <div className={styles.alertError} role="alert">
          <Icons.AlertCircle />
          <span>{error}</span>
          <button onClick={() => setError('')} className={styles.alertClose}>×</button>
        </div>
      )}
      {success && (
        <div className={styles.alertSuccess} role="status">
          <Icons.Check />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className={styles.alertClose}>×</button>
        </div>
      )}

      {/* Missing requirements banner */}
      {hasExistingProfile && missingRequirements.length > 0 && (
        <div className={styles.requirementsBanner}>
          <div className={styles.requirementsContent}>
            <strong>Complétez votre profil pour être visible :</strong>
            <ul>
              {missingRequirements.map((item) => (
                <li key={item}>{translateRequirement(item)}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className={styles.mainLayout}>
        {/* Sidebar Navigation */}
        <nav className={styles.sidebar}>
          <ul className={styles.sidebarNav}>
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <li key={section.id}>
                  <button
                    className={`${styles.sidebarItem} ${activeSection === section.id ? styles.sidebarItemActive : ''}`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <Icon />
                    <span>{section.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className={styles.sidebarActions}>
            <Button
              fullWidth
              onClick={() => void upsertProfile()}
              isLoading={saving}
            >
              {hasExistingProfile ? 'Enregistrer' : 'Publier mon profil'}
            </Button>
          </div>
        </nav>

        {/* Main Content */}
        <main className={styles.mainContent}>
          {/* Account Section */}
          {activeSection === 'account' && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}><Icons.Settings /></div>
                <div>
                  <h2>Paramètres du compte</h2>
                  <p>Gérez vos informations personnelles et votre mot de passe</p>
                </div>
              </div>

              <div className={styles.accountCard}>
                <h3 className={styles.accountCardTitle}>
                  <Icons.Mail /> Informations personnelles
                </h3>

                <div className={styles.formRow}>
                  <Input
                    name="firstName"
                    label="Prénom"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Votre prénom"
                  />
                  <Input
                    name="lastName"
                    label="Nom"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Votre nom"
                  />
                </div>

                <div className={styles.formGroup}>
                  <Input
                    name="email"
                    label="Adresse email"
                    value={email}
                    disabled
                    placeholder="votre@email.com"
                  />
                  <p className={styles.fieldHint}>L'adresse email ne peut pas être modifiée</p>
                </div>
              </div>

              <div className={styles.accountCard}>
                <h3 className={styles.accountCardTitle}>
                  <Icons.Lock /> Changer le mot de passe
                </h3>
                <p className={styles.accountCardDesc}>Laissez vide si vous ne souhaitez pas changer votre mot de passe</p>

                <div className={styles.formGroup}>
                  <Input
                    name="currentPassword"
                    label="Mot de passe actuel"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <div className={styles.formRow}>
                  <Input
                    name="newPassword"
                    label="Nouveau mot de passe"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <Input
                    name="confirmPassword"
                    label="Confirmer le mot de passe"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <p className={styles.fieldHint}>Le mot de passe doit contenir au moins 8 caractères</p>
              </div>

              <div className={styles.accountActions}>
                <Button
                  onClick={() => void saveAccountInfo()}
                  isLoading={savingAccount}
                >
                  Enregistrer les modifications
                </Button>
              </div>
            </section>
          )}

          {/* Identity Section */}
          {activeSection === 'identity' && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}><Icons.User /></div>
                <div>
                  <h2>Identité & Présentation</h2>
                  <p>Informations visibles sur votre profil public</p>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Photo de profil</label>
                <div className={styles.avatarUpload}>
                  <div className={styles.avatarPreview}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {fullName ? fullName.charAt(0).toUpperCase() : 'M'}
                      </div>
                    )}
                  </div>
                  <div className={styles.avatarActions}>
                    <p className={styles.avatarHint}>Format recommandé : JPG ou PNG, 400x400px minimum</p>
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <FileUpload
                  label="Bannière de profil"
                  accept="image"
                  accessToken={accessToken}
                  value={bannerUrl || undefined}
                  onChange={(url) => setBannerUrl(url || '')}
                  placeholder="Glissez une image de bannière (1200x400px recommandé)"
                />
                {bannerUrl && (
                  <div className={styles.bannerPreview}>
                    <img src={bannerUrl} alt="Bannière" />
                  </div>
                )}
              </div>

              <div className={styles.formRow}>
                <Input
                  name="bio"
                  label="Bio courte"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Une phrase qui vous décrit (ex: Expert React avec 10 ans d'expérience)"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  À propos de vous
                  <span className={styles.charCount}>{about.length}/1200</span>
                </label>
                <textarea
                  className={styles.textarea}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Décrivez votre parcours, votre approche du mentorat, ce qui vous passionne..."
                  rows={6}
                  maxLength={1200}
                />
              </div>

              <div className={styles.formRow}>
                <Select
                  name="educationLevel"
                  label="Niveau d'études"
                  value={educationLevel}
                  options={EDUCATION_OPTIONS}
                  onChange={(e) => setEducationLevel(e.target.value)}
                />
                <Input
                  name="degrees"
                  label="Diplômes"
                  value={degreesInput}
                  onChange={(e) => setDegreesInput(e.target.value)}
                  placeholder="Master informatique, MBA... (séparés par virgule)"
                />
              </div>

              <div className={styles.formRow}>
                <Input
                  name="professionalLinks"
                  label="Profil LinkedIn"
                  value={professionalLinksInput}
                  onChange={(e) => setProfessionalLinksInput(e.target.value)}
                  placeholder="https://www.linkedin.com/in/votre-profil"
                />
                <Input
                  name="keywords"
                  label="Mots-clés"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  placeholder="gestion de projet, mémoire... (séparés par virgule)"
                />
              </div>
            </section>
          )}

          {/* Expertise Section */}
          {activeSection === 'expertise' && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}><Icons.Briefcase /></div>
                <div>
                  <h2>Expertise & Compétences</h2>
                  <p>Définissez votre domaine et vos compétences</p>
                </div>
              </div>

              <div className={styles.formRow}>
                <SearchableSelect
                  name="domain"
                  label="Domaine d'expertise"
                  placeholder="Rechercher un domaine..."
                  fetchUrl="/references/domains"
                  value={domain}
                  valueLabel={domainLabel}
                  onChange={(value, label) => {
                    setDomain(value);
                    setDomainLabel(label);
                  }}
                />
              </div>

              <div className={styles.formGroup}>
                <MultiSearchSelect
                  name="expertise"
                  label="Compétences (max 12)"
                  placeholder="Rechercher une compétence..."
                  fetchUrl="/references/skills"
                  domainFilter={domain || undefined}
                  values={expertiseTags}
                  onChange={setExpertiseTags}
                  maxItems={12}
                />
              </div>

              <div className={styles.formRow}>
                <LanguageSelect
                  label="Langues parlées"
                  values={languages}
                  onChange={setLanguages}
                />
                <Input
                  name="certifications"
                  label="Certifications"
                  value={certificationsInput}
                  onChange={(e) => setCertificationsInput(e.target.value)}
                  placeholder="AWS, Scrum Master... (séparées par virgule)"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Niveaux d'étudiants accompagnés</label>
                <div className={styles.optionCards}>
                  {LEVEL_OPTIONS.map((option) => {
                    const checked = supportedLevels.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className={`${styles.optionCard} ${checked ? styles.optionCardSelected : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setSupportedLevels((prev) =>
                              e.target.checked
                                ? [...new Set([...prev, option.value])]
                                : prev.filter((item) => item !== option.value),
                            );
                          }}
                          className={styles.hiddenCheckbox}
                        />
                        <div className={styles.optionCardContent}>
                          <span className={styles.optionCardTitle}>{option.label}</span>
                          <span className={styles.optionCardDesc}>{option.description}</span>
                        </div>
                        <div className={styles.optionCardCheck}>
                          {checked && <Icons.Check />}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Types d'accompagnement proposés</label>
                <div className={styles.optionCards}>
                  {SUPPORT_TYPE_OPTIONS.map((option) => {
                    const checked = supportTypes.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className={`${styles.optionCard} ${checked ? styles.optionCardSelected : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setSupportTypes((prev) =>
                              e.target.checked
                                ? [...new Set([...prev, option.value])]
                                : prev.filter((item) => item !== option.value),
                            );
                          }}
                          className={styles.hiddenCheckbox}
                        />
                        <div className={styles.optionCardContent}>
                          <span className={styles.optionCardTitle}>{option.label}</span>
                          <span className={styles.optionCardDesc}>{option.description}</span>
                        </div>
                        <div className={styles.optionCardCheck}>
                          {checked && <Icons.Check />}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Pricing Section */}
          {activeSection === 'pricing' && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}><Icons.DollarSign /></div>
                <div>
                  <h2>Tarification</h2>
                  <p>Définissez vos tarifs horaires</p>
                </div>
              </div>

              <div className={styles.pricingCard}>
                <div className={styles.pricingHeader}>
                  <h3>Tarif horaire</h3>
                  <p>Indiquez votre fourchette de prix</p>
                </div>
                <div className={styles.pricingInputs}>
                  <div className={styles.priceInput}>
                    <label>Minimum</label>
                    <div className={styles.priceInputWrapper}>
                      <input
                        type="number"
                        value={tariffMin}
                        onChange={(e) => setTariffMin(e.target.value)}
                        min={1}
                      />
                      <span className={styles.priceCurrency}>{currency}/h</span>
                    </div>
                  </div>
                  <div className={styles.priceSeparator}>à</div>
                  <div className={styles.priceInput}>
                    <label>Maximum</label>
                    <div className={styles.priceInputWrapper}>
                      <input
                        type="number"
                        value={tariffMax}
                        onChange={(e) => setTariffMax(e.target.value)}
                        min={1}
                      />
                      <span className={styles.priceCurrency}>{currency}/h</span>
                    </div>
                  </div>
                </div>
                <div className={styles.currencySelect}>
                  <label>Devise</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  >
                    <option value="EUR">EUR - Euro</option>
                    <option value="USD">USD - Dollar</option>
                    <option value="GBP">GBP - Livre</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {/* Availability Section */}
          {activeSection === 'availability' && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}><Icons.Calendar /></div>
                <div>
                  <h2>Disponibilités</h2>
                  <p>Gérez vos créneaux de disponibilité</p>
                </div>
              </div>

              <div className={styles.availabilityToggle}>
                <label className={styles.toggleLabel}>
                  <div className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={isAvailable}
                      onChange={(e) => setIsAvailable(e.target.checked)}
                    />
                    <span className={styles.toggleSlider} />
                  </div>
                  <div className={styles.toggleContent}>
                    <span className={styles.toggleTitle}>Disponible immédiatement</span>
                    <span className={styles.toggleDesc}>
                      Activez si vous pouvez prendre de nouveaux étudiants dès maintenant
                    </span>
                  </div>
                </label>
              </div>

              {!isAvailable && (
                <div className={styles.formGroup}>
                  <Input
                    name="next-available"
                    label="Prochaine disponibilité"
                    type="datetime-local"
                    value={nextAvailableAt}
                    onChange={(e) => setNextAvailableAt(e.target.value)}
                  />
                </div>
              )}

              <div className={styles.slotsSection}>
                <div className={styles.slotsHeader}>
                  <h3>Plages horaires hebdomadaires</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Icons.Plus />}
                    onClick={() => setSlots((prev) => [...prev, { ...EMPTY_SLOT }])}
                  >
                    Ajouter un créneau
                  </Button>
                </div>

                <div className={styles.slotsList}>
                  {slots.map((slot, index) => (
                    <div key={`slot-${index}`} className={styles.slotCard}>
                      <div className={styles.slotFields}>
                        <Select
                          label="Jour"
                          name={`slot-day-${index}`}
                          value={String(slot.dayOfWeek)}
                          options={DAY_OPTIONS}
                          onChange={(e) => {
                            const day = Number(e.target.value);
                            setSlots((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, dayOfWeek: day } : item)),
                            );
                          }}
                        />
                        <Input
                          name={`slot-start-${index}`}
                          label="Début"
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => {
                            setSlots((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, startTime: e.target.value } : item)),
                            );
                          }}
                        />
                        <Input
                          name={`slot-end-${index}`}
                          label="Fin"
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => {
                            setSlots((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, endTime: e.target.value } : item)),
                            );
                          }}
                        />
                      </div>
                      {slots.length > 1 && (
                        <button
                          className={styles.slotDelete}
                          onClick={() => setSlots((prev) => prev.filter((_, i) => i !== index))}
                          title="Supprimer ce créneau"
                        >
                          <Icons.Trash />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.googleCalendar}>
                <div className={styles.googleCalendarInfo}>
                  <h3>Synchronisation Google Calendar</h3>
                  <p>Synchronisez vos disponibilités avec votre agenda Google</p>
                </div>
                <div className={styles.googleCalendarStatus}>
                  <span className={calendarConnected ? styles.connected : styles.disconnected}>
                    {calendarConnected ? 'Connecté' : 'Non connecté'}
                  </span>
                  {!calendarConnected ? (
                    <Button variant="outline" size="sm" onClick={() => void connectGoogleCalendar()}>
                      Connecter
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => void disconnectGoogleCalendar()}>
                      Déconnecter
                    </Button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Documents Section */}
          {activeSection === 'documents' && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}><Icons.FileText /></div>
                <div>
                  <h2>Documents & Légitimité</h2>
                  <p>Ajoutez vos diplômes et certifications pour renforcer votre crédibilité</p>
                </div>
              </div>

              <div className={styles.documentUpload}>
                <div className={styles.documentUploadForm}>
                  <Select
                    name="docType"
                    label="Type de document"
                    value={docType}
                    options={[
                      { value: 'diploma', label: 'Diplôme' },
                      { value: 'certificate', label: 'Certification' },
                    ]}
                    onChange={(e) => setDocType(e.target.value as 'diploma' | 'certificate')}
                  />
                  <FileUpload
                    label="Document (PDF ou image)"
                    accept="document"
                    accessToken={accessToken}
                    value={docUrl || undefined}
                    onChange={(url) => setDocUrl(url || '')}
                    placeholder="Glissez un fichier ou cliquez pour sélectionner"
                  />
                </div>
                {docUrl && (
                  <Button variant="outline" onClick={() => void uploadDocument()}>
                    Enregistrer ce document
                  </Button>
                )}
              </div>

              {documents.length > 0 && (
                <div className={styles.documentsList}>
                  <h3>Documents enregistrés</h3>
                  <div className={styles.documentsGrid}>
                    {documents.map((doc) => (
                      <div key={doc.documentId} className={styles.documentCard}>
                        <div className={styles.documentIcon}>
                          <Icons.FileText />
                        </div>
                        <div className={styles.documentInfo}>
                          <span className={styles.documentType}>
                            {doc.type === 'diploma' ? 'Diplôme' : 'Certification'}
                          </span>
                          <span className={`${styles.documentStatus} ${styles[`status${doc.verificationStatus}`]}`}>
                            {doc.verificationStatus === 'pending' && 'En attente de vérification'}
                            {doc.verificationStatus === 'verified' && 'Vérifié'}
                            {doc.verificationStatus === 'rejected' && 'Rejeté'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </main>

        {/* Preview Panel */}
        <aside className={styles.previewPanel}>
          <div className={styles.previewHeader}>
            <Icons.Eye />
            <span>Aperçu du profil</span>
          </div>
          <div className={styles.previewContent}>
            <div className={styles.previewCard}>
              {bannerUrl && (
                <div className={styles.previewBanner}>
                  <img src={bannerUrl} alt="" />
                </div>
              )}
              <div className={styles.previewAvatar}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" />
                ) : (
                  <div className={styles.previewAvatarPlaceholder}>
                    {fullName ? fullName.charAt(0).toUpperCase() : 'M'}
                  </div>
                )}
              </div>
              <div className={styles.previewInfo}>
                <h3>{fullName || 'Votre nom'}</h3>
                <p className={styles.previewDomain}>{domain || 'Domaine non défini'}</p>
                {bio && <p className={styles.previewBio}>{bio}</p>}
              </div>
              {expertiseTags.length > 0 && (
                <div className={styles.previewTags}>
                  {expertiseTags.slice(0, 4).map((tag) => (
                    <span key={tag} className={styles.previewTag}>{tag}</span>
                  ))}
                  {expertiseTags.length > 4 && (
                    <span className={styles.previewTagMore}>+{expertiseTags.length - 4}</span>
                  )}
                </div>
              )}
              <div className={styles.previewMeta}>
                {tariffMin && tariffMax && (
                  <div className={styles.previewPrice}>
                    {tariffMin}-{tariffMax} {currency}/h
                  </div>
                )}
                {isAvailable && (
                  <span className={styles.previewAvailable}>Disponible</span>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
