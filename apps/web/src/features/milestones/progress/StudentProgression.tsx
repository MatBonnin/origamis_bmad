'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  KanbanSquare,
  Layers3,
  ListTodo,
  Sparkles,
} from 'lucide-react';
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

const VIEW_META: Record<ViewMode, { label: string; icon: typeof ListTodo }> = {
  list: { label: 'Liste', icon: ListTodo },
  kanban: { label: 'Kanban', icon: KanbanSquare },
  calendar: { label: 'Calendrier', icon: CalendarDays },
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

      const response = await fetch(`${API_URL}/milestones/progression?${params.toString()}`, {
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

  const insights = useMemo(() => {
    const reviewCount = milestones.filter((milestone) => milestone.status === 'review').length;
    const inFlightCount = milestones.filter(
      (milestone) => milestone.status === 'planned' || milestone.status === 'in_progress',
    ).length;
    const blockedCount = milestones.filter((milestone) => milestone.status === 'blocked').length;
    const nextMilestone = [...milestones]
      .filter((milestone) => milestone.status !== 'done')
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())[0];

    return {
      reviewCount,
      inFlightCount,
      blockedCount,
      nextMilestone,
    };
  }, [milestones]);

  return (
    <section className={styles.page} aria-labelledby="progression-title">
      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            <Sparkles size={16} aria-hidden="true" />
            Vue projets
          </span>
          <h1 id="progression-title" className={styles.title}>
            Parcours de progression
          </h1>
          <p className={styles.subtitle}>
            Suivez vos jalons, demandez une validation et gardez une vue claire sur votre
            avancement avec une lecture plus directe de vos prochaines etapes.
          </p>
        </div>

        <div className={styles.metricsGrid}>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Progression globale</span>
            <strong className={styles.metricValue}>
              {metadata.completionRate}
              <span className={styles.metricUnit}>%</span>
            </strong>
            <span className={styles.metricHint}>
              {metadata.totalCompleted} finalises sur {metadata.total}
            </span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>A traiter</span>
            <strong className={styles.metricValue}>{insights.inFlightCount}</strong>
            <span className={styles.metricHint}>jalons encore en cours ou planifies</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>En validation</span>
            <strong className={styles.metricValue}>{insights.reviewCount}</strong>
            <span className={styles.metricHint}>elements envoyes au mentor</span>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Blocages</span>
            <strong className={styles.metricValue}>{insights.blockedCount}</strong>
            <span className={styles.metricHint}>points qui demandent une relance</span>
          </article>
        </div>
      </div>

      <p className={styles.srOnly} aria-live="polite">{liveMessage}</p>

      <div className={styles.overviewGrid}>
        <Card className={styles.progressCard} variant="elevated">
          <CardHeader className={styles.cardHeader}>
            <div>
              <p className={styles.cardEyebrow}>Tableau de bord</p>
              <CardTitle>Progression globale</CardTitle>
              <p className={styles.cardSubtitle}>
                Une lecture immediate de votre cadence actuelle sur l&apos;ensemble du parcours.
              </p>
            </div>
            <span className={styles.cardIcon}>
              <Layers3 size={18} aria-hidden="true" />
            </span>
          </CardHeader>
          <CardContent className={styles.progressCardContent}>
            <ProgressBar value={metadata.completionRate} max={100} labels={['0%', '50%', '100%']} />
            <p className={styles.summary}>
              {metadata.totalCompleted}/{metadata.total} jalons termines
            </p>
            <div className={styles.progressMetaRow}>
              <span className={styles.progressMetaPill}>
                <CheckCircle2 size={15} aria-hidden="true" />
                {metadata.totalCompleted} finalises
              </span>
              <span className={styles.progressMetaPill}>
                <Clock3 size={15} aria-hidden="true" />
                {metadata.totalPending} restants
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.nextCard} variant="elevated">
          <CardHeader className={styles.cardHeader}>
            <div>
              <p className={styles.cardEyebrow}>Point de focus</p>
              <CardTitle>Prochain jalon cle</CardTitle>
            </div>
            <span className={styles.cardIcon}>
              <CalendarDays size={18} aria-hidden="true" />
            </span>
          </CardHeader>
          <CardContent className={styles.nextCardContent}>
            {insights.nextMilestone ? (
              <>
                <strong className={styles.nextTitle}>A venir: {insights.nextMilestone.title}</strong>
                <p className={styles.nextMeta}>
                  Echeance {formatDate(insights.nextMilestone.dueAt)}
                </p>
                <span className={styles.inlineStatus} data-status={insights.nextMilestone.status}>
                  {STATUS_LABELS[insights.nextMilestone.status]}
                </span>
              </>
            ) : (
              <p className={styles.nextEmpty}>Aucun jalon ouvert pour le moment.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={styles.controlsCard} variant="elevated">
        <CardHeader className={styles.cardHeader}>
          <div>
            <p className={styles.cardEyebrow}>Navigation</p>
            <CardTitle>Choisissez votre angle de lecture</CardTitle>
          </div>
        </CardHeader>
        <CardContent className={styles.controlsContent}>
          <nav className={styles.viewToggle} aria-label="Changer la vue">
            {(['list', 'kanban', 'calendar'] as ViewMode[]).map((mode) => {
              const Icon = VIEW_META[mode].icon;

              return (
                <button
                  key={mode}
                  type="button"
                  className={viewMode === mode ? styles.viewToggleActive : styles.viewToggleButton}
                  onClick={() => setViewMode(mode)}
                  aria-pressed={viewMode === mode}
                >
                  <Icon size={16} aria-hidden="true" />
                  {VIEW_META[mode].label}
                </button>
              );
            })}
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
        </CardContent>
      </Card>

      {error && (
        <div className={styles.error} role="alert" aria-live="assertive">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingPanel} aria-busy="true">
          <div className={styles.loadingPulse} />
          <p className={styles.loadingText}>Chargement des jalons...</p>
        </div>
      ) : milestones.length === 0 ? (
        <Card className={styles.emptyCard} variant="elevated">
          <CardContent className={styles.emptyContent}>
            <div className={styles.emptyBadge}>
              <Sparkles size={18} aria-hidden="true" />
            </div>
            <h2 className={styles.emptyTitle}>Aucun jalon pour ce filtre.</h2>
            <p className={styles.emptyText}>Essayez une autre vue ou elargissez le type selectionne.</p>
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
              <Card className={styles.timelineCard} variant="elevated">
                <CardHeader className={styles.timelineHeader}>
                  <div className={styles.timelineTitleBlock}>
                    <span className={styles.timelineType}>{TYPE_LABELS[milestone.type]}</span>
                    <CardTitle>{milestone.title}</CardTitle>
                  </div>
                  <span className={styles.status} data-status={milestone.status}>
                    {STATUS_LABELS[milestone.status]}
                  </span>
                </CardHeader>
                <CardContent className={styles.timelineContent}>
                  <div className={styles.metaRow}>
                    <p className={styles.meta}>
                      <CalendarDays size={15} aria-hidden="true" />
                      Echeance: {formatDate(milestone.dueAt)}
                    </p>
                    <p className={styles.meta}>
                      <Clock3 size={15} aria-hidden="true" />
                      Statut actuel: {STATUS_LABELS[milestone.status]}
                    </p>
                  </div>
                  {milestone.notes && <p className={styles.notes}>{milestone.notes}</p>}

                  {(milestone.status === 'in_progress' || milestone.status === 'planned') && (
                    <Button
                      type="button"
                      size="sm"
                      className={styles.timelineAction}
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
