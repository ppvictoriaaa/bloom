import { useState, useEffect } from 'react';
import type { PlacedPlant } from '../types/garden.types';
import { compatibilityApi } from '../../../api/compatibility';

export interface ActiveWarning {
  id: string;
  type: 'incompatible' | 'good_companion';
  severity: 'high' | 'medium' | 'low';
  reason: string;
  effectRadiusM: number;
  affectedPlantIds: string[];
  affectedPlantNames: string[];
}

const getEdgeDist = (a: PlacedPlant, b: PlacedPlant): number => {
  const aRows = Math.ceil(a.count / a.plantsPerRow);
  const bRows = Math.ceil(b.count / b.plantsPerRow);
  const dx = Math.max(
    0,
    Math.max(a.x, b.x) -
      Math.min(a.x + a.plantsPerRow * a.spacing, b.x + b.plantsPerRow * b.spacing),
  );
  const dy = Math.max(
    0,
    Math.max(a.y, b.y) -
      Math.min(a.y + aRows * a.spacing, b.y + bRows * b.spacing),
  );
  return Math.sqrt(dx * dx + dy * dy);
};

export const useCompatibility = (placedPlants: PlacedPlant[]) => {
  const [activeWarnings, setActiveWarnings] = useState<ActiveWarning[]>([]);

  useEffect(() => {
    if (placedPlants.length < 2) {
      setActiveWarnings([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const inputs = placedPlants.map((p) => ({
          id: p.id,
          slug: p.slug,
          category: p.category ?? '',
        }));

        const { data } = await compatibilityApi.evaluate(inputs);

        // Group warnings by reason — multiple plant pairs with the same rule
        // collapse into one warning that lists all affected plants.
        const groups = new Map<
          string,
          {
            type: 'incompatible' | 'good_companion';
            severity: 'high' | 'medium' | 'low';
            reason: string;
            effectRadiusM: number;
            plantIds: Set<string>;
            plantNames: Map<string, string>;
          }
        >();

        for (const w of data.warnings) {
          if (w.type !== 'incompatible') continue;
          const plantA = placedPlants.find((p) => p.id === w.plantAId);
          const plantB = placedPlants.find((p) => p.id === w.plantBId);
          if (!plantA || !plantB) continue;
          if (getEdgeDist(plantA, plantB) > w.effectRadiusM) continue;

          const key = `${w.severity}|${w.reason}`;
          if (!groups.has(key)) {
            groups.set(key, {
              type: w.type,
              severity: w.severity,
              reason: w.reason,
              effectRadiusM: w.effectRadiusM,
              plantIds: new Set(),
              plantNames: new Map(),
            });
          }
          const g = groups.get(key)!;
          g.plantIds.add(w.plantAId);
          g.plantIds.add(w.plantBId);
          g.plantNames.set(w.plantAId, plantA.name);
          g.plantNames.set(w.plantBId, plantB.name);
        }

        const warnings: ActiveWarning[] = Array.from(groups.entries()).map(([key, g]) => ({
          id: key,
          type: g.type,
          severity: g.severity,
          reason: g.reason,
          effectRadiusM: g.effectRadiusM,
          affectedPlantIds: Array.from(g.plantIds),
          affectedPlantNames: Array.from(g.plantNames.values()),
        }));

        setActiveWarnings(warnings);
      } catch {
        // silently fail — don't block the UI
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [placedPlants]);

  return { activeWarnings };
};
