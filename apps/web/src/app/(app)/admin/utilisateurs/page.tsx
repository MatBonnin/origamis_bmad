import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AdminUsersManager } from '@/features/admin/users/AdminUsersManager';

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/admin/utilisateurs');
  }

  if (!session.user.roles.includes('admin')) {
    redirect('/dashboard');
  }

  return <AdminUsersManager accessToken={session.accessToken} currentUserId={session.user.id} />;
}
