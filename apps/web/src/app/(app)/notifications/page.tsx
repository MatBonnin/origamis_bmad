import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { NotificationCenter } from '@/features/notifications/center';

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/notifications');
  }

  return <NotificationCenter accessToken={session.accessToken} />;
}
