'use client';

import { Calendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import styles from './CalendarView.module.css';

const locales = { fr };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

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

const STATUS_COLORS: Record<MilestoneStatus, string> = {
  planned: '#3b82f6',
  in_progress: '#f59e0b',
  review: '#8b5cf6',
  done: '#10b981',
  blocked: '#ef4444',
};

interface CalendarEvent extends Event {
  milestoneId: string;
  status: MilestoneStatus;
}

export function CalendarViewClient({ milestones }: Props) {
  const events: CalendarEvent[] = milestones.map((m) => ({
    milestoneId: m.id,
    title: m.title,
    start: new Date(m.dueAt),
    end: new Date(m.dueAt),
    allDay: true,
    status: m.status,
  }));

  const eventStyleGetter = (event: CalendarEvent) => ({
    style: {
      backgroundColor: STATUS_COLORS[event.status] ?? '#6b7280',
      borderRadius: '4px',
      border: 'none',
      color: '#fff',
      fontSize: '0.8rem',
    },
  });

  return (
    <div className={styles.calendarWrapper}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
        culture="fr"
        eventPropGetter={eventStyleGetter}
        messages={{
          next: 'Suivant',
          previous: 'Precedent',
          today: "Aujourd'hui",
          month: 'Mois',
          week: 'Semaine',
          day: 'Jour',
          agenda: 'Agenda',
          date: 'Date',
          time: 'Heure',
          event: 'Jalon',
          noEventsInRange: 'Aucun jalon dans cette periode.',
        }}
      />
    </div>
  );
}
