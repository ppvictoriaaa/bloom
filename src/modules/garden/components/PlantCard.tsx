import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { PlantData } from '../types/garden.types';
import { SvgIcon } from '../../../components/ui/SvgIcon';
import { icons } from '../../../components/ui/icons';
import { theme } from '../../../styles/theme';
import styles from '../styles/plant-card.module.css';

interface Props {
  plant: PlantData;
}

export const PlantCard = ({ plant }: Props) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `sidebar-${plant._id}`,
    data: { type: 'new', plant } satisfies { type: 'new'; plant: PlantData },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      className={styles.card}
      {...listeners}
      {...attributes}
    >
      {plant.imageUrl ? (
        <img src={plant.imageUrl} width={32} height={32} alt={plant.name} className={styles.icon} />
      ) : (
        <SvgIcon icon={icons.seedling} size={32} color={theme.colors.plantText} />
      )}
      <span className={styles.name}>{plant.name}</span>
    </div>
  );
};
