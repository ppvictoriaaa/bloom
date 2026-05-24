import { useState } from 'react';
import styles from '../styles/duplicate-plant-modal.module.css';

interface Props {
  plantName: string;
  onSame: () => void;
  onSeparate: (customName: string) => void;
  onCancel: () => void;
}

export const DuplicatePlantModal = ({ plantName, onSame, onSeparate, onCancel }: Props) => {
  const [choice, setChoice] = useState<'same' | 'separate' | null>(null);
  const [name, setName] = useState(`${plantName} 2`);

  const handleConfirm = () => {
    if (choice === 'same') {
      onSame();
    } else if (choice === 'separate' && name.trim()) {
      onSeparate(name.trim());
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Add {plantName} again?</h3>
        <p className={styles.desc}>
          {plantName} is already in your garden. How should the calendar treat this new planting?
        </p>

        <div className={styles.options}>
          <button
            className={`${styles.option} ${choice === 'same' ? styles.optionActive : ''}`}
            onClick={() => setChoice('same')}
          >
            <span className={styles.optionIcon}>🔗</span>
            <div>
              <div className={styles.optionLabel}>Same plot</div>
              <div className={styles.optionHint}>Share care schedule with existing {plantName}</div>
            </div>
          </button>

          <button
            className={`${styles.option} ${choice === 'separate' ? styles.optionActive : ''}`}
            onClick={() => setChoice('separate')}
          >
            <span className={styles.optionIcon}>🌱</span>
            <div>
              <div className={styles.optionLabel}>Separate plot</div>
              <div className={styles.optionHint}>Get its own care schedule and calendar events</div>
            </div>
          </button>
        </div>

        {choice === 'separate' && (
          <div className={styles.nameRow}>
            <label className={styles.nameLabel}>Plot name</label>
            <input
              className={styles.nameInput}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder={`${plantName} 2`}
            />
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          <button
            className={styles.confirmBtn}
            disabled={!choice || (choice === 'separate' && !name.trim())}
            onClick={handleConfirm}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};
