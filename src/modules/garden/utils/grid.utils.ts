export const BASE_CELL_SIZE = 24;
export const MAJOR_GRID_INTERVAL = 5;

export const DEFAULT_PLOT_WIDTH_M = 20;
export const DEFAULT_PLOT_HEIGHT_M = 15;

export const MAX_DISPLAY_ROWS = 10;
export const MAX_DISPLAY_COLS = 10;
export const MAX_INPUT_VALUE = 9999;

export const MIN_SCALE = 0.5;
export const MAX_SCALE = 3;
export const SCALE_STEP = 0.1;

export interface PlotScale {
  label: string;
  metersPerCell: number;
}

export const PLOT_SCALES: PlotScale[] = [
  { label: "0.5 m", metersPerCell: 0.5 },
  { label: "1 m", metersPerCell: 1 },
  { label: "2 m", metersPerCell: 2 },
  { label: "5 m", metersPerCell: 5 },
  { label: "10 m", metersPerCell: 10 },
  { label: "25 m", metersPerCell: 25 },
  { label: "50 m", metersPerCell: 50 },
  { label: "100 m", metersPerCell: 100 },
  { label: "500 m", metersPerCell: 500 },
  { label: "1 km", metersPerCell: 1000 },
];

export const DEFAULT_PLOT_SCALE = PLOT_SCALES[1];

export const formatLength = (meters: number): string => {
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${Number.isInteger(km) ? km : km.toFixed(1)} km`;
  }
  if (meters < 1) return `${Math.round(meters * 100)} cm`;
  return `${parseFloat(meters.toFixed(1))} m`;
};

export const getCellSize = (scale: number): number =>
  Math.round(BASE_CELL_SIZE * scale);

// Snap step in meters: fine-grained (max 1 m) so plants aren't stuck at full-cell increments.
// At sub-meter scales it stays equal to metersPerCell.
export const getSnapStep = (metersPerCell: number): number => {
  if (metersPerCell <= 0.5) return 0.05;
  if (metersPerCell <= 1) return 0.1;
  if (metersPerCell <= 2) return 0.2;
  if (metersPerCell <= 5) return 0.5;
  return Math.max(1, metersPerCell / 10);
};

// Returns position snapped to snap grid, expressed in meters.
export const screenToMeters = (
  offsetX: number,
  offsetY: number,
  cellSize: number,
  metersPerCell: number,
  plotWidthM: number,
  plotHeightM: number,
): { x: number; y: number } => {
  const snap = getSnapStep(metersPerCell);
  const mPerPx = metersPerCell / cellSize;
  const snap2 = (v: number, max: number) =>
    Math.max(0, Math.min(Math.round((v * mPerPx) / snap) * snap, max));
  return { x: snap2(offsetX, plotWidthM), y: snap2(offsetY, plotHeightM) };
};

// Moves a plant by a pixel delta, snapping to the fine-grained snap grid.
export const deltaToMeters = (
  currentXM: number,
  currentYM: number,
  deltaX: number,
  deltaY: number,
  cellSize: number,
  metersPerCell: number,
  plotWidthM: number,
  plotHeightM: number,
): { x: number; y: number } => {
  const snap = getSnapStep(metersPerCell);
  const mPerPx = metersPerCell / cellSize;
  const snap2 = (cur: number, delta: number, max: number) =>
    Math.max(
      0,
      Math.min(Math.round((cur + delta * mPerPx) / snap) * snap, max),
    );
  return {
    x: snap2(currentXM, deltaX, plotWidthM),
    y: snap2(currentYM, deltaY, plotHeightM),
  };
};

export const clampScale = (scale: number): number =>
  Math.max(MIN_SCALE, Math.min(MAX_SCALE, parseFloat(scale.toFixed(1))));
