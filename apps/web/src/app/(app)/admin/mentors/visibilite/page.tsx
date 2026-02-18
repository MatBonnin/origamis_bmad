import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { MentorVisibilityBoard } from '@/features/admin/visibility';

export default async function AdminMentorVisibilityPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/admin/mentors/visibilite');
  }

  if (!session.user.roles.includes('admin') && !session.user.roles.includes('support')) {
    redirect('/dashboard');
  }

  return <MentorVisibilityBoard accessToken={session.accessToken} />;
}
