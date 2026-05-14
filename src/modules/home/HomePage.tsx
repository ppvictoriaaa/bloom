import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { useProfile } from '../../hooks/useProfile';
import { RouteNames } from '../../router/routes';
import { GardenEditor } from '../garden/components/GardenEditor';
import { SvgIcon } from '../../components/ui/SvgIcon';
import { icons } from '../../components/ui/icons';
import { theme } from '../../styles/theme';
import { gardensApi } from '../../api/gardens';
import styles from './styles/home.module.css';

type Tab = 'overview' | 'create';

export const HomePage = () => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [gardenId, setGardenId] = useState<string | null>(null);

  const { data: gardens = [], isLoading } = useQuery({
    queryKey: ['gardens'],
    queryFn: () => gardensApi.getAll().then((r) => r.data),
  });

  const handleLogout = () => {
    logout();
    navigate(RouteNames.LOGIN);
  };

  const handleOpenGarden = (id: string) => {
    setGardenId(id);
    setActiveTab('create');
  };

  const handleNewGarden = () => {
    setGardenId(null);
    setActiveTab('create');
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
          <div className={styles.overviewHeader}>
            <h2 className={styles.greeting}>Hello, {profile?.name || user?.email}!</h2>
            <button className={styles.newGardenButton} onClick={handleNewGarden}>
              + New Garden
            </button>
          </div>

          {isLoading && <p className={styles.hint}>Loading your gardens…</p>}

          {!isLoading && gardens.length === 0 && (
            <p className={styles.hint}>
              No gardens saved yet.{' '}
              <button className={styles.inlineLink} onClick={handleNewGarden}>
                Create your first one
              </button>
            </p>
          )}

          {gardens.length > 0 && (
            <div className={styles.gardenGrid}>
              {gardens.map((garden) => (
                <button
                  key={garden._id}
                  className={styles.gardenCard}
                  onClick={() => handleOpenGarden(garden._id)}
                >
                  <span className={styles.gardenIcon}>
                    <SvgIcon icon={icons.leaf} size={22} color={theme.colors.primary} />
                  </span>
                  <span className={styles.gardenName}>{garden.name}</span>
                  <span className={styles.gardenMeta}>
                    {garden.placedPlants.length} plant{garden.placedPlants.length !== 1 ? 's' : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </main>
      )}

      {activeTab === 'create' && (
        <div className={styles.editorWrapper}>
          <GardenEditor gardenId={gardenId} />
        </div>
      )}
    </div>
  );
};
