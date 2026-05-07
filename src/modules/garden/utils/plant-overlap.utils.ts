import type { PlacedPlant, PlantCategory, PlacementRules } from '../types/garden.types';
import { getSnapStep } from './grid.utils';

export const SAFE_CROP_GAP_M = 0.6;
export const MIN_TREE_GAP_M = 1.0;
export const SAFE_TREE_GAP_M = 2.0;
export const MAX_TREE_GAP_M = 5.0;

export const DEFAULT_PLACEMENT_RULES: PlacementRules = {
  minCropGapM: SAFE_CROP_GAP_M,
  minTreeGapM: SAFE_TREE_GAP_M,
};

export interface PlantBounds {
  x: number;
  y: number;
  w: number;
  h: number;
  plantId: string;
  spacing: number;
  category?: PlantCategory;
}

export const getPlantBounds = (
  plant: Pick<PlacedPlant, 'x' | 'y' | 'count' | 'plantsPerRow' | 'spacing' | 'plantId' | 'category'>,
): PlantBounds => {
  const plantRows = Math.ceil(plant.count / plant.plantsPerRow);
  return {
    x: plant.x,
    y: plant.y,
    w: plant.plantsPerRow * plant.spacing,
    h: plantRows * plant.spacing,
    plantId: plant.plantId,
    spacing: plant.spacing,
    category: plant.category,
  };
};

const getRequiredGap = (
  incoming: PlantBounds,
  existing: PlantBounds,
  rules: PlacementRules,
): number => {
  if (incoming.plantId === existing.plantId) return 0;
  const isTree = incoming.category === 'tree' || existing.category === 'tree';
  return isTree ? rules.minTreeGapM : rules.minCropGapM;
};

export const isPlacementValid = (
  incoming: PlantBounds,
  existingPlants: PlacedPlant[],
  excludeId?: string,
  rules: PlacementRules = DEFAULT_PLACEMENT_RULES,
): boolean => {
  for (const plant of existingPlants) {
    if (plant.id === excludeId) continue;

    const existing = getPlantBounds(plant);
    const gap = getRequiredGap(incoming, existing, rules);

    const overlaps = !(
      incoming.x + incoming.w + gap <= existing.x ||
      incoming.x >= existing.x + existing.w + gap ||
      incoming.y + incoming.h + gap <= existing.y ||
      incoming.y >= existing.y + existing.h + gap
    );

    if (overlaps) return false;
  }
  return true;
};

// Scans candidate positions (snapped to cell grid) and returns nearest valid one
export const findFreePosition = (
  plant: Pick<PlacedPlant, 'count' | 'plantsPerRow' | 'spacing' | 'plantId' | 'category'> & {
    x: number;
    y: number;
  },
  existingPlants: PlacedPlant[],
  plotWidthM: number,
  plotHeightM: number,
  metersPerCell: number,
  rules: PlacementRules = DEFAULT_PLACEMENT_RULES,
  excludeId?: string,
): { x: number; y: number } | null => {
  const plantRows = Math.ceil(plant.count / plant.plantsPerRow);
  const wM = plant.plantsPerRow * plant.spacing;
  const hM = plantRows * plant.spacing;

  const step = getSnapStep(metersPerCell);
  const candidates: Array<{ x: number; y: number; dist: number }> = [];
  for (let cy = 0; cy + hM <= plotHeightM; cy += step) {
    for (let cx = 0; cx + wM <= plotWidthM; cx += step) {
      candidates.push({ x: cx, y: cy, dist: Math.abs(cx - plant.x) + Math.abs(cy - plant.y) });
    }
  }
  // Also allow placement when plot is smaller than the plant area
  if (candidates.length === 0) {
    candidates.push({ x: 0, y: 0, dist: Math.abs(plant.x) + Math.abs(plant.y) });
  }
  candidates.sort((a, b) => a.dist - b.dist);

  for (const pos of candidates) {
    const bounds = getPlantBounds({ ...plant, x: pos.x, y: pos.y });
    if (isPlacementValid(bounds, existingPlants, excludeId, rules)) {
      return { x: pos.x, y: pos.y };
    }
  }
  return null;
};
