import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { PlacedPlant as PlacedPlantType } from '../types/garden.types';
import type { PlotScale } from '../utils/grid.utils';
import { SvgIcon } from '../../../components/ui/SvgIcon';
import { icons } from '../../../components/ui/icons';
import { theme } from '../../../styles/theme';
import styles from '../styles/placed-plant.module.css';

interface Props {
  plant: PlacedPlantType;
  cellSize: number;
  plotScale: PlotScale;
  hasViolation: boolean;
  onEdit: (plant: PlacedPlantType) => void;
  onHover: (id: string | null) => void;
}

const DETAIL_THRESHOLD_PX = 10;
const SHOW_ALL_THRESHOLD = 30;
const MIN_BOX_PX = 24;

const TOOLTIP_MESSAGE =
  'Planting these plants too close may reduce growth, increase competition for water and nutrients, or raise the risk of disease.';
const TOOLTIP_WIDTH = 214;
const TOOLTIP_GAP = 8;

const WarningBadge = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);

  const show = () => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    let left = r.left;
    if (left + TOOLTIP_WIDTH > window.innerWidth - 8) {
      left = window.innerWidth - TOOLTIP_WIDTH - 8;
    }
    const above = r.top > 130;
    setPos(
      above
        ? { left, bottom: window.innerHeight - r.top + TOOLTIP_GAP }
        : { left, top: r.bottom + TOOLTIP_GAP },
    );
  };

  return (
    <>
      <div
        ref={ref}
        className={styles.warningBadge}
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
        onPointerDown={(e) => e.stopPropagation()}
      >
        !
      </div>
      {pos &&
        createPortal(
          <div
            className={styles.warningTooltip}
            style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: TOOLTIP_WIDTH }}
          >
            {TOOLTIP_MESSAGE}
          </div>,
          document.body,
        )}
    </>
  );
};

export const PlacedPlant = ({ plant, cellSize, plotScale, hasViolation, onEdit, onHover }: Props) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `placed-${plant.id}`,
    data: { type: 'existing', placedId: plant.id, x: plant.x, y: plant.y },
  });

  const { metersPerCell } = plotScale;

  const leftPx = (plant.x / metersPerCell) * cellSize;
  const topPx = (plant.y / metersPerCell) * cellSize;

  const plantRows = Math.ceil(plant.count / plant.plantsPerRow);
  const spacingPx = (plant.spacing / metersPerCell) * cellSize;

  const showAll = plant.count <= SHOW_ALL_THRESHOLD;
  const displayRows = showAll ? plantRows : Math.min(plantRows, 6);
  const displayCols = showAll ? plant.plantsPerRow : Math.min(plant.plantsPerRow, 6);
  const isTruncated = !showAll;

  const physicalW = plant.plantsPerRow * spacingPx;
  const physicalH = plantRows * spacingPx;

  const totalWidth = Math.max(MIN_BOX_PX, physicalW);
  const totalHeight = Math.max(MIN_BOX_PX, physicalH);

  const isDetailMode = spacingPx >= DETAIL_THRESHOLD_PX && showAll;
  const stepX = isDetailMode ? spacingPx : totalWidth / displayCols;
  const stepY = isDetailMode ? spacingPx : totalHeight / displayRows;
  const iconSize = Math.max(4, Math.floor(Math.min(stepX, stepY) * 0.72));

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        left: leftPx,
        top: topPx,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.55 : 1,
        zIndex: isDragging ? 10 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      {...listeners}
      {...attributes}
      onMouseEnter={() => onHover(plant.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div
        className={styles.area}
        style={{
          width: Math.round(totalWidth),
          height: Math.round(totalHeight),
          ...(plant.color && {
            background: `${plant.color}1a`,
            borderColor: `${plant.color}50`,
          }),
        }}
      >
        {Array.from({ length: displayRows }).flatMap((_, row) =>
          Array.from({ length: displayCols }).map((_, col) => {
            const idx = row * plant.plantsPerRow + col;
            if (idx >= plant.count) return null;
            return (
              <div
                key={`${row}-${col}`}
                className={styles.plantDot}
                style={{
                  left: Math.round(col * stepX + (stepX - iconSize) / 2),
                  top: Math.round(row * stepY + (stepY - iconSize) / 2),
                  width: iconSize,
                  height: iconSize,
                }}
              >
                {plant.imageUrl
                  ? <img src={plant.imageUrl} width={iconSize} height={iconSize} alt="" style={{ objectFit: 'contain', display: 'block' }} />
                  : <SvgIcon icon={icons.seedling} size={iconSize} color={plant.color || theme.colors.plantText} />
                }
              </div>
            );
          }),
        )}

        <div className={styles.nameTag}>
          {plant.name}
          {isDetailMode ? ` · ${plant.count}` : ''}
        </div>

        <button
          className={styles.editButton}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(plant);
          }}
          aria-label="Edit plant"
        >
          <SvgIcon icon={icons.edit} size={10} color={theme.colors.plantText} />
        </button>

        {isTruncated && (
          <div className={styles.badge}>
            {plantRows}×{plant.plantsPerRow}
          </div>
        )}

        {hasViolation && <WarningBadge />}
      </div>
    </div>
  );
};