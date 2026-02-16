'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { objectives as allObjectives } from '../constants/objectives';
import { SelectableCard } from './SelectableCard';
import styles from './ProfileSuggestion.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Suggestion {
  level: string;
  objectives: string[];
  bio: string;
}

interface ProfileSuggestionProps {
  accessToken: string;
}

const LEVEL_LABELS: Record<string, string> = {
  debutant: 'Debutant',
  intermediaire: 'Intermediaire',
  avance: 'Avance',
};

export function ProfileSuggestion({ accessToken }: ProfileSuggestionProps) {
  const router = useRouter();
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSuggestion, setEditedSuggestion] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    async function loadSuggestion() {
      try {
        const response = await fetch(`${API_URL}/onboarding/profile-suggestion`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });
        const result = await response.json();

        if (!response.ok || result.error) {
          setError(result.error?.message || 'Erreur lors du chargement de la suggestion');
          return;
        }

        setSuggestion(result.data.suggestion);
        setEditedSuggestion(result.data.suggestion);
        setAccepted(result.data.accepted);
      } catch {
        setError('Erreur de connexion au serveur');
      } finally {
        setLoading(false);
      }
    }

    loadSuggestion();
  }, [accessToken]);

  const handleAccept = useCallback(async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/onboarding/profile-suggestion/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error?.message || 'Erreur lors de l acceptation');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setSubmitting(false);
    }
  }, [accessToken, router]);

  const handleModify = useCallback(async () => {
    if (!editedSuggestion) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/onboarding/profile-suggestion`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(editedSuggestion),
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error?.message || 'Erreur lors de la modification');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setSubmitting(false);
    }
  }, [accessToken, editedSuggestion, router]);

  const handleToggleObjective = useCallback((id: string) => {
    setEditedSuggestion((prev) => {
      if (!prev) return prev;
      const isSelected = prev.objectives.includes(id);
      const newObjectives = isSelected
        ? prev.objectives.filter((o) => o !== id)
        : [...prev.objectives, id];
      return { ...prev, objectives: newObjectives };
    });
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Chargement de votre suggestion...</p>
      </div>
    );
  }

  if (accepted) {
    router.push('/dashboard');
    return null;
  }

  if (!suggestion) {
    return (
      <div className={styles.container}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <p>Aucune suggestion disponible.</p>
        <Button onClick={() => router.push('/dashboard')}>
          Aller au dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Votre profil suggere</h1>
      <p className={styles.subtitle}>
        Sur la base de vos reponses, nous avons prepare un profil pour vous.
        Vous pouvez l accepter tel quel ou le modifier.
      </p>

      {error && (
        <p className={styles.error} role="alert" aria-live="assertive">
          {error}
        </p>
      )}

      {!isEditing ? (
        <>
          <Card variant="elevated" className={styles.suggestionCard}>
            <CardHeader>
              <CardTitle>Profil suggere</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className={styles.details}>
                <dt>Niveau</dt>
                <dd>{LEVEL_LABELS[suggestion.level] || suggestion.level}</dd>
                <dt>Objectifs</dt>
                <dd>
                  {suggestion.objectives
                    .map((id) => {
                      const obj = allObjectives.find((o) => o.id === id);
                      return obj ? obj.label : id;
                    })
                    .join(', ')}
                </dd>
                <dt>Bio</dt>
                <dd>{suggestion.bio}</dd>
              </dl>
            </CardContent>
          </Card>

          <div className={styles.actions}>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsEditing(true)}
              disabled={submitting}
            >
              Modifier
            </Button>
            <Button
              size="lg"
              onClick={handleAccept}
              isLoading={submitting}
            >
              Accepter
            </Button>
          </div>
        </>
      ) : (
        <>
          <Card variant="elevated" className={styles.suggestionCard}>
            <CardHeader>
              <CardTitle>Modifier votre profil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.editForm}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Niveau</span>
                  <select
                    className={styles.select}
                    value={editedSuggestion?.level || ''}
                    onChange={(e) =>
                      setEditedSuggestion((prev) =>
                        prev ? { ...prev, level: e.target.value } : prev,
                      )
                    }
                  >
                    <option value="debutant">Debutant</option>
                    <option value="intermediaire">Intermediaire</option>
                    <option value="avance">Avance</option>
                  </select>
                </label>

                <div className={styles.objectivesSection}>
                  <span className={styles.fieldLabel}>Objectifs</span>
                  <div className={styles.objectivesGrid}>
                    {allObjectives.map((objective) => (
                      <SelectableCard
                        key={objective.id}
                        id={objective.id}
                        label={objective.label}
                        selected={editedSuggestion?.objectives.includes(objective.id) ?? false}
                        onToggle={handleToggleObjective}
                      />
                    ))}
                  </div>
                </div>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Bio</span>
                  <Input
                    value={editedSuggestion?.bio || ''}
                    onChange={(e) =>
                      setEditedSuggestion((prev) =>
                        prev ? { ...prev, bio: e.target.value } : prev,
                      )
                    }
                  />
                </label>
              </div>
            </CardContent>
          </Card>

          <div className={styles.actions}>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setIsEditing(false);
                setEditedSuggestion(suggestion);
              }}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              size="lg"
              onClick={handleModify}
              isLoading={submitting}
            >
              Valider les modifications
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
