import { useMemo, useRef, useState } from 'react';
import type { CalendarEvent, CalendarResponse, EventType } from '../../../api/recommendations';
import styles from '../styles/mini-calendar.module.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const EVENT_COLORS: Record<EventType, string> = {
  watering:    '#3b82f6',
  fertilizing: '#41443a',
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
  isOutdated: boolean;
  newPlantsCount: number;
  onExpand: () => void;
  onClose: () => void;
}

export const MiniCalendar = ({ data, isOutdated, newPlantsCount, onExpand, onClose }: Props) => {
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

  const widgetRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; initLeft: number; initTop: number } | null>(null);

  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();

    const rect = widgetRef.current!.getBoundingClientRect();
    dragState.current = { startX: e.clientX, startY: e.clientY, initLeft: rect.left, initTop: rect.top };
    setDragging(true);

    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      setPos({
        left: Math.max(8, Math.min(dragState.current.initLeft + ev.clientX - dragState.current.startX, window.innerWidth - 240)),
        top:  Math.max(8, Math.min(dragState.current.initTop  + ev.clientY - dragState.current.startY, window.innerHeight - 100)),
      });
    };

    const onUp = () => {
      dragState.current = null;
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const posStyle: React.CSSProperties = pos
    ? { top: pos.top, left: pos.left, bottom: 'auto', right: 'auto' }
    : {};

  return (
    <div
      ref={widgetRef}
      className={`${styles.widget} ${dragging ? styles.dragging : ''}`}
      style={posStyle}
    >
      <div className={styles.header} onMouseDown={handleHeaderMouseDown}>
        <span className={styles.monthLabel}>{MONTH_NAMES[month]} {year}</span>
        <div className={styles.headerBtns}>
          <button className={styles.expandBtn} onClick={onExpand} title="Open full calendar">⤢</button>
          <button className={styles.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
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
            <div key={i} className={`${styles.dayCell} ${isToday ? styles.dayCellToday : ''}`}>
              <span className={styles.dayNumber}>{day}</span>
              {uniqueTypes.length > 0 && (
                <div className={styles.dotsRow}>
                  {uniqueTypes.slice(0, 3).map((type) => (
                    <span key={type} className={styles.dot} style={{ background: EVENT_COLORS[type] }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isOutdated && (
        <div className={styles.outdatedWarning}>
          ⚠ Calendar may be outdated
        </div>
      )}
      {!isOutdated && newPlantsCount > 0 && (
        <div className={styles.newPlantsWarning}>
          🌱 {newPlantsCount} new plant{newPlantsCount > 1 ? 's' : ''} not in calendar
        </div>
      )}

      <button className={styles.openBtn} onClick={onExpand}>
        View full calendar
      </button>
    </div>
  );
};
