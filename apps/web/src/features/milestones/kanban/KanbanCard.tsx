'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './KanbanCard.module.css';

interface Milestone {
  id: string;
  title: string;
  type: string;
  dueAt: string;
  status: string;
}

interface Props {
  milestone: Milestone;
}

const TYPE_LABELS: Record<string, string> = {
  message: 'Message',
  rdv: 'RDV',
  visio: 'Visio',
};

export function KanbanCard({ milestone }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: milestone.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.card}
      {...attributes}
      {...listeners}
      role="listitem"
      aria-label={`Jalon: ${milestone.title}`}
    >
      <p className={styles.title}>{milestone.title}</p>
      <div className={styles.meta}>
        {milestone.type && milestone.type !== 'all' && (
          <span className={styles.type}>{TYPE_LABELS[milestone.type] ?? milestone.type}</span>
        )}
        <span className={styles.date}>{formatDate(milestone.dueAt)}</span>
      </div>
    </div>
  );
}
