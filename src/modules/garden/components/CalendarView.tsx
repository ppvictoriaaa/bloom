import { useCallback, useMemo, useRef, useState } from 'react';
import type { CalendarEvent, CalendarResponse, EventStatus, EventType, WeatherDay } from '../../../api/recommendations';
import { recommendationsApi } from '../../../api/recommendations';
import { toast } from '../../../store/toast.store';
import styles from '../styles/calendar-view.module.css';

// ── Helpers ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const EVENT_COLORS: Record<EventType, string> = {
  watering:    '#3b82f6',
  fertilizing: '#2D4A3E',
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
  newPlants: { slug: string; name: string }[];
  plantingDays: Record<string, { name: string; imageUrl?: string }[]>;
  plantInfoBySlug: Record<string, { name: string; imageUrl?: string }>;
  isOutdated: boolean;
  onMinimize: () => void;
  onClose: () => void;
  onDelete: () => void;
  onDataUpdate: (data: CalendarResponse) => void;
  onRequestAddPlants: () => void;
  onReminders?: () => void;
  onEditSettings: () => void;
}

export const CalendarView = ({ data, gardenId, newPlants, plantingDays, plantInfoBySlug, isOutdated, onMinimize, onClose, onDelete, onDataUpdate, onRequestAddPlants, onReminders, onEditSettings }: Props) => {
  const [events, setEvents] = useState<CalendarEvent[]>(data.events);
  const [weatherDays, setWeatherDays] = useState<WeatherDay[]>(data.weatherDays ?? []);
  const [filter, setFilter]   = useState<EventType | 'all'>('all');
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusPopover, setStatusPopover] = useState<{ event: CalendarEvent; x: number; y: number } | null>(null);
  const [plantingTooltip, setPlantingTooltip] = useState<{ names: string; x: number; y: number } | null>(null);
  const [dayModalDate, setDayModalDate] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Weather by date for O(1) icon lookup
  const weatherByDate = useMemo(() => {
    const map = new Map<string, WeatherDay>();
    weatherDays.forEach((d) => map.set(d.date, d));
    return map;
  }, [weatherDays]);

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

  const dayModalEvents = dayModalDate ? (eventsByDate.get(dayModalDate) ?? []) : [];

  const harvestingByDate = useMemo(() => {
    const map = new Map<string, { name: string; imageUrl?: string }[]>();
    events.forEach((e) => {
      if (e.type !== 'harvesting') return;
      const info = plantInfoBySlug[e.plantLabel ?? e.plantSlug];
      if (!info) return;
      const list = map.get(e.date) ?? [];
      if (!list.some((p) => p.name === info.name)) list.push(info);
      map.set(e.date, list);
    });
    return map;
  }, [events, plantInfoBySlug]);

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
    try {
      await recommendationsApi.deleteCalendar(gardenId);
      onDelete();
    } catch {
      toast.error('Failed to delete calendar. Please try again.');
      setConfirmDelete(false);
    }
  };

  // ── Weather refresh ──────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await recommendationsApi.refreshWeather(gardenId);
      const updated = await recommendationsApi.getCalendar(gardenId);
      const newData = updated.data;
      setEvents(newData.events);
      setWeatherDays(newData.weatherDays ?? []);
      onDataUpdate(newData);
      toast.success(res.data.notice);
    } catch {
      toast.error('Failed to refresh weather. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [gardenId, onDataUpdate]);

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
            {data.weatherApplied && data.weatherAccuracyDays > 0 && (
              <span className={styles.weatherBadge}>
                🌤 Weather applied for {data.weatherAccuracyDays} days
              </span>
            )}
          </div>
          <div className={styles.headerActions}>
            {onReminders && (
              <button className={styles.remindersBtn} onClick={onReminders}>
                🔔 Reminders
              </button>
            )}
            <button className={styles.editSettingsBtn} onClick={onEditSettings} title="Edit calendar settings">
              ⚙ Edit settings
            </button>
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

        {data.notice && (
          <div className={styles.notice}>{data.notice}</div>
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

        {/* ── Outdated banner ── */}
        {isOutdated && (
          <div className={styles.outdatedBanner}>
            <span className={styles.outdatedText}>
              Some plants were removed from the garden. The calendar may be outdated.
            </span>
            <button className={styles.outdatedBtn} onClick={onEditSettings}>
              Regenerate
            </button>
          </div>
        )}

        {/* ── New plants banner ── */}
        {newPlants.length > 0 && (
          <div className={styles.newPlantsBanner}>
            <span className={styles.newPlantsText}>
              🌱 New plants added: <strong>{newPlants.map((p) => p.name).join(', ')}</strong>
            </span>
            <button className={styles.newPlantsBtn} onClick={onRequestAddPlants}>
              Add to calendar
            </button>
          </div>
        )}

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
                    const wx = weatherByDate.get(key);
                    const hasRain = wx && wx.precip >= 2;
                    const hasHeat = wx && wx.maxTemp >= 30 && !hasRain;
                    return (
                      <div
                        key={i}
                        className={`${styles.dayCell} ${isToday ? styles.dayCellToday : ''} ${hasRain ? styles.dayCellRain : ''} ${hasHeat ? styles.dayCellHeat : ''}`}
                        title={hasRain ? `Rain: ${wx!.precip.toFixed(1)} mm` : hasHeat ? `Heat: ${wx!.maxTemp}°C` : undefined}
                        onClick={() => { setStatusPopover(null); setDayModalDate(key); }}
                      >
                        {(hasRain || hasHeat) && (
                          <span className={styles.weatherBg} aria-hidden="true">
                            {hasRain ? '💧' : '☀️'}
                          </span>
                        )}
                        {harvestingByDate.get(key) && (
                          <span className={`${styles.plantingBg} ${(harvestingByDate.get(key)!.length > 4 ? styles.plantingBgMany : harvestingByDate.get(key)!.length > 1 ? styles.plantingBgMulti : '')}`}>
                            {harvestingByDate.get(key)!.map((plant, idx) => (
                              <span
                                key={idx}
                                className={styles.plantingBgItem}
                              >
                                {plant.imageUrl
                                  ? <img src={plant.imageUrl} alt={plant.name} className={styles.plantingBgImg} />
                                  : <span className={styles.plantingBgEmoji}>🌾</span>}
                              </span>
                            ))}
                          </span>
                        )}

                        {plantingDays[key] && (
                          <span className={`${styles.plantingBg} ${plantingDays[key].length > 1 ? (plantingDays[key].length > 4 ? styles.plantingBgMany : styles.plantingBgMulti) : ''}`}>
                            {plantingDays[key].map((plant, idx) => (
                              <span
                                key={idx}
                                className={styles.plantingBgItem}
                                onMouseEnter={(e) => {
                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  setPlantingTooltip({ names: plant.name, x: rect.left + rect.width / 2, y: rect.top });
                                }}
                                onMouseLeave={() => setPlantingTooltip(null)}
                              >
                                {plant.imageUrl
                                  ? <img src={plant.imageUrl} alt={plant.name} className={styles.plantingBgImg} />
                                  : <span className={styles.plantingBgEmoji}>🌱</span>}
                              </span>
                            ))}
                          </span>
                        )}
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

      {/* ── Planting tooltip ── */}
      {plantingTooltip && (
        <div
          className={styles.tooltip}
          style={{ left: plantingTooltip.x, top: plantingTooltip.y - 8 }}
          onMouseEnter={() => setPlantingTooltip(null)}
        >
          <div className={styles.tooltipIcon}>🌱</div>
          <div className={styles.tooltipContent}>
            <p className={styles.tooltipTitle}>Planting day</p>
            <p className={styles.tooltipMeta}>{plantingTooltip.names}</p>
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
          {(['planned', 'done', 'skipped'] as EventStatus[]).map((s) => {
            const isFuture = statusPopover.event.date > toDateKey(new Date());
            const isDisabled = s === 'done' && isFuture;
            return (
              <button
                key={s}
                className={`${styles.statusOption} ${statusPopover.event.status === s ? styles.statusOptionActive : ''} ${isDisabled ? styles.statusOptionDisabled : ''}`}
                onClick={() => !isDisabled && handleStatusUpdate(statusPopover.event, s)}
                title={isDisabled ? 'Cannot mark future events as done' : undefined}
              >
                {STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Day detail modal ── */}
      {dayModalDate && (
        <div className={styles.dayModalOverlay} onClick={() => setDayModalDate(null)}>
          <div className={styles.dayModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dayModalHeader}>
              <h3 className={styles.dayModalDate}>{formatDate(dayModalDate)}</h3>
              <button className={styles.dayModalClose} onClick={() => setDayModalDate(null)}>✕</button>
            </div>

            {plantingDays[dayModalDate] && (
              <div className={styles.dayModalPlanting}>
                🌱 Planted: <strong>{plantingDays[dayModalDate].map((p) => p.name).join(', ')}</strong>
              </div>
            )}

            {dayModalEvents.length === 0 ? (
              <p className={styles.dayModalEmpty}>No events planned for this day.</p>
            ) : (
              <ul className={styles.dayModalList}>
                {dayModalEvents.map((evt) => {
                  const isFuture = evt.date > toDateKey(new Date());
                  return (
                    <li key={evt.id} className={styles.dayModalItem}>
                      <span className={styles.dayModalIcon}>{EVENT_ICONS[evt.type]}</span>
                      <span className={styles.dayModalTitle}>{evt.title}</span>
                      <div className={styles.dayModalStatuses}>
                        {(['planned', 'done', 'skipped'] as EventStatus[]).map((s) => {
                          const isDisabled = s === 'done' && isFuture;
                          return (
                            <button
                              key={s}
                              className={`${styles.dayModalStatusBtn} ${evt.status === s ? styles.dayModalStatusBtnActive : ''} ${isDisabled ? styles.dayModalStatusBtnDisabled : ''}`}
                              onClick={() => !isDisabled && handleStatusUpdate(evt, s)}
                              title={isDisabled ? 'Cannot mark future events as done' : undefined}
                            >
                              {STATUS_LABELS[s]}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
