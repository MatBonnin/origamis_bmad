'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, ProgressBar } from '@/components/ui';
import { KanbanBoard } from '../kanban/KanbanBoard';
import { CalendarView } from '../calendar/CalendarView';
import styles from './StudentProgression.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type MilestoneType = 'all' | 'message' | 'rdv' | 'visio';
type MilestoneStatus = 'planned' | 'in_progress' | 'review' | 'done' | 'blocked';
type ViewMode = 'list' | 'kanban' | 'calendar';

interface Milestone {
  id: string;
  type: Exclude<MilestoneType, 'all'>;
  status: MilestoneStatus;
  title: string;
  dueAt: string;
  notes: string | null;
}

interface Metadata {
  total: number;
  totalCompleted: number;
  totalPending: number;
  completionRate: number;
}

interface Props {
  accessToken: string;
  userId: string;
}

const TYPE_LABELS: Record<MilestoneType, string> = {
  all: 'Tous',
  message: 'Messages',
  rdv: 'RDV',
  visio: 'Visio',
};

const STATUS_LABELS: Record<MilestoneStatus, string> = {
  planned: 'Planifie',
  in_progress: 'En cours',
  review: 'En validation',
  done: 'Termine',
  blocked: 'Bloque',
};

export function StudentProgression({ accessToken, userId }: Props) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [metadata, setMetadata] = useState<Metadata>({
    total: 0,
    totalCompleted: 0,
    totalPending: 0,
    completionRate: 0,
  });
  const [filter, setFilter] = useState<MilestoneType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveMessage, setLiveMessage] = useState('');

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }),
    [accessToken],
  );

  const loadProgression = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ user_id: userId });
      if (filter !== 'all') {
        params.set('type', filter);
      }

      const response = await fetch(`${API_URL}/progression?${params.toString()}`, {
        headers,
        cache: 'no-store',
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error?.message || 'Impossible de charger la progression');
      }

      const nextMilestones = (result.data.milestones ?? []) as Milestone[];
      const nextMetadata = (result.data.metadata ?? {
        total: 0,
        totalCompleted: 0,
        totalPending: 0,
        completionRate: 0,
      }) as Metadata;

      setMilestones(nextMilestones);
      setMetadata(nextMetadata);
      setLiveMessage(`${nextMilestones.length} jalons affiches`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur reseau');
      setMilestones([]);
      setMetadata({ total: 0, totalCompleted: 0, totalPending: 0, completionRate: 0 });
    } finally {
      setLoading(false);
    }
  }, [filter, headers, userId]);

  useEffect(() => {
    void loadProgression();
  }, [loadProgression]);

  const handleStatusChange = (milestoneId: string, newStatus: MilestoneStatus) => {
    setMilestones((current) =>
      current.map((item) => (item.id === milestoneId ? { ...item, status: newStatus } : item)),
    );
  };

  const markMilestoneDone = async (milestoneId: string) => {
    const confirmed = window.confirm('Confirmer la demande de validation de ce jalon ?');
    if (!confirmed) {
      return;
    }

    setError('');

    const response = await fetch(`${API_URL}/milestones/${milestoneId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'review' }),
    });
    const result = await response.json();

    if (!response.ok || result.error) {
      setError(result.error?.message || 'Mise a jour impossible');
      return;
    }

    const updated = result.data.milestone as Milestone;

    setMilestones((current) =>
      current.map((item) => (item.id === updated.id ? { ...item, status: updated.status } : item)),
    );

    setLiveMessage(
      updated.status === 'review'
        ? 'Jalon envoye pour validation mentor'
        : 'Jalon mis a jour',
    );

    await loadProgression();
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <section className={styles.container} aria-labelledby="progression-title">
      <header className={styles.header}>
        <h1 id="progression-title" className={styles.title}>Parcours de progression</h1>
        <p className={styles.subtitle}>Suivez vos jalons, demandez une validation et gardez une vue claire sur votre avancement.</p>
      </header>

      <p className={styles.srOnly} aria-live="polite">{liveMessage}</p>

      <Card>
        <CardHeader>
          <CardTitle>Progression globale</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressBar value={metadata.completionRate} max={100} labels={['0%', '50%', '100%']} />
          <p className={styles.summary}>
            {metadata.totalCompleted}/{metadata.total} jalons termines
          </p>
        </CardContent>
      </Card>

      <nav className={styles.viewToggle} aria-label="Changer la vue">
        {(['list', 'kanban', 'calendar'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            className={viewMode === mode ? styles.viewToggleActive : styles.viewToggleButton}
            onClick={() => setViewMode(mode)}
            aria-pressed={viewMode === mode}
          >
            {mode === 'list' ? 'Liste' : mode === 'kanban' ? 'Kanban' : 'Calendrier'}
          </button>
        ))}
      </nav>

      <nav className={styles.filters} aria-label="Filtrer les jalons">
        {(Object.keys(TYPE_LABELS) as MilestoneType[]).map((type) => (
          <button
            key={type}
            type="button"
            className={filter === type ? styles.filterActive : styles.filterButton}
            onClick={() => setFilter(type)}
          >
            {TYPE_LABELS[type]}
          </button>
        ))}
      </nav>

      {error && (
        <div className={styles.error} role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      {loading ? (
        <div className={styles.loading} aria-busy="true">Chargement des jalons...</div>
      ) : milestones.length === 0 ? (
        <Card>
          <CardContent>
            <p className={styles.empty}>Aucun jalon pour ce filtre.</p>
          </CardContent>
        </Card>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          accessToken={accessToken}
          milestones={milestones}
          onStatusChange={handleStatusChange}
        />
      ) : viewMode === 'calendar' ? (
        <CalendarView milestones={milestones} />
      ) : (
        <ol className={styles.timeline}>
          {milestones.map((milestone) => (
            <li key={milestone.id} className={styles.timelineItem}>
              <Card variant="outlined">
                <CardHeader className={styles.cardHeader}>
                  <CardTitle>{milestone.title}</CardTitle>
                  <span className={styles.status} data-status={milestone.status}>
                    {STATUS_LABELS[milestone.status]}
                  </span>
                </CardHeader>
                <CardContent>
                  <p className={styles.meta}>Type: {TYPE_LABELS[milestone.type]}</p>
                  <p className={styles.meta}>Echeance: {formatDate(milestone.dueAt)}</p>
                  {milestone.notes && <p className={styles.notes}>{milestone.notes}</p>}

                  {(milestone.status === 'in_progress' || milestone.status === 'planned') && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void markMilestoneDone(milestone.id)}
                    >
                      Marquer termine
                    </Button>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
