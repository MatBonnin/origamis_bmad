import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { SessionRoom } from '@/features/sessions';
import { authOptions } from '@/lib/auth';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SessionRoomPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/bookings');
  }

  const { token } = await params;

  return (
    <SessionRoom
      accessToken={session.accessToken}
      currentUserId={session.user.id}
      token={token}
    />
  );
}
