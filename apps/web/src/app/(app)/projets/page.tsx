import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { StudentProgression } from '@/features/milestones';

export default async function ProjetsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/projets');
  }

  if (session.user.roles.includes('mentor') && !session.user.roles.includes('etudiant')) {
    redirect('/mentor/programs');
  }

  return (
    <StudentProgression
      accessToken={session.accessToken}
      userId={session.user.id}
    />
  );
}
