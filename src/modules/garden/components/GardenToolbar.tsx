import type { PlacementRules } from '../types/garden.types';
import type { PlotScale } from '../utils/grid.utils';
import { PlotScaleSelector } from './PlotScaleSelector';
import { formatLength } from '../utils/grid.utils';
import {
  SAFE_CROP_GAP_M,
  MIN_TREE_GAP_M,
  SAFE_TREE_GAP_M,
} from '../utils/plant-overlap.utils';
import { SvgIcon } from '../../../components/ui/SvgIcon';
import { icons } from '../../../components/ui/icons';
import { theme } from '../../../styles/theme';
import styles from '../styles/garden-toolbar.module.css';

interface Props {
  scale: number;
  plotScale: PlotScale;
  plotWidthM: number;
  plotHeightM: number;
  placementRules: PlacementRules;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onPlotScaleChange: (scale: PlotScale) => void;
  onDimensionsChange: (widthM: number, heightM: number) => void;
  onPlacementRulesChange: (partial: Partial<PlacementRules>) => void;
}

export const GardenToolbar = ({
  scale,
  plotScale,
  plotWidthM,
  plotHeightM,
  placementRules,
  onZoomIn,
  onZoomOut,
  onPlotScaleChange,
  onDimensionsChange,
  onPlacementRulesChange,
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

  const { minCropGapM, minTreeGapM } = placementRules;
  const cropGapWarning = minCropGapM < SAFE_CROP_GAP_M;
  const treeGapWarning = minTreeGapM >= MIN_TREE_GAP_M && minTreeGapM < SAFE_TREE_GAP_M;

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
        <span className={styles.label}>Crop gap</span>
        <input
          type="number"
          className={styles.input}
          min={0.1}
          max={100}
          step={0.1}
          value={minCropGapM}
          onChange={(e) =>
            onPlacementRulesChange({ minCropGapM: Math.max(0.1, Number(e.target.value)) })
          }
          aria-label="Minimum gap between different crops"
        />
        <span className={styles.unit}>m</span>

        <span className={styles.separator} />
        <span className={styles.label}>Tree gap</span>
        <input
          type="number"
          className={styles.input}
          min={MIN_TREE_GAP_M}
          max={100}
          step={0.5}
          value={minTreeGapM}
          onChange={(e) =>
            onPlacementRulesChange({ minTreeGapM: Math.max(MIN_TREE_GAP_M, Number(e.target.value)) })
          }
          aria-label="Minimum gap from trees"
        />
        <span className={styles.unit}>m</span>
      </div>

      {(cropGapWarning || treeGapWarning) && (
        <div className={styles.warnings}>
          {cropGapWarning && (
            <span className={styles.warningBanner}>
              <SvgIcon icon={icons.warning} size={13} color={theme.colors.warningText} />
              Warning: low spacing increases risk of infections.
            </span>
          )}
          {treeGapWarning && (
            <span className={styles.warningBanner}>
              <SvgIcon icon={icons.warning} size={13} color={theme.colors.warningText} />
              Warning: distance to trees is recommended to be 2-5 m.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
