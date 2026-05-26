import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { useUiStore } from '../../store/ui.store';
import { useProfile } from '../../hooks/useProfile';
import { RouteNames } from '../../router/routes';
import { GardenEditor } from '../garden/components/GardenEditor';
import { SvgIcon } from '../../components/ui/SvgIcon';
import { icons } from '../../components/ui/icons';
import { theme } from '../../styles/theme';
import { gardensApi } from '../../api/gardens';
import { toast } from '../../store/toast.store';
import { AiChat } from '../ai/AiChat';
import styles from './styles/home.module.css';

interface GardenTab {
  tabId: string;
  gardenId: string | null;
  label: string;
  hasUnsaved: boolean;
}

let tabCounter = 0;
const nextTabId = () => `tab-${++tabCounter}`;

export const HomePage = () => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { profile } = useProfile();
  const navigate = useNavigate();

  const { openGardenIds, activeGardenId: savedActiveGardenId, setOpenGardenIds, setActiveGardenId } =
    useUiStore();

  const [tabs, setTabs] = useState<GardenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [pendingCloseTabId, setPendingCloseTabId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const restoredRef = useRef(false);

  const queryClient = useQueryClient();
  const { mutate: deleteGarden, isPending: isDeleting, variables: deletingId } = useMutation({
    mutationFn: (id: string) => gardensApi.remove(id),
    onSuccess: () => {
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['gardens'] });
      toast.success('Garden deleted.');
    },
    onError: () => {
      setConfirmDeleteId(null);
      toast.error('Failed to delete garden. Please try again.');
    },
  });

  const { data: gardens = [], isLoading, isError } = useQuery({
    queryKey: ['gardens'],
    queryFn: () => gardensApi.getAll().then((r) => r.data),
  });

  // Restore open tabs once gardens are loaded
  useEffect(() => {
    if (restoredRef.current || isLoading) return;
    restoredRef.current = true; // always mark done once loading finishes, so sync effects can work

    if (openGardenIds.length === 0 || gardens.length === 0) return;

    const restoredTabs: GardenTab[] = openGardenIds
      .filter((id) => gardens.some((g) => g._id === id))
      .map((gardenId) => {
        const garden = gardens.find((g) => g._id === gardenId)!;
        return { tabId: nextTabId(), gardenId, label: garden.name, hasUnsaved: false };
      });

    if (restoredTabs.length === 0) return;
    setTabs(restoredTabs);

    if (savedActiveGardenId) {
      const active = restoredTabs.find((t) => t.gardenId === savedActiveGardenId);
      if (active) setActiveTabId(active.tabId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // Sync open tabs to store (only after restoration is done, to avoid wiping persisted state on mount)
  useEffect(() => {
    if (!restoredRef.current) return;
    setOpenGardenIds(tabs.filter((t) => t.gardenId !== null).map((t) => t.gardenId!));
  }, [tabs, setOpenGardenIds]);

  // Sync active tab to store
  useEffect(() => {
    if (!restoredRef.current) return;
    const active = tabs.find((t) => t.tabId === activeTabId);
    setActiveGardenId(active?.gardenId ?? null);
  }, [activeTabId, tabs, setActiveGardenId]);

  const handleLogout = () => {
    logout();
    navigate(RouteNames.LOGIN);
  };

  const handleOpenGarden = (gardenId: string) => {
    const existing = tabs.find((t) => t.gardenId === gardenId);
    if (existing) {
      setActiveTabId(existing.tabId);
      return;
    }
    const garden = gardens.find((g) => g._id === gardenId);
    const tab: GardenTab = {
      tabId: nextTabId(),
      gardenId,
      label: garden?.name ?? 'garden',
      hasUnsaved: false,
    };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.tabId);
  };

  const handleNewGarden = () => {
    const tab: GardenTab = {
      tabId: nextTabId(),
      gardenId: null,
      label: 'garden',
      hasUnsaved: false,
    };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.tabId);
  };

  const doCloseTab = useCallback((tabId: string) => {
    setTabs((prev) => prev.filter((t) => t.tabId !== tabId));
    setActiveTabId((cur) => {
      if (cur !== tabId) return cur;
      const idx = tabs.findIndex((t) => t.tabId === tabId);
      const remaining = tabs.filter((t) => t.tabId !== tabId);
      if (remaining.length === 0) return null;
      return remaining[Math.max(0, idx - 1)].tabId;
    });
  }, [tabs]);

  const handleCloseTab = useCallback((tabId: string) => {
    const tab = tabs.find((t) => t.tabId === tabId);
    if (tab?.hasUnsaved) {
      setPendingCloseTabId(tabId);
    } else {
      doCloseTab(tabId);
    }
  }, [tabs, doCloseTab]);

  const handleLeaveConfirm = () => {
    if (pendingCloseTabId) {
      doCloseTab(pendingCloseTabId);
      setPendingCloseTabId(null);
    }
  };

  const handleUnsavedChange = useCallback((tabId: string, hasUnsaved: boolean) => {
    setTabs((prev) =>
      prev.map((t) => (t.tabId === tabId ? { ...t, hasUnsaved } : t)),
    );
  }, []);

  const handleCreated = useCallback((tabId: string, gardenId: string, name: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.tabId === tabId ? { ...t, gardenId, label: name } : t)),
    );
  }, []);

  const isEditorActive = activeTabId !== null;

  return (
    <div className={`${styles.container} ${isEditorActive ? styles.containerFull : ''}`}>
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
          className={`${styles.tab} ${activeTabId === null ? styles.tabActive : ''}`}
          onClick={() => setActiveTabId(null)}
        >
          My Gardens
        </button>
        {tabs.map((tab) => (
          <div
            key={tab.tabId}
            className={`${styles.tabItem} ${activeTabId === tab.tabId ? styles.tabItemActive : ''}`}
          >
            <button
              className={styles.tabLabel}
              onClick={() => setActiveTabId(tab.tabId)}
            >
              {tab.hasUnsaved && <span className={styles.tabDot} />}
              {tab.label}
            </button>
            <button
              className={styles.tabClose}
              onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.tabId); }}
              aria-label="Close tab"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {activeTabId === null && (
        <main className={styles.main}>
          <div className={styles.overviewHeader}>
            <h2 className={styles.greeting}>Hello, {profile?.name || user?.email}!</h2>
            <button className={styles.newGardenButton} onClick={handleNewGarden}>
              + New Garden
            </button>
          </div>

          {isLoading && <p className={styles.hint}>Loading your gardens…</p>}

          {isError && (
            <p className={styles.hint}>Failed to load gardens. Please refresh the page.</p>
          )}

          {!isLoading && !isError && gardens.length === 0 && (
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
                      <button
                        className={styles.deleteConfirmYes}
                        onClick={() => deleteGarden(garden._id)}
                        disabled={isDeleting && deletingId === garden._id}
                      >
                        {isDeleting && deletingId === garden._id ? '…' : 'Yes'}
                      </button>
                      <button
                        className={styles.deleteConfirmNo}
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={isDeleting}
                      >
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

      {tabs.map((tab) => (
        <div
          key={tab.tabId}
          className={styles.editorWrapper}
          style={{ display: activeTabId === tab.tabId ? undefined : 'none' }}
        >
          <GardenEditor
            gardenId={tab.gardenId}
            onUnsavedStateChange={(hasUnsaved) => handleUnsavedChange(tab.tabId, hasUnsaved)}
            onCreated={(gardenId, name) => handleCreated(tab.tabId, gardenId, name)}
          />
        </div>
      ))}

      {pendingCloseTabId && (
        <div className={styles.modalOverlay} onClick={() => setPendingCloseTabId(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Unsaved changes</h3>
            <p className={styles.modalBody}>
              Your changes won't be saved. Are you sure you want to lose your progress?
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalStay} onClick={() => setPendingCloseTabId(null)}>
                Stay
              </button>
              <button className={styles.modalLeave} onClick={handleLeaveConfirm}>
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTabId !== null && <AiChat />}
    </div>
  );
};
