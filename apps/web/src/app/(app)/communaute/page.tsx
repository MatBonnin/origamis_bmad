import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { CommunityFeed } from '@/features/community';

export default async function CommunautePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/communaute');
  }

  return (
    <CommunityFeed
      accessToken={session.accessToken}
      userId={session.user.id}
    />
  );
}
