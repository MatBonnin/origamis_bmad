import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { SessionHistory } from '@/features/sessions';

export default async function SessionsHistoryPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/sessions/history');
  }

  return (
    <SessionHistory
      accessToken={session.accessToken}
      userId={session.user.id}
    />
  );
}
