'use client';

import { SelectableCard } from './SelectableCard';
import { objectives } from '../constants/objectives';
import styles from './StepObjectives.module.css';

interface StepObjectivesProps {
  selectedObjectives: string[];
  onToggleObjective: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepObjectives({
  selectedObjectives,
  onToggleObjective,
  onBack,
  onNext,
}: StepObjectivesProps) {
  const canContinue = selectedObjectives.length >= 1;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Vos objectifs</h1>
      <p className={styles.subtitle}>
        Selectionnez au moins un objectif (3 recommandes)
      </p>

      <div className={styles.grid}>
        {objectives.map((objective) => (
          <SelectableCard
            key={objective.id}
            id={objective.id}
            label={objective.label}
            selected={selectedObjectives.includes(objective.id)}
            onToggle={onToggleObjective}
          />
        ))}
      </div>

      <div className={styles.buttons}>
        <button type="button" className={styles.buttonOutline} onClick={onBack}>
          Retour
        </button>
        <button
          type="button"
          className={styles.buttonFilled}
          onClick={onNext}
          disabled={!canContinue}
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
