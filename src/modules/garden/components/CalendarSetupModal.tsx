import { useEffect, useRef, useState } from 'react';
import type { PlacedPlant } from '../types/garden.types';
import {
  geocodeCity,
  recommendationsApi,
  type GeocodedLocation,
  type PlantCareRule,
} from '../../../api/recommendations';
import { toast } from '../../../store/toast.store';
import styles from '../styles/calendar-setup-modal.module.css';

type SoilType = 'sandy' | 'loamy' | 'clay';

interface PlantSetting {
  plantId: string;
  slug: string;
  name: string;
  variety: string;
  plantedAt: string;
  supportsVarieties: boolean;
  allowedVarieties: string[];
}

export interface CalendarSetupResult {
  location: GeocodedLocation;
  soilType: SoilType;
  plantSettings: PlantSetting[];
}

interface Props {
  placedPlants: PlacedPlant[];
  isEditing?: boolean;
  initialValues?: CalendarSetupResult;
  onGenerate: (result: CalendarSetupResult) => Promise<void>;
  onClose: () => void;
}

const TODAY = new Date().toISOString().split('T')[0];

const SOIL_LABELS: Record<SoilType, string> = {
  sandy: 'Sandy — drains fast, watering more often',
  loamy: 'Loamy — balanced, ideal for most plants',
  clay: 'Clay — retains moisture, watering less often',
};

const VARIETY_LABELS: Record<string, string> = {
  early: 'Early',
  normal: 'Normal',
  late: 'Late',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
};

export const CalendarSetupModal = ({ placedPlants, isEditing = false, initialValues, onGenerate, onClose }: Props) => {
  const [cityInput, setCityInput] = useState(initialValues?.location.name ?? '');
  const [location, setLocation] = useState<GeocodedLocation | null>(initialValues?.location ?? null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');

  const [soilType, setSoilType] = useState<SoilType>(initialValues?.soilType ?? 'loamy');
  const [plantSettings, setPlantSettings] = useState<PlantSetting[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const cityRef = useRef<HTMLInputElement>(null);

  // Build unique-per-instance plant list and fetch care rules.
  // Named plants (customName set) get their own row; unnamed plants dedup by slug.
  useEffect(() => {
    const seen = new Set<string>();
    const unique = placedPlants.filter((p) => {
      const key = p.customName ?? p.slug;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    setPlantSettings(
      unique.map((p) => {
        const saved = initialValues?.plantSettings.find((s) => s.plantId === p.id);
        return {
          plantId: p.id,
          slug: p.slug,
          name: p.customName ?? p.name,
          variety: saved?.variety ?? '',
          plantedAt: saved?.plantedAt ?? TODAY,
          supportsVarieties: false,
          allowedVarieties: [],
        };
      }),
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
              // Reset variety if it's not in the allowed list
              variety:
                rule.supportsVarieties && rule.allowedVarieties.includes(ps.variety)
                  ? ps.variety
                  : '',
            };
          }),
        );
      })
      .catch(() => { toast.info('Could not load variety data. You can still generate the calendar.'); })
      .finally(() => setLoadingRules(false));

    cityRef.current?.focus();
  }, []);

  const handleGeocode = async () => {
    if (!cityInput.trim()) return;
    setGeocoding(true);
    setGeocodeError('');
    const result = await geocodeCity(cityInput.trim());
    if (result) {
      setLocation(result);
    } else {
      setGeocodeError('City not found. Check the spelling or try a larger nearby city.');
    }
    setGeocoding(false);
  };

  const updateSetting = (plantId: string, field: 'variety' | 'plantedAt', value: string) => {
    setPlantSettings((prev) =>
      prev.map((ps) => (ps.plantId === plantId ? { ...ps, [field]: value } : ps)),
    );
  };

  const handleGenerate = async () => {
    if (!location) { setError('Please find your city first.'); return; }
    setError('');
    setGenerating(true);
    try {
      await onGenerate({ location, soilType, plantSettings });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Something went wrong.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        <div className={styles.header}>
          <h2 className={styles.title}>{isEditing ? 'Edit care calendar settings' : 'Generate care calendar'}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* ── Location ── */}
        <section className={styles.section}>
          <p className={styles.sectionTitle}>Your location</p>
          <div className={styles.row}>
            <input
              ref={cityRef}
              className={styles.input}
              placeholder="City name, e.g. Kyiv"
              value={cityInput}
              onChange={(e) => { setCityInput(e.target.value); setLocation(null); setGeocodeError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleGeocode()}
            />
            <button
              className={styles.findBtn}
              onClick={handleGeocode}
              disabled={geocoding || !cityInput.trim()}
            >
              {geocoding ? 'Searching…' : 'Find'}
            </button>
          </div>
          {location && (
            <p className={styles.locationFound}>
              <span className={styles.checkmark}>✓</span> {location.name}
            </p>
          )}
          {geocodeError && <p className={styles.fieldError}>{geocodeError}</p>}
        </section>

        {/* ── Soil type ── */}
        <section className={styles.section}>
          <p className={styles.sectionTitle}>Soil type</p>
          <div className={styles.soilGrid}>
            {(Object.keys(SOIL_LABELS) as SoilType[]).map((type) => (
              <label
                key={type}
                className={`${styles.soilOption} ${soilType === type ? styles.soilOptionActive : ''}`}
              >
                <input
                  type="radio"
                  name="soil"
                  value={type}
                  checked={soilType === type}
                  onChange={() => setSoilType(type)}
                  className={styles.radioHidden}
                />
                <span className={styles.soilName}>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                <span className={styles.soilHint}>{SOIL_LABELS[type].split('—')[1].trim()}</span>
              </label>
            ))}
          </div>
        </section>

        {/* ── Plants table ── */}
        <section className={styles.section}>
          <p className={styles.sectionTitle}>Your plants</p>
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
                    <tr key={ps.plantId} className={styles.tr}>
                      <td className={styles.td}>
                        <span className={styles.plantName}>{ps.name}</span>
                      </td>
                      <td className={styles.td}>
                        {ps.supportsVarieties ? (
                          <select
                            className={styles.select}
                            value={ps.variety}
                            onChange={(e) => updateSetting(ps.plantId, 'variety', e.target.value)}
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
                          onChange={(e) =>
                            updateSetting(ps.plantId, 'plantedAt', e.target.value)
                          }
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
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={!location || generating || loadingRules}
          >
            {generating ? (
              <><span className={styles.spinner} /> {isEditing ? 'Regenerating…' : 'Generating…'}</>
            ) : (
              isEditing ? 'Regenerate calendar' : 'Generate calendar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
