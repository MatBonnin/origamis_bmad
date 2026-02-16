import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { MentorSettings } from '@/features/mentors/settings';

export default async function MentorSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/mentors/profil');
  }

  return <MentorSettings accessToken={session.accessToken} />;
}
