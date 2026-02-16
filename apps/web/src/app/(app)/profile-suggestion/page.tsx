'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ProfileSuggestion } from '@/features/onboarding/components/ProfileSuggestion';

export default function ProfileSuggestionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/connexion');
    }
  }, [status, router]);

  if (status === 'loading' || !session?.accessToken) {
    return (
      <main style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        Chargement...
      </main>
    );
  }

  return (
    <main>
      <ProfileSuggestion accessToken={session.accessToken} />
    </main>
  );
}
