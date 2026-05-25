import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../../api/users';
import { gardensApi } from '../../../api/gardens';
import { recommendationsApi } from '../../../api/recommendations';
import { toast } from '../../../store/toast.store';
import { NotificationSettingsModal } from '../../notifications/NotificationSettingsModal';
import styles from '../styles/profile.module.css';

interface Props {
  initialName: string;
  email: string;
}

export const ProfileForm = ({ initialName, email }: Props) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(true);
  const [editingGardenId, setEditingGardenId] = useState<string | null>(null);

  const { data: gardens = [] } = useQuery({
    queryKey: ['gardens'],
    queryFn: () => gardensApi.getAll().then((r) => r.data),
  });

  const { data: gardenIdsWithCalendar = [] } = useQuery({
    queryKey: ['gardensWithCalendar', gardens.map((g) => g._id).join(',')],
    queryFn: () =>
      recommendationsApi.getGardensWithCalendar(gardens.map((g) => g._id)).then((r) => r.data),
    enabled: gardens.length > 0,
  });

  const gardensWithCalendar = gardens.filter((g) => gardenIdsWithCalendar.includes(g._id));

  const { data: allSettings = [] } = useQuery({
    queryKey: ['allGardenNotificationSettings'],
    queryFn: () => usersApi.getAllGardenSettings().then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: () => usersApi.updateProfile({ name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSaved(true);
      toast.success('Profile saved.');
    },
    onError: () => toast.error('Failed to save profile. Please try again.'),
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setSaved(false);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }
    mutation.mutate();
  };

  const settingsMap = Object.fromEntries(allSettings.map((s) => [s.gardenId, s]));
  const editingGarden = gardens.find((g) => g._id === editingGardenId);

  return (
    <>
      <div className={styles.card}>
        <h1 className={styles.title}>Profile</h1>
        <p className={styles.email}>{email}</p>

        <div className={styles.field}>
          <label className={styles.label}>Name</label>
          <input
            className={styles.input}
            value={name}
            onChange={handleNameChange}
            placeholder="Your name"
          />
        </div>

        <button
          className={styles.button}
          onClick={handleSave}
          disabled={mutation.isPending || saved}
        >
          {mutation.isPending ? 'Saving...' : saved ? 'Saved' : 'Save changes'}
        </button>
      </div>

      <div className={styles.notifCard}>
        <h2 className={styles.notifTitle}>Care Reminders</h2>
        <p className={styles.notifSubtitle}>Per-garden reminder settings</p>

        {gardensWithCalendar.length === 0 ? (
          <p className={styles.notifEmpty}>No gardens with a generated calendar yet.</p>
        ) : (
          <div className={styles.gardenList}>
            {gardensWithCalendar.map((garden) => {
              const s = settingsMap[garden._id];
              const isConfigured = !!s?.isEmailVerified;
              return (
                <div key={garden._id} className={styles.gardenRow}>
                  <div className={styles.gardenInfo}>
                    <span className={styles.gardenName}>🪴 {garden.name}</span>
                    {isConfigured ? (
                      <div className={styles.notifRow}>
                        <span className={styles.notifValue}>
                          {s.notificationEmail}
                          <span className={styles.notifVerified}>✓ verified</span>
                        </span>
                        <span className={styles.notifMeta}>
                          {s.daysBefore === 0
                            ? 'Same day'
                            : `${s.daysBefore} day${s.daysBefore !== 1 ? 's' : ''} before`}
                          {' · '}{s.time}
                        </span>
                      </div>
                    ) : (
                      <span className={styles.notifEmpty}>No reminders set up</span>
                    )}
                  </div>
                  <button
                    className={styles.editBtn}
                    onClick={() => setEditingGardenId(garden._id)}
                  >
                    {isConfigured ? 'Edit' : 'Set up'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingGardenId && editingGarden && (
        <NotificationSettingsModal
          gardenId={editingGardenId}
          gardenName={editingGarden.name}
          onClose={() => setEditingGardenId(null)}
        />
      )}
    </>
  );
};
