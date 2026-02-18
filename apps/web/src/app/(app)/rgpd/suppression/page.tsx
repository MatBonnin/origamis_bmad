import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { RgpdDeletionManager } from '@/features/rgpd/deletion';

export default async function RgpdSuppressionPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/rgpd/suppression');
  }

  return (
    <RgpdDeletionManager
      accessToken={session.accessToken}
      userId={session.user.id}
      isAdmin={session.user.roles.includes('admin')}
    />
  );
}
