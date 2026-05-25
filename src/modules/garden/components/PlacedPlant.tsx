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
  plotWidthM: number;
  plotHeightM: number;
  hasViolation: boolean;
  onEdit: (plant: PlacedPlantType) => void;
  onResize: (id: string, count: number, plantsPerRow: number, x: number, y: number) => void;
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

type Corner = 'tl' | 'tr' | 'bl' | 'br';

interface ResizeOrigin {
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  startPlantX: number;
  startPlantY: number;
  corner: Corner;
}

const CORNERS: Corner[] = ['tl', 'tr'];

export const PlacedPlant = ({
  plant,
  cellSize,
  plotScale,
  plotWidthM,
  plotHeightM,
  hasViolation,
  onEdit,
  onResize,
  onHover,
}: Props) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `placed-${plant.id}`,
    data: { type: 'existing', placedId: plant.id, x: plant.x, y: plant.y },
  });

  const resizeOrigin = useRef<ResizeOrigin | null>(null);
  const [previewM, setPreviewM] = useState<{ w: number; h: number; x: number; y: number } | null>(null);

  const { metersPerCell } = plotScale;

  const displayX = previewM?.x ?? plant.x;
  const displayY = previewM?.y ?? plant.y;
  const leftPx = (displayX / metersPerCell) * cellSize;
  const topPx = (displayY / metersPerCell) * cellSize;

  const plantRows = Math.ceil(plant.count / plant.plantsPerRow);
  const spacingPx = (plant.spacing / metersPerCell) * cellSize;

  const baseWM = plant.plantsPerRow * plant.spacing;
  const baseHM = plantRows * plant.spacing;

  const displayWM = previewM?.w ?? baseWM;
  const displayHM = previewM?.h ?? baseHM;

  const totalWidth  = Math.max(MIN_BOX_PX, (displayWM / metersPerCell) * cellSize);
  const totalHeight = Math.max(MIN_BOX_PX, (displayHM / metersPerCell) * cellSize);

  const showAll = plant.count <= SHOW_ALL_THRESHOLD;
  const displayRows = showAll ? plantRows : Math.min(plantRows, 6);
  const displayCols = showAll ? plant.plantsPerRow : Math.min(plant.plantsPerRow, 6);
  const isTruncated = !showAll;

  const isDetailMode = spacingPx >= DETAIL_THRESHOLD_PX && showAll;
  const stepX = isDetailMode ? spacingPx : totalWidth / displayCols;
  const stepY = isDetailMode ? spacingPx : totalHeight / displayRows;
  const iconSize = Math.max(4, Math.floor(Math.min(stepX, stepY) * 0.72));

  // ── Resize handlers ────────────────────────────────────────────────────
  const makeResizeDown = (corner: Corner) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeOrigin.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: baseWM,
      startH: baseHM,
      startPlantX: plant.x,
      startPlantY: plant.y,
      corner,
    };
  };

  const handleResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const o = resizeOrigin.current;
    if (!o) return;
    const mPerPx = metersPerCell / cellSize;
    const dx = (e.clientX - o.startX) * mPerPx;
    const dy = (e.clientY - o.startY) * mPerPx;
    const rightAnchor  = o.startPlantX + o.startW;
    const bottomAnchor = o.startPlantY + o.startH;
    const min = plant.spacing;

    let newX = o.startPlantX;
    let newY = o.startPlantY;
    let newW: number;
    let newH: number;

    if (o.corner === 'br' || o.corner === 'tr') {
      newW = Math.max(min, Math.min(o.startW + dx, plotWidthM - o.startPlantX));
    } else {
      newX = Math.max(0, Math.min(o.startPlantX + dx, rightAnchor - min));
      newW = rightAnchor - newX;
    }

    if (o.corner === 'br' || o.corner === 'bl') {
      newH = Math.max(min, Math.min(o.startH + dy, plotHeightM - o.startPlantY));
    } else {
      newY = Math.max(0, Math.min(o.startPlantY + dy, bottomAnchor - min));
      newH = bottomAnchor - newY;
    }

    setPreviewM({ w: newW, h: newH, x: newX, y: newY });
  };

  const handleResizeUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const o = resizeOrigin.current;
    if (!o) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    resizeOrigin.current = null;

    const p = previewM;
    setPreviewM(null);
    if (!p) return;

    const cellSnap  = metersPerCell;
    const plantSnap = plant.spacing;
    const fixedRight  = o.startPlantX + o.startW;
    const fixedBottom = o.startPlantY + o.startH;

    let snappedX = o.startPlantX;
    let snappedY = o.startPlantY;
    let snappedW: number;
    let snappedH: number;

    if (o.corner === 'tr') {
      snappedW = Math.max(plantSnap, Math.round(p.w / plantSnap) * plantSnap);
    } else {
      snappedX = Math.max(0, Math.min(Math.round(p.x / cellSnap) * cellSnap, fixedRight - plantSnap));
      snappedW = Math.max(plantSnap, Math.round((fixedRight - snappedX) / plantSnap) * plantSnap);
    }

    if (o.corner === 'bl') {
      snappedH = Math.max(plantSnap, Math.round(p.h / plantSnap) * plantSnap);
    } else {
      snappedY = Math.max(0, Math.min(Math.round(p.y / cellSnap) * cellSnap, fixedBottom - plantSnap));
      snappedH = Math.max(plantSnap, Math.round((fixedBottom - snappedY) / plantSnap) * plantSnap);
    }

    const newPlantsPerRow = Math.max(1, Math.round(snappedW / plantSnap));
    const newRows         = Math.max(1, Math.round(snappedH / plantSnap));
    onResize(plant.id, newRows * newPlantsPerRow, newPlantsPerRow, snappedX, snappedY);
  };

  const isResizing = previewM !== null;

  return (
    <div
      ref={setNodeRef}
      data-placed-id={plant.id}
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
        className={`${styles.area} ${isResizing ? styles.areaResizing : ''}`}
        style={{
          width: Math.round(totalWidth),
          height: Math.round(totalHeight),
          ...(plant.color && {
            background: `${plant.color}4a`,
            borderColor: `${plant.color}50`,
          }),
        }}
      >
        {!isResizing && Array.from({ length: displayRows }).flatMap((_, row) =>
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

        {!isResizing && (
          <>
            <div className={styles.nameTag}>
              {plant.customName ?? plant.name}
              {isDetailMode ? ` · ${plant.count}` : ''}
            </div>

            <button
              className={styles.editButton}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onEdit(plant); }}
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
          </>
        )}

        {isResizing && (
          <div className={styles.resizeLabel}>
            {displayWM.toFixed(1)} × {displayHM.toFixed(1)} m
          </div>
        )}

        {CORNERS.map((corner) => (
          <div
            key={corner}
            className={`${styles.resizeHandle} ${styles[`resizeHandle${corner.toUpperCase()}`]}`}
            onPointerDown={makeResizeDown(corner)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
          />
        ))}
      </div>
    </div>
  );
};
