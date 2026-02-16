'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './AdminUsersManager.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const ROLE_OPTIONS = ['etudiant', 'mentor', 'admin', 'support'] as const;

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
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

  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch(`${API_URL}/admin/users`, {
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
    }

    loadUsers();
  }, [accessToken]);

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
      const response = await fetch(`${API_URL}/admin/users/${user.id}/roles`, {
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
          <h1 className={styles.title}>Administration des roles</h1>
          <Link href="/dashboard" className={styles.backLink}>
            Retour au dashboard
          </Link>
        </div>

        <p className={styles.subtitle}>Attribuez les roles etudiant, mentor, admin, support.</p>

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

                <button
                  type="button"
                  onClick={() => saveRoles(user)}
                  className={styles.saveButton}
                  disabled={isCurrentAdmin || savingUserId === user.id}
                >
                  {savingUserId === user.id ? 'Enregistrement...' : 'Enregistrer'}
                </button>
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
