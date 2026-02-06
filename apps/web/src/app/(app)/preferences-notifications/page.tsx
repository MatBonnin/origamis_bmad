import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { NotificationPreferencesForm } from '@/features/notifications/preferences/NotificationPreferencesForm';

export default async function NotificationPreferencesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/preferences-notifications');
  }

  return <NotificationPreferencesForm accessToken={session.accessToken} />;
}
