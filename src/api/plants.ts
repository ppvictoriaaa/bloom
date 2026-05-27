import apiClient from './client';
import type { PlantData } from '../modules/garden/types/garden.types';

const resolveImageUrl = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('/')) return `${apiClient.defaults.baseURL}${url}`;
  return url;
};

export const plantsApi = {
  getAll: () =>
    apiClient.get<PlantData[]>('/plants').then((res) => ({
      ...res,
      data: res.data.map((p) => ({ ...p, imageUrl: resolveImageUrl(p.imageUrl) })),
    })),
};
