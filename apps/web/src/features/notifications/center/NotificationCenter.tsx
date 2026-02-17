'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import styles from './NotificationCenter.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Category = 'messages' | 'rdv' | 'system';

interface NotificationItem {
  notificationId: string;
  category: Category;
  channel: string;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

interface Props {
  accessToken: string;
}

const CATEGORY_LABELS: Record<Category | 'all', string> = {
  all: 'Toutes',
  messages: 'Messages',
  rdv: 'Rendez-vous',
  system: 'Systeme',
};

export function NotificationCenter({ accessToken }: Props) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('category', filter);

      const res = await fetch(`${API_URL}/notifications?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error?.message || 'Impossible de charger les notifications');
        return;
      }
      const data = result.data as { notifications?: NotificationItem[] };
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const result = await res.json();
      if (res.ok && !result.error) {
        setUnreadCount((result.data as { unreadCount: number }).unreadCount);
      }
    } catch {
      // silent
    }
  }, [accessToken]);

  useEffect(() => {
    void loadNotifications();
    void loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.notificationId === notificationId
              ? { ...n, readAt: new Date().toISOString() }
              : n,
          ),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      // silent
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })),
        );
        setUnreadCount(0);
      }
    } catch {
      // silent
    }
  };

  return (
    <section className={styles.container} aria-labelledby="notifications-title">
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <h1 id="notifications-title" className={styles.title}>
            Notifications
            {unreadCount > 0 && (
              <span className={styles.badge} aria-label={`${unreadCount} non lues`}>
                {unreadCount}
              </span>
            )}
          </h1>
          {unreadCount > 0 && (
            <Button type="button" variant="ghost" onClick={() => void markAllAsRead()}>
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </header>

      {error && (
        <div className={styles.error} role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      <nav className={styles.filters} aria-label="Filtres de notifications">
        {(Object.keys(CATEGORY_LABELS) as (Category | 'all')[]).map((cat) => (
          <button
            key={cat}
            type="button"
            className={filter === cat ? styles.filterActive : styles.filterButton}
            onClick={() => setFilter(cat)}
            aria-current={filter === cat ? 'true' : undefined}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle>{CATEGORY_LABELS[filter]}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className={styles.skeletonList} aria-busy="true" aria-live="polite">
              <div className={styles.skeletonItem} />
              <div className={styles.skeletonItem} />
              <div className={styles.skeletonItem} />
            </div>
          ) : notifications.length === 0 ? (
            <p className={styles.empty} aria-live="polite">
              Aucune notification.
            </p>
          ) : (
            <ul className={styles.notificationList} role="list">
              {notifications.map((n) => (
                <li
                  key={n.notificationId}
                  className={n.readAt ? styles.notificationRead : styles.notificationUnread}
                >
                  <div className={styles.notificationContent}>
                    <span className={styles.categoryTag} data-category={n.category}>
                      {CATEGORY_LABELS[n.category as Category] || n.category}
                    </span>
                    <strong className={styles.notificationTitle}>{n.title}</strong>
                    <p className={styles.notificationMessage}>{n.message}</p>
                    <time className={styles.notificationTime} dateTime={n.createdAt}>
                      {new Date(n.createdAt).toLocaleString('fr-FR')}
                    </time>
                  </div>
                  {!n.readAt && (
                    <button
                      type="button"
                      className={styles.markReadButton}
                      onClick={() => void markAsRead(n.notificationId)}
                      aria-label="Marquer comme lu"
                    >
                      Marquer lu
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
