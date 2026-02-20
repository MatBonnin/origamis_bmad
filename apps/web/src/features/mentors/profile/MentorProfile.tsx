'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, CardContent } from '@/components/ui';
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
    bannerUrl: string | null;
    about: string | null;
    professionalLinks: string[];
    educationLevel: string | null;
    degrees: string[];
    keywords: string[];
    domain: string;
    expertiseTags: string[];
    supportedLevels: string[];
    supportTypes: string[];
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

// Composant étoiles pour les notes
function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <span key={i} className={`${styles.star} ${styles.starFilled} ${styles[`star${size}`]}`}>
          ★
        </span>
      );
    } else if (i === fullStars && hasHalfStar) {
      stars.push(
        <span key={i} className={`${styles.star} ${styles.starHalf} ${styles[`star${size}`]}`}>
          ★
        </span>
      );
    } else {
      stars.push(
        <span key={i} className={`${styles.star} ${styles.starEmpty} ${styles[`star${size}`]}`}>
          ★
        </span>
      );
    }
  }

  return <span className={styles.starRating}>{stars}</span>;
}

// Badge de disponibilité
function AvailabilityBadge({ isAvailable, nextDate }: { isAvailable: boolean; nextDate: string | null }) {
  if (isAvailable) {
    return (
      <span className={`${styles.availabilityBadge} ${styles.availableNow}`}>
        <span className={styles.availabilityDot} />
        Disponible maintenant
      </span>
    );
  }
  if (nextDate) {
    return (
      <span className={`${styles.availabilityBadge} ${styles.availableLater}`}>
        <span className={styles.availabilityDotLater} />
        Dispo le {new Date(nextDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
      </span>
    );
  }
  return (
    <span className={`${styles.availabilityBadge} ${styles.unavailable}`}>
      Disponibilité non communiquée
    </span>
  );
}

// Icônes SVG inline
const Icons = {
  LinkedIn: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Message: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  GraduationCap: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  Briefcase: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  Clock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
};

export function MentorProfile({ accessToken, mentorId }: Props) {
  const [data, setData] = useState<MentorProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newRating, setNewRating] = useState(5);
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

  const supportTypesLabels: Record<string, string> = useMemo(() => ({
    ponctuel: 'Ponctuel',
    suivi_regulier: 'Suivi régulier',
    long_uniquement: 'Long terme',
  }), []);

  const educationLabels: Record<string, string> = useMemo(() => ({
    bac: 'Baccalauréat',
    'bac+2': 'Bac+2',
    'bac+3': 'Bac+3 / Licence',
    'bac+5': 'Bac+5 / Master',
    doctorat: 'Doctorat',
    autre: 'Autre',
  }), []);

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
          rating: newRating,
          body: newComment,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        setError(result.error?.message || "Impossible d'envoyer l'avis");
        return;
      }
      setNewComment('');
      setNewRating(5);
      await fetchProfile();
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.heroSkeleton}>
          <div className={styles.bannerSkeleton} />
          <div className={styles.avatarSkeleton} />
        </div>
        <div className={styles.contentSkeleton}>
          <div className={styles.textSkeleton} />
          <div className={styles.textSkeleton} style={{ width: '60%' }} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.errorContainer}>
          <h1>Profil indisponible</h1>
          <p>{error || 'Ce mentor n\'existe pas ou son profil n\'est pas publié.'}</p>
          <Button variant="outline" onClick={() => window.history.back()}>
            Retour
          </Button>
        </div>
      </div>
    );
  }

  const { mentor, reviews, availability, rating } = data;

  return (
    <div className={styles.pageContainer}>
      {/* Hero Section avec Bannière */}
      <section className={styles.heroSection}>
        <div
          className={styles.heroBanner}
          style={{
            backgroundImage: mentor.bannerUrl
              ? `url(${mentor.bannerUrl})`
              : 'linear-gradient(135deg, #00064F 0%, #36529B 50%, #3A68AD 100%)',
          }}
        >
          <div className={styles.bannerOverlay} />
        </div>

        <div className={styles.heroContent}>
          <div className={styles.avatarWrapper}>
            {mentor.avatarUrl ? (
              <img
                src={mentor.avatarUrl}
                alt={mentor.fullName}
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {mentor.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <AvailabilityBadge
              isAvailable={availability.isAvailable}
              nextDate={availability.nextAvailableAt}
            />
          </div>

          <div className={styles.heroInfo}>
            <h1 className={styles.mentorName}>{mentor.fullName}</h1>
            <p className={styles.mentorDomain}>{mentor.domain}</p>

            <div className={styles.ratingRow}>
              <StarRating rating={rating.average} size="lg" />
              <span className={styles.ratingText}>
                {rating.average.toFixed(1)} ({rating.reviewCount} avis)
              </span>
            </div>

            {mentor.bio && (
              <p className={styles.heroBio}>{mentor.bio}</p>
            )}

            <div className={styles.heroActions}>
              <Button size="lg" leftIcon={<Icons.Calendar />}>
                Réserver une session
              </Button>
              <Button variant="outline" size="lg" leftIcon={<Icons.Message />}>
                Envoyer un message
              </Button>
            </div>

            {mentor.hourlyRate && (
              <div className={styles.priceTag}>
                <span className={styles.priceAmount}>{mentor.hourlyRate} €</span>
                <span className={styles.priceUnit}>/heure</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Contenu principal */}
      <main className={styles.mainContent}>
        <div className={styles.contentGrid}>
          {/* Colonne gauche */}
          <div className={styles.leftColumn}>
            {/* À propos */}
            {mentor.about && (
              <Card variant="elevated" className={styles.card}>
                <CardContent>
                  <h2 className={styles.sectionTitle}>À propos</h2>
                  <p className={styles.aboutText}>{mentor.about}</p>
                </CardContent>
              </Card>
            )}

            {/* Compétences */}
            <Card variant="elevated" className={styles.card}>
              <CardContent>
                <h2 className={styles.sectionTitle}>Compétences</h2>
                {mentor.expertiseTags.length > 0 ? (
                  <div className={styles.skillsGrid}>
                    {mentor.expertiseTags.map((tag) => (
                      <span key={tag} className={styles.skillTag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyState}>Aucune compétence renseignée</p>
                )}

                {mentor.keywords.length > 0 && (
                  <>
                    <h3 className={styles.subsectionTitle}>Mots-clés</h3>
                    <div className={styles.keywordsRow}>
                      {mentor.keywords.map((keyword) => (
                        <span key={keyword} className={styles.keyword}>
                          #{keyword}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Avis */}
            <Card variant="elevated" className={styles.card}>
              <CardContent>
                <div className={styles.reviewsHeader}>
                  <h2 className={styles.sectionTitle}>Avis</h2>
                  <span className={styles.reviewCount}>{rating.reviewCount} avis</span>
                </div>

                {reviews.length === 0 ? (
                  <p className={styles.emptyState}>Aucun avis pour le moment. Soyez le premier à partager votre expérience !</p>
                ) : (
                  <div className={styles.reviewsList}>
                    {reviews.map((review) => (
                      <article key={review.reviewId} className={styles.reviewCard}>
                        <div className={styles.reviewHeader}>
                          <div className={styles.reviewAuthorAvatar}>
                            {review.author.charAt(0).toUpperCase()}
                          </div>
                          <div className={styles.reviewAuthorInfo}>
                            <span className={styles.reviewAuthorName}>{review.author}</span>
                            <div className={styles.reviewMeta}>
                              <StarRating rating={review.rating} size="sm" />
                              <span className={styles.reviewDate}>
                                <Icons.Clock />
                                {new Date(review.createdAt).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className={styles.reviewBody}>{review.comment}</p>
                      </article>
                    ))}
                  </div>
                )}

                {/* Formulaire d'avis */}
                <div className={styles.reviewForm}>
                  <h3 className={styles.reviewFormTitle}>Laisser un avis</h3>

                  <div className={styles.ratingInput}>
                    <span className={styles.ratingInputLabel}>Votre note</span>
                    <div className={styles.ratingStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className={`${styles.ratingStar} ${star <= newRating ? styles.ratingStarActive : ''}`}
                          onClick={() => setNewRating(star)}
                          aria-label={`Note ${star} étoiles`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    className={styles.reviewTextarea}
                    placeholder="Partagez votre expérience avec ce mentor..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={4}
                  />

                  {error && <p className={styles.formError}>{error}</p>}

                  <Button
                    onClick={() => void submitReview()}
                    disabled={submittingReview || !newComment.trim()}
                    isLoading={submittingReview}
                  >
                    Publier mon avis
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite - Sidebar */}
          <aside className={styles.rightColumn}>
            {/* Infos rapides */}
            <Card variant="elevated" className={styles.card}>
              <CardContent>
                <h2 className={styles.sectionTitle}>Informations</h2>

                <div className={styles.infoList}>
                  {mentor.educationLevel && (
                    <div className={styles.infoItem}>
                      <div className={styles.infoIcon}>
                        <Icons.GraduationCap />
                      </div>
                      <div className={styles.infoContent}>
                        <span className={styles.infoLabel}>Formation</span>
                        <span className={styles.infoValue}>
                          {educationLabels[mentor.educationLevel] || mentor.educationLevel}
                        </span>
                      </div>
                    </div>
                  )}

                  {mentor.degrees.length > 0 && (
                    <div className={styles.infoItem}>
                      <div className={styles.infoIcon}>
                        <Icons.GraduationCap />
                      </div>
                      <div className={styles.infoContent}>
                        <span className={styles.infoLabel}>Diplômes</span>
                        <span className={styles.infoValue}>
                          {mentor.degrees.join(', ')}
                        </span>
                      </div>
                    </div>
                  )}

                  {mentor.supportTypes.length > 0 && (
                    <div className={styles.infoItem}>
                      <div className={styles.infoIcon}>
                        <Icons.Briefcase />
                      </div>
                      <div className={styles.infoContent}>
                        <span className={styles.infoLabel}>Accompagnement</span>
                        <div className={styles.supportTypes}>
                          {mentor.supportTypes.map((type) => (
                            <span key={type} className={styles.supportTypeBadge}>
                              {supportTypesLabels[type] || type}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {mentor.professionalLinks.length > 0 && (
                    <div className={styles.infoItem}>
                      <div className={styles.infoIcon}>
                        <Icons.LinkedIn />
                      </div>
                      <div className={styles.infoContent}>
                        <span className={styles.infoLabel}>Réseaux</span>
                        <a
                          href={mentor.professionalLinks[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.linkedinLink}
                        >
                          Voir le profil LinkedIn
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Niveaux accompagnés */}
            {mentor.supportedLevels.length > 0 && (
              <Card variant="elevated" className={styles.card}>
                <CardContent>
                  <h2 className={styles.sectionTitle}>Niveaux accompagnés</h2>
                  <div className={styles.levelsList}>
                    {mentor.supportedLevels.map((level) => (
                      <span key={level} className={styles.levelBadge}>
                        {level}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CTA sticky */}
            <div className={styles.stickyCta}>
              <div className={styles.stickyCtaContent}>
                <div className={styles.stickyCtaPrice}>
                  {mentor.hourlyRate ? (
                    <>
                      <span className={styles.stickyCtaPriceAmount}>{mentor.hourlyRate} €</span>
                      <span className={styles.stickyCtaPriceUnit}>/heure</span>
                    </>
                  ) : (
                    <span className={styles.stickyCtaPriceAmount}>Tarif sur demande</span>
                  )}
                </div>
                <Button fullWidth size="lg">
                  Réserver une session
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
