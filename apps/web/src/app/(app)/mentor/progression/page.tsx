import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { MentorProgression } from '@/features/mentors/progression';

type Props = {
  searchParams: Promise<{ studentId?: string }>;
};

export default async function MentorProgressionPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/mentor/progression');
  }

  if (!session.user.roles.includes('mentor')) {
    redirect('/dashboard');
  }

  const { studentId } = await searchParams;

  if (!studentId) {
    return (
      <section>
        <h1>Suivi mentor</h1>
        <p>Ajoutez un parametre `studentId` dans l URL pour consulter la progression d un etudiant.</p>
      </section>
    );
  }

  return (
    <MentorProgression
      accessToken={session.accessToken}
      studentId={studentId}
    />
  );
}
