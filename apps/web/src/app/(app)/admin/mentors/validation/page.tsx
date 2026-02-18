import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { MentorValidationBoard } from '@/features/admin/mentor-validation';

export default async function AdminMentorValidationPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/admin/mentors/validation');
  }

  if (!session.user.roles.includes('admin') && !session.user.roles.includes('support')) {
    redirect('/dashboard');
  }

  return <MentorValidationBoard accessToken={session.accessToken} />;
}
