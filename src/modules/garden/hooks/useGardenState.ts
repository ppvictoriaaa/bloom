import { useState, useCallback } from 'react';
import type { PlacedPlant, PendingDrop } from '../types/garden.types';
import {
  SCALE_STEP,
  PLOT_SCALES,
  clampScale,
  DEFAULT_PLOT_SCALE,
  DEFAULT_PLOT_WIDTH_M,
  DEFAULT_PLOT_HEIGHT_M,
} from '../utils/grid.utils';
import type { PlotScale } from '../utils/grid.utils';

export const useGardenState = () => {
  const [placedPlants, setPlacedPlants] = useState<PlacedPlant[]>([]);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [scale, setScale] = useState(1);
  const [plotScale, setPlotScale] = useState<PlotScale>(DEFAULT_PLOT_SCALE);
  const [plotWidthM, setPlotWidthM] = useState(DEFAULT_PLOT_WIDTH_M);
  const [plotHeightM, setPlotHeightM] = useState(DEFAULT_PLOT_HEIGHT_M);
  // Tracks what the user actually wants — not inflated by scale minimums.
  // plotWidthM/plotHeightM = max(userDimensions, currentScale.metersPerCell).
  const [userDimensions, setUserDimensions] = useState({
    w: DEFAULT_PLOT_WIDTH_M,
    h: DEFAULT_PLOT_HEIGHT_M,
  });

  const addPlant = (plant: Omit<PlacedPlant, 'id'>) => {
    setPlacedPlants((prev) => [...prev, { ...plant, id: crypto.randomUUID() }]);
  };

  const movePlant = (id: string, x: number, y: number) => {
    setPlacedPlants((prev) => prev.map((p) => (p.id === id ? { ...p, x, y } : p)));
  };

  const updatePlant = (
    id: string,
    updates: Partial<Pick<PlacedPlant, 'count' | 'plantsPerRow' | 'spacing'>>,
  ) => {
    setPlacedPlants((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const loadGarden = useCallback(
    (data: { placedPlants: PlacedPlant[]; plotWidthM: number; plotHeightM: number; metersPerCell: number }) => {
      const scale = PLOT_SCALES.find((s) => s.metersPerCell === data.metersPerCell) ?? DEFAULT_PLOT_SCALE;
      setPlacedPlants(data.placedPlants);
      setPlotScale(scale);
      setPlotWidthM(data.plotWidthM);
      setPlotHeightM(data.plotHeightM);
      setUserDimensions({ w: data.plotWidthM, h: data.plotHeightM });
    },
    [],
  );

  const zoomIn = () => setScale((prev) => clampScale(prev + SCALE_STEP));
  const zoomOut = () => setScale((prev) => clampScale(prev - SCALE_STEP));

  const setPlotDimensions = (w: number, h: number) => {
    setUserDimensions({ w, h });
    setPlotWidthM(w);
    setPlotHeightM(h);
  };

  const changePlotScale = (newScale: PlotScale) => {
    setPlotScale(newScale);
    setPlotWidthM(Math.max(userDimensions.w, newScale.metersPerCell));
    setPlotHeightM(Math.max(userDimensions.h, newScale.metersPerCell));
  };

  return {
    placedPlants,
    pendingDrop,
    scale,
    plotScale,
    plotWidthM,
    plotHeightM,
    addPlant,
    movePlant,
    updatePlant,
    setPendingDrop,
    changePlotScale,
    setPlotDimensions,
    loadGarden,
    zoomIn,
    zoomOut,
  };
};