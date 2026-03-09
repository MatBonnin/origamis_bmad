import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { MentorProgramsBoard } from '@/features/mentors/workflows';

export default async function MentorProgramsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/mentor/programs');
  }

  if (!session.user.roles.includes('mentor')) {
    redirect('/dashboard');
  }

  return <MentorProgramsBoard accessToken={session.accessToken} />;
}

