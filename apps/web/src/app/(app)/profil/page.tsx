'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MentorSettings } from '@/features/mentors/settings';
import { BillingSection } from '@/features/profile/billing/BillingSection';
import styles from './page.module.css';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  level: string | null;
  objectives: string[];
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  level?: string;
  objectives?: string;
  bio?: string;
  avatarUrl?: string;
  general?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function ProfilPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profil' | 'facturation'>('profil');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [objectives, setObjectives] = useState<string[]>([]);

  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const levelRef = useRef<HTMLSelectElement>(null);
  const objectivesRef = useRef<HTMLDivElement>(null);
  const bioRef = useRef<HTMLTextAreaElement>(null);
  const avatarUrlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/connexion?callbackUrl=/profil');
    }
  }, [status, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setActiveTab(params.get('tab') === 'facturation' ? 'facturation' : 'profil');
  }, []);

  useEffect(() => {
    async function loadProfile() {
      if (!session?.accessToken) return;

      try {
        const response = await fetch(`${API_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          setErrors({ general: result.error?.message || 'Erreur lors du chargement du profil' });
          return;
        }

        setProfile(result.data);
        setObjectives(result.data.objectives || []);
      } catch {
        setErrors({ general: 'Erreur de connexion au serveur' });
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.accessToken) {
      void loadProfile();
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (Object.keys(errors).length > 0 && errorSummaryRef.current) {
      errorSummaryRef.current.focus();
    }
  }, [errors]);

  useEffect(() => {
    if (successMessage && successRef.current) {
      successRef.current.focus();
    }
  }, [successMessage]);

  const validateForm = (formData: FormData): FormErrors => {
    const newErrors: FormErrors = {};
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const level = formData.get('level') as string;
    const bio = formData.get('bio') as string;
    const avatarUrl = formData.get('avatarUrl') as string;

    if (!firstName || firstName.trim().length === 0) {
      newErrors.firstName = 'Le prénom est requis';
    } else if (firstName.length > 100) {
      newErrors.firstName = 'Le prénom ne peut pas dépasser 100 caractères';
    }

    if (!lastName || lastName.trim().length === 0) {
      newErrors.lastName = 'Le nom est requis';
    } else if (lastName.length > 100) {
      newErrors.lastName = 'Le nom ne peut pas dépasser 100 caractères';
    }

    if (level && !['debutant', 'intermediaire', 'avance'].includes(level)) {
      newErrors.level = 'Le niveau doit être débutant, intermédiaire ou avancé';
    }

    if (bio && bio.length > 500) {
      newErrors.bio = 'La bio ne peut pas dépasser 500 caractères';
    }

    if (avatarUrl && avatarUrl.length > 500) {
      newErrors.avatarUrl = "L'URL de l'avatar ne peut pas dépasser 500 caractères";
    }

    const invalidObjective = objectives.find((obj) => obj.length > 200);
    if (invalidObjective) {
      newErrors.objectives = 'Chaque objectif ne peut pas dépasser 200 caractères';
    }

    return newErrors;
  };

  const focusFirstError = (validationErrors: FormErrors) => {
    if (validationErrors.firstName) {
      firstNameRef.current?.focus();
      return;
    }
    if (validationErrors.lastName) {
      lastNameRef.current?.focus();
      return;
    }
    if (validationErrors.level) {
      levelRef.current?.focus();
      return;
    }
    if (validationErrors.objectives) {
      const objectiveInput = objectivesRef.current?.querySelector('input');
      if (objectiveInput instanceof HTMLInputElement) {
        objectiveInput.focus();
      } else {
        objectivesRef.current?.focus();
      }
      return;
    }
    if (validationErrors.bio) {
      bioRef.current?.focus();
      return;
    }
    if (validationErrors.avatarUrl) {
      avatarUrlRef.current?.focus();
      return;
    }
    if (validationErrors.general) {
      errorSummaryRef.current?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');

    const formData = new FormData(e.currentTarget);
    const validationErrors = validateForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      focusFirstError(validationErrors);
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        level: formData.get('level') || null,
        objectives: objectives.filter((obj) => obj.trim() !== ''),
        bio: formData.get('bio') || null,
        avatarUrl: formData.get('avatarUrl') || null,
      };

      const response = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        if (result.error?.details) {
          const apiErrors: FormErrors = {};
          const details = result.error.details as Record<string, string>;
          for (const [key, value] of Object.entries(details)) {
            apiErrors[key as keyof FormErrors] = value;
          }
          setErrors(apiErrors);
        } else {
          setErrors({ general: result.error?.message || 'Erreur lors de la mise à jour' });
        }
        return;
      }

      setProfile(result.data);
      setSuccessMessage('Profil mis à jour avec succès');
    } catch {
      setErrors({ general: 'Erreur de connexion au serveur' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleObjectiveChange = (index: number, value: string) => {
    const newObjectives = [...objectives];
    newObjectives[index] = value;
    setObjectives(newObjectives);
  };

  const addObjective = () => {
    if (objectives.length < 10) {
      setObjectives([...objectives, '']);
    }
  };

  const removeObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const getInitials = () => {
    if (!profile) return '?';
    return `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();
  };

  const hasErrors = Object.keys(errors).length > 0;
  const isMentor = profile?.roles.includes('mentor') ?? false;

  if (status === 'loading' || isLoading) {
    return (
      <div className={styles.main}>
        <div className={styles.container}>
          <div className={styles.loading}>Chargement...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.main}>
        <div className={styles.container}>
          {hasErrors && (
            <div
              ref={errorSummaryRef}
              className={styles.errorSummary}
              role="alert"
              aria-live="assertive"
              tabIndex={-1}
            >
              <h2 className={styles.errorTitle}>Erreur</h2>
              <p>{errors.general}</p>
            </div>
          )}
          <Link href="/dashboard" className={styles.backLink}>
            &larr; Retour au tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  // Pour les mentors : afficher directement MentorSettings (sans onglets)
  if (isMentor && session?.accessToken) {
    return <MentorSettings accessToken={session.accessToken} />;
  }

  // Pour les non-mentors : afficher le formulaire de profil classique
  return (
    <div className={styles.main}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Mon profil</h1>
          <Link href="/dashboard" className={styles.backLink}>
            &larr; Retour
          </Link>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Sections du profil">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'profil'}
            className={activeTab === 'profil' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('profil')}
          >
            Profil
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'facturation'}
            className={activeTab === 'facturation' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('facturation')}
          >
            Facturation
          </button>
        </div>

        {activeTab === 'facturation' && session?.accessToken ? (
          <BillingSection accessToken={session.accessToken} />
        ) : activeTab === 'profil' ? (
          <>
        {successMessage && (
          <div
            ref={successRef}
            className={styles.successMessage}
            role="status"
            aria-live="polite"
            tabIndex={-1}
          >
            {successMessage}
          </div>
        )}

        {hasErrors && (
          <div
            ref={errorSummaryRef}
            className={styles.errorSummary}
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
          >
            <h2 className={styles.errorTitle}>{Object.keys(errors).length} erreur(s) détectée(s)</h2>
            <ul className={styles.errorList}>
              {errors.general && <li>{errors.general}</li>}
              {errors.firstName && (
                <li><a href="#firstName">{errors.firstName}</a></li>
              )}
              {errors.lastName && (
                <li><a href="#lastName">{errors.lastName}</a></li>
              )}
              {errors.level && (
                <li><a href="#level">{errors.level}</a></li>
              )}
              {errors.objectives && (
                <li><a href="#objectives">{errors.objectives}</a></li>
              )}
              {errors.bio && (
                <li><a href="#bio">{errors.bio}</a></li>
              )}
              {errors.avatarUrl && (
                <li><a href="#avatarUrl">{errors.avatarUrl}</a></li>
              )}
            </ul>
          </div>
        )}

        <div className={styles.avatarSection}>
          <div className={styles.avatar}>
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : getInitials()}
          </div>
          <h2 className={styles.userName}>
            {profile.firstName} {profile.lastName}
          </h2>
          <p className={styles.userEmail}>{profile.email}</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="firstName" className={`${styles.label} ${styles.required}`}>
                Prénom
              </label>
              <input
                ref={firstNameRef}
                type="text"
                id="firstName"
                name="firstName"
                defaultValue={profile.firstName}
                aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                aria-invalid={errors.firstName ? 'true' : undefined}
                className={`${styles.input} ${errors.firstName ? styles.inputError : ''}`}
                disabled={isSaving}
              />
              {errors.firstName && (
                <p id="firstName-error" className={styles.fieldError} role="alert">
                  {errors.firstName}
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="lastName" className={`${styles.label} ${styles.required}`}>
                Nom
              </label>
              <input
                ref={lastNameRef}
                type="text"
                id="lastName"
                name="lastName"
                defaultValue={profile.lastName}
                aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                aria-invalid={errors.lastName ? 'true' : undefined}
                className={`${styles.input} ${errors.lastName ? styles.inputError : ''}`}
                disabled={isSaving}
              />
              {errors.lastName && (
                <p id="lastName-error" className={styles.fieldError} role="alert">
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="level" className={styles.label}>
              Niveau
            </label>
            <select
              ref={levelRef}
              id="level"
              name="level"
              defaultValue={profile.level || ''}
              className={`${styles.select} ${errors.level ? styles.inputError : ''}`}
              disabled={isSaving}
            >
              <option value="">Sélectionnez votre niveau</option>
              <option value="debutant">Débutant</option>
              <option value="intermediaire">Intermédiaire</option>
              <option value="avance">Avancé</option>
            </select>
            {errors.level && (
              <p id="level-error" className={styles.fieldError} role="alert">
                {errors.level}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label id="objectives-label" className={styles.label}>
              Objectifs
            </label>
            <div
              className={styles.objectivesList}
              role="group"
              aria-labelledby="objectives-label"
              id="objectives"
              ref={objectivesRef}
              tabIndex={-1}
            >
              {objectives.map((objective, index) => (
                <div key={index} className={styles.objectiveItem}>
                  <input
                    type="text"
                    value={objective}
                    onChange={(e) => handleObjectiveChange(index, e.target.value)}
                    placeholder={`Objectif ${index + 1}`}
                    className={styles.input}
                    disabled={isSaving}
                    aria-label={`Objectif ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeObjective(index)}
                    className={styles.removeButton}
                    disabled={isSaving}
                    aria-label={`Supprimer l'objectif ${index + 1}`}
                  >
                    &times;
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addObjective}
                className={styles.addButton}
                disabled={isSaving || objectives.length >= 10}
              >
                + Ajouter un objectif
              </button>
            </div>
            {errors.objectives && (
              <p className={styles.fieldError} role="alert">
                {errors.objectives}
              </p>
            )}
            <p className={styles.fieldHint}>Maximum 10 objectifs, 200 caractères chacun</p>
          </div>

          <div className={styles.field}>
            <label htmlFor="bio" className={styles.label}>
              Bio
            </label>
            <textarea
              ref={bioRef}
              id="bio"
              name="bio"
              defaultValue={profile.bio || ''}
              placeholder="Parlez-nous de vous..."
              aria-describedby={errors.bio ? 'bio-error' : 'bio-hint'}
              aria-invalid={errors.bio ? 'true' : undefined}
              className={`${styles.textarea} ${errors.bio ? styles.inputError : ''}`}
              disabled={isSaving}
            />
            {errors.bio && (
              <p id="bio-error" className={styles.fieldError} role="alert">
                {errors.bio}
              </p>
            )}
            <p id="bio-hint" className={styles.fieldHint}>Maximum 500 caractères</p>
          </div>

          <div className={styles.field}>
            <label htmlFor="avatarUrl" className={styles.label}>
              URL de l&apos;avatar
            </label>
            <input
              ref={avatarUrlRef}
              type="url"
              id="avatarUrl"
              name="avatarUrl"
              defaultValue={profile.avatarUrl || ''}
              placeholder="https://example.com/avatar.jpg"
              aria-describedby={errors.avatarUrl ? 'avatarUrl-error' : 'avatarUrl-hint'}
              aria-invalid={errors.avatarUrl ? 'true' : undefined}
              className={`${styles.input} ${errors.avatarUrl ? styles.inputError : ''}`}
              disabled={isSaving}
            />
            {errors.avatarUrl && (
              <p id="avatarUrl-error" className={styles.fieldError} role="alert">
                {errors.avatarUrl}
              </p>
            )}
            <p id="avatarUrl-hint" className={styles.fieldHint}>
              URL vers une image de profil (optionnel)
            </p>
          </div>

          <div className={styles.buttonRow}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSaving}
              aria-busy={isSaving}
            >
              {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
          </>
        ) : null}
      </div>
    </div>
  );
}
