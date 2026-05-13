export interface PlotConfig {
  scale: number;
  plotScale: import('../utils/grid.utils').PlotScale;
  plotWidthM: number;
  plotHeightM: number;
}

export const PlantCategory = {
  TREE: 'tree',
  VEGETABLE: 'vegetable',
  BERRY: 'berry',
  FLOWER: 'flower',
  HERB: 'herb',
} as const;

export type PlantCategory = (typeof PlantCategory)[keyof typeof PlantCategory];

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
