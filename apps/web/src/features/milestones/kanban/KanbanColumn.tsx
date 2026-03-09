'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import styles from './KanbanColumn.module.css';

interface Milestone {
  id: string;
  title: string;
  type: string;
  dueAt: string;
  status: string;
}

interface Props {
  id: string;
  label: string;
  milestones: Milestone[];
}

export function KanbanColumn({ id, label, milestones }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.column} ${isOver ? styles.over : ''}`}
      data-status={id}
    >
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.count}>{milestones.length}</span>
      </div>
      <SortableContext
        items={milestones.map((m) => m.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={styles.cards} role="list" aria-label={`Colonne ${label}`}>
          {milestones.map((m) => (
            <KanbanCard key={m.id} milestone={m} />
          ))}
          {milestones.length === 0 && (
            <div className={styles.empty}>Aucun jalon</div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
