import type { PlacedPlant, PlantCategory } from '../types/garden.types';
import { getSnapStep } from './grid.utils';

export const MIN_DISTANCE_RULES = {
  sameType: {
    tree: 4,
    vegetable: 0.4,
    berry: 0.7,
    flower: 0.3,
    herb: 0.3,
  },
  differentTypes: {
    tree: { vegetable: 2, berry: 2, flower: 1.5, herb: 1.5 },
    vegetable: { tree: 2, berry: 0.7, flower: 0.4, herb: 0.3 },
    berry: { tree: 2, vegetable: 0.7, flower: 0.5, herb: 0.5 },
    flower: { tree: 1.5, vegetable: 0.4, berry: 0.5, herb: 0.3 },
    herb: { tree: 1.5, vegetable: 0.3, berry: 0.5, flower: 0.3 },
  },
} as const;

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

const getRequiredGap = (a: PlantBounds, b: PlantBounds): number => {
  if (a.plantId === b.plantId) return 0;
  const catA = a.category as string;
  const catB = b.category as string;
  if (!catA || !catB) return 0.3;
  const same = MIN_DISTANCE_RULES.sameType as Record<string, number>;
  const diff = MIN_DISTANCE_RULES.differentTypes as Record<string, Record<string, number>>;
  if (catA === catB) return same[catA] ?? 0.3;
  return diff[catA]?.[catB] ?? 0.3;
};

const boundsOverlap = (a: PlantBounds, b: PlantBounds, gap: number): boolean =>
  !(
    a.x + a.w + gap <= b.x ||
    a.x >= b.x + b.w + gap ||
    a.y + a.h + gap <= b.y ||
    a.y >= b.y + b.h + gap
  );

// Blocks only physical bounding-box overlap (gap = 0). Distance warnings are handled separately.
export const isPlacementValid = (
  incoming: PlantBounds,
  existingPlants: PlacedPlant[],
  excludeId?: string,
): boolean => {
  for (const plant of existingPlants) {
    if (plant.id === excludeId) continue;
    const existing = getPlantBounds(plant);
    if (boundsOverlap(incoming, existing, 0)) return false;
  }
  return true;
};

export const getViolatingIds = (placedPlants: PlacedPlant[]): Set<string> => {
  const violated = new Set<string>();
  for (let i = 0; i < placedPlants.length; i++) {
    for (let j = i + 1; j < placedPlants.length; j++) {
      const a = getPlantBounds(placedPlants[i]);
      const b = getPlantBounds(placedPlants[j]);
      const gap = getRequiredGap(a, b);
      if (boundsOverlap(a, b, gap)) {
        violated.add(placedPlants[i].id);
        violated.add(placedPlants[j].id);
      }
    }
  }
  return violated;
};

// Returns Map<plant.id, display names of plants it conflicts with>
export const getViolations = (placedPlants: PlacedPlant[]): Map<string, string[]> => {
  const violations = new Map<string, string[]>();
  for (let i = 0; i < placedPlants.length; i++) {
    for (let j = i + 1; j < placedPlants.length; j++) {
      const a = getPlantBounds(placedPlants[i]);
      const b = getPlantBounds(placedPlants[j]);
      if (boundsOverlap(a, b, getRequiredGap(a, b))) {
        const nameA = placedPlants[i].customName ?? placedPlants[i].name;
        const nameB = placedPlants[j].customName ?? placedPlants[j].name;
        if (!violations.has(placedPlants[i].id)) violations.set(placedPlants[i].id, []);
        if (!violations.has(placedPlants[j].id)) violations.set(placedPlants[j].id, []);
        violations.get(placedPlants[i].id)!.push(nameB);
        violations.get(placedPlants[j].id)!.push(nameA);
      }
    }
  }
  return violations;
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
  if (candidates.length === 0) {
    candidates.push({ x: 0, y: 0, dist: Math.abs(plant.x) + Math.abs(plant.y) });
  }
  candidates.sort((a, b) => a.dist - b.dist);

  for (const pos of candidates) {
    const bounds = getPlantBounds({ ...plant, x: pos.x, y: pos.y });
    if (isPlacementValid(bounds, existingPlants, excludeId)) {
      return { x: pos.x, y: pos.y };
    }
  }
  return null;
};