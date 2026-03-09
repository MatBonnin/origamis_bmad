'use client';

import { useCallback, useEffect, useState } from 'react';
import { Modal } from '@/components/ui';
import { SessionNotesEditor } from '../notes/SessionNotesEditor';
import styles from './PostSessionFeedbackModal.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Feedback {
  id: string;
  next_actions: string[];
  objectives_met: boolean;
  notes_for_student: string | null;
  submitted_by: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  accessToken: string;
  bookingId: string;
  userId: string;
  isMentor: boolean;
}

export function PostSessionFeedbackModal({
  open,
  onClose,
  accessToken,
  bookingId,
  userId,
  isMentor,
}: Props) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'feedback'>('notes');

  // Mentor feedback form state
  const [nextActions, setNextActions] = useState<string[]>(['']);
  const [objectivesMet, setObjectivesMet] = useState(false);
  const [notesForStudent, setNotesForStudent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  const loadFeedback = useCallback(async () => {
    setLoadingFeedback(true);
    try {
      const res = await fetch(`${API_URL}/sessions/${bookingId}/feedback`, {
        headers,
        cache: 'no-store',
      });
      const result = await res.json();
      if (res.ok && !result.error && result.data) {
        const fb = result.data as Feedback;
        setFeedback(fb);
        if (isMentor) {
          setNextActions(fb.next_actions.length > 0 ? fb.next_actions : ['']);
          setObjectivesMet(fb.objectives_met);
          setNotesForStudent(fb.notes_for_student ?? '');
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setLoadingFeedback(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, bookingId, isMentor]);

  useEffect(() => {
    if (open) void loadFeedback();
  }, [open, loadFeedback]);

  const submitFeedback = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/sessions/${bookingId}/feedback`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          nextActions: nextActions.filter((a) => a.trim()),
          objectivesMet,
          notesForStudent: notesForStudent || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || 'Impossible de soumettre le feedback');
        return;
      }
      setSuccess('Feedback soumis avec succes');
      void loadFeedback();
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const addAction = () => setNextActions((prev) => [...prev, '']);
  const updateAction = (idx: number, val: string) => {
    setNextActions((prev) => prev.map((a, i) => (i === idx ? val : a)));
  };
  const removeAction = (idx: number) => {
    setNextActions((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <Modal open={open} onClose={onClose} title="Notes &amp; Retours de session">
      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'notes'}
          className={activeTab === 'notes' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('notes')}
        >
          Notes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'feedback'}
          className={activeTab === 'feedback' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('feedback')}
        >
          Feedback
        </button>
      </div>

      {activeTab === 'notes' && (
        <SessionNotesEditor
          accessToken={accessToken}
          bookingId={bookingId}
          userId={userId}
        />
      )}

      {activeTab === 'feedback' && (
        <div className={styles.feedbackSection}>
          {!isMentor && feedback && (
            <div className={styles.feedbackDisplay}>
              <div className={styles.feedbackItem}>
                <strong>Objectifs atteints :</strong>{' '}
                <span>{feedback.objectives_met ? 'Oui' : 'Non'}</span>
              </div>
              {feedback.notes_for_student && (
                <div className={styles.feedbackItem}>
                  <strong>Message du mentor :</strong>
                  <p className={styles.feedbackText}>{feedback.notes_for_student}</p>
                </div>
              )}
              {feedback.next_actions.length > 0 && (
                <div className={styles.feedbackItem}>
                  <strong>Prochaines actions :</strong>
                  <ul className={styles.actionList}>
                    {feedback.next_actions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
              {!feedback && !loadingFeedback && (
                <p className={styles.noFeedback}>Aucun feedback disponible pour cette session.</p>
              )}
            </div>
          )}

          {isMentor && (
            <div className={styles.feedbackForm}>
              {error && <div className={styles.error} role="alert">{error}</div>}
              {success && <div className={styles.success} role="status">{success}</div>}

              <div className={styles.formField}>
                <label className={styles.label}>
                  <input
                    type="checkbox"
                    checked={objectivesMet}
                    onChange={(e) => setObjectivesMet(e.target.checked)}
                    className={styles.checkbox}
                  />
                  Objectifs atteints
                </label>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Message pour l&apos;etudiant</label>
                <textarea
                  className={styles.textarea}
                  value={notesForStudent}
                  onChange={(e) => setNotesForStudent(e.target.value)}
                  placeholder="Votre message pour l'etudiant..."
                  rows={4}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Prochaines actions</label>
                {nextActions.map((action, idx) => (
                  <div key={idx} className={styles.actionRow}>
                    <input
                      type="text"
                      className={styles.actionInput}
                      value={action}
                      onChange={(e) => updateAction(idx, e.target.value)}
                      placeholder={`Action ${idx + 1}`}
                    />
                    {nextActions.length > 1 && (
                      <button
                        type="button"
                        className={styles.removeAction}
                        onClick={() => removeAction(idx)}
                        aria-label={`Supprimer action ${idx + 1}`}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className={styles.addAction} onClick={addAction}>
                  + Ajouter une action
                </button>
              </div>

              <button
                type="button"
                className={styles.submitButton}
                onClick={() => void submitFeedback()}
                disabled={saving}
              >
                {saving ? 'Envoi...' : 'Soumettre le feedback'}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
