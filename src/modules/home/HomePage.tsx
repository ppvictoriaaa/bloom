import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { useProfile } from '../../hooks/useProfile';
import { RouteNames } from '../../router/routes';
import { GardenEditor } from '../garden/components/GardenEditor';
import { SvgIcon } from '../../components/ui/SvgIcon';
import { icons } from '../../components/ui/icons';
import { theme } from '../../styles/theme';
import { gardensApi } from '../../api/gardens';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import styles from './styles/home.module.css';

type Tab = 'overview' | 'create';

export const HomePage = () => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { profile } = useProfile();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [gardenId, setGardenId] = useState<string | null>(null);
  const [editorHasUnsaved, setEditorHasUnsaved] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { mutate: deleteGarden } = useMutation({
    mutationFn: (id: string) => gardensApi.remove(id),
    onSuccess: () => {
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['gardens'] });
    },
  });

  const { data: gardens = [], isLoading } = useQuery({
    queryKey: ['gardens'],
    queryFn: () => gardensApi.getAll().then((r) => r.data),
  });

  const handleLogout = () => {
    logout();
    navigate(RouteNames.LOGIN);
  };

  const handleMyGardensClick = () => {
    if (activeTab === 'create' && editorHasUnsaved) {
      setShowLeaveModal(true);
    } else {
      setActiveTab('overview');
    }
  };

  const handleLeaveConfirm = () => {
    setShowLeaveModal(false);
    setEditorHasUnsaved(false);
    setActiveTab('overview');
  };

  const handleOpenGarden = (id: string) => {
    setGardenId(id);
    setActiveTab('create');
  };

  const handleNewGarden = () => {
    setGardenId(null);
    setActiveTab('create');
  };

  const handleUnsavedStateChange = useCallback((hasUnsaved: boolean) => {
    setEditorHasUnsaved(hasUnsaved);
  }, []);

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
          onClick={handleMyGardensClick}
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
                <div
                  key={garden._id}
                  className={styles.gardenCard}
                  onClick={() => handleOpenGarden(garden._id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleOpenGarden(garden._id); }}
                >
                  <span className={styles.gardenIcon}>
                    <SvgIcon icon={icons.leaf} size={22} color={theme.colors.primary} />
                  </span>
                  <span className={styles.gardenName}>{garden.name}</span>
                  <span className={styles.gardenMeta}>
                    {garden.placedPlants.length} plant{garden.placedPlants.length !== 1 ? 's' : ''}
                  </span>

                  {confirmDeleteId === garden._id ? (
                    <div className={styles.deleteConfirm} onClick={(e) => e.stopPropagation()}>
                      <span className={styles.deleteConfirmText}>Delete?</span>
                      <button className={styles.deleteConfirmYes} onClick={() => deleteGarden(garden._id)}>
                        Yes
                      </button>
                      <button className={styles.deleteConfirmNo} onClick={() => setConfirmDeleteId(null)}>
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      className={styles.deleteButton}
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(garden._id); }}
                      aria-label="Delete garden"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {activeTab === 'create' && (
        <div className={styles.editorWrapper}>
          <GardenEditor gardenId={gardenId} onUnsavedStateChange={handleUnsavedStateChange} />
        </div>
      )}

      {showLeaveModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLeaveModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Unsaved changes</h3>
            <p className={styles.modalBody}>
              Your changes won't be saved. Are you sure you want to lose your progress?
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalStay} onClick={() => setShowLeaveModal(false)}>
                Stay
              </button>
              <button className={styles.modalLeave} onClick={handleLeaveConfirm}>
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
