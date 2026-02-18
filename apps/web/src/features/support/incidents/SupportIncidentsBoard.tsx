'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Select } from '@/components/ui';
import styles from './SupportIncidentsBoard.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Incident = {
  id: string;
  sessionId: string;
  type: string;
  details: string;
  status: 'open' | 'in_review' | 'resolved' | 'escalated';
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
};

export function SupportIncidentsBoard({ accessToken }: { accessToken: string }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | Incident['status']>('all');
  const [error, setError] = useState('');

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }),
    [accessToken],
  );

  const loadIncidents = async () => {
    setError('');
    const query = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
    const response = await fetch(`${API_URL}/incidents${query}`, { headers, cache: 'no-store' });
    const result = await response.json();

    if (!response.ok || result.error) {
      setError(result.error?.message || 'Impossible de charger les incidents');
      return;
    }

    setIncidents((result.data.incidents ?? []) as Incident[]);
  };

  useEffect(() => {
    void loadIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const updateStatus = async (incidentId: string, status: Incident['status']) => {
    const response = await fetch(`${API_URL}/incidents/${incidentId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status, notes: 'Mise a jour support' }),
    });
    const result = await response.json();
    if (!response.ok || result.error) {
      setError(result.error?.message || 'Impossible de mettre a jour le statut');
      return;
    }
    await loadIncidents();
  };

  return (
    <section className={styles.container} aria-labelledby="support-incidents-title">
      <header className={styles.header}>
        <h1 id="support-incidents-title" className={styles.title}>Support incidents</h1>
        <p className={styles.subtitle}>Suivi des incidents lies aux sessions et resolution.</p>
      </header>

      <div className={styles.filterRow}>
        <Select
          aria-label="Filtrer les incidents"
          value={statusFilter}
          options={[
            { value: 'all', label: 'all' },
            { value: 'open', label: 'open' },
            { value: 'in_review', label: 'in_review' },
            { value: 'resolved', label: 'resolved' },
            { value: 'escalated', label: 'escalated' },
          ]}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | Incident['status'])}
        />
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}

      <div className={styles.list}>
        {incidents.map((incident) => (
          <Card key={incident.id} variant="outlined">
            <CardHeader className={styles.cardHeader}>
              <CardTitle>{incident.id}</CardTitle>
              <span className={styles.status}>{incident.status}</span>
            </CardHeader>
            <CardContent>
              <p className={styles.meta}>Session: {incident.sessionId}</p>
              <p className={styles.meta}>Type: {incident.type}</p>
              <p className={styles.meta}>Severite: {incident.severity}</p>
              <p className={styles.meta}>{incident.details}</p>
              <div className={styles.actions}>
                <Button type="button" size="sm" onClick={() => void updateStatus(incident.id, 'in_review')}>En revue</Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => void updateStatus(incident.id, 'resolved')}>Resolu</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void updateStatus(incident.id, 'escalated')}>Escalader</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
