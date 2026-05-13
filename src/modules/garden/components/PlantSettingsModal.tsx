import { useState } from 'react';
import type { PendingDrop, PlacedPlant } from '../types/garden.types';
import type { PlotScale } from '../utils/grid.utils';
import { SvgIcon } from '../../../components/ui/SvgIcon';
import { icons } from '../../../components/ui/icons';
import { formatLength } from '../utils/grid.utils';
import { theme } from '../../../styles/theme';
import styles from '../styles/plant-settings-modal.module.css';

interface InitialValues {
  count: number;
  plantsPerRow: number;
  spacing: number;
}

interface Props {
  pendingDrop: PendingDrop;
  plotScale: PlotScale;
  plotWidthM: number;
  plotHeightM: number;
  initialValues?: InitialValues;
  onConfirm: (plant: Omit<PlacedPlant, 'id'>) => void;
  onCancel: () => void;
}

const AREA_MODE_THRESHOLD = 5;

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const formatCount = (n: number): string => {
  if (n >= 1_000_000) return `~${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `~${Math.round(n / 1_000)}K`;
  return String(n);
};

export const PlantSettingsModal = ({
  pendingDrop,
  plotScale,
  plotWidthM,
  plotHeightM,
  initialValues,
  onConfirm,
  onCancel,
}: Props) => {
  const { metersPerCell } = plotScale;
  const isAreaMode = metersPerCell >= AREA_MODE_THRESHOLD;

  const isKm = metersPerCell >= 1000;
  const areaUnit = isKm ? 'km' : 'm';
  const cellInDisplayUnits = isKm ? metersPerCell / 1000 : metersPerCell;
  const inputStep = isKm ? 0.1 : 1;
  const inputMin = isKm ? 0.1 : 1;
  const maxWidthDisplay = isKm ? plotWidthM / 1000 : plotWidthM;
  const maxHeightDisplay = isKm ? plotHeightM / 1000 : plotHeightM;

  const initSpacing = initialValues?.spacing ?? 0.5;
  const initPlantsPerRow = initialValues?.plantsPerRow ?? 5;
  const initCount = initialValues?.count ?? 10;
  const initPlantRows = Math.ceil(initCount / initPlantsPerRow);

  // Count mode state
  const [count, setCount] = useState(initCount);
  const [plantsPerRow, setPlantsPerRow] = useState(initPlantsPerRow);

  // Area mode state — derived from initialValues if editing
  const [widthDisplay, setWidthDisplay] = useState(() => {
    const wM = initialValues ? initPlantsPerRow * initSpacing : cellInDisplayUnits * 2;
    return Math.min(isKm ? wM / 1000 : wM, maxWidthDisplay);
  });
  const [heightDisplay, setHeightDisplay] = useState(() => {
    const hM = initialValues ? initPlantRows * initSpacing : cellInDisplayUnits * 3;
    return Math.min(isKm ? hM / 1000 : hM, maxHeightDisplay);
  });

  // Shared
  const [spacing, setSpacing] = useState(initSpacing);

  // Derived values
  let finalCount: number;
  let finalPlantsPerRow: number;
  let areaWidthM: number;
  let areaHeightM: number;

  if (isAreaMode) {
    areaWidthM = isKm ? widthDisplay * 1000 : widthDisplay;
    areaHeightM = isKm ? heightDisplay * 1000 : heightDisplay;
    finalPlantsPerRow = Math.max(1, Math.round(areaWidthM / spacing));
    const plantRows = Math.max(1, Math.round(areaHeightM / spacing));
    finalCount = finalPlantsPerRow * plantRows;
  } else {
    const plantRows = Math.ceil(count / plantsPerRow);
    areaWidthM = plantsPerRow * spacing;
    areaHeightM = plantRows * spacing;
    finalCount = count;
    finalPlantsPerRow = plantsPerRow;
  }

  const plantRowsDisplay = Math.ceil(finalCount / finalPlantsPerRow);
  const showAllPreview = finalCount <= 30;
  const previewRows = showAllPreview ? plantRowsDisplay : Math.min(plantRowsDisplay, 6);
  const previewCols = showAllPreview ? finalPlantsPerRow : Math.min(finalPlantsPerRow, 6);
  const isTruncated = !showAllPreview;

  const handleConfirm = () => {
    onConfirm({
      plantId: pendingDrop.plantId,
      name: pendingDrop.name,
      slug: pendingDrop.slug,
      category: pendingDrop.category,
      color: pendingDrop.color,
      imageUrl: pendingDrop.imageUrl,
      x: pendingDrop.x,
      y: pendingDrop.y,
      count: finalCount,
      plantsPerRow: finalPlantsPerRow,
      spacing,
    });
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>
          {initialValues ? 'Edit' : 'Place'} {pendingDrop.name}
        </h3>

        {isAreaMode ? (
          <>
            <div className={styles.modeTag}>Field scale — enter area dimensions</div>
            <div className={styles.fields}>
              <label className={styles.label}>
                Width ({areaUnit})
                <input
                  type="number"
                  min={inputMin}
                  max={maxWidthDisplay}
                  step={inputStep}
                  value={widthDisplay}
                  onChange={(e) => setWidthDisplay(clamp(Number(e.target.value), inputMin, maxWidthDisplay))}
                  className={styles.input}
                />
              </label>
              <label className={styles.label}>
                Height ({areaUnit})
                <input
                  type="number"
                  min={inputMin}
                  max={maxHeightDisplay}
                  step={inputStep}
                  value={heightDisplay}
                  onChange={(e) => setHeightDisplay(clamp(Number(e.target.value), inputMin, maxHeightDisplay))}
                  className={styles.input}
                />
              </label>
              <label className={styles.label}>
                Spacing (m)
                <input
                  type="number"
                  min={0.05}
                  max={100}
                  step={0.05}
                  value={spacing}
                  onChange={(e) => setSpacing(clamp(Number(e.target.value), 0.05, 100))}
                  className={styles.input}
                />
              </label>
            </div>
          </>
        ) : (
          <>
            <div className={styles.modeTag}>Garden scale — enter plant count</div>
            <div className={styles.fields}>
              <label className={styles.label}>
                Total plants
                <input
                  type="number"
                  min={1}
                  max={99999}
                  value={count}
                  onChange={(e) => setCount(clamp(Number(e.target.value), 1, 99999))}
                  className={styles.input}
                />
              </label>
              <label className={styles.label}>
                Per row
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={plantsPerRow}
                  onChange={(e) => setPlantsPerRow(clamp(Number(e.target.value), 1, 9999))}
                  className={styles.input}
                />
              </label>
              <label className={styles.label}>
                Spacing (m)
                <input
                  type="number"
                  min={0.05}
                  max={100}
                  step={0.05}
                  value={spacing}
                  onChange={(e) => setSpacing(clamp(Number(e.target.value), 0.05, 100))}
                  className={styles.input}
                />
              </label>
            </div>
          </>
        )}

        <div className={styles.meta}>
          <span className={styles.metaItem}>{formatCount(finalCount)} plants</span>
          <span className={styles.metaItem}>{plantRowsDisplay} rows × {finalPlantsPerRow}/row</span>
          <span className={styles.metaItem}>
            {formatLength(areaWidthM)} × {formatLength(areaHeightM)}
          </span>
        </div>

        <div className={styles.previewWrapper}>
          <p className={styles.previewLabel}>
            Preview
            {isTruncated && (
              <span className={styles.previewNote}>
                {' '}(first {previewRows}×{previewCols} of {plantRowsDisplay}×{finalPlantsPerRow})
              </span>
            )}
          </p>
          <div className={styles.preview}>
            {Array.from({ length: previewRows }).map((_, row) => (
              <div key={row} className={styles.previewRow}>
                {Array.from({ length: previewCols }).map((_, col) => {
                  const idx = row * finalPlantsPerRow + col;
                  if (idx >= finalCount) return null;
                  return (
                    <div key={col} className={styles.previewCell}>
                      {pendingDrop.imageUrl
                        ? <img src={pendingDrop.imageUrl} width={22} height={22} alt="" />
                        : <SvgIcon icon={icons.seedling} size={22} color={theme.colors.plantText} />
                      }
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.confirmButton} onClick={handleConfirm}>
            {initialValues ? 'Save' : 'Place'}
          </button>
        </div>
      </div>
    </div>
  );
};
