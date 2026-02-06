'use client';

import { useState, useRef, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
  general?: string;
}

export default function InscriptionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const firstNameRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (Object.keys(errors).length > 0 && errorSummaryRef.current) {
      errorSummaryRef.current.focus();
    }
  }, [errors]);

  const validateForm = (formData: FormData): FormErrors => {
    const newErrors: FormErrors = {};
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const role = formData.get('role') as string;

    if (!firstName || firstName.trim().length < 2) {
      newErrors.firstName = 'Le prénom doit contenir au moins 2 caractères';
    }

    if (!lastName || lastName.trim().length < 2) {
      newErrors.lastName = 'Le nom doit contenir au moins 2 caractères';
    }

    if (!email) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Veuillez entrer un email valide';
    }

    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Veuillez confirmer votre mot de passe';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    if (!role) {
      newErrors.role = 'Veuillez sélectionner votre profil';
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const validationErrors = validateForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.get('firstName'),
          lastName: formData.get('lastName'),
          email: formData.get('email'),
          password: formData.get('password'),
          role: formData.get('role'),
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setErrors({ general: result.error?.message || 'Erreur lors de l\'inscription' });
        return;
      }

      // Connexion automatique après inscription
      const signInResult = await signIn('credentials', {
        email: formData.get('email'),
        password: formData.get('password'),
        redirect: false,
      });

      if (signInResult?.ok) {
        const selectedRole = formData.get('role');
        if (selectedRole === 'etudiant') {
          router.push('/onboarding');
        } else {
          router.push('/dashboard');
        }
        router.refresh();
      } else {
        // Si la connexion échoue, rediriger vers la page de connexion
        router.push('/connexion?registered=true');
      }
    } catch {
      setErrors({ general: 'Une erreur inattendue est survenue' });
    } finally {
      setIsLoading(false);
    }
  };

  const hasErrors = Object.keys(errors).length > 0;
  const errorEntries = Object.entries(errors).filter(([key]) => key !== 'general');

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Créer un compte</h1>
        <p className={styles.subtitle}>
          Rejoignez la communauté Orig&apos;AMI
        </p>

        {hasErrors && (
          <div
            ref={errorSummaryRef}
            className={styles.errorSummary}
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
          >
            <h2 className={styles.errorTitle}>
              {Object.keys(errors).length} erreur(s) détectée(s)
            </h2>
            <ul className={styles.errorList}>
              {errors.general && <li>{errors.general}</li>}
              {errorEntries.map(([key, value]) => (
                <li key={key}>
                  <a href={`#${key}`}>{value}</a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="firstName" className={styles.label}>
                Prénom
              </label>
              <input
                ref={firstNameRef}
                type="text"
                id="firstName"
                name="firstName"
                autoComplete="given-name"
                aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                aria-invalid={errors.firstName ? 'true' : undefined}
                className={`${styles.input} ${errors.firstName ? styles.inputError : ''}`}
                disabled={isLoading}
              />
              {errors.firstName && (
                <p id="firstName-error" className={styles.fieldError} role="alert">
                  {errors.firstName}
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="lastName" className={styles.label}>
                Nom
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                autoComplete="family-name"
                aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                aria-invalid={errors.lastName ? 'true' : undefined}
                className={`${styles.input} ${errors.lastName ? styles.inputError : ''}`}
                disabled={isLoading}
              />
              {errors.lastName && (
                <p id="lastName-error" className={styles.fieldError} role="alert">
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Adresse email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="email"
              aria-describedby={errors.email ? 'email-error' : undefined}
              aria-invalid={errors.email ? 'true' : undefined}
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              disabled={isLoading}
            />
            {errors.email && (
              <p id="email-error" className={styles.fieldError} role="alert">
                {errors.email}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Mot de passe
            </label>
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="new-password"
              aria-describedby="password-hint password-error"
              aria-invalid={errors.password ? 'true' : undefined}
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              disabled={isLoading}
            />
            <p id="password-hint" className={styles.hint}>
              8 caractères minimum, avec majuscule, minuscule et chiffre
            </p>
            {errors.password && (
              <p id="password-error" className={styles.fieldError} role="alert">
                {errors.password}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword" className={styles.label}>
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              aria-invalid={errors.confirmPassword ? 'true' : undefined}
              className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <p id="confirmPassword-error" className={styles.fieldError} role="alert">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Je suis</legend>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="role"
                  value="etudiant"
                  className={styles.radio}
                  disabled={isLoading}
                />
                <span className={styles.radioText}>Étudiant</span>
                <span className={styles.radioDesc}>Je cherche un mentor</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="role"
                  value="mentor"
                  className={styles.radio}
                  disabled={isLoading}
                />
                <span className={styles.radioText}>Mentor</span>
                <span className={styles.radioDesc}>Je souhaite accompagner</span>
              </label>
            </div>
            {errors.role && (
              <p id="role-error" className={styles.fieldError} role="alert">
                {errors.role}
              </p>
            )}
          </fieldset>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Création en cours...' : 'Créer mon compte'}
          </button>
        </form>

        <p className={styles.footerText}>
          Déjà un compte ?{' '}
          <Link href="/connexion" className={styles.link}>
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
