'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../connexion/page.module.css';

interface FormErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const passwordRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (Object.keys(errors).length > 0 && errorSummaryRef.current) {
      errorSummaryRef.current.focus();
    }
  }, [errors]);

  if (!token) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>Lien invalide</h1>
          <p className={styles.subtitle}>
            Le lien de réinitialisation est invalide ou a expiré.
          </p>
          <Link
            href="/mot-de-passe-oublie"
            className={styles.submitButton}
            style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '1.5rem' }}
          >
            Demander un nouveau lien
          </Link>
        </div>
      </main>
    );
  }

  const validateForm = (formData: FormData): FormErrors => {
    const newErrors: FormErrors = {};
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = 'Le mot de passe doit contenir au moins une majuscule';
    } else if (!/\d/.test(password)) {
      newErrors.password = 'Le mot de passe doit contenir au moins un chiffre';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'La confirmation du mot de passe est requise';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
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
      passwordRef.current?.focus();
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            password: formData.get('password'),
          }),
        }
      );

      const result = await response.json();

      if (result.error) {
        if (result.error.code === 'INVALID_TOKEN' || result.error.code === 'TOKEN_EXPIRED' || result.error.code === 'TOKEN_USED') {
          setErrors({ general: 'Le lien de réinitialisation est invalide ou a expiré. Veuillez en demander un nouveau.' });
        } else {
          setErrors({ general: result.error.message });
        }
      } else {
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/connexion');
        }, 3000);
      }
    } catch {
      setErrors({ general: 'Une erreur inattendue est survenue' });
    } finally {
      setIsLoading(false);
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  if (isSuccess) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>Mot de passe modifié</h1>
          <p className={styles.subtitle}>
            Votre mot de passe a été réinitialisé avec succès.
          </p>
          <p className={styles.subtitle}>
            Vous allez être redirigé vers la page de connexion...
          </p>
          <Link
            href="/connexion"
            className={styles.submitButton}
            style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '1.5rem' }}
          >
            Se connecter maintenant
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Nouveau mot de passe</h1>
        <p className={styles.subtitle}>
          Choisissez un nouveau mot de passe sécurisé
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
              {errors.password && (
                <li>
                  <a href="#password">{errors.password}</a>
                </li>
              )}
              {errors.confirmPassword && (
                <li>
                  <a href="#confirmPassword">{errors.confirmPassword}</a>
                </li>
              )}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Nouveau mot de passe
            </label>
            <input
              ref={passwordRef}
              type="password"
              id="password"
              name="password"
              autoComplete="new-password"
              aria-describedby={errors.password ? 'password-error' : 'password-hint'}
              aria-invalid={errors.password ? 'true' : undefined}
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              disabled={isLoading}
            />
            <p id="password-hint" style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
              Min. 8 caractères, 1 majuscule, 1 chiffre
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

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Modification en cours...' : 'Modifier le mot de passe'}
          </button>
        </form>

        <p className={styles.footerText}>
          <Link href="/connexion" className={styles.link}>
            Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function ReinitialiserMotDePassePage() {
  return (
    <Suspense fallback={
      <main className={styles.main}>
        <div className={styles.container}>
          <p className={styles.subtitle}>Chargement...</p>
        </div>
      </main>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
