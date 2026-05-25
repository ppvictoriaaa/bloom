import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { usersApi } from '../../api/users';
import styles from './verify-email.module.css';

const broadcast = (email: string) => {
  const channel = new BroadcastChannel('email-verification');
  channel.postMessage({ type: 'email-verified', email });
  channel.close();
};

export const VerifyEmailPage = () => {
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email') ?? '';

  const [code, setCode] = useState(['', '', '', '', '']);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const mutation = useMutation({
    mutationFn: (fullCode: string) => usersApi.verifyCode(email, fullCode),
    onSuccess: () => {
      setVerified(true);
      broadcast(email);
      setTimeout(() => window.close(), 1800);
    },
    onError: () => {
      setCode(['', '', '', '', '']);
      inputRefs.current[0]?.focus();
    },
  });

  const handleInput = (i: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[i] = char;
    setCode(next);
    if (char && i < 4) {
      inputRefs.current[i + 1]?.focus();
    }
    if (char && i === 4 && next.every((c) => c)) {
      mutation.mutate(next.join(''));
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 5);
    if (pasted.length === 5) {
      const digits = pasted.split('');
      setCode(digits);
      inputRefs.current[4]?.focus();
      mutation.mutate(pasted);
    }
  };

  if (verified) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.title}>Email verified!</h1>
          <p className={styles.desc}>You can close this tab. Your settings have been saved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Verify your email</h1>
        <p className={styles.desc}>
          Enter the 5-digit code sent to <strong>{email}</strong>
        </p>

        <div className={styles.codeRow} onPaste={handlePaste}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              className={`${styles.codeInput} ${mutation.isError ? styles.codeInputError : ''}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInput(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              autoFocus={i === 0}
            />
          ))}
        </div>

        {mutation.isError && (
          <p className={styles.error}>Invalid or expired code. Please try again.</p>
        )}

        <button
          className={styles.submitBtn}
          onClick={() => mutation.mutate(code.join(''))}
          disabled={code.some((c) => !c) || mutation.isPending}
        >
          {mutation.isPending ? 'Verifying…' : 'Confirm'}
        </button>
      </div>
    </div>
  );
};
