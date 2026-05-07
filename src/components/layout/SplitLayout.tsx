import styles from './split-layout.module.css';

interface Props {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export const SplitLayout = ({ children, sidebar }: Props) => (
  <div className={styles.layout}>
    <div className={styles.main}>{children}</div>
    <div className={styles.sidebar}>{sidebar}</div>
  </div>
);
