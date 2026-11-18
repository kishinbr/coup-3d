import { create } from 'zustand'

interface CameraStore {
  /** true quando o cursor está capturado (pointer lock) para olhar ao redor. */
  locked: boolean
  setLocked: (locked: boolean) => void
}

export const useCameraStore = create<CameraStore>((set) => ({
  locked: false,
  setLocked: (locked) => set({ locked }),
}))
