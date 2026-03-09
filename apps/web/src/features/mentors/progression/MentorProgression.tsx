'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import styles from './MentorProgression.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Milestone = {
  id: string;
  title: string;
  type: 'message' | 'rdv' | 'visio';
  status: 'planned' | 'in_progress' | 'review' | 'done' | 'blocked';
  dueAt: string;
};

type Insights = {
  studentId: string;
  completionRate: number;
  overdueCount: number;
  reviewPending: number;
  riskLevel: 'low' | 'medium' | 'high';
  notes: string;
};

interface Props {
  accessToken: string;
  studentId: string;
}

const STATUS_LABELS: Record<Milestone['status'], string> = {
  planned: 'Planifie',
  in_progress: 'En cours',
  review: 'En validation',
  done: 'Termine',
  blocked: 'Bloque',
};

export function MentorProgression({ accessToken, studentId }: Props) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveMessage, setLiveMessage] = useState('');

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }),
    [accessToken],
  );

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');

      try {
        const [progressionResponse, insightsResponse] = await Promise.all([
          fetch(`${API_URL}/milestones/students/${studentId}/progression`, { headers, cache: 'no-store' }),
          fetch(`${API_URL}/milestones/students/${studentId}/milestone-insights`, { headers, cache: 'no-store' }),
        ]);

        const progressionResult = await progressionResponse.json();
        const insightsResult = await insightsResponse.json();

        if (!progressionResponse.ok || progressionResult.error) {
          throw new Error(progressionResult.error?.message || 'Erreur de chargement progression');
        }
        if (!insightsResponse.ok || insightsResult.error) {
          throw new Error(insightsResult.error?.message || 'Erreur de chargement insights');
        }

        const nextMilestones = (progressionResult.data.milestones ?? []) as Milestone[];
        const nextInsights = insightsResult.data.insights as Insights;

        setMilestones(nextMilestones);
        setInsights(nextInsights);
        setLiveMessage(`${nextMilestones.length} jalons mentor charges`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur reseau');
        setMilestones([]);
        setInsights(null);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [headers, studentId]);

  const reviewMilestone = async (id: string, approved: boolean) => {
    setError('');
    const response = await fetch(`${API_URL}/milestones/${id}/review`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ approved }),
    });
    const result = await response.json();

    if (!response.ok || result.error) {
      setError(result.error?.message || 'Mise a jour review impossible');
      return;
    }

    setMilestones((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: result.data.milestone.status as Milestone['status'] } : item,
      ),
    );
    setLiveMessage(approved ? 'Jalon valide' : 'Jalon renvoye en cours');
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  return (
    <section className={styles.container} aria-labelledby="mentor-progression-title">
      <header className={styles.header}>
        <h1 id="mentor-progression-title" className={styles.title}>Suivi mentor</h1>
        <p className={styles.subtitle}>Visualisez les jalons de l etudiant, les risques et validez les etapes en attente.</p>
      </header>

      <p className={styles.srOnly} aria-live="polite">{liveMessage}</p>

      {error && <div className={styles.error} role="alert">{error}</div>}

      {loading ? (
        <div className={styles.loading} aria-busy="true">Chargement du suivi mentor...</div>
      ) : (
        <>
          {insights && (
            <Card>
              <CardHeader>
                <CardTitle>Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={styles.insightsGrid}>
                  <p>Progression: {insights.completionRate}%</p>
                  <p>Retards: {insights.overdueCount}</p>
                  <p>En validation: {insights.reviewPending}</p>
                  <p data-risk={insights.riskLevel}>Risque: {insights.riskLevel}</p>
                </div>
                <p className={styles.notes}>{insights.notes}</p>
              </CardContent>
            </Card>
          )}

          <ol className={styles.timeline}>
            {milestones.map((milestone) => (
              <li key={milestone.id}>
                <Card variant="outlined">
                  <CardHeader className={styles.cardHeader}>
                    <CardTitle>{milestone.title}</CardTitle>
                    <span className={styles.status}>{STATUS_LABELS[milestone.status]}</span>
                  </CardHeader>
                  <CardContent>
                    <p className={styles.meta}>Type: {milestone.type}</p>
                    <p className={styles.meta}>Echeance: {formatDate(milestone.dueAt)}</p>
                    {milestone.status === 'review' && (
                      <div className={styles.actions}>
                        <Button type="button" size="sm" onClick={() => void reviewMilestone(milestone.id, true)}>
                          Valider
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => void reviewMilestone(milestone.id, false)}>
                          Demander ajustement
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
