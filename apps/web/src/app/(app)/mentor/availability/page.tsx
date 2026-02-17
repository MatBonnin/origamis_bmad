import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AvailabilityManager } from '@/features/mentors/availability';

export default async function MentorAvailabilityPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/mentor/availability');
  }

  if (!session.user.roles.includes('mentor')) {
    redirect('/dashboard');
  }

  return <AvailabilityManager accessToken={session.accessToken} />;
}
