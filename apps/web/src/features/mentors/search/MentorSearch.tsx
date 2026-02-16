'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@/components/ui';
import styles from './MentorSearch.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const FILTERS_STORAGE_KEY = 'origami.mentors.search.filters';

interface MentorSearchItem {
  mentorId: string;
  firstName: string;
  lastName: string;
  domain: string;
  expertiseTags: string[];
  hourlyRate: number | null;
  rating: number;
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
  rating_thresholds: number[];
}

interface SearchFilters {
  domains?: string[];
  maxPrice?: number;
  minRating?: number;
  availability?: 'available' | 'all';
}

interface Props {
  accessToken: string;
}

const EMPTY_FILTERS: SearchFilters = {};

function safeParseFilters(serialized: string | null): SearchFilters {
  if (!serialized) {
    return EMPTY_FILTERS;
  }

  try {
    return JSON.parse(serialized) as SearchFilters;
  } catch {
    return EMPTY_FILTERS;
  }
}

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
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
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
    if (initial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError('');

    try {
      const params = new URLSearchParams({
        q: query,
        sort,
        limit: '6',
      });

      if (cursor) {
        params.set('cursor', cursor);
      }

      if (Object.keys(filters).length > 0) {
        params.set('filters', JSON.stringify(filters));
      }

      const response = await fetch(`${API_URL}/mentors/search?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
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
    const timeout = setTimeout(() => {
      void fetchResults();
    }, 250);

    return () => clearTimeout(timeout);
  }, [fetchResults]);

  const subtitle = useMemo(() => {
    if (loading) {
      return 'Recherche des mentors en cours...';
    }
    return `${total} mentor(s) trouve(s)`;
  }, [loading, total]);

  const domainValue = filters.domains?.[0] ?? '';
  const maxPriceValue = filters.maxPrice !== undefined ? String(filters.maxPrice) : '';
  const minRatingValue = filters.minRating !== undefined ? String(filters.minRating) : '';
  const onlyAvailable = filters.availability === 'available';

  const domainOptions = (facets?.domains ?? []).map((domain) => ({ value: domain, label: domain }));
  const ratingOptions = (facets?.rating_thresholds ?? []).map((threshold) => ({
    value: String(threshold),
    label: `${threshold}+`,
  }));
  const priceOptions = (facets?.price_ranges.presets ?? []).map((preset) => ({
    value: String(preset.max ?? 9999),
    label: preset.label,
  }));

  const activeFilters = [
    domainValue ? `Domaine: ${domainValue}` : '',
    maxPriceValue ? `Prix max: ${maxPriceValue} EUR/h` : '',
    minRatingValue ? `Note min: ${minRatingValue}` : '',
    onlyAvailable ? 'Disponible maintenant' : '',
  ].filter(Boolean);

  const renderFilterPanel = () => (
    <div className={styles.filtersContent}>
      <Select
        label="Domaine"
        name="domain"
        value={domainValue}
        options={domainOptions}
        placeholder="Tous les domaines"
        onChange={(event) => {
          const nextValue = event.target.value;
          setFilters((previous) => ({
            ...previous,
            domains: nextValue ? [nextValue] : undefined,
          }));
        }}
      />

      <Select
        label="Prix"
        name="price"
        value={maxPriceValue}
        options={priceOptions}
        placeholder="Tous les prix"
        onChange={(event) => {
          const nextValue = event.target.value;
          setFilters((previous) => ({
            ...previous,
            maxPrice: nextValue ? Number(nextValue) : undefined,
          }));
        }}
      />

      <Select
        label="Note minimale"
        name="rating"
        value={minRatingValue}
        options={ratingOptions}
        placeholder="Toutes les notes"
        onChange={(event) => {
          const nextValue = event.target.value;
          setFilters((previous) => ({
            ...previous,
            minRating: nextValue ? Number(nextValue) : undefined,
          }));
        }}
      />

      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={onlyAvailable}
          onChange={(event) => {
            setFilters((previous) => ({
              ...previous,
              availability: event.target.checked ? 'available' : undefined,
            }));
          }}
        />
        Uniquement les mentors disponibles
      </label>
    </div>
  );

  return (
    <section className={styles.container} aria-labelledby="mentors-search-title">
      <header className={styles.header}>
        <h1 id="mentors-search-title" className={styles.title}>Trouver un mentor</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </header>

      <div className={styles.searchRow}>
        <Input
          name="search"
          label="Recherche"
          placeholder="Rechercher par competence, domaine, bio..."
          aria-label="Rechercher un mentor"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <Select
          label="Tri"
          name="sort"
          value={sort}
          options={[
            { value: 'relevance', label: 'Pertinence' },
            { value: 'rating_desc', label: 'Note (desc)' },
            { value: 'price_asc', label: 'Prix croissant' },
            { value: 'price_desc', label: 'Prix decroissant' },
            { value: 'availability', label: 'Disponibilite' },
          ]}
          onChange={(event) => setSort(event.target.value)}
        />

        <Button
          type="button"
          variant="outline"
          className={styles.mobileFiltersButton}
          onClick={() => setDrawerOpen(true)}
        >
          Filtres
        </Button>
      </div>

      <div className={styles.layout}>
        <aside className={styles.filtersDesktop} aria-label="Panneau des filtres">
          {renderFilterPanel()}
          <Button
            type="button"
            variant="ghost"
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            Reinitialiser les filtres
          </Button>
        </aside>

        <div className={styles.results}>
          {activeFilters.length > 0 && (
            <div className={styles.chips} aria-label="Filtres actifs">
              {activeFilters.map((label) => (
                <span key={label} className={styles.chip}>{label}</span>
              ))}
            </div>
          )}

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          {!error && loading && (
            <div className={styles.loader} role="status" aria-live="polite">
              Chargement des mentors...
            </div>
          )}

          {!error && !loading && mentors.length === 0 && (
            <div className={styles.emptyState} role="status" aria-live="polite">
              Aucun mentor ne correspond a votre recherche.
            </div>
          )}

          <div className={styles.grid}>
            {mentors.map((mentor) => (
              <Card key={mentor.mentorId} variant="elevated" className={styles.card}>
                <CardHeader>
                  <CardTitle as="h2">{mentor.firstName} {mentor.lastName}</CardTitle>
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
                    <div>
                      <dt>Disponibilite</dt>
                      <dd>{mentor.isAvailable ? 'Disponible' : 'Indisponible'}</dd>
                    </div>
                  </dl>
                  <div className={styles.cardActions}>
                    <Link
                      href={`/mentors/${mentor.mentorId}`}
                      className={styles.profileLink}
                    >
                      <Button type="button" variant="secondary" fullWidth>
                        Voir profil
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {nextCursor && (
            <div className={styles.actions}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void fetchResults(nextCursor)}
                isLoading={loadingMore}
              >
                Charger plus de mentors
              </Button>
            </div>
          )}
        </div>
      </div>

      {drawerOpen && (
        <div className={`${styles.drawerBackdrop} ${styles.drawerVisible}`}>
          <aside className={styles.drawer} aria-label="Filtres mobiles">
            <div className={styles.drawerHeader}>
              <h2>Filtres</h2>
              <Button type="button" variant="ghost" onClick={() => setDrawerOpen(false)}>
                Fermer
              </Button>
            </div>
            {facetsLoading ? <p className={styles.drawerLoading}>Chargement des filtres...</p> : renderFilterPanel()}
            <Button type="button" variant="secondary" onClick={() => setDrawerOpen(false)}>
              Appliquer
            </Button>
          </aside>
        </div>
      )}
    </section>
  );
}
