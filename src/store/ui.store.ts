import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiStore {
  openGardenIds: string[]
  activeGardenId: string | null
  setOpenGardenIds: (ids: string[]) => void
  setActiveGardenId: (id: string | null) => void
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      openGardenIds: [],
      activeGardenId: null,
      setOpenGardenIds: (ids) => set({ openGardenIds: ids }),
      setActiveGardenId: (id) => set({ activeGardenId: id }),
    }),
    { name: 'garden-ui' },
  ),
)
