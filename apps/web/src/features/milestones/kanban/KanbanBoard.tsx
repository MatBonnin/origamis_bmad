'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import styles from './KanbanBoard.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type MilestoneStatus = 'planned' | 'in_progress' | 'review' | 'done' | 'blocked';

interface Milestone {
  id: string;
  title: string;
  type: string;
  dueAt: string;
  status: MilestoneStatus;
  notes: string | null;
}

interface Props {
  accessToken: string;
  milestones: Milestone[];
  onStatusChange: (milestoneId: string, newStatus: MilestoneStatus) => void;
}

const COLUMNS: { id: MilestoneStatus; label: string }[] = [
  { id: 'planned', label: 'Planifie' },
  { id: 'in_progress', label: 'En cours' },
  { id: 'review', label: 'En validation' },
  { id: 'done', label: 'Termine' },
  { id: 'blocked', label: 'Bloque' },
];

export function KanbanBoard({ accessToken, milestones, onStatusChange }: Props) {
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const found = milestones.find((m) => m.id === String(event.active.id));
    setActiveMilestone(found ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveMilestone(null);
    const { active, over } = event;
    if (!over) return;

    const draggedId = String(active.id);
    const overId = String(over.id);

    // Determine target column
    const targetColumn = COLUMNS.find((col) => col.id === overId);
    const targetStatus: MilestoneStatus | undefined = targetColumn?.id;

    if (!targetStatus) {
      // over is a card, find its column
      const overMilestone = milestones.find((m) => m.id === overId);
      if (!overMilestone) return;
      const draggedMilestone = milestones.find((m) => m.id === draggedId);
      if (!draggedMilestone || draggedMilestone.status === overMilestone.status) return;

      onStatusChange(draggedId, overMilestone.status);

      try {
        const res = await fetch(`${API_URL}/milestones/${draggedId}/status`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: overMilestone.status }),
        });
        if (!res.ok) {
          // Rollback
          const draggedMilestoneOriginal = milestones.find((m) => m.id === draggedId);
          if (draggedMilestoneOriginal) {
            onStatusChange(draggedId, draggedMilestoneOriginal.status);
          }
        }
      } catch {
        const draggedMilestoneOriginal = milestones.find((m) => m.id === draggedId);
        if (draggedMilestoneOriginal) {
          onStatusChange(draggedId, draggedMilestoneOriginal.status);
        }
      }
      return;
    }

    const draggedMilestone = milestones.find((m) => m.id === draggedId);
    if (!draggedMilestone || draggedMilestone.status === targetStatus) return;

    // Optimistic update
    onStatusChange(draggedId, targetStatus);

    try {
      const res = await fetch(`${API_URL}/milestones/${draggedId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (!res.ok) {
        // Rollback
        onStatusChange(draggedId, draggedMilestone.status);
      }
    } catch {
      onStatusChange(draggedId, draggedMilestone.status);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={(e) => void handleDragEnd(e)}
    >
      <div className={styles.board}>
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            label={col.label}
            milestones={milestones.filter((m) => m.status === col.id)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeMilestone && <KanbanCard milestone={activeMilestone} />}
      </DragOverlay>
    </DndContext>
  );
}
