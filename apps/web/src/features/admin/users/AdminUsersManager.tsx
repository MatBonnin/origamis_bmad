'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './AdminUsersManager.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const ROLE_OPTIONS = ['etudiant', 'mentor', 'admin', 'support'] as const;

type UserStatus = 'active' | 'suspended' | 'deleted';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  status: UserStatus;
  rgpdSync: boolean;
  auditCount: number;
}

interface ApiResponse<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } | null;
}

interface AdminUsersManagerProps {
  accessToken: string;
  currentUserId: string;
}

export function AdminUsersManager({ accessToken, currentUserId }: AdminUsersManagerProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | (typeof ROLE_OPTIONS)[number]>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');

  const loadUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const query = new URLSearchParams();
      if (roleFilter !== 'all') query.set('role', roleFilter);
      if (statusFilter !== 'all') query.set('status', statusFilter);

      const response = await fetch(`${API_URL}/users?${query.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      });

      const result: ApiResponse<{ users: AdminUser[] }> = await response.json();

      if (!response.ok || result.error) {
        setError(result.error?.message || 'Erreur lors du chargement des utilisateurs');
        return;
      }

      setUsers(result.data?.users || []);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, roleFilter, statusFilter]);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),
    [users],
  );

  const toggleRole = (userId: string, role: string, checked: boolean) => {
    setError('');
    setSuccess('');

    setUsers((previousUsers) =>
      previousUsers.map((user) => {
        if (user.id !== userId) {
          return user;
        }

        const nextRoles = checked
          ? Array.from(new Set([...user.roles, role]))
          : user.roles.filter((currentRole) => currentRole !== role);

        if (nextRoles.length === 0) {
          return user;
        }

        return { ...user, roles: nextRoles };
      }),
    );
  };

  const saveRoles = async (user: AdminUser) => {
    setError('');
    setSuccess('');
    setSavingUserId(user.id);

    try {
      const response = await fetch(`${API_URL}/users/${user.id}/roles`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ roles: user.roles }),
      });

      const result: ApiResponse<{ user: AdminUser }> = await response.json();

      if (!response.ok || result.error) {
        setError(result.error?.message || 'Erreur lors de la mise a jour des roles');
        return;
      }

      setUsers((previousUsers) =>
        previousUsers.map((existing) =>
          existing.id === user.id ? result.data!.user : existing,
        ),
      );
      setSuccess(`Roles de ${user.firstName} ${user.lastName} mis a jour`);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setSavingUserId(null);
    }
  };

  const updateStatus = async (user: AdminUser, status: UserStatus) => {
    setError('');
    setSuccess('');
    setSavingUserId(user.id);

    try {
      const response = await fetch(`${API_URL}/users/${user.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status }),
      });

      const result: ApiResponse<{ user: AdminUser }> = await response.json();

      if (!response.ok || result.error) {
        setError(result.error?.message || 'Erreur lors de la mise a jour du statut');
        return;
      }

      setUsers((previousUsers) =>
        previousUsers.map((existing) =>
          existing.id === user.id ? result.data!.user : existing,
        ),
      );
      setSuccess(`Statut de ${user.firstName} ${user.lastName} mis a jour`);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setSavingUserId(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.main}>
        <div className={styles.container}>Chargement...</div>
      </div>
    );
  }

  return (
    <div className={styles.main}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Administration des comptes</h1>
          <Link href="/dashboard" className={styles.backLink}>
            Retour au dashboard
          </Link>
        </div>

        <p className={styles.subtitle}>Attribuez les roles et gelez/reactivez des comptes avec audit.</p>

        <div className={styles.filters}>
          <label>
            Role
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as 'all' | (typeof ROLE_OPTIONS)[number])}>
              <option value="all">all</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | UserStatus)}>
              <option value="all">all</option>
              <option value="active">active</option>
              <option value="suspended">suspended</option>
              <option value="deleted">deleted</option>
            </select>
          </label>
        </div>

        {error && <div className={styles.error} role="alert">{error}</div>}
        {success && <div className={styles.success} role="status">{success}</div>}

        <div className={styles.table}>
          {sortedUsers.map((user) => {
            const isCurrentAdmin = user.id === currentUserId;

            return (
              <section key={user.id} className={styles.row}>
                <div className={styles.userInfo}>
                  <p className={styles.userName}>{user.firstName} {user.lastName}</p>
                  <p className={styles.userEmail}>{user.email}</p>
                  <p className={styles.userMeta}>status: {user.status} | rgpdSync: {String(user.rgpdSync)} | audits: {user.auditCount}</p>
                </div>

                <div className={styles.roles}>
                  {ROLE_OPTIONS.map((role) => (
                    <label key={role} className={styles.roleItem}>
                      <input
                        type="checkbox"
                        checked={user.roles.includes(role)}
                        onChange={(event) => toggleRole(user.id, role, event.target.checked)}
                        disabled={isCurrentAdmin || savingUserId === user.id}
                      />
                      {role}
                    </label>
                  ))}
                </div>

                <div className={styles.actions}>
                  <button
                    type="button"
                    onClick={() => saveRoles(user)}
                    className={styles.saveButton}
                    disabled={isCurrentAdmin || savingUserId === user.id}
                  >
                    {savingUserId === user.id ? 'Enregistrement...' : 'Enregistrer roles'}
                  </button>
                  <button type="button" className={styles.secondaryButton} onClick={() => void updateStatus(user, 'active')}>
                    Activer
                  </button>
                  <button type="button" className={styles.secondaryButton} onClick={() => void updateStatus(user, 'suspended')}>
                    Suspendre
                  </button>
                </div>
              </section>
            );
          })}
        </div>

        <p className={styles.note}>
          Note: un administrateur ne peut pas modifier ses propres roles.
        </p>
      </div>
    </div>
  );
}
