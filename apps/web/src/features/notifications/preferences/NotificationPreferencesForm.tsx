'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './NotificationPreferencesForm.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const CHANNELS = ['email', 'push', 'in_app'] as const;
const CATEGORIES = ['messages', 'rdv', 'system'] as const;

type Channel = (typeof CHANNELS)[number];
type Category = (typeof CATEGORIES)[number];

type Preference = {
  channel: Channel;
  category: Category;
  enabled: boolean;
};

interface Props {
  accessToken: string;
}

export function NotificationPreferencesForm({ accessToken }: Props) {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`${API_URL}/users/me/notification-preferences`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });
        const result = await response.json();

        if (!response.ok || result.error) {
          setError(result.error?.message || 'Erreur lors du chargement des preferences');
          return;
        }

        setPreferences(result.data.preferences || []);
      } catch {
        setError('Erreur de connexion au serveur');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [accessToken]);

  const grouped = useMemo(() => {
    return CATEGORIES.map((category) => ({
      category,
      items: CHANNELS.map((channel) => {
        const current = preferences.find(
          (item) => item.category === category && item.channel === channel,
        );
        return {
          category,
          channel,
          enabled: current?.enabled ?? true,
        };
      }),
    }));
  }, [preferences]);

  const togglePreference = (category: Category, channel: Channel, enabled: boolean) => {
    setPreferences((previous) => {
      const index = previous.findIndex(
        (item) => item.category === category && item.channel === channel,
      );

      if (index === -1) {
        return [...previous, { category, channel, enabled }];
      }

      const next = [...previous];
      next[index] = { ...next[index], enabled };
      return next;
    });
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/users/me/notification-preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ preferences }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        setError(result.error?.message || 'Erreur lors de la sauvegarde');
        return;
      }

      setPreferences(result.data.preferences || []);
      setSuccess('Preferences enregistrees avec succes');
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>Chargement...</div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Preferences de notifications</h1>
          <Link href="/dashboard" className={styles.backLink}>
            Retour
          </Link>
        </div>

        <p className={styles.subtitle}>
          Activez ou desactivez les canaux par categorie (messages, rendez-vous, systeme).
        </p>

        {error && (
          <div className={styles.error} role="alert" aria-live="assertive">
            {error}
          </div>
        )}
        {success && (
          <div className={styles.success} role="status" aria-live="polite">
            {success}
          </div>
        )}

        <div className={styles.groups}>
          {grouped.map((group) => (
            <section key={group.category} className={styles.group}>
              <h2 className={styles.groupTitle}>{group.category}</h2>
              <div className={styles.groupGrid}>
                {group.items.map((item) => {
                  const id = `${item.category}-${item.channel}`;
                  return (
                    <label key={id} htmlFor={id} className={styles.toggleRow}>
                      <span>{item.channel}</span>
                      <input
                        id={id}
                        type="checkbox"
                        aria-label={`${item.category}-${item.channel}`}
                        checked={item.enabled}
                        onChange={(event) =>
                          togglePreference(item.category, item.channel, event.target.checked)
                        }
                        disabled={saving}
                      />
                    </label>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <button
          type="button"
          className={styles.saveButton}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer mes preferences'}
        </button>
      </div>
    </main>
  );
}
