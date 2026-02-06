'use client';

import { Check } from 'lucide-react';
import styles from './SelectableCard.module.css';

interface SelectableCardProps {
  id: string;
  label: string;
  description?: string;
  selected: boolean;
  onToggle: (id: string) => void;
}

export function SelectableCard({
  id,
  label,
  description,
  selected,
  onToggle,
}: SelectableCardProps) {
  return (
    <button
      type="button"
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      onClick={() => onToggle(id)}
      aria-pressed={selected}
    >
      <div className={styles.checkbox}>
        {selected && <Check size={14} />}
      </div>
      <div className={styles.content}>
        <span className={styles.label}>{label}</span>
        {description && <span className={styles.description}>{description}</span>}
      </div>
    </button>
  );
}
