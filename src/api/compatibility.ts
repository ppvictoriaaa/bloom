import apiClient from './client';

export interface CompatibilityPlantInput {
  id: string;
  slug: string;
  category: string;
}

export interface CompatibilityWarning {
  type: 'incompatible' | 'good_companion';
  severity: 'high' | 'medium' | 'low';
  reason: string;
  plantAId: string;
  plantBId: string;
  effectRadiusM: number;
}

export const compatibilityApi = {
  evaluate: (plants: CompatibilityPlantInput[]) =>
    apiClient.post<{ warnings: CompatibilityWarning[] }>('/compatibility', { plants }),
};
