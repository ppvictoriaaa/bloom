import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { aiApi } from '../../api/ai';
import type { ChatMessage } from '../../api/ai';
import { gardensApi } from '../../api/gardens';
import { useChatStore } from '../../store/chat.store';
import { useUiStore } from '../../store/ui.store';
import styles from './ai-chat.module.css';

export const AiChat = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { histories, activeGardenId: savedGardenId, setActiveGarden, pushMessage } = useChatStore();
  const uiActiveGardenId = useUiStore((s) => s.activeGardenId);

  const { data: gardens = [] } = useQuery({
    queryKey: ['gardens-for-chat'],
    queryFn: () => gardensApi.getAll().then((r) => r.data),
    staleTime: 60_000,
  });

  // Derive active garden without writing back to store:
  // 1. open tab in ui store
  // 2. last selected in chat store
  // 3. first available garden
  const activeGardenId =
    uiActiveGardenId ??
    savedGardenId ??
    (gardens.length > 0 ? gardens[0]._id : null);

  const history: ChatMessage[] = activeGardenId ? (histories[activeGardenId] ?? []) : [];

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [open, history]);

  const send = async () => {
    const message = input.trim();
    if (!message || loading || !activeGardenId) return;

    const userMsg: ChatMessage = { role: 'user', content: message };
    pushMessage(activeGardenId, userMsg);
    setInput('');
    setLoading(true);

    const gardenId = activeGardenId;
    try {
      const res = await aiApi.chat(message, history, gardenId);
      pushMessage(gardenId, { role: 'assistant', content: res.data.reply });
    } catch {
      pushMessage(gardenId, { role: 'assistant', content: 'Something went wrong. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const activeGardenName = gardens.find((g) => g._id === activeGardenId)?.name ?? '';

  return (
    <>
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span className={styles.headerTitle}>🌱 Garden Assistant</span>
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>

          {gardens.length > 1 && (
            <div className={styles.gardenSelect}>
              <select
                value={activeGardenId ?? ''}
                onChange={(e) => setActiveGarden(e.target.value)}
                className={styles.select}
              >
                {gardens.map((g) => (
                  <option key={g._id} value={g._id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.messages}>
            {history.length === 0 && (
              <p className={styles.empty}>
                {activeGardenName
                  ? `Ask me anything about "${activeGardenName}" — care tasks, plant advice, where to plant…`
                  : 'Select a garden to start chatting.'}
              </p>
            )}
            {history.map((msg, i) => (
              <div
                key={i}
                className={msg.role === 'user' ? styles.userMsg : styles.assistantMsg}
              >
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className={styles.assistantMsg}>
                <span className={styles.typing}>●●●</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className={styles.inputRow}>
            <textarea
              ref={inputRef}
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your garden…"
              rows={1}
            />
            <button
              className={styles.sendBtn}
              onClick={() => void send()}
              disabled={!input.trim() || loading || !activeGardenId}
            >
              ↑
            </button>
          </div>
        </div>
      )}

      <button
        className={`${styles.fab} ${open ? styles.fabOpen : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="Garden Assistant"
      >
        {open ? '✕' : '🌱'}
      </button>
    </>
  );
};