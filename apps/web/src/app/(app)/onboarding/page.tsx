import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { OnboardingWizard } from '@/features/onboarding/OnboardingWizard';

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/onboarding');
  }

  return <OnboardingWizard accessToken={session.accessToken} />;
}
