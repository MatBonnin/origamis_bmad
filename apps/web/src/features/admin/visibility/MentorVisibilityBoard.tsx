'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Select } from '@/components/ui';
import styles from './MentorVisibilityBoard.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type MentorVisibility = {
  mentorId: string;
  domain: string;
  status: 'visible' | 'hidden' | 'priority' | 'experimental';
  effectiveFrom: string | null;
  notes: string;
};

interface Props {
  accessToken: string;
}

export function MentorVisibilityBoard({ accessToken }: Props) {
  const [rules, setRules] = useState<MentorVisibility[]>([]);
  const [editing, setEditing] = useState<Record<string, MentorVisibility['status']>>({});
  const [error, setError] = useState('');
  const [liveMessage, setLiveMessage] = useState('');

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }),
    [accessToken],
  );

  const loadRules = async () => {
    setError('');

    const response = await fetch(`${API_URL}/mentors/visibility`, {
      headers,
      cache: 'no-store',
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      setError(result.error?.message || 'Impossible de charger les regles de visibilite');
      setRules([]);
      return;
    }

    const visibilityRules = (result.data.visibilityRules ?? []) as MentorVisibility[];
    setRules(visibilityRules);
    setEditing(
      Object.fromEntries(
        visibilityRules.map((rule) => [rule.mentorId, rule.status]),
      ) as Record<string, MentorVisibility['status']>,
    );
  };

  useEffect(() => {
    void loadRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveRule = async (mentorId: string) => {
    setError('');
    const status = editing[mentorId];

    const effectiveFrom = window.prompt(
      'Date effective (ISO) - vide pour immediat',
      '',
    ) || undefined;

    const notes = window.prompt('Notes de changement', 'Mise a jour admin') ?? '';

    const response = await fetch(`${API_URL}/mentors/${mentorId}/visibility`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status, effectiveFrom, notes }),
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      setError(result.error?.message || 'Mise a jour impossible');
      return;
    }

    setLiveMessage(`Visibilite ${status} enregistree`);
    await loadRules();
  };

  return (
    <section className={styles.container} aria-labelledby="mentor-visibility-title">
      <header className={styles.header}>
        <h1 id="mentor-visibility-title" className={styles.title}>Visibilite des mentors</h1>
        <p className={styles.subtitle}>Ajustez les profils visibles pour la recherche et les recommandations.</p>
      </header>

      <p className={styles.srOnly} aria-live="polite">{liveMessage}</p>
      {error && <div className={styles.error} role="alert">{error}</div>}

      <div className={styles.list}>
        {rules.map((rule) => (
          <Card key={rule.mentorId} variant="outlined">
            <CardHeader className={styles.cardHeader}>
              <CardTitle>{rule.mentorId}</CardTitle>
              <span className={styles.domain}>{rule.domain}</span>
            </CardHeader>
            <CardContent>
              <p className={styles.meta}>Statut courant: {rule.status}</p>
              <p className={styles.meta}>
                Effective from: {rule.effectiveFrom ? new Date(rule.effectiveFrom).toLocaleString('fr-FR') : 'immediat'}
              </p>
              <p className={styles.meta}>Notes: {rule.notes || 'Aucune note'}</p>
              <div className={styles.controls}>
                <Select
                  aria-label={`Visibilite ${rule.mentorId}`}
                  value={editing[rule.mentorId] ?? rule.status}
                  options={[
                    { value: 'visible', label: 'visible' },
                    { value: 'hidden', label: 'hidden' },
                    { value: 'priority', label: 'priority' },
                    { value: 'experimental', label: 'experimental' },
                  ]}
                  onChange={(event) =>
                    setEditing((previous) => ({
                      ...previous,
                      [rule.mentorId]: event.target.value as MentorVisibility['status'],
                    }))
                  }
                />
                <Button type="button" size="sm" onClick={() => void saveRule(rule.mentorId)}>
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
