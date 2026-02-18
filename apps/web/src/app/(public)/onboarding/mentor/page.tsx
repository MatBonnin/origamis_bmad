import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { MentorOnboardingWizard } from '@/features/mentors/onboarding';

export const metadata = {
  title: "Onboarding mentor - Orig'AMI",
  description: 'Configurez votre profil mentor pour demarrer vos accompagnements',
};

export default async function MentorOnboardingPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/connexion?callbackUrl=/onboarding/mentor');
  }

  if (!session.user.roles.includes('mentor')) {
    redirect('/dashboard');
  }

  return <MentorOnboardingWizard accessToken={session.accessToken} />;
}

