'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, Input, Select } from '@/components/ui';
import styles from './MentorSearch.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const FILTERS_STORAGE_KEY = 'origami.mentors.search.filters';

interface MentorSearchItem {
  mentorId: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  domain: string;
  bio?: string | null;
  expertiseTags: string[];
  supportTypes?: string[];
  hourlyRate: number | null;
  rating: number;
  reviewCount?: number;
  isAvailable: boolean;
}

interface SearchResponse {
  mentors: MentorSearchItem[];
  metadata: {
    total: number;
    applied_filters: SearchFilters;
    next_cursor: string | null;
  };
}

interface SearchFacets {
  domains: string[];
  price_ranges: {
    min: number | null;
    max: number | null;
    presets: Array<{ key: string; min: number; max: number | null; label: string }>;
  };
  availabilities: string[];
  support_types?: string[];
  rating_thresholds: number[];
}

interface SearchFilters {
  domains?: string[];
  supportTypes?: string[];
  maxPrice?: number;
  minRating?: number;
  availability?: 'available' | 'all';
}

interface Props {
  accessToken: string;
}

const EMPTY_FILTERS: SearchFilters = {};

function safeParseFilters(serialized: string | null): SearchFilters {
  if (!serialized) return EMPTY_FILTERS;
  try {
    return JSON.parse(serialized) as SearchFilters;
  } catch {
    return EMPTY_FILTERS;
  }
}

// Composant étoiles
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<span key={i} className={`${styles.star} ${styles.starFilled} ${styles[`star${size}`]}`}>★</span>);
    } else if (i === fullStars && hasHalfStar) {
      stars.push(<span key={i} className={`${styles.star} ${styles.starHalf} ${styles[`star${size}`]}`}>★</span>);
    } else {
      stars.push(<span key={i} className={`${styles.star} ${styles.starEmpty} ${styles[`star${size}`]}`}>★</span>);
    }
  }

  return <span className={styles.starRating}>{stars}</span>;
}

// Icônes SVG
const Icons = {
  Search: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Filter: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Users: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Star: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Calendar: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
};

export function MentorSearch({ accessToken }: Props) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('relevance');
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [facets, setFacets] = useState<SearchFacets | null>(null);
  const [mentors, setMentors] = useState<MentorSearchItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [facetsLoading, setFacetsLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchFacets = useCallback(async () => {
    setFacetsLoading(true);
    try {
      const response = await fetch(`${API_URL}/mentors/filters`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        setError(result.error?.message || 'Impossible de charger les facettes');
        return;
      }
      setFacets(result.data as SearchFacets);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setFacetsLoading(false);
    }
  }, [accessToken]);

  const fetchResults = useCallback(async (cursor?: string) => {
    const initial = !cursor;
    if (initial) setLoading(true);
    else setLoadingMore(true);
    setError('');

    try {
      const params = new URLSearchParams({ q: query, sort, limit: '9' });
      if (cursor) params.set('cursor', cursor);
      if (Object.keys(filters).length > 0) params.set('filters', JSON.stringify(filters));

      const response = await fetch(`${API_URL}/mentors/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error?.message || 'Impossible de charger les mentors');
        return;
      }

      const data = result.data as SearchResponse;
      setMentors((previous) => (cursor ? [...previous, ...data.mentors] : data.mentors));
      setNextCursor(data.metadata.next_cursor);
      setTotal(data.metadata.total);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [accessToken, filters, query, sort]);

  useEffect(() => {
    const storedFilters = safeParseFilters(window.localStorage.getItem(FILTERS_STORAGE_KEY));
    setFilters(storedFilters);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    void fetchFacets();
  }, [fetchFacets]);

  useEffect(() => {
    const timeout = setTimeout(() => void fetchResults(), 250);
    return () => clearTimeout(timeout);
  }, [fetchResults]);

  const domainValue = filters.domains?.[0] ?? '';
  const supportTypeValue = filters.supportTypes?.[0] ?? '';
  const maxPriceSliderMax = facets?.price_ranges.max ?? 200;
  const maxPriceValue = filters.maxPrice !== undefined ? filters.maxPrice : maxPriceSliderMax;
  const minRatingValue = filters.minRating !== undefined ? String(filters.minRating) : '';
  const onlyAvailable = filters.availability === 'available';

  const domainOptions = (facets?.domains ?? []).map((domain) => ({ value: domain, label: domain }));
  const ratingOptions = (facets?.rating_thresholds ?? []).map((threshold) => ({
    value: String(threshold),
    label: `${threshold}+ étoiles`,
  }));
  const supportTypeOptions = (facets?.support_types ?? []).map((value) => ({ value, label: value }));

  const activeFiltersCount = [
    domainValue,
    filters.maxPrice !== undefined,
    supportTypeValue,
    minRatingValue,
    onlyAvailable,
  ].filter(Boolean).length;

  const activeFilters = useMemo(() => [
    domainValue ? { key: 'domain', label: domainValue } : null,
    filters.maxPrice !== undefined ? { key: 'price', label: `Max ${filters.maxPrice} €/h` } : null,
    supportTypeValue ? { key: 'support', label: supportTypeValue } : null,
    minRatingValue ? { key: 'rating', label: `${minRatingValue}+ étoiles` } : null,
    onlyAvailable ? { key: 'available', label: 'Disponible' } : null,
  ].filter(Boolean) as Array<{ key: string; label: string }>, [domainValue, filters.maxPrice, supportTypeValue, minRatingValue, onlyAvailable]);

  const removeFilter = (key: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (key === 'domain') delete next.domains;
      if (key === 'price') delete next.maxPrice;
      if (key === 'support') delete next.supportTypes;
      if (key === 'rating') delete next.minRating;
      if (key === 'available') delete next.availability;
      return next;
    });
  };

  const renderFilterPanel = () => (
    <div className={styles.filtersContent}>
      <div className={styles.filterSection}>
        <h3 className={styles.filterTitle}>Domaine</h3>
        <Select
          name="domain"
          value={domainValue}
          options={domainOptions}
          placeholder="Tous les domaines"
          onChange={(e) => setFilters((prev) => ({ ...prev, domains: e.target.value ? [e.target.value] : undefined }))}
        />
      </div>

      <div className={styles.filterSection}>
        <h3 className={styles.filterTitle}>Type d'accompagnement</h3>
        <Select
          name="supportType"
          value={supportTypeValue}
          options={supportTypeOptions}
          placeholder="Tous les types"
          onChange={(e) => setFilters((prev) => ({ ...prev, supportTypes: e.target.value ? [e.target.value] : undefined }))}
        />
      </div>

      <div className={styles.filterSection}>
        <div className={styles.sliderHeader}>
          <h3 className={styles.filterTitle}>Budget maximum</h3>
          <span className={styles.sliderValue}>
            {maxPriceValue >= maxPriceSliderMax ? 'Illimité' : `${maxPriceValue} €/h`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={maxPriceSliderMax}
          step={5}
          value={maxPriceValue}
          className={styles.slider}
          onChange={(e) => {
            const value = Number(e.target.value);
            setFilters((prev) => ({ ...prev, maxPrice: value >= maxPriceSliderMax ? undefined : value }));
          }}
        />
        <div className={styles.sliderTicks}>
          <span>0 €</span>
          <span>{maxPriceSliderMax} €+</span>
        </div>
      </div>

      <div className={styles.filterSection}>
        <h3 className={styles.filterTitle}>Note minimale</h3>
        <Select
          name="rating"
          value={minRatingValue}
          options={ratingOptions}
          placeholder="Toutes les notes"
          onChange={(e) => setFilters((prev) => ({ ...prev, minRating: e.target.value ? Number(e.target.value) : undefined }))}
        />
      </div>

      <div className={styles.filterSection}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => setFilters((prev) => ({ ...prev, availability: e.target.checked ? 'available' : undefined }))}
            className={styles.checkbox}
          />
          <span className={styles.checkboxCustom} />
          <span>Disponibles maintenant uniquement</span>
        </label>
      </div>

      <Button
        type="button"
        variant="ghost"
        fullWidth
        onClick={() => setFilters(EMPTY_FILTERS)}
        className={styles.resetButton}
      >
        Réinitialiser les filtres
      </Button>
    </div>
  );

  return (
    <div className={styles.pageContainer}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroBackground} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Trouvez le mentor idéal</h1>
          <p className={styles.heroSubtitle}>
            Connectez-vous avec des experts passionnés pour accélérer votre progression
          </p>

          {/* Stats */}
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <div className={styles.statIcon}><Icons.Users /></div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{total}+</span>
                <span className={styles.statLabel}>Mentors</span>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statIcon}><Icons.Star /></div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>4.8</span>
                <span className={styles.statLabel}>Note moyenne</span>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statIcon}><Icons.Calendar /></div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>1000+</span>
                <span className={styles.statLabel}>Sessions</span>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className={styles.searchBar}>
            <div className={styles.searchInputWrapper}>
              <span className={styles.searchIcon}><Icons.Search /></span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Rechercher par compétence, domaine, nom..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button size="lg" className={styles.searchButton}>
              Rechercher
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <span className={styles.resultsCount}>
              {loading ? 'Recherche...' : `${total} mentor${total > 1 ? 's' : ''} trouvé${total > 1 ? 's' : ''}`}
            </span>
          </div>
          <div className={styles.toolbarRight}>
            <Select
              name="sort"
              value={sort}
              options={[
                { value: 'relevance', label: 'Pertinence' },
                { value: 'rating_desc', label: 'Meilleures notes' },
                { value: 'price_asc', label: 'Prix croissant' },
                { value: 'price_desc', label: 'Prix décroissant' },
                { value: 'availability', label: 'Disponibilité' },
              ]}
              onChange={(e) => setSort(e.target.value)}
              className={styles.sortSelect}
            />
            <Button
              variant="outline"
              className={styles.mobileFiltersButton}
              onClick={() => setDrawerOpen(true)}
              leftIcon={<Icons.Filter />}
            >
              Filtres {activeFiltersCount > 0 && <span className={styles.filterBadge}>{activeFiltersCount}</span>}
            </Button>
          </div>
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className={styles.activeFilters}>
            {activeFilters.map((filter) => (
              <button
                key={filter.key}
                className={styles.filterChip}
                onClick={() => removeFilter(filter.key)}
              >
                {filter.label}
                <Icons.X />
              </button>
            ))}
            <button
              className={styles.clearAllFilters}
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              Tout effacer
            </button>
          </div>
        )}

        <div className={styles.contentLayout}>
          {/* Filters Sidebar */}
          <aside className={styles.filtersSidebar}>
            <div className={styles.filtersHeader}>
              <h2 className={styles.filtersTitle}>Filtres</h2>
              {activeFiltersCount > 0 && (
                <span className={styles.activeFiltersCount}>{activeFiltersCount} actif{activeFiltersCount > 1 ? 's' : ''}</span>
              )}
            </div>
            {renderFilterPanel()}
          </aside>

          {/* Results */}
          <div className={styles.resultsContainer}>
            {error && (
              <div className={styles.errorBanner} role="alert">
                <p>{error}</p>
                <Button variant="outline" size="sm" onClick={() => void fetchResults()}>
                  Réessayer
                </Button>
              </div>
            )}

            {!error && loading && (
              <div className={styles.loadingGrid}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className={styles.skeletonCard}>
                    <div className={styles.skeletonAvatar} />
                    <div className={styles.skeletonContent}>
                      <div className={styles.skeletonLine} />
                      <div className={styles.skeletonLineShort} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!error && !loading && mentors.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>🔍</div>
                <h3>Aucun mentor trouvé</h3>
                <p>Essayez de modifier vos critères de recherche ou vos filtres</p>
                <Button variant="outline" onClick={() => { setQuery(''); setFilters(EMPTY_FILTERS); }}>
                  Réinitialiser la recherche
                </Button>
              </div>
            )}

            {!error && !loading && mentors.length > 0 && (
              <>
                <div className={styles.mentorsGrid}>
                  {mentors.map((mentor) => (
                    <Link
                      key={mentor.mentorId}
                      href={`/mentors/${mentor.mentorId}`}
                      className={styles.mentorCardLink}
                    >
                      <Card variant="elevated" className={styles.mentorCard}>
                        <CardContent className={styles.mentorCardContent}>
                          {/* Header avec avatar */}
                          <div className={styles.mentorHeader}>
                            <div className={styles.mentorAvatarWrapper}>
                              {mentor.avatarUrl ? (
                                <img
                                  src={mentor.avatarUrl}
                                  alt={`${mentor.firstName} ${mentor.lastName}`}
                                  className={styles.mentorAvatar}
                                />
                              ) : (
                                <div className={styles.mentorAvatarPlaceholder}>
                                  {mentor.firstName.charAt(0)}{mentor.lastName.charAt(0)}
                                </div>
                              )}
                              {mentor.isAvailable && (
                                <span className={styles.availabilityIndicator} title="Disponible maintenant" />
                              )}
                            </div>
                            <div className={styles.mentorInfo}>
                              <h3 className={styles.mentorName}>
                                {mentor.firstName} {mentor.lastName}
                              </h3>
                              <p className={styles.mentorDomain}>{mentor.domain}</p>
                            </div>
                          </div>

                          {/* Rating */}
                          <div className={styles.ratingRow}>
                            <StarRating rating={mentor.rating} />
                            <span className={styles.ratingValue}>{mentor.rating.toFixed(1)}</span>
                            {mentor.reviewCount !== undefined && (
                              <span className={styles.reviewCount}>({mentor.reviewCount} avis)</span>
                            )}
                          </div>

                          {/* Bio courte */}
                          {mentor.bio && (
                            <p className={styles.mentorBio}>
                              {mentor.bio.length > 100 ? `${mentor.bio.substring(0, 100)}...` : mentor.bio}
                            </p>
                          )}

                          {/* Tags */}
                          <div className={styles.tagsList}>
                            {mentor.expertiseTags.slice(0, 3).map((tag) => (
                              <span key={tag} className={styles.skillTag}>{tag}</span>
                            ))}
                            {mentor.expertiseTags.length > 3 && (
                              <span className={styles.moreTagsBadge}>+{mentor.expertiseTags.length - 3}</span>
                            )}
                          </div>

                          {/* Footer */}
                          <div className={styles.mentorFooter}>
                            <div className={styles.priceInfo}>
                              {mentor.hourlyRate ? (
                                <>
                                  <span className={styles.priceAmount}>{mentor.hourlyRate} €</span>
                                  <span className={styles.priceUnit}>/heure</span>
                                </>
                              ) : (
                                <span className={styles.priceNegotiable}>Sur devis</span>
                              )}
                            </div>
                            <span className={styles.viewProfileLink}>
                              Voir profil <Icons.ChevronRight />
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>

                {nextCursor && (
                  <div className={styles.loadMoreContainer}>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => void fetchResults(nextCursor)}
                      isLoading={loadingMore}
                    >
                      Voir plus de mentors
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className={styles.drawerBackdrop} onClick={() => setDrawerOpen(false)}>
          <aside className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h2>Filtres</h2>
              <button className={styles.drawerClose} onClick={() => setDrawerOpen(false)}>
                <Icons.X />
              </button>
            </div>
            <div className={styles.drawerContent}>
              {facetsLoading ? (
                <p className={styles.drawerLoading}>Chargement des filtres...</p>
              ) : (
                renderFilterPanel()
              )}
            </div>
            <div className={styles.drawerFooter}>
              <Button fullWidth size="lg" onClick={() => setDrawerOpen(false)}>
                Voir {total} résultat{total > 1 ? 's' : ''}
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
