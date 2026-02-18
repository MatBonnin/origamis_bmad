import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AnalyticsDashboard } from '@/features/analytics/dashboard';

export default async function AdminAnalyticsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/admin/analytics');
  }

  if (!session.user.roles.includes('admin') && !session.user.roles.includes('support')) {
    redirect('/dashboard');
  }

  return <AnalyticsDashboard accessToken={session.accessToken} />;
}
