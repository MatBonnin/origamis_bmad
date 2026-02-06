'use client';

import type { LucideIcon } from 'lucide-react';
import styles from './ProfileCard.module.css';

interface ProfileCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

export function ProfileCard({
  icon: Icon,
  title,
  description,
  selected,
  onSelect,
}: ProfileCardProps) {
  return (
    <button
      type="button"
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className={styles.iconWrapper}>
        <Icon className={styles.icon} size={32} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
    </button>
  );
}
