'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { PostSessionFeedbackModal } from '../feedback/PostSessionFeedbackModal';
import styles from './SessionHistory.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type CategoryFilter = 'all' | 'message' | 'rdv' | 'visio';

type HistoryEntry = {
  id: string;
  type: 'message' | 'rdv' | 'visio';
  bookingId?: string | null;
  callSessionId?: string | null;
  startedAt: string;
  endedAt: string;
  mentorId: string;
  status: string;
  notes: string | null;
  replayAvailable?: boolean;
  transcriptStatus?: string | null;
  transcriptSummary?: string | null;
};

interface Props {
  accessToken: string;
  userId: string;
  isMentor?: boolean;
}

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'Tous',
  message: 'Messages',
  rdv: 'RDV',
  visio: 'Visio',
};

const STATUS_LABELS: Record<string, string> = {
  completed: 'Termine',
  cancelled: 'Annule',
  confirmed: 'Confirme',
  pending: 'En attente',
  queued: 'En file',
  processing: 'En cours',
  failed: 'Echec',
  declined: 'Refusee',
  pending_consent: 'Consentement requis',
  initiated: 'Lance',
  waiting: 'En attente',
  live: 'En direct',
  missed: 'Sans reponse',
  ended: 'Termine',
};

export function SessionHistory({ accessToken, userId, isMentor = false }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [feedbackModalBookingId, setFeedbackModalBookingId] = useState<string | null>(null);
  const [expandedTranscripts, setExpandedTranscripts] = useState<Record<string, string>>({});

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }),
    [accessToken],
  );

  const loadCategory = useCallback(
    async (category: Exclude<CategoryFilter, 'all'>) => {
      const params = new URLSearchParams({
        user_id: userId,
        category,
        limit: '20',
      });
      const response = await fetch(`${API_URL}/sessions/history?${params.toString()}`, {
        headers,
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error?.message || 'Erreur de chargement');
      }
      return (result.data.sessions ?? []) as HistoryEntry[];
    },
    [headers, userId],
  );

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (filter === 'all') {
        const [messages, rdv, visio] = await Promise.all([
          loadCategory('message'),
          loadCategory('rdv'),
          loadCategory('visio'),
        ]);
        const merged = [...messages, ...rdv, ...visio].sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
        );
        setEntries(merged);
        setAnnouncement(`${merged.length} elements charges`);
      } else {
        const data = await loadCategory(filter);
        setEntries(data);
        setAnnouncement(`${data.length} elements charges`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de connexion');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [filter, loadCategory]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const formatDate = (value: string) =>
    new Date(value).toLocaleString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const downloadExport = async (format: 'csv' | 'pdf') => {
    setError('');
    const response = await fetch(`${API_URL}/sessions/history/export`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: userId,
        category: filter === 'all' ? 'rdv' : filter,
        format,
      }),
    });
    const result = await response.json();
    if (!response.ok || result.error) {
      setError(result.error?.message || 'Export impossible');
      return;
    }

    const url = (result.data.exportUrl || result.data.export_url) as string;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const openReplay = async (id: string) => {
    const response = await fetch(`${API_URL}/sessions/${id}/replay-link`, {
      headers,
      cache: 'no-store',
    });
    const result = await response.json();
    if (!response.ok || result.error) {
      setError(result.error?.message || 'Replay indisponible');
      return;
    }
    window.open(result.data.url as string, '_blank', 'noopener,noreferrer');
  };

  const loadTranscript = async (entry: HistoryEntry) => {
    const callId = entry.callSessionId || entry.id;
    const response = await fetch(`${API_URL}/sessions/calls/${callId}/transcript`, {
      headers,
      cache: 'no-store',
    });
    const result = await response.json();
    if (!response.ok || result.error) {
      setError(result.error?.message || 'Transcription indisponible');
      return;
    }

    const fullText = (result.data.fullText as string | null) || 'Aucun verbatim disponible.';
    setExpandedTranscripts((previous) => ({
      ...previous,
      [entry.id]: fullText,
    }));
  };

  return (
    <section className={styles.container} aria-labelledby="history-title">
      <header className={styles.header}>
        <h1 id="history-title" className={styles.title}>Historique des sessions</h1>
        <p className={styles.subtitle}>Timeline de vos messages, rendez-vous et visios passes.</p>
      </header>

      <p className={styles.srOnly} aria-live="polite">{announcement}</p>

      <div className={styles.toolbar}>
        <nav className={styles.filters} aria-label="Filtrer les sessions par type">
          {(Object.keys(CATEGORY_LABELS) as CategoryFilter[]).map((category) => (
            <button
              key={category}
              type="button"
              className={filter === category ? styles.filterActive : styles.filterButton}
              onClick={() => setFilter(category)}
            >
              {CATEGORY_LABELS[category]}
            </button>
          ))}
        </nav>
        <div className={styles.exportButtons}>
          <Button size="sm" variant="outline" type="button" onClick={() => void downloadExport('csv')}>
            Export CSV
          </Button>
          <Button size="sm" variant="secondary" type="button" onClick={() => void downloadExport('pdf')}>
            Export PDF
          </Button>
        </div>
      </div>

      {error && (
        <div className={styles.error} role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      {loading ? (
        <div className={styles.loading} aria-busy="true">
          Chargement de l&apos;historique...
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent>
            <p className={styles.empty}>Aucune session a afficher.</p>
          </CardContent>
        </Card>
      ) : (
        <ol className={styles.timeline}>
          {entries.map((entry) => (
            <li key={`${entry.type}-${entry.id}`} className={styles.timelineItem}>
              <Card variant="outlined">
                <CardHeader className={styles.cardHeader}>
                  <CardTitle>{CATEGORY_LABELS[entry.type]}</CardTitle>
                  <span className={styles.status} data-status={entry.status}>
                    {STATUS_LABELS[entry.status] ?? entry.status}
                  </span>
                </CardHeader>
                <CardContent>
                  <p className={styles.date}>{formatDate(entry.startedAt)}</p>
                  <p className={styles.meta}>Mentor: {entry.mentorId}</p>
                  {entry.notes && <p className={styles.notes}>{entry.notes}</p>}
                  {entry.type === 'visio' && entry.transcriptStatus && (
                    <p className={styles.meta}>
                      Transcription: {entry.transcriptStatus}
                      {entry.transcriptSummary ? ` · ${entry.transcriptSummary}` : ''}
                    </p>
                  )}
                  {entry.type === 'visio' && entry.replayAvailable && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void openReplay(entry.id)}
                      aria-label="Ouvrir le replay"
                    >
                      Ouvrir replay
                    </Button>
                  )}
                  {entry.type === 'visio' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void loadTranscript(entry)}
                      aria-label="Afficher la transcription"
                    >
                      Voir transcription
                    </Button>
                  )}
                  {expandedTranscripts[entry.id] && (
                    <p className={styles.notes}>{expandedTranscripts[entry.id]}</p>
                  )}
                  {entry.status === 'completed' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setFeedbackModalBookingId(entry.id)}
                      aria-label="Voir les notes et retours de cette session"
                    >
                      Notes &amp; Retours
                    </Button>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}

      {feedbackModalBookingId && (
        <PostSessionFeedbackModal
          open={Boolean(feedbackModalBookingId)}
          onClose={() => setFeedbackModalBookingId(null)}
          accessToken={accessToken}
          bookingId={feedbackModalBookingId}
          userId={userId}
          isMentor={isMentor}
        />
      )}
    </section>
  );
}
