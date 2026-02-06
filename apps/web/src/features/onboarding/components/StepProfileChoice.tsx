'use client';

import { GraduationCap, Pencil } from 'lucide-react';
import { ProfileCard } from './ProfileCard';
import styles from './StepProfileChoice.module.css';

interface StepProfileChoiceProps {
  profileType: 'mentor' | 'etudiant' | null;
  onSelect: (type: 'mentor' | 'etudiant') => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepProfileChoice({
  profileType,
  onSelect,
  onBack,
  onNext,
}: StepProfileChoiceProps) {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Choisissez votre profil</h1>
      <p className={styles.subtitle}>
        Selectionnez le profil qui correspond le mieux a votre situation
      </p>

      <div className={styles.cardsGrid}>
        <ProfileCard
          icon={GraduationCap}
          title="Mentor expert"
          description="Partagez votre expertise et accompagnez des etudiants dans leur parcours academique"
          selected={profileType === 'mentor'}
          onSelect={() => onSelect('mentor')}
        />
        <ProfileCard
          icon={Pencil}
          title="Etudiant"
          description="Trouvez un mentor pour vous aider a atteindre vos objectifs academiques"
          selected={profileType === 'etudiant'}
          onSelect={() => onSelect('etudiant')}
        />
      </div>

      <div className={styles.buttons}>
        <button type="button" className={styles.buttonOutline} onClick={onBack}>
          Retour
        </button>
        <button
          type="button"
          className={styles.buttonFilled}
          onClick={onNext}
          disabled={!profileType}
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
