import { create } from 'zustand'
import type { ActionType } from '../game/types/engine'

interface InterfaceStore {
  cardsOpen: boolean
  toast: string | null
  /** Ação escolhida que ainda espera a seleção de um alvo (GDD §9.4). */
  targeting: ActionType | null
  setCardsOpen: (open: boolean) => void
  toggleCards: () => void
  showToast: (text: string) => void
  setTargeting: (action: ActionType | null) => void
  resetForNewGame: () => void
}

let toastTimer: ReturnType<typeof setTimeout> | undefined

export const useInterfaceStore = create<InterfaceStore>((set) => ({
  cardsOpen: false,
  toast: null,
  targeting: null,
  setCardsOpen: (open) => set({ cardsOpen: open }),
  toggleCards: () => set((s) => ({ cardsOpen: !s.cardsOpen })),
  showToast: (text) => {
    clearTimeout(toastTimer)
    set({ toast: text })
    toastTimer = setTimeout(() => set({ toast: null }), 3200)
  },
  setTargeting: (action) => set((s) => (s.targeting === action ? s : { targeting: action })),
  resetForNewGame: () => set({ cardsOpen: false, targeting: null, toast: null }),
}))
