import type { PlantData } from '../types/garden.types';
import { PlantCard } from './PlantCard';
import styles from '../styles/plants-sidebar.module.css';

interface Props {
  plants: PlantData[];
  isLoading: boolean;
}

export const PlantsSidebar = ({ plants, isLoading }: Props) => (
  <aside className={styles.sidebar}>
    <h3 className={styles.title}>Plants</h3>
    {isLoading ? (
      <p className={styles.loading}>Loading...</p>
    ) : (
      <ul className={styles.list}>
        {plants.map((plant) => (
          <li key={plant._id}>
            <PlantCard plant={plant} />
          </li>
        ))}
      </ul>
    )}
  </aside>
);
