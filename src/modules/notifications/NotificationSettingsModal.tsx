import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../api/users';
import { toast } from '../../store/toast.store';
import { RouteNames } from '../../router/routes';
import styles from './notification-settings.module.css';

interface Props {
  gardenId: string;
  gardenName: string;
  onClose: () => void;
}

export const NotificationSettingsModal = ({ gardenId, gardenName, onClose }: Props) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<BroadcastChannel | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['gardenNotificationSettings', gardenId],
    queryFn: () => usersApi.getGardenSettings(gardenId).then((r) => r.data),
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => usersApi.getProfile().then((r) => r.data),
  });

  const verifiedEmails = new Set(profile?.verifiedEmails ?? []);

  const [email, setEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [daysBefore, setDaysBefore] = useState(0);
  const [time, setTime] = useState('09:00');
  const [verificationSent, setVerificationSent] = useState(false);
  const [testResult, setTestResult] = useState<{
    sent: boolean;
    eventsCount: number;
    previewUrl: string | null;
    targetDate: string;
  } | null>(null);

  useEffect(() => {
    if (settings) {
      setEmail(settings.notificationEmail ?? '');
      setEmailVerified(settings.isEmailVerified ?? false);
      setDaysBefore(settings.daysBefore ?? 0);
      setTime(settings.time ?? '09:00');
    }
  }, [settings]);

  useEffect(() => {
    const channel = new BroadcastChannel('email-verification');
    channelRef.current = channel;
    channel.onmessage = (e: MessageEvent<{ type: string; email: string }>) => {
      if (e.data.type === 'email-verified') {
        setEmail(e.data.email);
        setEmailVerified(true);
        setVerificationSent(false);
        void queryClient.invalidateQueries({ queryKey: ['gardenNotificationSettings', gardenId] });
        void queryClient.invalidateQueries({ queryKey: ['profile'] });
      }
    };
    return () => channel.close();
  }, [queryClient, gardenId]);

  const sendMutation = useMutation({
    mutationFn: () => usersApi.sendVerification(email),
    onSuccess: () => {
      setVerificationSent(true);
      const verifyUrl = `${window.location.origin}${RouteNames.VERIFY_EMAIL}?email=${encodeURIComponent(email)}`;
      window.open(verifyUrl, '_blank', 'noopener');
    },
    onError: () => toast.error('Failed to send verification email.'),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      usersApi.upsertGardenSettings(gardenId, { notificationEmail: email, daysBefore, time }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gardenNotificationSettings', gardenId] });
      void queryClient.invalidateQueries({ queryKey: ['allGardenNotificationSettings'] });
      toast.success('Reminder settings saved.');
      onClose();
    },
    onError: () => toast.error('Failed to save settings.'),
  });

  const testMutation = useMutation({
    mutationFn: () => usersApi.triggerTestReminder(gardenId),
    onSuccess: (res) => {
      setTestResult(res.data);
      if (!res.data.sent) {
        toast.info(`No care tasks found for ${res.data.targetDate}.`);
      }
    },
    onError: () => toast.error('Failed to send test reminder.'),
  });

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setEmailVerified(verifiedEmails.has(val));
    setVerificationSent(false);
    setTestResult(null);
  };

  const isSaved =
    settings?.isEmailVerified &&
    settings.notificationEmail === email &&
    settings.daysBefore === daysBefore &&
    settings.time === time;

  const canVerify = email.includes('@') && email.includes('.');
  const canSave = emailVerified;

  if (isLoading) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Care Reminders</h2>
            <p className={styles.gardenLabel}>🪴 {gardenName}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <p className={styles.description}>
            Get email reminders for upcoming care tasks in this garden.
          </p>

          <div className={styles.field}>
            <label className={styles.label}>
              Notification email <span className={styles.required}>*</span>
            </label>
            <div className={styles.emailRow}>
              <input
                className={`${styles.input} ${emailVerified ? styles.inputVerified : ''}`}
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="your@email.com"
              />
              {emailVerified ? (
                <span className={styles.verifiedBadge}>✓ Verified</span>
              ) : (
                <button
                  className={styles.verifyBtn}
                  onClick={() => sendMutation.mutate()}
                  disabled={!canVerify || sendMutation.isPending}
                >
                  {sendMutation.isPending ? 'Sending…' : verificationSent ? 'Resend code' : 'Verify email'}
                </button>
              )}
            </div>
            {verificationSent && !emailVerified && (
              <p className={styles.hint}>
                A 5-digit code was sent to <strong>{email}</strong>. Enter it in the new tab.
              </p>
            )}
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Send reminder</label>
              <div className={styles.daysRow}>
                <input
                  className={`${styles.input} ${styles.inputNarrow}`}
                  type="number"
                  min={0}
                  max={30}
                  value={daysBefore}
                  onChange={(e) => { setDaysBefore(Number(e.target.value)); setTestResult(null); }}
                />
                <span className={styles.unit}>day{daysBefore !== 1 ? 's' : ''} before</span>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>At time</label>
              <input
                className={`${styles.input} ${styles.inputTime}`}
                type="time"
                value={time}
                onChange={(e) => { setTime(e.target.value); setTestResult(null); }}
              />
            </div>
          </div>

          {isSaved && (
            <div className={styles.testSection}>
              {testResult ? (
                testResult.sent ? (
                  <div className={styles.testSuccess}>
                    <span>✓ Sent — {testResult.eventsCount} task{testResult.eventsCount > 1 ? 's' : ''} for {testResult.targetDate}</span>
                    {testResult.previewUrl && (
                      <a
                        href={testResult.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.previewLink}
                      >
                        View email →
                      </a>
                    )}
                  </div>
                ) : (
                  <p className={styles.testEmpty}>No tasks found for {testResult.targetDate}.</p>
                )
              ) : (
                <button
                  className={styles.testBtn}
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? 'Sending…' : '📬 Send test reminder now'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            className={styles.saveBtn}
            onClick={() => saveMutation.mutate()}
            disabled={!canSave || saveMutation.isPending}
            title={!canSave ? 'Verify your email first' : undefined}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save reminders'}
          </button>
        </div>
      </div>
    </div>
  );
};
