'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import styles from './MentorRequestsBoard.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface MentorRequest {
  requestId: string;
  studentId: string;
  studentName?: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string | null;
  decisionReason?: string | null;
  createdAt: string;
}

interface Props {
  accessToken: string;
}

export function MentorRequestsBoard({ accessToken }: Props) {
  const [requests, setRequests] = useState<MentorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decisionReason, setDecisionReason] = useState<Record<string, string>>({});

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/mentor/requests`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || 'Impossible de charger les demandes');
        return;
      }
      setRequests((result.data?.requests ?? []) as MentorRequest[]);
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const updateRequest = async (
    requestId: string,
    status: 'accepted' | 'rejected',
  ) => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/mentor/requests/${requestId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status,
          reason: decisionReason[requestId] || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || 'Mise a jour impossible');
        return;
      }
      await loadRequests();
    } catch {
      setError('Erreur de connexion');
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  return (
    <section className={styles.container} aria-labelledby="mentor-requests-title">
      <header className={styles.header}>
        <h1 id="mentor-requests-title" className={styles.title}>
          Demandes d&apos;accompagnement
        </h1>
        <p className={styles.subtitle}>
          Acceptez ou refusez les demandes des etudiants.
        </p>
      </header>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className={styles.loading} aria-busy="true">
          Chargement...
        </p>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent>
            <p className={styles.empty}>Aucune demande pour le moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className={styles.list}>
          {requests.map((request) => (
            <Card key={request.requestId}>
              <CardHeader>
                <CardTitle>
                  {request.studentName || request.studentId}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={styles.meta}>
                  Recu le {formatDate(request.createdAt)}
                </p>
                <p className={styles.meta}>Statut: {request.status}</p>
                {request.message && <p className={styles.message}>{request.message}</p>}

                {request.status === 'pending' ? (
                  <div className={styles.actions}>
                    <Input
                      name={`reason-${request.requestId}`}
                      label="Raison (optionnel)"
                      value={decisionReason[request.requestId] ?? ''}
                      onChange={(e) =>
                        setDecisionReason((prev) => ({
                          ...prev,
                          [request.requestId]: e.target.value,
                        }))
                      }
                    />
                    <div className={styles.buttonRow}>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void updateRequest(request.requestId, 'accepted')}
                      >
                        Accepter
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void updateRequest(request.requestId, 'rejected')}
                      >
                        Refuser
                      </Button>
                    </div>
                  </div>
                ) : (
                  request.decisionReason && (
                    <p className={styles.meta}>
                      Motif: {request.decisionReason}
                    </p>
                  )
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

