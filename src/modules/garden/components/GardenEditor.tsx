import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { usePlants } from '../hooks/usePlants';
import { useGardenState } from '../hooks/useGardenState';
import { useGardenSave } from '../hooks/useGardenSave';
import { useCompatibility } from '../hooks/useCompatibility';
import type { ActiveWarning } from '../hooks/useCompatibility';
import { GardenNameModal } from './GardenNameModal';
import { GardenGrid } from './GardenGrid';
import { GardenToolbar } from './GardenToolbar';
import { PlantsSidebar } from './PlantsSidebar';
import { PlantSettingsModal } from './PlantSettingsModal';
import { WarningsPanel } from './WarningsPanel';
import { WarningArrows } from './WarningArrows';
import { CalendarSetupModal } from './CalendarSetupModal';
import { CalendarView } from './CalendarView';
import { MiniCalendar } from './MiniCalendar';
import { NotificationSettingsModal } from '../../notifications/NotificationSettingsModal';
import { AddPlantsModal } from './AddPlantsModal';
import type { AddPlantsResult } from './AddPlantsModal';
import { DuplicatePlantModal } from './DuplicatePlantModal';
import { SvgIcon } from '../../../components/ui/SvgIcon';
import { icons } from '../../../components/ui/icons';
import { theme } from '../../../styles/theme';
import { SplitLayout } from '../../../components/layout/SplitLayout';
import { screenToMeters, deltaToMeters } from '../utils/grid.utils';
import {
  getPlantBounds,
  isPlacementValid,
  findFreePosition,
} from '../utils/plant-overlap.utils';
import type { DragData, PlantData, PlacedPlant, PlotConfig, PendingDrop } from '../types/garden.types';
import { useAuthStore } from '../../../store/auth.store';
import { gardensApi } from '../../../api/gardens';
import { recommendationsApi } from '../../../api/recommendations';
import type { CalendarResponse } from '../../../api/recommendations';
import type { CalendarSetupResult } from './CalendarSetupModal';
import { toast } from '../../../store/toast.store';
import styles from '../styles/garden-editor.module.css';

interface Props {
  gardenId: string | null;
  onUnsavedStateChange: (hasUnsaved: boolean) => void;
  onCreated?: (gardenId: string, name: string) => void;
}

export const GardenEditor = ({ gardenId, onUnsavedStateChange, onCreated }: Props) => {
  const { plants, isLoading } = usePlants();
  const {
    placedPlants,
    pendingDrop,
    scale,
    plotScale,
    plotWidthM,
    plotHeightM,
    addPlant,
    movePlant,
    updatePlant,
    setPendingDrop,
    changePlotScale,
    setPlotDimensions,
    loadGarden,
    removePlant,
    zoomIn,
    zoomOut,
  } = useGardenState();

  const {
    saveGarden,
    isSaving,
    showNameModal,
    confirmSave,
    dismissModal,
    hasUnsavedChanges,
    autoSaveStatus,
    activeGardenId,
    gardenName,
  } = useGardenSave(
    { placedPlants, plotWidthM, plotHeightM, plotScale },
    loadGarden,
    gardenId,
    onCreated,
  );

  const user = useAuthStore((s) => s.user);
  const [calendarView, setCalendarView] = useState<'none' | 'setup' | 'full' | 'mini'>('none');
  const [calendarData, setCalendarData] = useState<CalendarResponse | null>(null);
  const [lastCalendarSetup, setLastCalendarSetup] = useState<CalendarSetupResult | null>(null);
  const [showAddPlantsModal, setShowAddPlantsModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [calendarVersion, setCalendarVersion] = useState(0);
  const [pendingDuplicateCheck, setPendingDuplicateCheck] = useState<PendingDrop | null>(null);

  const isCalendarOutdated = useMemo(() => {
    if (!calendarData) return false;
    const currentKeys = new Set(placedPlants.map((p) => p.customName ?? p.slug));
    const calendarSlugs = new Set(calendarData.events.map((e) => e.plantLabel ?? e.plantSlug));
    for (const key of calendarSlugs) {
      if (!currentKeys.has(key)) return true;
    }
    return false;
  }, [calendarData, placedPlants]);

  const newPlantsForCalendar = useMemo(() => {
    if (!calendarData) return [];
    const calendarKeys = new Set(calendarData.events.map((e) => e.plantLabel ?? e.plantSlug));
    const seen = new Set<string>();
    return placedPlants.filter((p) => {
      const key = p.customName ?? p.slug;
      if (calendarKeys.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [placedPlants, calendarData]);

  const plantInfoBySlug = useMemo(() => {
    const map: Record<string, { name: string; imageUrl?: string }> = {};
    for (const p of placedPlants) {
      const key = p.customName ?? p.slug;
      if (map[key]) continue;
      map[key] = { name: p.customName ?? p.name, imageUrl: p.imageUrl };
    }
    return map;
  }, [placedPlants]);

  const plantingDays = useMemo(() => {
    const map: Record<string, { name: string; imageUrl?: string }[]> = {};
    const seen = new Set<string>();
    for (const p of placedPlants) {
      if (!p.plantedAt) continue;
      const key = p.customName ?? p.slug;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!map[p.plantedAt]) map[p.plantedAt] = [];
      map[p.plantedAt].push({ name: p.customName ?? p.name, imageUrl: p.imageUrl });
    }
    return map;
  }, [placedPlants]);

  useEffect(() => {
    if (!activeGardenId) return;

    const raw = localStorage.getItem(`calendar-setup-${activeGardenId}`);
    if (raw) {
      try { setLastCalendarSetup(JSON.parse(raw)); } catch {}
    }

    recommendationsApi.getCalendar(activeGardenId)
      .then((res) => {
        setCalendarData(res.data);
        setCalendarView('mini');
      })
      .catch((err) => {
        if (err?.response?.status !== 404) {
          toast.error('Failed to load calendar data.');
        }
      });
  }, [activeGardenId]);

  const handleCalendarOpen = () => {
    if (calendarData) {
      setCalendarView('full');
    } else {
      setCalendarView('setup');
    }
  };

  const handleCalendarGenerate = async (result: CalendarSetupResult) => {
    if (!user) throw new Error('You must be logged in.');
    if (!activeGardenId) throw new Error('Save your garden before generating a calendar.');

    // Build updated plants list with variety/plantedAt from setup
    const updatedPlants = placedPlants.map((p) => {
      const ps = result.plantSettings.find((s) => s.plantId === p.id);
      return ps ? { ...p, variety: ps.variety || undefined, plantedAt: ps.plantedAt } : p;
    });

    // Sync variety/plantedAt into React state
    result.plantSettings.forEach((ps) => {
      updatePlant(ps.plantId, { variety: ps.variety || undefined, plantedAt: ps.plantedAt });
    });

    // Save garden with updated plant data so recommendation-service can read it
    const name = gardenName ?? (await gardensApi.getAll().then((r) => r.data.find((g) => g._id === activeGardenId)?.name));
    if (!name) throw new Error('Could not load garden name. Please try again.');

    await gardensApi.update(activeGardenId, {
      name,
      placedPlants: updatedPlants,
      plotWidthM,
      plotHeightM,
      metersPerCell: plotScale.metersPerCell,
    });

    const response = await recommendationsApi.generateCalendar({
      userId: user.userId,
      gardenId: activeGardenId,
      location: {
        latitude: result.location.latitude,
        longitude: result.location.longitude,
        city: result.location.name,
      },
      soilType: result.soilType,
    });

    setLastCalendarSetup(result);
    localStorage.setItem(`calendar-setup-${activeGardenId}`, JSON.stringify(result));
    setCalendarData(response.data);
    setCalendarView('full');
    toast.success('Care calendar generated!');
  };

  const handleAddNewPlants = async (result: AddPlantsResult) => {
    if (!activeGardenId) throw new Error('Save your garden before updating the calendar.');

    const updatedPlants = placedPlants.map((p) => {
      const ps = result.plantSettings.find((s) => s.plantId === p.id);
      return ps ? { ...p, variety: ps.variety || undefined, plantedAt: ps.plantedAt } : p;
    });

    result.plantSettings.forEach((ps) => {
      updatePlant(ps.plantId, { variety: ps.variety || undefined, plantedAt: ps.plantedAt });
    });

    const name = gardenName ?? (await gardensApi.getAll().then((r) => r.data.find((g) => g._id === activeGardenId)?.name));
    if (!name) throw new Error('Could not load garden name. Please try again.');

    await gardensApi.update(activeGardenId, {
      name,
      placedPlants: updatedPlants,
      plotWidthM,
      plotHeightM,
      metersPerCell: plotScale.metersPerCell,
    });

    const plantInstances = newPlantsForCalendar.map((p) => ({
      slug: p.slug,
      label: p.customName,
    }));
    const response = await recommendationsApi.addPlants(activeGardenId, plantInstances);

    setCalendarData(response.data);
    setCalendarVersion((v) => v + 1);
    setShowAddPlantsModal(false);
    toast.success('Calendar updated with new plants!');
  };

  const { activeWarnings } = useCompatibility(placedPlants);
  const [hoveredWarning, setHoveredWarning] = useState<ActiveWarning | null>(null);

  useEffect(() => {
    onUnsavedStateChange(hasUnsavedChanges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  const [activeDragData, setActiveDragData] = useState<DragData | null>(null);
  const [noSpaceError, setNoSpaceError] = useState(false);
  const [editingPlant, setEditingPlant] = useState<PlacedPlant | null>(null);

  const cellSizeRef = useRef<number>(24);
  const handleCellSizeChange = useCallback((cs: number) => {
    cellSizeRef.current = cs;
  }, []);

  const { metersPerCell } = plotScale;

  const plotConfig: PlotConfig = { scale, plotScale, plotWidthM, plotHeightM };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragData(event.active.data.current as DragData);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    setActiveDragData(null);

    if (!over || over.id !== 'garden-grid') return;

    const data = active.data.current as DragData;

    if (data.type === 'new') {
      const translated = active.rect.current.translated;
      if (!translated) return;
      const offsetX = translated.left - over.rect.left;
      const offsetY = translated.top - over.rect.top;
      const { x, y } = screenToMeters(
        offsetX, offsetY, cellSizeRef.current, metersPerCell, plotWidthM, plotHeightM,
      );

      const drop: PendingDrop = {
        plantId: data.plant._id,
        name: data.plant.name,
        slug: data.plant.slug,
        category: data.plant.category,
        color: data.plant.color,
        imageUrl: data.plant.imageUrl,
        x,
        y,
      };

      const isDuplicate = placedPlants.some((p) => p.slug === data.plant.slug);
      if (isDuplicate) {
        setPendingDuplicateCheck(drop);
      } else {
        setPendingDrop(drop);
      }
    }

    if (data.type === 'existing') {
      const plantToMove = placedPlants.find((p) => p.id === data.placedId);
      if (!plantToMove) return;

      const wM = plantToMove.plantsPerRow * plantToMove.spacing;
      const hM = Math.ceil(plantToMove.count / plantToMove.plantsPerRow) * plantToMove.spacing;

      const { x: rawX, y: rawY } = deltaToMeters(
        data.x, data.y, delta.x, delta.y,
        cellSizeRef.current, metersPerCell, plotWidthM, plotHeightM,
      );
      const x = Math.max(0, Math.min(rawX, plotWidthM - wM));
      const y = Math.max(0, Math.min(rawY, plotHeightM - hM));

      const newBounds = getPlantBounds({ ...plantToMove, x, y });
      if (!isPlacementValid(newBounds, placedPlants, data.placedId)) {
        const freePos = findFreePosition(
          { ...plantToMove, x, y },
          placedPlants, plotWidthM, plotHeightM, metersPerCell,
          data.placedId,
        );
        if (freePos) {
          movePlant(data.placedId, freePos.x, freePos.y);
        } else {
          setNoSpaceError(true);
        }
        return;
      }
      movePlant(data.placedId, x, y);
    }
  };

  const handleConfirmPlant = (plant: Parameters<typeof addPlant>[0]) => {
    const plantRows = Math.ceil(plant.count / plant.plantsPerRow);
    const wM = plant.plantsPerRow * plant.spacing;
    const hM = plantRows * plant.spacing;
    const clampedPlant = {
      ...plant,
      x: Math.max(0, Math.min(plant.x, plotWidthM - wM)),
      y: Math.max(0, Math.min(plant.y, plotHeightM - hM)),
    };

    const bounds = getPlantBounds(clampedPlant);
    if (isPlacementValid(bounds, placedPlants)) {
      addPlant(clampedPlant);
      setPendingDrop(null);
      return;
    }

    const freePos = findFreePosition(
      clampedPlant, placedPlants, plotWidthM, plotHeightM, metersPerCell,
    );
    if (freePos) {
      addPlant({ ...clampedPlant, x: freePos.x, y: freePos.y });
      setPendingDrop(null);
    } else {
      setNoSpaceError(true);
    }
  };

  const handleEditConfirm = (updated: Parameters<typeof addPlant>[0]) => {
    if (!editingPlant) return;
    updatePlant(editingPlant.id, {
      count: updated.count,
      plantsPerRow: updated.plantsPerRow,
      spacing: updated.spacing,
    });
    setEditingPlant(null);
  };

  const activePlant: PlantData | null =
    activeDragData?.type === 'new' ? activeDragData.plant : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <SplitLayout
        sidebar={<PlantsSidebar plants={plants} isLoading={isLoading} />}
        rightSidebar={
          activeWarnings.length > 0 ? (
            <WarningsPanel
              warnings={activeWarnings}
              onWarningHover={setHoveredWarning}
            />
          ) : undefined
        }
      >
        <GardenToolbar
          scale={scale}
          plotScale={plotScale}
          plotWidthM={plotWidthM}
          plotHeightM={plotHeightM}
          isSaving={isSaving}
          autoSaveStatus={autoSaveStatus}
          hasCalendar={!!calendarData}
          canUseCalendar={!!activeGardenId}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onPlotScaleChange={changePlotScale}
          onDimensionsChange={setPlotDimensions}
          onSave={saveGarden}
          onCalendarOpen={handleCalendarOpen}
          onReminders={calendarData ? () => setShowReminderModal(true) : undefined}
        />
        <GardenGrid
          placedPlants={placedPlants}
          plotConfig={plotConfig}
          onEditPlant={setEditingPlant}
          onResizePlant={(id, count, plantsPerRow, x, y) => updatePlant(id, { count, plantsPerRow, x, y })}
          onCellSizeChange={handleCellSizeChange}
        />
      </SplitLayout>

      <WarningArrows hoveredWarning={hoveredWarning} />

      <DragOverlay dropAnimation={null}>
        {activePlant ? (
          <div className={styles.dragOverlay}>
            {activePlant.imageUrl ? (
              <img src={activePlant.imageUrl} width={32} height={32} alt={activePlant.name} />
            ) : (
              <SvgIcon icon={icons.seedling} size={32} color={theme.colors.plantText} />
            )}
            <span className={styles.dragOverlayName}>{activePlant.name}</span>
          </div>
        ) : null}
      </DragOverlay>

      {pendingDuplicateCheck && (
        <DuplicatePlantModal
          plantName={pendingDuplicateCheck.name}
          onSame={() => {
            setPendingDrop(pendingDuplicateCheck);
            setPendingDuplicateCheck(null);
          }}
          onSeparate={(customName) => {
            setPendingDrop({ ...pendingDuplicateCheck, customName });
            setPendingDuplicateCheck(null);
          }}
          onCancel={() => setPendingDuplicateCheck(null)}
        />
      )}

      {pendingDrop && (
        <PlantSettingsModal
          pendingDrop={pendingDrop}
          plotScale={plotScale}
          plotWidthM={plotWidthM}
          plotHeightM={plotHeightM}
          onConfirm={handleConfirmPlant}
          onCancel={() => setPendingDrop(null)}
        />
      )}

      {editingPlant && (
        <PlantSettingsModal
          pendingDrop={{
            plantId: editingPlant.plantId,
            name: editingPlant.name,
            slug: editingPlant.slug,
            category: editingPlant.category,
            color: editingPlant.color,
            imageUrl: editingPlant.imageUrl,
            x: editingPlant.x,
            y: editingPlant.y,
          }}
          plotScale={plotScale}
          plotWidthM={plotWidthM}
          plotHeightM={plotHeightM}
          initialValues={{
            count: editingPlant.count,
            plantsPerRow: editingPlant.plantsPerRow,
            spacing: editingPlant.spacing,
          }}
          onConfirm={handleEditConfirm}
          onDelete={() => { removePlant(editingPlant.id); setEditingPlant(null); }}
          onCancel={() => setEditingPlant(null)}
        />
      )}

      {showNameModal && (
        <GardenNameModal onConfirm={confirmSave} onCancel={dismissModal} />
      )}

      {noSpaceError && (
        <div
          className={styles.noSpaceOverlay}
          onClick={() => { setNoSpaceError(false); setPendingDrop(null); }}
        >
          <div className={styles.noSpaceModal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.noSpaceText}>
              No space left on the plot — increase the plot size to add more plants.
            </p>
            <button
              className={styles.noSpaceButton}
              onClick={() => { setNoSpaceError(false); setPendingDrop(null); }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {calendarView === 'setup' && (
        <CalendarSetupModal
          placedPlants={placedPlants}
          isEditing={!!calendarData}
          initialValues={lastCalendarSetup ?? undefined}
          onGenerate={handleCalendarGenerate}
          onClose={() => setCalendarView(calendarData ? 'full' : 'none')}
        />
      )}

      {calendarView === 'full' && calendarData && activeGardenId && (
        <CalendarView
          key={calendarVersion}
          data={calendarData}
          gardenId={activeGardenId}
          newPlants={newPlantsForCalendar.map((p) => ({ slug: p.slug, name: p.customName ?? p.name }))}
          plantingDays={plantingDays}
          plantInfoBySlug={plantInfoBySlug}
          isOutdated={isCalendarOutdated}
          onMinimize={() => setCalendarView('mini')}
          onClose={() => setCalendarView('none')}
          onDelete={() => { setCalendarData(null); setCalendarView('none'); toast.info('Calendar deleted.'); }}
          onDataUpdate={setCalendarData}
          onRequestAddPlants={() => setShowAddPlantsModal(true)}
          onReminders={() => setShowReminderModal(true)}
          onEditSettings={() => setCalendarView('setup')}
        />
      )}

      {showAddPlantsModal && (
        <AddPlantsModal
          newPlants={newPlantsForCalendar}
          onAdd={handleAddNewPlants}
          onClose={() => setShowAddPlantsModal(false)}
        />
      )}

      {showReminderModal && activeGardenId && (
        <NotificationSettingsModal
          gardenId={activeGardenId}
          gardenName={gardenName ?? activeGardenId}
          onClose={() => setShowReminderModal(false)}
        />
      )}

      {calendarView === 'mini' && calendarData && (
        <MiniCalendar
          data={calendarData}
          isOutdated={isCalendarOutdated}
          newPlantsCount={newPlantsForCalendar.length}
          onExpand={() => setCalendarView('full')}
          onClose={() => setCalendarView('none')}
        />
      )}
    </DndContext>
  );
};
