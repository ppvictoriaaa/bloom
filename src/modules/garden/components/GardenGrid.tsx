import { useCallback, useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { PlacedPlant, PlotConfig } from '../types/garden.types';
import { PlacedPlant as PlacedPlantComponent } from './PlacedPlant';
import { BASE_CELL_SIZE, MAJOR_GRID_INTERVAL, formatLength } from '../utils/grid.utils';
import { getViolatingIds } from '../utils/plant-overlap.utils';
import { theme } from '../../../styles/theme';
import styles from '../styles/garden-grid.module.css';

interface Props {
  placedPlants: PlacedPlant[];
  plotConfig: PlotConfig;
  onEditPlant: (plant: PlacedPlant) => void;
  onRemovePlant: (id: string) => void;
  onResizePlant: (id: string, count: number, plantsPerRow: number, x: number, y: number) => void;
  onCellSizeChange: (cellSize: number) => void;
}

export const GardenGrid = ({ placedPlants, plotConfig, onEditPlant, onRemovePlant, onResizePlant, onCellSizeChange }: Props) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'garden-grid' });
  const viewportRef = useRef<HTMLDivElement>(null);

  const [cellSize, setCellSize] = useState(BASE_CELL_SIZE);
  const [hoveredPlantId, setHoveredPlantId] = useState<string | null>(null);

  const { scale, plotScale, plotWidthM, plotHeightM } = plotConfig;
  const { metersPerCell } = plotScale;
  const gridCols = Math.max(1, plotWidthM / metersPerCell);
  const gridRows = Math.max(1, plotHeightM / metersPerCell);

  const computeCellSize = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const base = Math.max(
      4,
      Math.floor(Math.min(el.clientWidth / gridCols, el.clientHeight / gridRows)),
    );
    const cs = Math.max(4, Math.round(base * scale));
    setCellSize(cs);
    onCellSizeChange(cs);
  }, [gridCols, gridRows, scale, onCellSizeChange]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(computeCellSize);
    ro.observe(el);
    computeCellSize();
    return () => ro.disconnect();
  }, [computeCellSize]);

  const majorCellSize = metersPerCell >= 5 ? cellSize : cellSize * MAJOR_GRID_INTERVAL;
  const minorCellSize = metersPerCell >= 5 ? Math.round(cellSize / 2) : cellSize;

  return (
    <div ref={viewportRef} className={styles.viewport}>
      <div
        ref={setNodeRef}
        className={`${styles.grid} ${isOver ? styles.gridOver : ''}`}
        style={
          {
            width: gridCols * cellSize,
            height: gridRows * cellSize,
            '--minor-size': `${minorCellSize}px`,
            '--major-size': `${majorCellSize}px`,
            '--major-color': metersPerCell >= 5 ? theme.colors.gridLineMajorLarge : theme.colors.gridLineMajor,
            '--major-width': metersPerCell >= 5 ? '2px' : '1px',
          } as React.CSSProperties
        }
      >
        {(() => {
          const violatingIds = getViolatingIds(placedPlants);
          return placedPlants.map((plant) => (
            <PlacedPlantComponent
              key={plant.id}
              plant={plant}
              cellSize={cellSize}
              plotScale={plotScale}
              plotWidthM={plotWidthM}
              plotHeightM={plotHeightM}
              hasViolation={violatingIds.has(plant.id)}
              onEdit={onEditPlant}
              onRemove={onRemovePlant}
              onResize={onResizePlant}
              onHover={setHoveredPlantId}
            />
          ));
        })()}

        {(() => {
          const hovered = hoveredPlantId
            ? placedPlants.find((p) => p.id === hoveredPlantId) ?? null
            : null;
          if (!hovered) return null;

          const toPx = (m: number) => (m / metersPerCell) * cellSize;
          const hRows = Math.ceil(hovered.count / hovered.plantsPerRow);
          const hx1 = toPx(hovered.x);
          const hy1 = toPx(hovered.y);
          const hx2 = toPx(hovered.x + hovered.plantsPerRow * hovered.spacing);
          const hy2 = toPx(hovered.y + hRows * hovered.spacing);
          const hcx = (hx1 + hx2) / 2;
          const hcy = (hy1 + hy2) / 2;

          return (
            <svg
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                overflow: 'visible',
                zIndex: 20,
              }}
            >
              {placedPlants
                .filter((p) => p.id !== hoveredPlantId)
                .map((other) => {
                  const oRows = Math.ceil(other.count / other.plantsPerRow);
                  const ox1 = toPx(other.x);
                  const oy1 = toPx(other.y);
                  const ox2 = toPx(other.x + other.plantsPerRow * other.spacing);
                  const oy2 = toPx(other.y + oRows * other.spacing);
                  const ocx = (ox1 + ox2) / 2;
                  const ocy = (oy1 + oy2) / 2;

                  const nax = Math.max(hx1, Math.min(ocx, hx2));
                  const nay = Math.max(hy1, Math.min(ocy, hy2));
                  const nbx = Math.max(ox1, Math.min(hcx, ox2));
                  const nby = Math.max(oy1, Math.min(hcy, oy2));

                  const dx = Math.max(
                    0,
                    Math.max(hovered.x, other.x) -
                      Math.min(
                        hovered.x + hovered.plantsPerRow * hovered.spacing,
                        other.x + other.plantsPerRow * other.spacing,
                      ),
                  );
                  const dy = Math.max(
                    0,
                    Math.max(hovered.y, other.y) -
                      Math.min(
                        hovered.y + hRows * hovered.spacing,
                        other.y + oRows * other.spacing,
                      ),
                  );
                  const label = formatLength(Math.sqrt(dx * dx + dy * dy));
                  const mx = (nax + nbx) / 2;
                  const my = (nay + nby) / 2;

                  return (
                    <g key={other.id}>
                      <line
                        x1={nax} y1={nay} x2={nbx} y2={nby}
                        stroke={theme.colors.lineStroke}
                        strokeWidth="1"
                        strokeDasharray="4 3"
                        opacity="0.65"
                      />
                      <text
                        x={mx}
                        y={my + 4}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        fill={theme.colors.lineLabel}
                        stroke={theme.colors.surface}
                        strokeWidth="3"
                        paintOrder="stroke"
                        fontFamily="sans-serif"
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}
            </svg>
          );
        })()}
      </div>
    </div>
  );
};
