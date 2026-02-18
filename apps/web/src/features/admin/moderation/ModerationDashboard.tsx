'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Select } from '@/components/ui';
import styles from './ModerationDashboard.module.css';

type Report = {
  id: string;
  targetType: 'post' | 'reply' | 'user';
  targetId: string;
  reason: string;
  status: 'new' | 'in_review' | 'escalated' | 'resolved';
  createdAt: string;
};

interface Props {
  accessToken: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const ACTION_OPTIONS = [
  { value: 'hide', label: 'Masquer' },
  { value: 'restore', label: 'Restaurer' },
  { value: 'warn', label: 'Avertir' },
  { value: 'escalate', label: 'Escalader' },
];

export function ModerationDashboard({ accessToken }: Props) {
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | Report['status']>('all');
  const [error, setError] = useState('');
  const [liveMessage, setLiveMessage] = useState('');

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }),
    [accessToken],
  );

  const loadReports = async () => {
    setError('');

    const response = await fetch(`${API_URL}/reports/pending`, {
      headers,
      cache: 'no-store',
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      setError(result.error?.message || 'Impossible de charger les signalements');
      setReports([]);
      return;
    }

    setReports((result.data.reports ?? []) as Report[]);
  };

  useEffect(() => {
    void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyAction = async (reportId: string, actionType: 'hide' | 'restore' | 'warn' | 'escalate') => {
    setError('');

    const reason = window.prompt('Raison de moderation', 'Verification admin') ?? 'Verification admin';

    const response = await fetch(`${API_URL}/reports/${reportId}/actions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ actionType, reason }),
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      setError(result.error?.message || 'Action impossible');
      return;
    }

    setLiveMessage(`Action ${actionType} appliquee`);
    await loadReports();
  };

  const updateStatus = async (reportId: string, status: Report['status']) => {
    const response = await fetch(`${API_URL}/reports/${reportId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    });
    const result = await response.json();

    if (!response.ok || result.error) {
      setError(result.error?.message || 'Statut impossible');
      return;
    }

    setLiveMessage(`Statut ${status} enregistre`);
    await loadReports();
  };

  const displayed =
    statusFilter === 'all'
      ? reports
      : reports.filter((report) => report.status === statusFilter);

  return (
    <section className={styles.container} aria-labelledby="moderation-title">
      <header className={styles.header}>
        <h1 id="moderation-title" className={styles.title}>Moderation admin</h1>
        <p className={styles.subtitle}>Traitez les signalements, appliquez une action et gardez une trace d audit.</p>
      </header>

      <p className={styles.srOnly} aria-live="polite">{liveMessage}</p>

      <div className={styles.toolbar}>
        <Select
          aria-label="Filtrer par statut"
          value={statusFilter}
          options={[
            { value: 'all', label: 'Tous' },
            { value: 'new', label: 'new' },
            { value: 'in_review', label: 'in_review' },
            { value: 'escalated', label: 'escalated' },
            { value: 'resolved', label: 'resolved' },
          ]}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | Report['status'])}
        />
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}

      <div className={styles.list}>
        {displayed.map((report) => (
          <Card key={report.id} variant="outlined">
            <CardHeader className={styles.cardHeader}>
              <CardTitle>{report.id}</CardTitle>
              <span className={styles.status}>{report.status}</span>
            </CardHeader>
            <CardContent>
              <p className={styles.meta}>Cible: {report.targetType} / {report.targetId}</p>
              <p className={styles.meta}>Raison: {report.reason}</p>
              <div className={styles.actions}>
                {ACTION_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={option.value === 'hide' ? 'secondary' : 'outline'}
                    onClick={() => void applyAction(report.id, option.value as 'hide' | 'restore' | 'warn' | 'escalate')}
                  >
                    {option.label}
                  </Button>
                ))}
                <Button type="button" size="sm" onClick={() => void updateStatus(report.id, 'resolved')}>
                  Marquer resolu
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
