import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { SupportIncidentsBoard } from '@/features/support/incidents';

export default async function AdminIncidentsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/admin/incidents');
  }

  if (!session.user.roles.includes('admin') && !session.user.roles.includes('support')) {
    redirect('/dashboard');
  }

  return <SupportIncidentsBoard accessToken={session.accessToken} />;
}
