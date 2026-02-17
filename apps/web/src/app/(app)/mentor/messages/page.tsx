import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { MentorMessagingPanel } from '@/features/messaging';

export default async function MentorMessagesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/mentor/messages');
  }

  if (!session.user.roles.includes('mentor')) {
    redirect('/messages');
  }

  return (
    <MentorMessagingPanel
      accessToken={session.accessToken}
      currentUserId={session.user.id}
    />
  );
}
