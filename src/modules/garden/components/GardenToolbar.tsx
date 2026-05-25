import type { PlotScale } from '../utils/grid.utils';
import type { AutoSaveStatus } from '../hooks/useGardenSave';
import { PlotScaleSelector } from './PlotScaleSelector';
import { formatLength } from '../utils/grid.utils';
import { SvgIcon } from '../../../components/ui/SvgIcon';
import { icons } from '../../../components/ui/icons';
import { theme } from '../../../styles/theme';
import styles from '../styles/garden-toolbar.module.css';

interface Props {
  scale: number;
  plotScale: PlotScale;
  plotWidthM: number;
  plotHeightM: number;
  isSaving: boolean;
  autoSaveStatus: AutoSaveStatus;
  hasCalendar: boolean;
  canUseCalendar: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onPlotScaleChange: (scale: PlotScale) => void;
  onDimensionsChange: (widthM: number, heightM: number) => void;
  onSave: () => void;
  onCalendarOpen: () => void;
  onReminders?: () => void;
}

export const GardenToolbar = ({
  scale,
  plotScale,
  plotWidthM,
  plotHeightM,
  isSaving,
  autoSaveStatus,
  hasCalendar,
  canUseCalendar,
  onZoomIn,
  onZoomOut,
  onPlotScaleChange,
  onDimensionsChange,
  onSave,
  onCalendarOpen,
  onReminders,
}: Props) => {
  const { metersPerCell } = plotScale;
  const isKm = metersPerCell >= 1000;
  const sizeUnit = isKm ? 'km' : 'm';
  const sizeStep = isKm ? 0.1 : 1;
  const sizeMin = isKm ? metersPerCell / 1000 : metersPerCell;

  const widthVal = isKm ? plotWidthM / 1000 : plotWidthM;
  const heightVal = isKm ? plotHeightM / 1000 : plotHeightM;

  const handleWidthChange = (val: number) => {
    const m = Math.max(metersPerCell, isKm ? val * 1000 : val);
    onDimensionsChange(m, plotHeightM);
  };
  const handleHeightChange = (val: number) => {
    const m = Math.max(metersPerCell, isKm ? val * 1000 : val);
    onDimensionsChange(plotWidthM, m);
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.controls}>
        <button className={styles.zoomButton} onClick={onZoomOut} aria-label="Zoom out">
          <SvgIcon icon={icons.minus} size={14} color={theme.colors.text} />
        </button>
        <span className={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
        <button className={styles.zoomButton} onClick={onZoomIn} aria-label="Zoom in">
          <SvgIcon icon={icons.plus} size={14} color={theme.colors.text} />
        </button>

        <span className={styles.separator} />
        <PlotScaleSelector value={plotScale} onChange={onPlotScaleChange} />

        <span className={styles.separator} />
        <span className={styles.label}>Plot</span>
        <input
          type="number"
          className={styles.input}
          min={sizeMin}
          step={sizeStep}
          value={widthVal}
          onChange={(e) => handleWidthChange(Number(e.target.value))}
          aria-label="Plot width"
        />
        <span className={styles.cross}>×</span>
        <input
          type="number"
          className={styles.input}
          min={sizeMin}
          step={sizeStep}
          value={heightVal}
          onChange={(e) => handleHeightChange(Number(e.target.value))}
          aria-label="Plot height"
        />
        <span className={styles.unit}>{sizeUnit}</span>
        <span className={styles.dim}>
          ({formatLength(plotWidthM)} × {formatLength(plotHeightM)})
        </span>

        <span className={styles.separator} />
        <button
          className={styles.calendarButton}
          onClick={onCalendarOpen}
          disabled={!canUseCalendar}
          title={!canUseCalendar ? 'Save your garden first' : undefined}
        >
          {hasCalendar ? '📅 Calendar' : '+ Calendar'}
        </button>

        {hasCalendar && onReminders && (
          <>
            <span className={styles.separator} />
            <button className={styles.remindersButton} onClick={onReminders}>
              🔔 Reminders
            </button>
          </>
        )}

        <span className={styles.separator} />
        {autoSaveStatus === 'saving' && <span className={styles.spinner} aria-label="Saving" />}
        {autoSaveStatus === 'saved' && (
          <svg className={styles.checkmark} viewBox="0 0 12 12" aria-label="Saved">
            <polyline points="1.5,6 4.5,9.5 10.5,2.5" />
          </svg>
        )}
        <button className={styles.saveButton} onClick={onSave} disabled={isSaving}>
          Save
        </button>
      </div>
    </div>
  );
};
