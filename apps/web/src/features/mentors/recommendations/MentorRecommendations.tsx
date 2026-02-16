'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import styles from './MentorRecommendations.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface MentorRecommendation {
  mentorId: string;
  firstName: string;
  lastName: string;
  domain: string;
  expertiseTags: string[];
  hourlyRate: number | null;
  rating: number;
  score: number;
  isRecommended: boolean;
  cta: 'Voir le mentor' | 'Envoyer un message';
}

interface RecommendationResponse {
  mentors: MentorRecommendation[];
  metadata: {
    scoring_signals: string[];
    applied_filters: {
      domains?: string[];
      maxPrice?: number;
      minRating?: number;
    };
    next_cursor: string | null;
  };
}

interface Props {
  accessToken: string;
}

const SKELETON_COUNT = 3;

export function MentorRecommendations({ accessToken }: Props) {
  const [recommendations, setRecommendations] = useState<MentorRecommendation[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const loadRecommendations = useCallback(async (cursor?: string) => {
    const isInitial = !cursor;
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError('');

    try {
      const params = new URLSearchParams({ limit: '6' });
      if (cursor) {
        params.set('cursor', cursor);
      }

      const response = await fetch(`${API_URL}/mentors/recommendations?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error?.message || 'Erreur lors du chargement des recommandations');
        return;
      }

      const data = result.data as RecommendationResponse;
      setRecommendations((prev) => (cursor ? [...prev, ...data.mentors] : data.mentors));
      setNextCursor(data.metadata.next_cursor);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations]);

  const subtitle = useMemo(() => {
    if (recommendations.length === 0) {
      return 'Aucune recommandation pour le moment';
    }
    return `${recommendations.length} mentor(s) recommandes pour vous`;
  }, [recommendations.length]);

  if (loading) {
    return (
      <section className={styles.container} aria-labelledby="mentors-title">
        <header className={styles.header}>
          <h1 id="mentors-title" className={styles.title}>Mentors recommandes</h1>
          <p className={styles.subtitle}>Recherche des mentors en cours...</p>
        </header>
        <div className={styles.grid}>
          {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <div key={index} className={styles.skeletonCard} aria-hidden="true" />
          ))}
        </div>
        <p className={styles.liveRegion} aria-live="polite">Chargement des recommandations...</p>
      </section>
    );
  }

  return (
    <section className={styles.container} aria-labelledby="mentors-title">
      <header className={styles.header}>
        <h1 id="mentors-title" className={styles.title}>Mentors recommandes</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </header>

      {error && (
        <div className={styles.error} role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      {!error && recommendations.length === 0 && (
        <div className={styles.emptyState} role="status" aria-live="polite">
          Aucun mentor ne correspond actuellement a votre profil.
        </div>
      )}

      <div className={styles.grid}>
        {recommendations.map((mentor) => (
          <Card key={mentor.mentorId} variant="elevated" className={styles.card}>
            <CardHeader>
              <div className={styles.cardTop}>
                <CardTitle as="h2">
                  {mentor.firstName} {mentor.lastName}
                </CardTitle>
                {mentor.isRecommended && (
                  <span className={styles.badge}>Recommande</span>
                )}
              </div>
              <p className={styles.domain}>{mentor.domain}</p>
            </CardHeader>
            <CardContent>
              <div className={styles.tags}>
                {mentor.expertiseTags.slice(0, 3).map((tag) => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
              </div>
              <dl className={styles.meta}>
                <div>
                  <dt>Note</dt>
                  <dd>{mentor.rating.toFixed(1)}/5</dd>
                </div>
                <div>
                  <dt>Tarif</dt>
                  <dd>{mentor.hourlyRate ? `${mentor.hourlyRate} EUR/h` : 'Non renseigne'}</dd>
                </div>
              </dl>
              <Button className={styles.ctaButton}>
                {mentor.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {nextCursor && (
        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={() => void loadRecommendations(nextCursor)}
            isLoading={loadingMore}
          >
            Charger plus de mentors
          </Button>
        </div>
      )}

      <p className={styles.liveRegion} aria-live="polite">
        {loadingMore ? 'Chargement de mentors supplementaires...' : ''}
      </p>
    </section>
  );
}
