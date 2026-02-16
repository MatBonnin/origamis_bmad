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
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        Chargement...
      </div>
    );
  }

  return (
    <div>
      <ProfileSuggestion accessToken={session.accessToken} />
    </div>
  );
}
