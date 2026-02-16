'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import styles from './ConsentManagement.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ConsentStatus {
  hasActiveConsent: boolean;
  consentVersion: string | null;
  consentedAt: string | null;
  withdrawnAt: string | null;
}

interface Props {
  accessToken: string;
}

export function ConsentManagement({ accessToken }: Props) {
  const [consent, setConsent] = useState<ConsentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`${API_URL}/users/me/consent`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });
        const result = await response.json();

        if (!response.ok || result.error) {
          setError(result.error?.message || 'Erreur lors du chargement du consentement');
          return;
        }

        setConsent(result.data);
      } catch {
        setError('Erreur de connexion au serveur');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [accessToken]);

  const handleWithdraw = async () => {
    if (!confirmWithdraw) return;

    setError('');
    setSuccess('');
    setWithdrawing(true);

    try {
      const response = await fetch(`${API_URL}/users/me/consent/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error?.message || 'Erreur lors du retrait du consentement');
        return;
      }

      setConsent({
        hasActiveConsent: false,
        consentVersion: consent?.consentVersion ?? null,
        consentedAt: consent?.consentedAt ?? null,
        withdrawnAt: result.data.withdrawnAt,
      });
      setSuccess('Votre consentement a ete retire avec succes.');
      setConfirmWithdraw(false);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setWithdrawing(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Chargement...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Consentement RGPD</h1>
        <Link href="/dashboard" className={styles.backLink}>
          Retour
        </Link>
      </div>

      <p className={styles.subtitle}>
        Gerez votre consentement concernant l&apos;utilisation de vos donnees personnelles.
      </p>

      {error && (
        <div className={styles.feedbackError} role="alert" aria-live="assertive">
          {error}
        </div>
      )}
      {success && (
        <div className={styles.feedbackSuccess} role="status" aria-live="polite">
          {success}
        </div>
      )}

      <div className={styles.statusCard}>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Statut du consentement</span>
          {consent?.hasActiveConsent ? (
            <span className={styles.statusActive}>Actif</span>
          ) : (
            <span className={styles.statusWithdrawn}>Retire</span>
          )}
        </div>

        {consent?.consentVersion && (
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Version</span>
            <span className={styles.statusDate}>{consent.consentVersion}</span>
          </div>
        )}

        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Date de consentement</span>
          <span className={styles.statusDate}>{formatDate(consent?.consentedAt ?? null)}</span>
        </div>

        {consent?.withdrawnAt && (
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Date de retrait</span>
            <span className={styles.statusDate}>{formatDate(consent.withdrawnAt)}</span>
          </div>
        )}
      </div>

      {consent?.hasActiveConsent && (
        <div className={styles.withdrawSection}>
          <h2 className={styles.withdrawTitle}>Retirer mon consentement</h2>

          <p className={styles.impactLabel}>Fonctionnalites desactivees :</p>
          <ul className={styles.impactList}>
            <li>Matching de mentors</li>
            <li>Messagerie</li>
            <li>Prise de rendez-vous</li>
            <li>Notifications</li>
          </ul>

          <p className={styles.keepLabel}>Vous pourrez toujours :</p>
          <ul className={styles.keepList}>
            <li>Consulter votre compte</li>
            <li>Telecharger vos donnees</li>
            <li>Demander la suppression de votre compte</li>
          </ul>

          <label className={styles.confirmRow}>
            <input
              type="checkbox"
              checked={confirmWithdraw}
              onChange={(e) => setConfirmWithdraw(e.target.checked)}
              className={styles.confirmCheckbox}
            />
            <span className={styles.confirmText}>
              Je comprends les impacts et souhaite retirer mon consentement
            </span>
          </label>

          <Button
            variant="outline"
            size="lg"
            onClick={handleWithdraw}
            disabled={!confirmWithdraw || withdrawing}
            isLoading={withdrawing}
          >
            Retirer mon consentement
          </Button>
        </div>
      )}
    </div>
  );
}
