import { useState, useEffect, useRef } from 'react';
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

export type AutoSaveStatus = 'idle' | 'saving' | 'saved';

export const useGardenSave = (
  gardenState: GardenState,
  loadGarden: LoadGardenFn,
  gardenId: string | null,
  onCreated?: (gardenId: string, name: string) => void,
) => {
  const queryClient = useQueryClient();
  const [showNameModal, setShowNameModal] = useState(false);
  const [loadedGardenId, setLoadedGardenId] = useState<string | null>(null);
  const [createdGardenId, setCreatedGardenId] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');

  const { data: gardens = [], isLoading: isLoadingGarden } = useQuery({
    queryKey: ['gardens'],
    queryFn: () => gardensApi.getAll().then((r) => r.data),
  });

  const activeId = gardenId ?? createdGardenId;
  const garden = activeId ? (gardens.find((g) => g._id === activeId) ?? null) : null;

  // Use a ref so the auto-save timeout always reads the latest garden without
  // including it as an effect dependency (avoids triggering on metadata-only changes)
  const gardenRef = useRef(garden);
  gardenRef.current = garden;

  // Load the garden into the editor when opening an existing one
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
        onCreated?.(response.data._id, response.data.name);
      }
      setShowNameModal(false);
      setAutoSaveStatus('saved');
      queryClient.invalidateQueries({ queryKey: ['gardens'] });
    },
  });

  const { placedPlants, plotWidthM, plotHeightM, plotScale } = gardenState;

  const buildPayload = (name: string): GardenPayload => ({
    name,
    placedPlants,
    plotWidthM,
    plotHeightM,
    metersPerCell: plotScale.metersPerCell,
  });

  // Auto-save: debounce 1.5 s after any state change, but only once a garden exists
  useEffect(() => {
    if (!gardenRef.current) return;

    setAutoSaveStatus('idle');
    const timer = setTimeout(() => {
      const g = gardenRef.current;
      if (!g) return;
      setAutoSaveStatus('saving');
      mutate({ type: 'update', id: g._id, data: buildPayload(g.name) });
    }, 1500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placedPlants, plotWidthM, plotHeightM, plotScale.metersPerCell]);

  // Reset "saved" badge after 2 s
  useEffect(() => {
    if (autoSaveStatus !== 'saved') return;
    const timer = setTimeout(() => setAutoSaveStatus('idle'), 2000);
    return () => clearTimeout(timer);
  }, [autoSaveStatus]);

  // True only before first save and the user has made meaningful changes
  const hasUnsavedChanges = !garden && placedPlants.length > 0;

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

  return {
    saveGarden,
    isSaving,
    isLoadingGarden,
    showNameModal,
    confirmSave,
    dismissModal,
    hasUnsavedChanges,
    autoSaveStatus,
  };
};
