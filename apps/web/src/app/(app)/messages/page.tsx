import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { MessagingPanel } from '@/features/messaging';

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/messages');
  }

  return (
    <MessagingPanel
      accessToken={session.accessToken}
      currentUserId={session.user.id}
    />
  );
}
