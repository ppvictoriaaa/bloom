import apiClient from './client';
import type { PlacedPlant } from '../modules/garden/types/garden.types';

export interface GardenPayload {
  name: string;
  placedPlants: PlacedPlant[];
  plotWidthM: number;
  plotHeightM: number;
  metersPerCell: number;
}

export interface GardenData extends GardenPayload {
  _id: string;
  userId: string;
}

export const gardensApi = {
  getAll: () => apiClient.get<GardenData[]>('/gardens'),
  create: (data: GardenPayload) => apiClient.post<GardenData>('/gardens', data),
  update: (id: string, data: GardenPayload) => apiClient.put<GardenData>(`/gardens/${id}`, data),
  remove: (id: string) => apiClient.delete(`/gardens/${id}`),
};
