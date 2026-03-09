import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { MentorRequestsBoard } from '@/features/mentors/workflows';

export default async function MentorRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/mentor/requests');
  }

  if (!session.user.roles.includes('mentor')) {
    redirect('/dashboard');
  }

  return <MentorRequestsBoard accessToken={session.accessToken} />;
}

