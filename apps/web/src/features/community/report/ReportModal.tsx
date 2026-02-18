'use client';

import { useMemo, useState } from 'react';
import { Button, Input } from '@/components/ui';
import styles from './ReportModal.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  targetId: string | null;
  targetType: 'post' | 'reply' | 'user';
  accessToken: string;
  userId: string;
  onSubmitted: () => void;
}

export function ReportModal({
  isOpen,
  onClose,
  targetId,
  targetType,
  accessToken,
  userId,
  onSubmitted,
}: Props) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('ok');
  const [error, setError] = useState('');

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }),
    [accessToken],
  );

  if (!isOpen || !targetId) {
    return null;
  }

  const submit = async () => {
    setError('');

    const response = await fetch(`${API_URL}/reports`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        targetType,
        targetId,
        reason,
        details,
        anonymous,
        captchaToken,
        reporterId: userId,
      }),
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      setError(result.error?.message || 'Signalement impossible');
      return;
    }

    onSubmitted();
    onClose();
    setReason('');
    setDetails('');
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Signaler un contenu">
      <div className={styles.modal}>
        <h2 className={styles.title}>Signaler ce contenu</h2>
        <Input aria-label="Raison" placeholder="Raison" value={reason} onChange={(event) => setReason(event.target.value)} />
        <textarea
          className={styles.textarea}
          aria-label="Details"
          placeholder="Details"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
        />
        <Input
          aria-label="Captcha"
          placeholder="Captcha"
          value={captchaToken}
          onChange={(event) => setCaptchaToken(event.target.value)}
        />
        <label className={styles.checkbox}>
          <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} />
          Rendre ce signalement anonyme
        </label>

        {error && <div className={styles.error} role="alert">{error}</div>}

        <div className={styles.actions}>
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="button" onClick={() => void submit()}>Envoyer</Button>
        </div>
      </div>
    </div>
  );
}
