import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { ConsentManagement } from '@/features/settings/consent';

export default async function ConsentPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/consentement');
  }

  return <ConsentManagement accessToken={session.accessToken} />;
}
