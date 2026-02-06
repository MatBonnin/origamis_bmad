'use client';

import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  value: number;
  max?: number;
  labels?: string[];
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  value,
  max = 100,
  labels,
  showLabels = true,
  size = 'md',
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  // Calculate which label is active based on percentage
  const getActiveIndex = () => {
    if (!labels || labels.length === 0) return -1;
    if (percentage === 0) return 0;
    if (percentage >= 100) return labels.length - 1;
    return Math.floor((percentage / 100) * (labels.length - 1)) + 1;
  };

  const activeIndex = getActiveIndex();

  return (
    <div className={styles.container}>
      {showLabels && labels && labels.length > 0 && (
        <div className={styles.labels}>
          {labels.map((label, index) => (
            <span
              key={label}
              className={`${styles.label} ${index <= activeIndex ? styles.active : ''}`}
            >
              {label}
            </span>
          ))}
        </div>
      )}
      <div className={`${styles.track} ${styles[size]}`}>
        <div
          className={styles.progress}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}
