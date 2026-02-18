import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { MentorSearch } from '@/features/mentors/search';
import styles from './page.module.css';

export default async function MentorsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/mentors');
  }

  const isMentor = session.user.roles?.includes('mentor') ?? false;

  return (
    <div className={styles.container}>
      {isMentor && (
        <div className={styles.actions}>
          <Link href="/mentors/profil" className={styles.profileLink}>
            Configurer mon profil mentor
          </Link>
        </div>
      )}
      <MentorSearch accessToken={session.accessToken} />
    </div>
  );
}
