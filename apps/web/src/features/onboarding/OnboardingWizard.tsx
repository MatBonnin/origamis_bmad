'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import logo from '@/app/assets/logo.png';
import styles from './OnboardingWizard.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const STEP_LABELS = ['Profil', 'Parcours', 'Objectifs', 'Validation'];

interface Props {
  accessToken: string;
}

interface Answers {
  profileType?: string;
  domain?: string;
  level?: string;
  year?: string;
  objectives?: string[];
}

export function OnboardingWizard({ accessToken }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>({ profileType: 'etudiant', objectives: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadState() {
      try {
        const response = await fetch(`${API_URL}/onboarding/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });
        const result = await response.json();

        if (!response.ok || result.error) {
          setError(result.error?.message || 'Erreur lors du chargement de l onboarding');
          return;
        }

        setStep(result.data.step || 1);
        setAnswers({ profileType: 'etudiant', objectives: [], ...result.data.answers });

        if (result.data.completed) {
          router.push('/dashboard');
        }
      } catch {
        setError('Erreur de connexion au serveur');
      } finally {
        setLoading(false);
      }
    }

    loadState();
  }, [accessToken, router]);

  const objectivesAsText = useMemo(
    () => (answers.objectives && answers.objectives.length > 0 ? answers.objectives.join(', ') : ''),
    [answers.objectives],
  );

  const validateStep = (): string | null => {
    if (step === 2) {
      if (!answers.domain || !answers.level || !answers.year) {
        return 'Veuillez renseigner domaine, niveau et annee';
      }
    }

    if (step === 3) {
      if (!answers.objectives || answers.objectives.length === 0) {
        return 'Veuillez renseigner au moins un objectif';
      }
    }

    return null;
  };

  const saveStep = async (nextStep: number) => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return false;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/onboarding/step`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ step: nextStep, answers }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        setError(result.error?.message || 'Erreur lors de la sauvegarde');
        return false;
      }

      setStep(result.data.step);
      setSuccess('Etape enregistree');
      return true;
    } catch {
      setError('Erreur de connexion au serveur');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    setSuccess('');
    const target = Math.min(step + 1, 4);
    await saveStep(target);
  };

  const goBack = async () => {
    setSuccess('');
    const target = Math.max(step - 1, 1);
    await saveStep(target);
  };

  const completeOnboarding = async () => {
    setError('');
    setSuccess('');

    const saved = await saveStep(4);
    if (!saved) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/onboarding/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        setError(result.error?.message || 'Erreur lors de la finalisation');
        return;
      }

      router.push('/profile-suggestion');
      router.refresh();
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>Chargement...</div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Image src={logo} alt="Orig'AMI" width={95} height={67} />
          <h1 className={styles.title}>Onboarding etudiant</h1>
        </header>

        <ol className={styles.stepper} aria-label="Progression onboarding">
          {STEP_LABELS.map((label, index) => {
            const indexStep = index + 1;
            const isActive = indexStep === step;
            return (
              <li key={label} className={isActive ? styles.stepActive : styles.stepItem}>
                <span aria-current={isActive ? 'step' : undefined}>{indexStep}. {label}</span>
              </li>
            );
          })}
        </ol>

        {error && (
          <p className={styles.error} role="alert" aria-live="assertive">
            {error}
          </p>
        )}
        {success && (
          <p className={styles.success} role="status" aria-live="polite">
            {success}
          </p>
        )}

        <section className={styles.panel}>
          {step === 1 && (
            <>
              <h2>Profil</h2>
              <p>Votre type de profil est pre-rempli pour cette etape.</p>
              <label className={styles.field}>
                Profil
                <input
                  type="text"
                  value={answers.profileType || 'etudiant'}
                  readOnly
                  aria-readonly="true"
                />
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <h2>Parcours academique</h2>
              <label className={styles.field}>
                Domaine
                <input
                  type="text"
                  value={answers.domain || ''}
                  onChange={(event) => setAnswers((prev) => ({ ...prev, domain: event.target.value }))}
                />
              </label>
              <label className={styles.field}>
                Niveau
                <select
                  value={answers.level || ''}
                  onChange={(event) => setAnswers((prev) => ({ ...prev, level: event.target.value }))}
                >
                  <option value="">Selectionnez</option>
                  <option value="debutant">Debutant</option>
                  <option value="intermediaire">Intermediaire</option>
                  <option value="avance">Avance</option>
                </select>
              </label>
              <label className={styles.field}>
                Annee
                <input
                  type="text"
                  placeholder="Ex: L3, M1, M2"
                  value={answers.year || ''}
                  onChange={(event) => setAnswers((prev) => ({ ...prev, year: event.target.value }))}
                />
              </label>
            </>
          )}

          {step === 3 && (
            <>
              <h2>Objectifs</h2>
              <label className={styles.field}>
                Objectifs (separes par virgule)
                <textarea
                  value={objectivesAsText}
                  onChange={(event) =>
                    setAnswers((prev) => ({
                      ...prev,
                      objectives: event.target.value
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean),
                    }))
                  }
                />
              </label>
            </>
          )}

          {step === 4 && (
            <>
              <h2>Validation finale</h2>
              <p>Validez pour terminer l'onboarding et acceder au dashboard.</p>
              <dl className={styles.summary}>
                <dt>Domaine</dt>
                <dd>{answers.domain || '-'}</dd>
                <dt>Niveau</dt>
                <dd>{answers.level || '-'}</dd>
                <dt>Annee</dt>
                <dd>{answers.year || '-'}</dd>
                <dt>Objectifs</dt>
                <dd>{answers.objectives?.join(', ') || '-'}</dd>
              </dl>
            </>
          )}
        </section>

        <div className={styles.actions}>
          <button type="button" onClick={goBack} disabled={saving || step === 1}>
            Retour
          </button>

          {step < 4 ? (
            <button type="button" onClick={goNext} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Suivant'}
            </button>
          ) : (
            <button type="button" onClick={completeOnboarding} disabled={saving}>
              {saving ? 'Finalisation...' : 'Terminer'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
