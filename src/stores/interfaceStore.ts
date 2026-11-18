import { create } from 'zustand'

interface InterfaceStore {
  cardsOpen: boolean
  toast: string | null
  setCardsOpen: (open: boolean) => void
  toggleCards: () => void
  showToast: (text: string) => void
  clearToast: () => void
}

let toastTimer: ReturnType<typeof setTimeout> | undefined

export const useInterfaceStore = create<InterfaceStore>((set) => ({
  cardsOpen: false,
  toast: null,
  setCardsOpen: (open) => set({ cardsOpen: open }),
  toggleCards: () => set((s) => ({ cardsOpen: !s.cardsOpen })),
  showToast: (text) => {
    clearTimeout(toastTimer)
    set({ toast: text })
    toastTimer = setTimeout(() => set({ toast: null }), 2600)
  },
  clearToast: () => set({ toast: null }),
}))
