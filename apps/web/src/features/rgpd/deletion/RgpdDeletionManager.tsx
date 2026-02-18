'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import styles from './RgpdDeletionManager.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function RgpdDeletionManager({ accessToken, userId, isAdmin }: { accessToken: string; userId: string; isAdmin: boolean }) {
  const [reason, setReason] = useState('');
  const [requestExport, setRequestExport] = useState(true);
  const [status, setStatus] = useState('Aucune demande');
  const [error, setError] = useState('');

  const submitRequest = async () => {
    setError('');
    const response = await fetch(`${API_URL}/users/${userId}/request-deletion`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason, requestExport }),
    });
    const result = await response.json();

    if (!response.ok || result.error) {
      setError(result.error?.message || 'Impossible d envoyer la demande');
      return;
    }

    setStatus(`Demande enregistree: ${result.data.request.status}`);
  };

  const runDelete = async () => {
    setError('');
    const response = await fetch(`${API_URL}/users/${userId}/data`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const result = await response.json();

    if (!response.ok || result.error) {
      setError(result.error?.message || 'Suppression impossible');
      return;
    }

    setStatus('Suppression executee');
  };

  return (
    <section className={styles.container} aria-labelledby="rgpd-deletion-title">
      <header className={styles.header}>
        <h1 id="rgpd-deletion-title" className={styles.title}>Suppression des donnees</h1>
        <p className={styles.subtitle}>Exercez votre droit RGPD avec suivi de statut.</p>
      </header>

      {error && <div className={styles.error} role="alert">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle as="h2">Demande de suppression</CardTitle>
        </CardHeader>
        <CardContent>
          <label className={styles.field}>
            Raison
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} className={styles.textarea} />
          </label>
          <label className={styles.checkbox}>
            <input type="checkbox" checked={requestExport} onChange={(event) => setRequestExport(event.target.checked)} />
            Recevoir un export de mes donnees avant suppression
          </label>
          <Button type="button" onClick={() => void submitRequest()} disabled={!reason.trim()}>
            Envoyer ma demande
          </Button>
          <p className={styles.status} aria-live="polite">{status}</p>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle as="h2">Execution admin</CardTitle>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="secondary" onClick={() => void runDelete()}>
              Executer la suppression finale
            </Button>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
