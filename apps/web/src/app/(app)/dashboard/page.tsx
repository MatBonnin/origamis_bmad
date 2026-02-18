import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import styles from './page.module.css';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion');
  }

  return (
    <div className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>
          Bienvenue, {session.user.firstName} !
        </h1>
        <p className={styles.subtitle}>
          Vous êtes connecté en tant que {session.user.roles.join(', ')}.
        </p>

        <div className={styles.card}>
          <h2>Informations du profil</h2>
          <dl className={styles.info}>
            <dt>Nom complet</dt>
            <dd>{session.user.firstName} {session.user.lastName}</dd>
            <dt>Email</dt>
            <dd>{session.user.email}</dd>
            <dt>Rôle(s)</dt>
            <dd>{session.user.roles.join(', ')}</dd>
          </dl>

          <div className={styles.preferencesActions}>
            <Link href="/preferences-notifications" className={styles.preferencesLink}>
              Gerer mes preferences de notifications
            </Link>
          </div>

          {session.user.roles.includes('admin') && (
            <div className={styles.adminActions}>
              <Link href="/admin/utilisateurs" className={styles.adminLink}>
                Gerer les roles utilisateurs
              </Link>
              <Link href="/admin/mentors/validation" className={styles.adminLink}>
                Valider les mentors
              </Link>
              <Link href="/admin/mentors/visibilite" className={styles.adminLink}>
                Gerer la visibilite mentors
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
