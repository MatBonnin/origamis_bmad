import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { MentorRecommendations } from '@/features/mentors/recommendations';

export default async function MentorsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/mentors');
  }

  return <MentorRecommendations accessToken={session.accessToken} />;
}
