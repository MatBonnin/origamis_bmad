'use client';

import { GraduationCap, Video, Users, Route } from 'lucide-react';
import { Button } from '@/components/ui';
import { FeatureCard } from './FeatureCard';
import styles from './StepWelcome.module.css';

interface StepWelcomeProps {
  onNext: () => void;
}

const features = [
  {
    icon: GraduationCap,
    title: 'Mentors experts',
    description: 'Des professionnels et etudiants avances pour vous guider',
  },
  {
    icon: Video,
    title: 'Visio integree',
    description: 'Des sessions de mentorat en video directement sur la plateforme',
  },
  {
    icon: Users,
    title: 'Etudiants dans le besoin',
    description: 'Aidez des etudiants qui ont besoin de votre expertise',
  },
  {
    icon: Route,
    title: 'Parcours personnalises',
    description: 'Un accompagnement adapte a vos objectifs specifiques',
  },
];

export function StepWelcome({ onNext }: StepWelcomeProps) {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Bienvenue sur Orig&apos;AMI</h1>
      <p className={styles.subtitle}>
        La plateforme qui connecte etudiants et mentors pour reussir ensemble
      </p>

      <div className={styles.featuresGrid}>
        {features.map((feature) => (
          <FeatureCard
            key={feature.title}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </div>

      <div className={styles.buttonWrapper}>
        <Button size="lg" onClick={onNext}>
          Commencer
        </Button>
      </div>

      <p className={styles.footer}>
        En continuant, vous acceptez nos{' '}
        <a href="/conditions" className={styles.link}>
          Conditions d&apos;utilisation
        </a>{' '}
        et notre{' '}
        <a href="/confidentialite" className={styles.link}>
          Politique de confidentialite
        </a>
        .
      </p>
    </div>
  );
}
