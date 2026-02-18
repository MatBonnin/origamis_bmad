'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import styles from './MentorProfile.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface MentorReview {
  reviewId: string;
  rating: number;
  comment: string;
  author: string;
  source: 'session' | 'feedback';
  createdAt: string;
}

interface MentorProfileResponse {
  mentor: {
    mentorId: string;
    fullName: string;
    bio: string | null;
    avatarUrl: string | null;
    domain: string;
    expertiseTags: string[];
    supportedLevels: string[];
    hourlyRate: number | null;
  };
  reviews: MentorReview[];
  availability: {
    isAvailable: boolean;
    nextAvailableAt: string | null;
  };
  rating: {
    average: number;
    reviewCount: number;
  };
}

interface Props {
  accessToken: string;
  mentorId: string;
}

export function MentorProfile({ accessToken, mentorId }: Props) {
  const [data, setData] = useState<MentorProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newRating, setNewRating] = useState('5');
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/mentors/${mentorId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error?.message || 'Impossible de charger le profil mentor');
        return;
      }

      setData(result.data as MentorProfileResponse);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }, [accessToken, mentorId]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const availabilityText = useMemo(() => {
    if (!data) return '';
    if (data.availability.isAvailable) return 'Disponible maintenant';
    if (!data.availability.nextAvailableAt) return 'Disponibilite non communiquee';
    return `Prochaine disponibilite: ${new Date(data.availability.nextAvailableAt).toLocaleString('fr-FR')}`;
  }, [data]);

  const submitReview = async () => {
    setError('');
    setSubmittingReview(true);
    try {
      const response = await fetch(`${API_URL}/mentors/${mentorId}/reviews`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: Number(newRating),
          body: newComment,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        setError(result.error?.message || 'Impossible d envoyer l avis');
        return;
      }
      setNewComment('');
      setNewRating('5');
      await fetchProfile();
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <section className={styles.container} aria-labelledby="mentor-profile-title">
        <header className={styles.header}>
          <h1 id="mentor-profile-title" className={styles.title}>Profil mentor</h1>
          <p className={styles.subtitle}>Chargement du profil...</p>
        </header>
        <div className={styles.skeletonCard} aria-hidden="true" />
        <p className={styles.liveRegion} aria-live="polite">Chargement du profil mentor...</p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className={styles.container} aria-labelledby="mentor-profile-title">
        <header className={styles.header}>
          <h1 id="mentor-profile-title" className={styles.title}>Profil mentor</h1>
        </header>
        <div className={styles.error} role="alert">{error || 'Profil indisponible'}</div>
      </section>
    );
  }

  return (
    <section className={styles.container} aria-labelledby="mentor-profile-title">
      <header className={styles.header}>
        <h1 id="mentor-profile-title" className={styles.title}>{data.mentor.fullName}</h1>
        <p className={styles.subtitle}>{data.mentor.domain}</p>
      </header>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle as="h2">Informations clés</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={styles.bio}>{data.mentor.bio || 'Bio non renseignee.'}</p>
          <dl className={styles.meta}>
            <div>
              <dt>Note moyenne</dt>
              <dd>{data.rating.average.toFixed(1)}/5 ({data.rating.reviewCount} avis)</dd>
            </div>
            <div>
              <dt>Tarif</dt>
              <dd>{data.mentor.hourlyRate ? `${data.mentor.hourlyRate} EUR/h` : 'Non renseigne'}</dd>
            </div>
            <div>
              <dt>Disponibilite</dt>
              <dd>{availabilityText}</dd>
            </div>
          </dl>
          <div className={styles.actions}>
            <Button type="button">Contacter</Button>
            <Button type="button" variant="secondary">Prendre RDV</Button>
          </div>
        </CardContent>
      </Card>

      <div className={styles.twoColumns}>
        <Card>
          <CardHeader>
            <CardTitle as="h2">Competences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.tags}>
              {data.mentor.expertiseTags.length > 0
                ? data.mentor.expertiseTags.map((tag) => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))
                : <span className={styles.fallback}>Aucune competence renseignee.</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Avis</CardTitle>
          </CardHeader>
          <CardContent>
            {data.reviews.length === 0 && (
              <p className={styles.fallback} aria-live="polite">Aucun avis disponible pour le moment.</p>
            )}
            {data.reviews.map((review) => (
              <article key={review.reviewId} className={styles.review}>
                <p className={styles.reviewHeader}>
                  <strong>{review.author}</strong> · {review.rating.toFixed(1)}/5
                </p>
                <p className={styles.reviewComment}>{review.comment}</p>
                <p className={styles.reviewMeta}>
                  Source: {review.source} · {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </article>
            ))}

            <div className={styles.reviewForm}>
              <h3 className={styles.reviewFormTitle}>Laisser un avis</h3>
              <label className={styles.reviewFormLabel}>
                Note
                <input
                  className={styles.reviewInput}
                  type="number"
                  min={1}
                  max={5}
                  step={0.5}
                  value={newRating}
                  onChange={(event) => setNewRating(event.target.value)}
                />
              </label>
              <label className={styles.reviewFormLabel}>
                Commentaire
                <textarea
                  className={styles.reviewTextarea}
                  value={newComment}
                  onChange={(event) => setNewComment(event.target.value)}
                  aria-label="Rediger un avis"
                />
              </label>
              <Button
                type="button"
                size="sm"
                onClick={() => void submitReview()}
                disabled={submittingReview || !newComment.trim()}
              >
                {submittingReview ? 'Envoi...' : 'Publier mon avis'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
