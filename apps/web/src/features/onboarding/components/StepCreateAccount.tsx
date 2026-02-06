'use client';

import { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import styles from './StepCreateAccount.module.css';

interface StepCreateAccountProps {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  onChangeFirstName: (value: string) => void;
  onChangeLastName: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  error: string | null;
}

export function StepCreateAccount({
  firstName,
  lastName,
  email,
  password,
  onChangeFirstName,
  onChangeLastName,
  onChangeEmail,
  onChangePassword,
  onBack,
  onSubmit,
  isLoading,
  error,
}: StepCreateAccountProps) {
  const [showPassword, setShowPassword] = useState(false);

  const isValidPassword = password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password);

  const canSubmit = firstName && lastName && email && isValidPassword && !isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onSubmit();
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Creons votre compte</h1>
      <p className={styles.subtitle}>C&apos;est bientot fini...</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="firstName" className={styles.label}>
              Prenom
            </label>
            <div className={styles.inputWrapper}>
              <User className={styles.inputIcon} size={18} />
              <input
                id="firstName"
                type="text"
                className={styles.input}
                value={firstName}
                onChange={(e) => onChangeFirstName(e.target.value)}
                placeholder="Jean"
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="lastName" className={styles.label}>
              Nom
            </label>
            <div className={styles.inputWrapper}>
              <User className={styles.inputIcon} size={18} />
              <input
                id="lastName"
                type="text"
                className={styles.input}
                value={lastName}
                onChange={(e) => onChangeLastName(e.target.value)}
                placeholder="Dupont"
                required
              />
            </div>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>
            Email
          </label>
          <div className={styles.inputWrapper}>
            <Mail className={styles.inputIcon} size={18} />
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => onChangeEmail(e.target.value)}
              placeholder="jean.dupont@email.com"
              required
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="password" className={styles.label}>
            Mot de passe
          </label>
          <div className={styles.inputWrapper}>
            <Lock className={styles.inputIcon} size={18} />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className={styles.input}
              value={password}
              onChange={(e) => onChangePassword(e.target.value)}
              placeholder="Votre mot de passe"
              required
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <span className={styles.hint}>
            8 caracteres minimum, avec au moins une majuscule et un chiffre
          </span>
        </div>

        <div className={styles.buttons}>
          <button type="button" className={styles.buttonOutline} onClick={onBack}>
            Retour
          </button>
          <button
            type="submit"
            className={styles.buttonFilled}
            disabled={!canSubmit}
          >
            {isLoading ? 'Creation en cours...' : 'Creer mon compte'}
          </button>
        </div>
      </form>
    </div>
  );
}
