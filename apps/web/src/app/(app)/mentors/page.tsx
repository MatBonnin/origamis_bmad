import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { MentorSearch } from '@/features/mentors/search';

export default async function MentorsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/mentors');
  }

  return <MentorSearch accessToken={session.accessToken} />;
}
