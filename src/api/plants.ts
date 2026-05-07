import apiClient from './client';
import type { PlantData } from '../modules/garden/types/garden.types';

export const plantsApi = {
  getAll: () => apiClient.get<PlantData[]>('/plants'),
};
