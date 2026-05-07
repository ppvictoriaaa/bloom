import { useQuery } from '@tanstack/react-query';
import { plantsApi } from '../../../api/plants';
import type { PlantData } from '../types/garden.types';

export const usePlants = () => {
  const { data: plants = [], isLoading } = useQuery<PlantData[]>({
    queryKey: ['plants'],
    queryFn: () => plantsApi.getAll().then((r) => r.data),
  });

  return { plants, isLoading };
};
