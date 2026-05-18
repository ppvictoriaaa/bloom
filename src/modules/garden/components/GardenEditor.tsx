import { useCallback, useEffect, useRef, useState } from 'react';
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
import type { DragData, PlantData, PlacedPlant, PlotConfig } from '../types/garden.types';
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
  } = useGardenSave(
    { placedPlants, plotWidthM, plotHeightM, plotScale },
    loadGarden,
    gardenId,
    onCreated,
  );

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

      setPendingDrop({
        plantId: data.plant._id,
        name: data.plant.name,
        slug: data.plant.slug,
        category: data.plant.category,
        color: data.plant.color,
        imageUrl: data.plant.imageUrl,
        x,
        y,
      });
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
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onPlotScaleChange={changePlotScale}
          onDimensionsChange={setPlotDimensions}
          onSave={saveGarden}
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
    </DndContext>
  );
};
