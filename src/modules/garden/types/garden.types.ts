export type PlotType = 'vegetable' | 'ornamental' | 'mixed';

export interface PlotConfig {
  scale: number;
  plotScale: import('../utils/grid.utils').PlotScale;
  plotWidthM: number;
  plotHeightM: number;
}

export type PlantCategory = 'vegetable' | 'berry' | 'tree' | 'flower' | 'herb' | 'unknown';

export interface PlacementRules {
  minCropGapM: number;
  minTreeGapM: number;
}

export interface PlantData {
  _id: string;
  name: string;
  slug: string;
  category: PlantCategory;
  imageUrl: string;
  color: string;
}

export interface PlacedPlant {
  id: string;
  plantId: string;
  name: string;
  slug: string;
  category?: PlantCategory;
  color?: string;
  imageUrl?: string;
  x: number;
  y: number;
  count: number;
  plantsPerRow: number;
  spacing: number;
}

export interface PendingDrop {
  plantId: string;
  name: string;
  slug: string;
  category?: PlantCategory;
  color?: string;
  imageUrl?: string;
  x: number;
  y: number;
}

export type DragData =
  | { type: 'new'; plant: PlantData }
  | { type: 'existing'; placedId: string; x: number; y: number };
