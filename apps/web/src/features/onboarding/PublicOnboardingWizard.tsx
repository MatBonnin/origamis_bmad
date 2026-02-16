'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Image from 'next/image';
import logo from '@/app/assets/logo.png';
import { ProgressBar } from '@/components/ui';
import { StepWelcome } from './components/StepWelcome';
import { StepProfileChoice } from './components/StepProfileChoice';
import { StepAcademicPath } from './components/StepAcademicPath';
import { StepObjectives } from './components/StepObjectives';
import { StepCreateAccount } from './components/StepCreateAccount';
import styles from './PublicOnboardingWizard.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const STORAGE_KEY = 'origami_onboarding_data';

interface OnboardingData {
  step: number;
  profileType: 'mentor' | 'etudiant' | null;
  domain: string;
  level: string;
  graduationYear: string;
  objectives: string[];
  firstName: string;
  lastName: string;
  email: string;
}

const initialData: OnboardingData = {
  step: 0,
  profileType: null,
  domain: '',
  level: '',
  graduationYear: '',
  objectives: [],
  firstName: '',
  lastName: '',
  email: '',
};

const TOTAL_STEPS = 5;

export function PublicOnboardingWizard() {
  const router = useRouter();
  const { status } = useSession();
  const [data, setData] = useState<OnboardingData>(initialData);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setData(parsed);
        } catch {
          // Invalid data, use initial
        }
      }
      setIsInitialized(true);
    }
  }, []);

  // Save to sessionStorage on change
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, isInitialized]);

  // Redirect if already logged in
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleNext = useCallback(() => {
    setError(null);
    setData((prev) => ({ ...prev, step: prev.step + 1 }));
  }, []);

  const handleBack = useCallback(() => {
    setError(null);
    setData((prev) => ({ ...prev, step: Math.max(0, prev.step - 1) }));
  }, []);

  const handleToggleObjective = useCallback((id: string) => {
    setData((prev) => {
      const isSelected = prev.objectives.includes(id);
      const newObjectives = isSelected
        ? prev.objectives.filter((o) => o !== id)
        : [...prev.objectives, id];
      return { ...prev, objectives: newObjectives };
    });
  }, []);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build onboarding data for API
      const onboardingData =
        data.profileType === 'etudiant'
          ? {
              domain: data.domain,
              level: data.level,
              graduationYear: data.graduationYear,
              objectives: data.objectives,
            }
          : {};

      // Register user with onboarding data
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password,
          role: data.profileType,
          onboardingData,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error?.message || 'Erreur lors de la creation du compte');
        return;
      }

      // Auto sign in
      const signInResult = await signIn('credentials', {
        email: data.email,
        password,
        redirect: false,
      });

      if (signInResult?.ok) {
        // Clear storage
        sessionStorage.removeItem(STORAGE_KEY);
        // Redirect to profile suggestion if student completed onboarding
        if (data.profileType === 'etudiant') {
          router.push('/profile-suggestion');
        } else {
          router.push('/dashboard');
        }
        router.refresh();
      } else {
        // If sign in fails, redirect to login
        sessionStorage.removeItem(STORAGE_KEY);
        router.push('/connexion?registered=true');
      }
    } catch (err) {
      console.error('Registration error:', err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError(
          `Impossible de contacter le serveur API (${API_URL}). Verifiez que l'API est demarree.`
        );
      } else if (err instanceof Error) {
        setError(`Erreur: ${err.message}`);
      } else {
        setError('Une erreur inattendue est survenue');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render until initialized and not authenticated
  if (!isInitialized || status === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Chargement...</div>
      </div>
    );
  }

  if (status === 'authenticated') {
    return null;
  }

  // Determine effective step based on profile type
  // For mentors, skip academic path and objectives
  const getEffectiveStep = () => {
    if (data.profileType === 'mentor' && data.step >= 2) {
      return 4; // Go directly to account creation
    }
    return data.step;
  };

  const effectiveStep = getEffectiveStep();

  // Calculate total steps for progress bar based on profile
  const getEffectiveTotalSteps = () => {
    if (data.profileType === 'mentor') {
      return 3; // Welcome, Profile, Account
    }
    return TOTAL_STEPS;
  };

  const effectiveTotalSteps = getEffectiveTotalSteps();

  // Map step to progress for mentor (adjusted)
  const getProgressStep = () => {
    if (data.profileType === 'mentor') {
      if (data.step === 0) return 0;
      if (data.step === 1) return 1;
      return 2;
    }
    return data.step;
  };

  const renderStep = () => {
    switch (effectiveStep) {
      case 0:
        return <StepWelcome onNext={handleNext} />;
      case 1:
        return (
          <StepProfileChoice
            profileType={data.profileType}
            onSelect={(type) => updateData({ profileType: type })}
            onBack={handleBack}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <StepAcademicPath
            domain={data.domain}
            level={data.level}
            graduationYear={data.graduationYear}
            onChangeDomain={(v) => updateData({ domain: v })}
            onChangeLevel={(v) => updateData({ level: v })}
            onChangeGraduationYear={(v) => updateData({ graduationYear: v })}
            onBack={handleBack}
            onNext={handleNext}
          />
        );
      case 3:
        return (
          <StepObjectives
            selectedObjectives={data.objectives}
            onToggleObjective={handleToggleObjective}
            onBack={handleBack}
            onNext={handleNext}
          />
        );
      case 4:
        return (
          <StepCreateAccount
            firstName={data.firstName}
            lastName={data.lastName}
            email={data.email}
            password={password}
            onChangeFirstName={(v) => updateData({ firstName: v })}
            onChangeLastName={(v) => updateData({ lastName: v })}
            onChangeEmail={(v) => updateData({ email: v })}
            onChangePassword={setPassword}
            onBack={() => {
              if (data.profileType === 'mentor') {
                setData((prev) => ({ ...prev, step: 1 }));
              } else {
                handleBack();
              }
            }}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            error={error}
          />
        );
      default:
        return <StepWelcome onNext={handleNext} />;
    }
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <Image src={logo} alt="Orig'AMI" height={48} priority />
        </div>
        <div className={styles.progressWrapper}>
          <ProgressBar
            value={getProgressStep()}
            max={effectiveTotalSteps - 1}
            labels={['Debut', 'Profil', 'Fin']}
          />
        </div>
      </header>
      <div className={styles.container}>
        <div className={styles.content}>{renderStep()}</div>
      </div>
    </main>
  );
}
