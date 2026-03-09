'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import styles from './SessionNotesEditor.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Note {
  id: string;
  role: 'student' | 'mentor';
  content: string;
  author_id: string;
  updated_at: string;
}

interface Props {
  accessToken: string;
  bookingId: string;
  userId: string;
}

export function SessionNotesEditor({ accessToken, bookingId, userId }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [myContent, setMyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/sessions/${bookingId}/notes`, {
        headers,
        cache: 'no-store',
      });
      const result = await res.json();
      if (res.ok && !result.error) {
        const loaded = (result.data as Note[]) ?? [];
        setNotes(loaded);
        const myNote = loaded.find((n) => n.author_id === userId);
        if (myNote) setMyContent(myNote.content);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, bookingId, userId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const saveNote = async () => {
    if (!myContent.trim()) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/sessions/${bookingId}/notes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: myContent }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || 'Impossible de sauvegarder la note');
        return;
      }
      setSuccess('Note sauvegardee');
      void loadNotes();
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const otherNotes = notes.filter((n) => n.author_id !== userId);

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Ma note</h3>
        {error && <div className={styles.error} role="alert">{error}</div>}
        {success && <div className={styles.success} role="status">{success}</div>}
        <textarea
          className={styles.textarea}
          value={myContent}
          onChange={(e) => setMyContent(e.target.value)}
          placeholder="Ecrivez vos notes sur cette session (max 2000 caracteres)..."
          maxLength={2000}
          rows={6}
          aria-label="Ma note de session"
          disabled={loading || saving}
        />
        <div className={styles.charCount}>{myContent.length}/2000</div>
        <Button
          type="button"
          size="sm"
          onClick={() => void saveNote()}
          isLoading={saving}
          disabled={!myContent.trim() || saving}
        >
          Sauvegarder
        </Button>
      </div>

      {otherNotes.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Note de l&apos;autre participant</h3>
          {otherNotes.map((note) => (
            <div key={note.id} className={styles.noteCard}>
              <p className={styles.noteRole}>{note.role === 'mentor' ? 'Mentor' : 'Etudiant'}</p>
              <p className={styles.noteContent}>{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
