'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import styles from './MentorValidationBoard.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type PendingMentor = {
  mentorId: string;
  fullName: string;
  email: string;
  domain: string;
  status: 'pending_review' | 'validated' | 'rejected';
  notes: string;
  updatedAt: string;
};

interface Props {
  accessToken: string;
}

export function MentorValidationBoard({ accessToken }: Props) {
  const [mentors, setMentors] = useState<PendingMentor[]>([]);
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [error, setError] = useState('');
  const [liveMessage, setLiveMessage] = useState('');

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }),
    [accessToken],
  );

  const loadMentors = async () => {
    setError('');

    const response = await fetch(`${API_URL}/mentors/pending`, {
      headers,
      cache: 'no-store',
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      setError(result.error?.message || 'Impossible de charger les mentors en attente');
      setMentors([]);
      return;
    }

    const nextMentors = (result.data.mentors ?? []) as PendingMentor[];
    setMentors(nextMentors);
    setSelectedMentorId((current) => current || nextMentors[0]?.mentorId || '');
  };

  useEffect(() => {
    void loadMentors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedMentor = mentors.find((mentor) => mentor.mentorId === selectedMentorId) ?? null;

  const submitValidation = async (mentorId: string, action: 'validated' | 'rejected') => {
    setError('');

    const notes =
      window.prompt(
        action === 'validated' ? 'Notes de validation' : 'Raison du rejet',
        action === 'validated' ? 'Profil valide' : 'Informations complementaires requises',
      ) ?? '';

    const response = await fetch(
      action === 'validated'
        ? `${API_URL}/mentors/${mentorId}/validate`
        : `${API_URL}/mentors/${mentorId}/status`,
      {
        method: action === 'validated' ? 'POST' : 'PATCH',
        headers,
        body: JSON.stringify(
          action === 'validated'
            ? { notes }
            : {
              status: 'rejected',
              notes,
            },
        ),
      },
    );

    const result = await response.json();

    if (!response.ok || result.error) {
      setError(result.error?.message || 'Action impossible');
      return;
    }

    setLiveMessage(action === 'validated' ? 'Mentor valide' : 'Mentor rejete');
    await loadMentors();
  };

  return (
    <section className={styles.container} aria-labelledby="mentor-validation-title">
      <header className={styles.header}>
        <h1 id="mentor-validation-title" className={styles.title}>Validation des mentors</h1>
        <p className={styles.subtitle}>Traitez les profils en attente et gardez la tracabilite des decisions.</p>
      </header>

      <p className={styles.srOnly} aria-live="polite">{liveMessage}</p>

      {error && <div className={styles.error} role="alert">{error}</div>}

      <div className={styles.layout}>
        <div className={styles.list}>
          {mentors.length === 0 && (
            <Card>
              <CardContent>
                <p className={styles.empty}>Aucun mentor en attente de validation.</p>
              </CardContent>
            </Card>
          )}

          {mentors.map((mentor) => (
            <Card key={mentor.mentorId} variant={mentor.mentorId === selectedMentorId ? 'elevated' : 'outlined'}>
              <CardHeader className={styles.cardHeader}>
                <CardTitle>{mentor.fullName}</CardTitle>
                <span className={styles.badge}>{mentor.status}</span>
              </CardHeader>
              <CardContent>
                <p className={styles.meta}>{mentor.domain}</p>
                <p className={styles.meta}>{mentor.email}</p>
                <Button type="button" size="sm" variant="outline" onClick={() => setSelectedMentorId(mentor.mentorId)}>
                  Previsualiser
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Apercu du profil</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedMentor && (
              <p className={styles.empty}>Selectionnez un mentor pour afficher les details.</p>
            )}
            {selectedMentor && (
              <>
                <p className={styles.previewName}>{selectedMentor.fullName}</p>
                <p className={styles.meta}>Domaine: {selectedMentor.domain}</p>
                <p className={styles.meta}>Email: {selectedMentor.email}</p>
                <p className={styles.meta}>Derniere mise a jour: {new Date(selectedMentor.updatedAt).toLocaleString('fr-FR')}</p>
                <p className={styles.notes}>Notes: {selectedMentor.notes || 'Aucune note'}</p>
                <div className={styles.actions}>
                  <Button type="button" onClick={() => void submitValidation(selectedMentor.mentorId, 'validated')}>
                    Valider
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void submitValidation(selectedMentor.mentorId, 'rejected')}
                  >
                    Rejeter
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
