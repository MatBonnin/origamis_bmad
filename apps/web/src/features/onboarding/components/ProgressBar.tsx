'use client';

import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const stepLabels = ['Debut', 'Profil', 'Fin'];

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const progress = (currentStep / (totalSteps - 1)) * 100;

  // Map current step to the 3 progress stages
  const getActiveStage = () => {
    if (currentStep === 0) return 0;
    if (currentStep >= totalSteps - 1) return 2;
    return 1;
  };

  const activeStage = getActiveStage();

  return (
    <div className={styles.container}>
      <div className={styles.labels}>
        {stepLabels.map((label, index) => (
          <span
            key={label}
            className={`${styles.label} ${index <= activeStage ? styles.active : ''}`}
          >
            {label}
          </span>
        ))}
      </div>
      <div className={styles.track}>
        <div
          className={styles.progress}
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={currentStep + 1}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
        />
      </div>
    </div>
  );
}
