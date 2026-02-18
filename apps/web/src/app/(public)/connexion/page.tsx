'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import logo from '@/app/assets/logo.png';
import styles from './page.module.css';

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const emailRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      setErrors({ general: 'Une erreur est survenue lors de la connexion' });
    }
  }, [searchParams]);

  useEffect(() => {
    if (Object.keys(errors).length > 0 && errorSummaryRef.current) {
      errorSummaryRef.current.focus();
    }
  }, [errors]);

  const validateForm = (formData: FormData): FormErrors => {
    const newErrors: FormErrors = {};
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Veuillez entrer un email valide';
    }

    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
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
      const firstErrorField = validationErrors.email ? emailRef.current : null;
      firstErrorField?.focus();
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email: formData.get('email'),
        password: formData.get('password'),
        redirect: false,
      });

      if (result?.error) {
        setErrors({ general: result.error });
      } else if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setErrors({ general: 'Une erreur inattendue est survenue' });
    } finally {
      setIsLoading(false);
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.logoWrapper}>
          <Image src={logo} alt="Orig'AMI" height={48} priority />
        </div>

        <h1 className={styles.title}>Connexion</h1>
        <p className={styles.subtitle}>
          Accédez à votre espace personnel
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
              {errors.email && (
                <li>
                  <a href="#email">{errors.email}</a>
                </li>
              )}
              {errors.password && (
                <li>
                  <a href="#password">{errors.password}</a>
                </li>
              )}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Adresse email
            </label>
            <input
              ref={emailRef}
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
              autoComplete="current-password"
              aria-describedby={errors.password ? 'password-error' : undefined}
              aria-invalid={errors.password ? 'true' : undefined}
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              disabled={isLoading}
            />
            {errors.password && (
              <p id="password-error" className={styles.fieldError} role="alert">
                {errors.password}
              </p>
            )}
          </div>

          <div className={styles.forgotLink}>
            <Link href="/mot-de-passe-oublie" className={styles.link}>
              Mot de passe oublié ?
            </Link>
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <p className={styles.footerText}>
          Pas encore de compte ?{' '}
          <Link href="/onboarding" className={styles.link}>
            Créer un compte
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.main}>
          <div className={styles.container}>
            <p className={styles.subtitle}>Chargement...</p>
          </div>
        </main>
      }
    >
      <ConnexionForm />
    </Suspense>
  );
}
