import { useState } from 'react';
import type { PlacedPlant, PendingDrop, PlotType, PlacementRules } from '../types/garden.types';
import {
  SCALE_STEP,
  clampScale,
  DEFAULT_PLOT_SCALE,
  DEFAULT_PLOT_WIDTH_M,
  DEFAULT_PLOT_HEIGHT_M,
} from '../utils/grid.utils';
import type { PlotScale } from '../utils/grid.utils';
import { DEFAULT_PLACEMENT_RULES } from '../utils/plant-overlap.utils';

export const useGardenState = () => {
  const [placedPlants, setPlacedPlants] = useState<PlacedPlant[]>([]);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [scale, setScale] = useState(1);
  const [plotScale, setPlotScale] = useState<PlotScale>(DEFAULT_PLOT_SCALE);
  const [plotWidthM, setPlotWidthM] = useState(DEFAULT_PLOT_WIDTH_M);
  const [plotHeightM, setPlotHeightM] = useState(DEFAULT_PLOT_HEIGHT_M);
  const [plotType, setPlotType] = useState<PlotType>('vegetable');
  const [placementRules, setPlacementRules] = useState<PlacementRules>(DEFAULT_PLACEMENT_RULES);

  const updatePlacementRules = (partial: Partial<PlacementRules>) =>
    setPlacementRules((prev) => ({ ...prev, ...partial }));

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

  const zoomIn = () => setScale((prev) => clampScale(prev + SCALE_STEP));
  const zoomOut = () => setScale((prev) => clampScale(prev - SCALE_STEP));

  const setPlotDimensions = (w: number, h: number) => {
    setPlotWidthM(w);
    setPlotHeightM(h);
  };

  const changePlotScale = (newScale: PlotScale) => {
    setPlotScale(newScale);
    setPlotWidthM((prev) => Math.max(prev, newScale.metersPerCell));
    setPlotHeightM((prev) => Math.max(prev, newScale.metersPerCell));
  };

  return {
    placedPlants,
    pendingDrop,
    scale,
    plotScale,
    plotWidthM,
    plotHeightM,
    plotType,
    placementRules,
    addPlant,
    movePlant,
    updatePlant,
    setPendingDrop,
    changePlotScale,
    setPlotDimensions,
    setPlotType,
    updatePlacementRules,
    zoomIn,
    zoomOut,
  };
};
