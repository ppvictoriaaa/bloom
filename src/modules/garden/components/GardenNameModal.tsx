import { useState } from 'react';
import styles from '../styles/garden-name-modal.module.css';

interface Props {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export const GardenNameModal = ({ onConfirm, onCancel }: Props) => {
  const [name, setName] = useState('');

  const handleConfirm = () => {
    if (name.trim()) onConfirm(name.trim());
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Name your garden</h3>
        <input
          className={styles.input}
          type="text"
          placeholder="e.g. Backyard vegetable patch"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
          autoFocus
        />
        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.confirmButton} onClick={handleConfirm} disabled={!name.trim()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
