import type { ActiveWarning } from '../hooks/useCompatibility';
import styles from '../styles/warnings-panel.module.css';

const SEVERITY_LABEL: Record<ActiveWarning['severity'], string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

interface Props {
  warnings: ActiveWarning[];
  onWarningHover: (warning: ActiveWarning | null) => void;
}

export const WarningsPanel = ({ warnings, onWarningHover }: Props) => (
  <aside className={styles.panel}>
    <h3 className={styles.header}>
      Warnings
      {warnings.length > 0 && (
        <span className={styles.count}>{warnings.length}</span>
      )}
    </h3>

    {warnings.length === 0 ? (
      <p className={styles.empty}>No conflicts detected.</p>
    ) : (
      <ul className={styles.list}>
        {warnings.map((w) => {
          const severityCap = w.severity.charAt(0).toUpperCase() + w.severity.slice(1);
          return (
            <li
              key={w.id}
              data-warning-id={w.id}
              className={`${styles.item} ${styles[`severity${severityCap}`]}`}
              onMouseEnter={() => onWarningHover(w)}
              onMouseLeave={() => onWarningHover(null)}
            >
              <div className={styles.plantNames}>
                {w.affectedPlantNames.join(' · ')}
              </div>
              <p className={styles.reason}>{w.reason}</p>
              <p className={styles.distance}>
                Min. distance:{' '}
                {w.effectRadiusM >= 1000
                  ? `${w.effectRadiusM / 1000} km`
                  : `${w.effectRadiusM} m`}
              </p>
              <span className={`${styles.badge} ${styles[`badge${severityCap}`]}`}>
                {SEVERITY_LABEL[w.severity]}
              </span>
            </li>
          );
        })}
      </ul>
    )}
  </aside>
);
