import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gardensApi, type GardenPayload, type GardenData } from '../../../api/gardens';
import type { PlacedPlant } from '../types/garden.types';
import type { PlotScale } from '../utils/grid.utils';
import type { AxiosResponse } from 'axios';

interface GardenState {
  placedPlants: PlacedPlant[];
  plotWidthM: number;
  plotHeightM: number;
  plotScale: PlotScale;
}

type LoadGardenFn = (data: {
  placedPlants: PlacedPlant[];
  plotWidthM: number;
  plotHeightM: number;
  metersPerCell: number;
}) => void;

type MutationPayload =
  | { type: 'create'; data: GardenPayload }
  | { type: 'update'; id: string; data: GardenPayload };

export const useGardenSave = (
  gardenState: GardenState,
  loadGarden: LoadGardenFn,
  // null = new garden (blank editor, create on save)
  // string = edit existing garden (auto-load, update on save)
  gardenId: string | null,
) => {
  const queryClient = useQueryClient();
  const [showNameModal, setShowNameModal] = useState(false);
  const [loadedGardenId, setLoadedGardenId] = useState<string | null>(null);
  // Tracks the garden created this session so subsequent saves update it
  const [createdGardenId, setCreatedGardenId] = useState<string | null>(null);

  const { data: gardens = [], isLoading: isLoadingGarden } = useQuery({
    queryKey: ['gardens'],
    queryFn: () => gardensApi.getAll().then((r) => r.data),
  });

  // The garden being edited:
  // - gardenId prop is a string → use that specific garden
  // - gardenId prop is null + we already created one → use the created garden
  // - gardenId prop is null + nothing created → null (blank editor)
  const activeId = gardenId ?? createdGardenId;
  const garden = activeId ? (gardens.find((g) => g._id === activeId) ?? null) : null;

  // Auto-load only when opening an existing garden (gardenId prop is a string)
  useEffect(() => {
    if (gardenId && garden && garden._id !== loadedGardenId) {
      setLoadedGardenId(garden._id);
      loadGarden({
        placedPlants: garden.placedPlants,
        plotWidthM: garden.plotWidthM,
        plotHeightM: garden.plotHeightM,
        metersPerCell: garden.metersPerCell,
      });
    }
  }, [garden, gardenId, loadedGardenId, loadGarden]);

  const { mutate, isPending: isSaving } = useMutation({
    mutationFn: (payload: MutationPayload): Promise<AxiosResponse<GardenData>> =>
      payload.type === 'create'
        ? gardensApi.create(payload.data)
        : gardensApi.update(payload.id, payload.data),
    onSuccess: (response, variables) => {
      if (variables.type === 'create') {
        setCreatedGardenId(response.data._id);
      }
      setShowNameModal(false);
      queryClient.invalidateQueries({ queryKey: ['gardens'] });
    },
  });

  const buildPayload = (name: string): GardenPayload => ({
    name,
    placedPlants: gardenState.placedPlants,
    plotWidthM: gardenState.plotWidthM,
    plotHeightM: gardenState.plotHeightM,
    metersPerCell: gardenState.plotScale.metersPerCell,
  });

  const saveGarden = () => {
    if (!garden) {
      setShowNameModal(true);
    } else {
      mutate({ type: 'update', id: garden._id, data: buildPayload(garden.name) });
    }
  };

  const confirmSave = (name: string) => {
    if (garden) {
      mutate({ type: 'update', id: garden._id, data: buildPayload(name) });
    } else {
      mutate({ type: 'create', data: buildPayload(name) });
    }
  };

  const dismissModal = () => setShowNameModal(false);

  return { saveGarden, isSaving, isLoadingGarden, showNameModal, confirmSave, dismissModal };
};
