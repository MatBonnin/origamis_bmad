'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import styles from '../connexion/page.module.css';

interface FormErrors {
  email?: string;
  general?: string;
}

export default function MotDePasseOubliePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const emailRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (Object.keys(errors).length > 0 && errorSummaryRef.current) {
      errorSummaryRef.current.focus();
    }
  }, [errors]);

  const validateForm = (formData: FormData): FormErrors => {
    const newErrors: FormErrors = {};
    const email = formData.get('email') as string;

    if (!email) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Veuillez entrer un email valide';
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
      emailRef.current?.focus();
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/forgot-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.get('email') }),
        }
      );

      const result = await response.json();

      if (result.error) {
        setErrors({ general: result.error.message });
      } else {
        setIsSuccess(true);
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
          <h1 className={styles.title}>Email envoyé</h1>
          <p className={styles.subtitle}>
            Si un compte existe avec cette adresse email, vous recevrez un lien
            de réinitialisation dans quelques instants.
          </p>
          <p className={styles.subtitle}>
            Pensez à vérifier vos spams si vous ne voyez pas l&apos;email.
          </p>
          <Link href="/connexion" className={styles.submitButton} style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '1.5rem' }}>
            Retour à la connexion
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Mot de passe oublié</h1>
        <p className={styles.subtitle}>
          Entrez votre adresse email pour recevoir un lien de réinitialisation
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

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Envoi en cours...' : 'Envoyer le lien'}
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
