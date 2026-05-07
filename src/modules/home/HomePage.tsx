import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { useProfile } from '../../hooks/useProfile';
import { RouteNames } from '../../router/routes';
import { GardenEditor } from '../garden/components/GardenEditor';
import { SvgIcon } from '../../components/ui/SvgIcon';
import { icons } from '../../components/ui/icons';
import { theme } from '../../styles/theme';
import styles from './styles/home.module.css';

type Tab = 'overview' | 'create';

export const HomePage = () => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const handleLogout = () => {
    logout();
    navigate(RouteNames.LOGIN);
  };

  return (
    <div className={`${styles.container} ${activeTab === 'create' ? styles.containerFull : ''}`}>
      <header className={styles.header}>
        <h1 className={styles.logo}>
          <SvgIcon icon={icons.leaf} size={20} color={theme.colors.primary} />
          Garden
        </h1>
        <nav className={styles.nav}>
          <button className={styles.navLink} onClick={() => navigate(RouteNames.PROFILE)}>
            Profile
          </button>
          <button className={styles.logoutButton} onClick={handleLogout}>
            Sign out
          </button>
        </nav>
      </header>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          My Gardens
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'create' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('create')}
        >
          Create Garden
        </button>
      </div>

      {activeTab === 'overview' && (
        <main className={styles.main}>
          <h2 className={styles.greeting}>Hello, {profile?.name || user?.email}!</h2>
          <p className={styles.description}>Your gardens will appear here.</p>
        </main>
      )}

      {activeTab === 'create' && (
        <div className={styles.editorWrapper}>
          <GardenEditor />
        </div>
      )}
    </div>
  );
};
