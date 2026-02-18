import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { StudentProgression } from '@/features/milestones';
import { MentorProgression } from '@/features/mentors/progression';

export default async function ProjetsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/projets');
  }

  if (session.user.roles.includes('mentor') && !session.user.roles.includes('etudiant')) {
    return <MentorProgression accessToken={session.accessToken} studentId={session.user.id} />;
  }

  return (
    <StudentProgression
      accessToken={session.accessToken}
      userId={session.user.id}
    />
  );
}
