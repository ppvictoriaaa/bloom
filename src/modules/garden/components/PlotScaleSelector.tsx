import { PLOT_SCALES } from '../utils/grid.utils';
import type { PlotScale } from '../utils/grid.utils';
import styles from '../styles/plot-scale-selector.module.css';

interface Props {
  value: PlotScale;
  onChange: (scale: PlotScale) => void;
}

export const PlotScaleSelector = ({ value, onChange }: Props) => (
  <div className={styles.wrapper}>
    <span className={styles.label}>Scale</span>
    <select
      className={styles.select}
      value={value.label}
      onChange={(e) => {
        const found = PLOT_SCALES.find((s) => s.label === e.target.value);
        if (found) onChange(found);
      }}
    >
      {PLOT_SCALES.map((s) => (
        <option key={s.label} value={s.label}>
          {s.label}/cell
        </option>
      ))}
    </select>
  </div>
);
