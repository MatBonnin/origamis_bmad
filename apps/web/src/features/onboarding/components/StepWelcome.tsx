'use client';

import { GraduationCap, Video, Users, Route } from 'lucide-react';
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
      <div className={styles.logo}>
        <span className={styles.logoText}>AMI</span>
      </div>

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

      <button type="button" className={styles.button} onClick={onNext}>
        Commencer
      </button>

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
