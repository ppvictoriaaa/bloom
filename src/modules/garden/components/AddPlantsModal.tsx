import { useEffect, useState } from 'react';
import type { PlacedPlant } from '../types/garden.types';
import { recommendationsApi, type PlantCareRule } from '../../../api/recommendations';
import { toast } from '../../../store/toast.store';
import styles from '../styles/add-plants-modal.module.css';

interface PlantSetting {
  slug: string;
  name: string;
  variety: string;
  plantedAt: string;
  supportsVarieties: boolean;
  allowedVarieties: string[];
}

export interface AddPlantsResult {
  plantSettings: PlantSetting[];
}

interface Props {
  newPlants: PlacedPlant[];
  onAdd: (result: AddPlantsResult) => Promise<void>;
  onClose: () => void;
}

const TODAY = new Date().toISOString().split('T')[0];

const VARIETY_LABELS: Record<string, string> = {
  early: 'Early', normal: 'Normal', late: 'Late',
  summer: 'Summer', autumn: 'Autumn', winter: 'Winter',
};

export const AddPlantsModal = ({ newPlants, onAdd, onClose }: Props) => {
  const [plantSettings, setPlantSettings] = useState<PlantSetting[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const seen = new Set<string>();
    const unique = newPlants.filter((p) => {
      if (seen.has(p.slug)) return false;
      seen.add(p.slug);
      return true;
    });

    setPlantSettings(
      unique.map((p) => ({
        slug: p.slug,
        name: p.name,
        variety: p.variety ?? '',
        plantedAt: p.plantedAt ?? TODAY,
        supportsVarieties: false,
        allowedVarieties: [],
      })),
    );

    const slugs = unique.map((p) => p.slug);
    recommendationsApi
      .getPlantCareRules(slugs)
      .then((rules: PlantCareRule[]) => {
        const ruleMap = new Map(rules.map((r) => [r.plantSlug, r]));
        setPlantSettings((prev) =>
          prev.map((ps) => {
            const rule = ruleMap.get(ps.slug);
            if (!rule) return ps;
            return {
              ...ps,
              supportsVarieties: rule.supportsVarieties,
              allowedVarieties: rule.allowedVarieties,
              variety:
                rule.supportsVarieties && rule.allowedVarieties.includes(ps.variety)
                  ? ps.variety
                  : '',
            };
          }),
        );
      })
      .catch(() => toast.info('Could not load variety data. You can still add plants.'))
      .finally(() => setLoadingRules(false));
  }, []);

  const updateSetting = (slug: string, field: 'variety' | 'plantedAt', value: string) => {
    setPlantSettings((prev) =>
      prev.map((ps) => (ps.slug === slug ? { ...ps, [field]: value } : ps)),
    );
  };

  const handleAdd = async () => {
    setError('');
    setAdding(true);
    try {
      await onAdd({ plantSettings });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Something went wrong.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        <div className={styles.header}>
          <h2 className={styles.title}>Add care recommendations</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p className={styles.subtitle}>
          Your saved location and soil type will be used.
        </p>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>New plants</p>
          {loadingRules ? (
            <p className={styles.loading}>Loading plant data…</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Plant</th>
                    <th className={styles.th}>Variety</th>
                    <th className={styles.th}>Planted on</th>
                  </tr>
                </thead>
                <tbody>
                  {plantSettings.map((ps) => (
                    <tr key={ps.slug} className={styles.tr}>
                      <td className={styles.td}>
                        <span className={styles.plantName}>{ps.name}</span>
                      </td>
                      <td className={styles.td}>
                        {ps.supportsVarieties ? (
                          <select
                            className={styles.select}
                            value={ps.variety}
                            onChange={(e) => updateSetting(ps.slug, 'variety', e.target.value)}
                          >
                            <option value="">Not specified</option>
                            {ps.allowedVarieties.map((v) => (
                              <option key={v} value={v}>
                                {VARIETY_LABELS[v] ?? v}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={styles.noVariety}>—</span>
                        )}
                      </td>
                      <td className={styles.td}>
                        <input
                          type="date"
                          className={styles.dateInput}
                          value={ps.plantedAt}
                          onChange={(e) => updateSetting(ps.slug, 'plantedAt', e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            className={styles.addBtn}
            onClick={handleAdd}
            disabled={adding || loadingRules}
          >
            {adding ? <><span className={styles.spinner} /> Adding…</> : 'Add to calendar'}
          </button>
        </div>
      </div>
    </div>
  );
};
