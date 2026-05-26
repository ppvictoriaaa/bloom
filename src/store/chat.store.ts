import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMessage } from '../api/ai'

interface ChatStore {
  histories: Record<string, ChatMessage[]>
  activeGardenId: string | null
  setActiveGarden: (id: string | null) => void
  pushMessage: (gardenId: string, msg: ChatMessage) => void
  replaceLastAssistant: (gardenId: string, msg: ChatMessage) => void
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      histories: {},
      activeGardenId: null,

      setActiveGarden: (id) => set({ activeGardenId: id }),

      pushMessage: (gardenId, msg) =>
        set((s) => ({
          histories: {
            ...s.histories,
            [gardenId]: [...(s.histories[gardenId] ?? []), msg],
          },
        })),

      replaceLastAssistant: (gardenId, msg) =>
        set((s) => {
          const prev = s.histories[gardenId] ?? [];
          const updated = [...prev];
          const lastIdx = updated.findLastIndex((m) => m.role === 'assistant');
          if (lastIdx !== -1) updated[lastIdx] = msg;
          else updated.push(msg);
          return { histories: { ...s.histories, [gardenId]: updated } };
        }),
    }),
    { name: 'garden-chat' },
  ),
)
