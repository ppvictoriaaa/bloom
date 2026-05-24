import { useToastStore } from '../../store/toast.store';
import styles from './toaster.module.css';

export const Toaster = () => {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
          <span className={styles.message}>{t.message}</span>
          <button className={styles.close} onClick={() => dismiss(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
};
