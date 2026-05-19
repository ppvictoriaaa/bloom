import { useCallback, useMemo, useRef, useState } from 'react';
import type { CalendarEvent, CalendarResponse, EventStatus, EventType } from '../../../api/recommendations';
import { recommendationsApi } from '../../../api/recommendations';
import styles from '../styles/calendar-view.module.css';

// ── Helpers ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const EVENT_COLORS: Record<EventType, string> = {
  watering:    '#3b82f6',
  fertilizing: '#4a7c59',
  harvesting:  '#f59e0b',
  care:        '#8b5cf6',
};

const EVENT_ICONS: Record<EventType, string> = {
  watering:    '💧',
  fertilizing: '🌿',
  harvesting:  '🌾',
  care:        '✂️',
};

const STATUS_LABELS: Record<EventStatus, string> = {
  planned: 'Planned',
  done:    'Done',
  skipped: 'Skipped',
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
  // Monday-first: Sunday = 6, Mon = 0
  const startOffset = (firstDay.getDay() + 6) % 7;
  const days: (number | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function getMonthRange(start: string, end: string): { year: number; month: number }[] {
  const s = new Date(start);
  const e = new Date(end);
  const result = [];
  const cur = new Date(s.getFullYear(), s.getMonth(), 1);
  while (cur <= e) {
    result.push({ year: cur.getFullYear(), month: cur.getMonth() });
    cur.setMonth(cur.getMonth() + 1);
  }
  return result;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}

// ── Filter types ───────────────────────────────────────────────────────────

const FILTER_OPTIONS: { key: EventType | 'all'; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'watering',    label: '💧 Watering' },
  { key: 'fertilizing', label: '🌿 Fertilizing' },
  { key: 'harvesting',  label: '🌾 Harvesting' },
  { key: 'care',        label: '✂️ Care' },
];

// ── Tooltip ────────────────────────────────────────────────────────────────

interface TooltipData {
  event: CalendarEvent;
  x: number;
  y: number;
}

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  data: CalendarResponse;
  gardenId: string;
  onMinimize: () => void;
  onClose: () => void;
  onDelete: () => void;
  onDataUpdate: (data: CalendarResponse) => void;
}

export const CalendarView = ({ data, gardenId, onMinimize, onClose, onDelete, onDataUpdate }: Props) => {
  const [events, setEvents] = useState<CalendarEvent[]>(data.events);
  const [filter, setFilter]   = useState<EventType | 'all'>('all');
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusPopover, setStatusPopover] = useState<{ event: CalendarEvent; x: number; y: number } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Group events by date key for O(1) lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    });
    return map;
  }, [events]);

  const months = useMemo(() => getMonthRange(data.calendarStart, data.calendarEnd), [data]);

  const filteredEventsByDate = useMemo(() => {
    if (filter === 'all') return eventsByDate;
    const map = new Map<string, CalendarEvent[]>();
    for (const [date, evts] of eventsByDate) {
      const filtered = evts.filter((e) => e.type === filter);
      if (filtered.length > 0) map.set(date, filtered);
    }
    return map;
  }, [eventsByDate, filter]);

  // ── Delete calendar ──────────────────────────────────────────────────────
  const handleDelete = async () => {
    await recommendationsApi.deleteCalendar(gardenId);
    onDelete();
  };

  // ── Weather refresh ──────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshNotice('');
    try {
      const res = await recommendationsApi.refreshWeather(gardenId);
      setRefreshNotice(res.data.notice);
      // Re-fetch full calendar to get updated dates
      const updated = await recommendationsApi.getCalendar(gardenId);
      const newData = updated.data;
      setEvents(newData.events);
      onDataUpdate(newData);
    } catch {
      setRefreshNotice('Failed to refresh weather. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [gardenId, data, onDataUpdate]);

  // ── Event status update ──────────────────────────────────────────────────
  const handleStatusUpdate = useCallback(async (event: CalendarEvent, status: EventStatus) => {
    setStatusPopover(null);
    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, status } : e)),
    );
    try {
      await recommendationsApi.updateEventStatus(event.id, status);
    } catch {
      // Revert on failure
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, status: event.status } : e)),
      );
    }
  }, []);

  // ── Dot interactions ─────────────────────────────────────────────────────
  const handleDotMouseEnter = (e: React.MouseEvent, evt: CalendarEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({ event: evt, x: rect.left + rect.width / 2, y: rect.top });
  };

  const handleDotClick = (e: React.MouseEvent, evt: CalendarEvent) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setStatusPopover({ event: evt, x: rect.left, y: rect.bottom + 8 });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>Care Calendar</h2>
            {data.weatherApplied && (
              <span className={styles.weatherBadge}>
                🌤 Weather applied for {data.weatherAccuracyDays} days
              </span>
            )}
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.refreshBtn}
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh weather forecast"
            >
              {refreshing ? <span className={styles.spinner} /> : '↻'} Refresh weather
            </button>
            {confirmDelete ? (
              <>
                <button className={styles.confirmDeleteBtn} onClick={handleDelete}>
                  Confirm delete
                </button>
                <button className={styles.iconBtn} onClick={() => setConfirmDelete(false)} title="Cancel">
                  ✕
                </button>
              </>
            ) : (
              <button className={styles.deleteBtn} onClick={() => setConfirmDelete(true)} title="Delete calendar">
                🗑
              </button>
            )}
            <button className={styles.iconBtn} onClick={onMinimize} title="Minimize">⊟</button>
            <button className={styles.iconBtn} onClick={onClose} title="Close">✕</button>
          </div>
        </div>

        {/* Weather notice */}
        {(refreshNotice || data.notice) && (
          <div className={styles.notice}>
            {refreshNotice || data.notice}
          </div>
        )}

        {/* ── Filters ── */}
        <div className={styles.filters}>
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.key}
              className={`${styles.filterChip} ${filter === f.key ? styles.filterChipActive : ''}`}
              onClick={() => setFilter(f.key as EventType | 'all')}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Calendar body ── */}
        <div className={styles.body} ref={bodyRef} onClick={() => setStatusPopover(null)}>
          {months.map(({ year, month }) => {
            const grid = getMonthGrid(year, month);
            return (
              <div key={`${year}-${month}`} className={styles.monthBlock}>
                <h3 className={styles.monthTitle}>
                  {MONTH_NAMES[month]} {year}
                </h3>

                <div className={styles.weekdayRow}>
                  {WEEKDAYS.map((wd) => (
                    <div key={wd} className={styles.weekday}>{wd}</div>
                  ))}
                </div>

                <div className={styles.daysGrid}>
                  {grid.map((day, i) => {
                    if (!day) return <div key={i} className={styles.emptyCell} />;
                    const key = toDateKey(new Date(year, month, day));
                    const dayEvents = filteredEventsByDate.get(key) ?? [];
                    const isToday = key === toDateKey(new Date());
                    return (
                      <div key={i} className={`${styles.dayCell} ${isToday ? styles.dayCellToday : ''}`}>
                        <span className={styles.dayNumber}>{day}</span>
                        {dayEvents.length > 0 && (
                          <div className={styles.dotsRow}>
                            {dayEvents.slice(0, 3).map((evt) => (
                              <span
                                key={evt.id}
                                className={`${styles.dot} ${evt.status === 'done' ? styles.dotDone : ''} ${evt.status === 'skipped' ? styles.dotSkipped : ''}`}
                                style={{ '--dot-color': EVENT_COLORS[evt.type] } as React.CSSProperties}
                                onMouseEnter={(e) => handleDotMouseEnter(e, evt)}
                                onMouseLeave={() => setTooltip(null)}
                                onClick={(e) => handleDotClick(e, evt)}
                                title={evt.title}
                              />
                            ))}
                            {dayEvents.length > 3 && (
                              <span className={styles.dotMore}>+{dayEvents.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Legend ── */}
        <div className={styles.legend}>
          {(Object.keys(EVENT_COLORS) as EventType[]).map((type) => (
            <span key={type} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: EVENT_COLORS[type] }} />
              {EVENT_ICONS[type]} {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
          ))}
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#d1d5db', outline: '1px solid #9ca3af' }} />
            Done / Skipped
          </span>
        </div>
      </div>

      {/* ── Tooltip (portal-like, fixed) ── */}
      {tooltip && (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x, top: tooltip.y - 8 }}
          onMouseEnter={() => setTooltip(null)}
        >
          <div className={styles.tooltipIcon}>{EVENT_ICONS[tooltip.event.type]}</div>
          <div className={styles.tooltipContent}>
            <p className={styles.tooltipTitle}>{tooltip.event.title}</p>
            <p className={styles.tooltipMeta}>
              {formatDate(tooltip.event.date)}
              &nbsp;·&nbsp;
              <span className={tooltip.event.accuracyLevel === 'high' ? styles.accuracyHigh : styles.accuracyEst}>
                {tooltip.event.accuracyLevel === 'high' ? '🌤 weather-adjusted' : 'estimated'}
              </span>
            </p>
            {tooltip.event.metadata?.shiftReason && (
              <p className={styles.tooltipShift}>↳ {tooltip.event.metadata.shiftReason}</p>
            )}
            {tooltip.event.metadata?.variety && (
              <p className={styles.tooltipMeta}>Variety: {tooltip.event.metadata.variety}</p>
            )}
            <p className={styles.tooltipStatus}>
              Status: <strong>{STATUS_LABELS[tooltip.event.status]}</strong>
              &nbsp;· click dot to change
            </p>
          </div>
        </div>
      )}

      {/* ── Status popover ── */}
      {statusPopover && (
        <div
          className={styles.statusPopover}
          style={{ left: statusPopover.x, top: statusPopover.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {(['planned', 'done', 'skipped'] as EventStatus[]).map((s) => (
            <button
              key={s}
              className={`${styles.statusOption} ${statusPopover.event.status === s ? styles.statusOptionActive : ''}`}
              onClick={() => handleStatusUpdate(statusPopover.event, s)}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
