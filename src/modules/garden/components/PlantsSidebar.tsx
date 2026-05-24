import { useMemo, useState } from 'react';
import type { PlantData } from '../types/garden.types';
import { PlantCategory } from '../types/garden.types';
import { PlantCard } from './PlantCard';
import styles from '../styles/plants-sidebar.module.css';

const CATEGORIES: { value: PlantCategory | 'all'; label: string; icon: string }[] = [
  { value: 'all',                    icon: '🌿', label: 'All'       },
  { value: PlantCategory.VEGETABLE,  icon: '🥕', label: 'Vegetable' },
  { value: PlantCategory.TREE,       icon: '🌳', label: 'Tree'      },
  { value: PlantCategory.BERRY,      icon: '🫐', label: 'Berry'     },
  { value: PlantCategory.FLOWER,     icon: '🌸', label: 'Flower'    },
  { value: PlantCategory.HERB,       icon: '🌿', label: 'Herb'      },
];

interface Props {
  plants: PlantData[];
  isLoading: boolean;
}

export const PlantsSidebar = ({ plants, isLoading }: Props) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<PlantCategory | 'all'>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plants.filter((p) => {
      const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
      const matchesSearch   = !q || p.name.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [plants, search, activeCategory]);

  return (
    <aside className={styles.sidebar}>
      <h3 className={styles.title}>Plants</h3>

      <input
        className={styles.search}
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className={styles.categories}>
        {CATEGORIES.map(({ value, icon, label }) => (
          <button
            key={value}
            className={`${styles.catChip} ${activeCategory === value ? styles.catChipActive : ''}`}
            onClick={() => setActiveCategory(value)}
            title={label}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className={styles.loading}>Loading...</p>
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>No plants found</p>
      ) : (
        <ul className={styles.list}>
          {filtered.map((plant) => (
            <li key={plant._id}>
              <PlantCard plant={plant} />
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
};
