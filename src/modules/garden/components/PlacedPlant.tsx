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
  onEdit: (plant: PlacedPlantType) => void;
  onHover: (id: string | null) => void;
}

const DETAIL_THRESHOLD_PX = 10;
// always show every plant icon if total count is ≤ this value.
const SHOW_ALL_THRESHOLD = 30;
const MIN_BOX_PX = 24;

export const PlacedPlant = ({ plant, cellSize, plotScale, onEdit, onHover }: Props) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `placed-${plant.id}`,
    data: { type: 'existing', placedId: plant.id, x: plant.x, y: plant.y },
  });

  const { metersPerCell } = plotScale;

  // position: plant.x / plant.y are meters -> convert to pixels
  const leftPx = (plant.x / metersPerCell) * cellSize;
  const topPx = (plant.y / metersPerCell) * cellSize;

  const plantRows = Math.ceil(plant.count / plant.plantsPerRow);
  // pixels per spacing unit at current scale
  const spacingPx = (plant.spacing / metersPerCell) * cellSize;

  const showAll = plant.count <= SHOW_ALL_THRESHOLD;
  const displayRows = showAll ? plantRows : Math.min(plantRows, 6);
  const displayCols = showAll ? plant.plantsPerRow : Math.min(plant.plantsPerRow, 6);
  const isTruncated = !showAll;

  const physicalW = plant.plantsPerRow * spacingPx;
  const physicalH = plantRows * spacingPx;

  // Ensure minimum visible box
  const totalWidth = Math.max(MIN_BOX_PX, physicalW);
  const totalHeight = Math.max(MIN_BOX_PX, physicalH);

  // Detail mode: real spacing positions - only when ALL plants are shown (count ≤ 30)
  // Compact mode: icons distributed evenly — used when count > 30 or spacing is too small
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
      </div>
    </div>
  );
};
