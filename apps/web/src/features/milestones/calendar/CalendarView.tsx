'use client';

import dynamic from 'next/dynamic';

const CalendarViewClient = dynamic(
  () => import('./CalendarViewClient').then((m) => m.CalendarViewClient),
  { ssr: false, loading: () => <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement du calendrier...</div> },
);

type MilestoneStatus = 'planned' | 'in_progress' | 'review' | 'done' | 'blocked';

interface Milestone {
  id: string;
  title: string;
  status: MilestoneStatus;
  dueAt: string;
}

interface Props {
  milestones: Milestone[];
}

export function CalendarView({ milestones }: Props) {
  return <CalendarViewClient milestones={milestones} />;
}
