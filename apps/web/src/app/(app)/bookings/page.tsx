import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { MyBookings } from '@/features/bookings';

export default async function BookingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/bookings');
  }

  return (
    <MyBookings accessToken={session.accessToken} userId={session.user.id} />
  );
}
