'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Select } from '@/components/ui';
import { SelectableCard } from '@/features/onboarding/components/SelectableCard';
import { objectives } from '@/features/onboarding/constants/objectives';
import { domains, levels, graduationYears } from '@/features/onboarding/constants/academicOptions';
import styles from './NeedsForm.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface UserNeeds {
  objectives: string[];
  domain: string | null;
  level: string | null;
  graduationYear: string | null;
  updatedAt: string;
}

export function NeedsForm() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [needs, setNeeds] = useState<UserNeeds | null>(null);
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);
  const [domain, setDomain] = useState('');
  const [level, setLevel] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/connexion?callbackUrl=/besoins');
    }
  }, [status, router]);

  const loadNeeds = useCallback(async () => {
    if (!session?.accessToken) return;

    try {
      const response = await fetch(`${API_URL}/users/me/needs`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setFeedback({ type: 'error', message: result.error?.message || 'Erreur lors du chargement' });
        return;
      }

      const data = result.data as UserNeeds;
      setNeeds(data);
      setSelectedObjectives(data.objectives || []);
      setDomain(data.domain || '');
      setLevel(data.level || '');
      setGraduationYear(data.graduationYear || '');
    } catch {
      setFeedback({ type: 'error', message: 'Erreur de connexion au serveur' });
    } finally {
      setIsLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (session?.accessToken) {
      loadNeeds();
    }
  }, [session?.accessToken, loadNeeds]);

  const handleToggleObjective = (id: string) => {
    setSelectedObjectives((prev) =>
      prev.includes(id)
        ? prev.filter((o) => o !== id)
        : [...prev, id],
    );
  };

  const handleSave = async () => {
    if (!session?.accessToken) return;

    setIsSaving(true);
    setFeedback(null);

    try {
      const payload: Record<string, unknown> = {
        objectives: selectedObjectives,
      };
      if (domain) payload.domain = domain;
      if (level) payload.level = level;
      if (graduationYear) payload.graduationYear = graduationYear;

      const response = await fetch(`${API_URL}/users/me/needs`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setFeedback({ type: 'error', message: result.error?.message || 'Erreur lors de la sauvegarde' });
        return;
      }

      const data = result.data as UserNeeds;
      setNeeds(data);
      setFeedback({ type: 'success', message: 'Vos besoins ont ete mis a jour avec succes' });
    } catch {
      setFeedback({ type: 'error', message: 'Erreur de connexion au serveur' });
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  return (
    <div className={styles.container}>
      <div>
        <h1 className={styles.title}>Mes besoins</h1>
        <p className={styles.subtitle}>
          Modifiez vos besoins pour adapter vos recommandations de mentors
        </p>
      </div>

      {feedback && (
        <div
          className={feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError}
          role="status"
          aria-live="polite"
        >
          {feedback.message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Objectifs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={styles.sectionHint}>
            Selectionnez vos objectifs d&apos;accompagnement (au moins 1)
          </p>
          <div className={styles.grid}>
            {objectives.map((objective) => (
              <SelectableCard
                key={objective.id}
                id={objective.id}
                label={objective.label}
                description={objective.description}
                selected={selectedObjectives.includes(objective.id)}
                onToggle={handleToggleObjective}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parcours academique</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.selectRow}>
            <div className={styles.field}>
              <Select
                id="needs-domain"
                label="Domaine"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Selectionnez un domaine"
                options={domains.map((d) => ({ value: d.value, label: d.label }))}
              />
            </div>
            <div className={styles.field}>
              <Select
                id="needs-level"
                label="Niveau"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="Selectionnez un niveau"
                options={levels.map((l) => ({ value: l.value, label: l.label }))}
              />
            </div>
            <div className={styles.field}>
              <Select
                id="needs-year"
                label="Annee de diplomation"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                placeholder="Selectionnez une annee"
                options={graduationYears.map((y) => ({ value: y.value, label: y.label }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className={styles.actions}>
        <Button onClick={handleSave} disabled={isSaving || selectedObjectives.length === 0}>
          {isSaving ? 'Enregistrement...' : 'Enregistrer mes besoins'}
        </Button>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          Retour au tableau de bord
        </Button>
      </div>
    </div>
  );
}
