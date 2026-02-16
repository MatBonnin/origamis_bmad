import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { MentorProfile } from '@/features/mentors/profile';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MentorProfilePage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/connexion?callbackUrl=/mentors');
  }

  const { id } = await params;
  return <MentorProfile accessToken={session.accessToken} mentorId={id} />;
}
