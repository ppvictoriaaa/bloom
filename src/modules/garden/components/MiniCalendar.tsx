import { useMemo } from 'react';
import type { CalendarEvent, CalendarResponse, EventType } from '../../../api/recommendations';
import styles from '../styles/mini-calendar.module.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const EVENT_COLORS: Record<EventType, string> = {
  watering:    '#3b82f6',
  fertilizing: '#4a7c59',
  harvesting:  '#f59e0b',
  care:        '#8b5cf6',
};

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonthGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const days: (number | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

interface Props {
  data: CalendarResponse;
  onExpand: () => void;
}

export const MiniCalendar = ({ data, onExpand }: Props) => {
  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth();
  const grid  = useMemo(() => getMonthGrid(year, month), [year, month]);
  const todayKey = toDateKey(today);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    data.events.forEach((e) => {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    });
    return map;
  }, [data.events]);

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <span className={styles.monthLabel}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button className={styles.expandBtn} onClick={onExpand} title="Open full calendar">
          ⤢
        </button>
      </div>

      <div className={styles.weekdayRow}>
        {WEEKDAYS.map((wd, i) => (
          <div key={i} className={styles.weekday}>{wd}</div>
        ))}
      </div>

      <div className={styles.daysGrid}>
        {grid.map((day, i) => {
          if (!day) return <div key={i} className={styles.emptyCell} />;
          const key = toDateKey(new Date(year, month, day));
          const dayEvents = eventsByDate.get(key) ?? [];
          const isToday = key === todayKey;
          const uniqueTypes = [...new Set(dayEvents.map((e) => e.type))];

          return (
            <div
              key={i}
              className={`${styles.dayCell} ${isToday ? styles.dayCellToday : ''}`}
            >
              <span className={styles.dayNumber}>{day}</span>
              {uniqueTypes.length > 0 && (
                <div className={styles.dotsRow}>
                  {uniqueTypes.slice(0, 3).map((type) => (
                    <span
                      key={type}
                      className={styles.dot}
                      style={{ background: EVENT_COLORS[type] }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className={styles.openBtn} onClick={onExpand}>
        View full calendar
      </button>
    </div>
  );
};
