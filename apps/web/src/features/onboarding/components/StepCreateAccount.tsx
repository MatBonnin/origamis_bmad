'use client';

import { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '@/components/ui';
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

  const TogglePasswordButton = (
    <button
      type="button"
      className={styles.togglePassword}
      onClick={() => setShowPassword(!showPassword)}
      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
    >
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Creons votre compte</h1>
      <p className={styles.subtitle}>C&apos;est bientot fini...</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.row}>
          <Input
            label="Prenom"
            value={firstName}
            onChange={(e) => onChangeFirstName(e.target.value)}
            placeholder="Jean"
            leftIcon={<User size={18} />}
            required
          />
          <Input
            label="Nom"
            value={lastName}
            onChange={(e) => onChangeLastName(e.target.value)}
            placeholder="Dupont"
            leftIcon={<User size={18} />}
            required
          />
        </div>

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => onChangeEmail(e.target.value)}
          placeholder="jean.dupont@email.com"
          leftIcon={<Mail size={18} />}
          required
        />

        <Input
          label="Mot de passe"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => onChangePassword(e.target.value)}
          placeholder="Votre mot de passe"
          leftIcon={<Lock size={18} />}
          rightElement={TogglePasswordButton}
          hint="8 caracteres minimum, avec au moins une majuscule et un chiffre"
          required
        />

        <div className={styles.buttons}>
          <Button type="button" variant="outline" size="lg" onClick={onBack}>
            Retour
          </Button>
          <Button type="submit" size="lg" disabled={!canSubmit} isLoading={isLoading}>
            Creer mon compte
          </Button>
        </div>
      </form>
    </div>
  );
}
