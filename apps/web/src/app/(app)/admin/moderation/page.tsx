import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { ModerationDashboard } from '@/features/admin/moderation';

export default async function AdminModerationPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/admin/moderation');
  }

  if (!session.user.roles.includes('admin')) {
    redirect('/dashboard');
  }

  return <ModerationDashboard accessToken={session.accessToken} />;
}
