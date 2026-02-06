import { PublicOnboardingWizard } from '@/features/onboarding/PublicOnboardingWizard';

export const metadata = {
  title: "Bienvenue - Orig'AMI",
  description: "Commencez votre parcours sur Orig'AMI, la plateforme de mentorat academique",
};

export default function OnboardingPage() {
  return <PublicOnboardingWizard />;
}
