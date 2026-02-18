import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { BookingPanel } from '@/features/bookings';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ name?: string }>;
}

export default async function BookMentorPage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/connexion?callbackUrl=/mentors');
  }

  const { id } = await params;
  const { name } = await searchParams;

  return (
    <BookingPanel
      accessToken={session.accessToken}
      mentorId={id}
      mentorName={name || 'ce mentor'}
    />
  );
}
