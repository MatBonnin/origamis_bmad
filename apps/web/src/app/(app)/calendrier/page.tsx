import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { CalendarView } from '@/features/calendar';

export const metadata = {
  title: 'Calendrier | Origamis',
  description: 'Visualisez vos sessions de mentorat dans un calendrier',
};

export default async function CalendrierPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/calendrier');
  }

  return (
    <CalendarView accessToken={session.accessToken} userId={session.user.id} />
  );
}
