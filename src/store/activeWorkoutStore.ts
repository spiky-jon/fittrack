import { create } from 'zustand'

interface ActiveWorkoutStore {
  sessionId: string | null
  sessionName: string | null
  startedAt: string | null
  isOpen: boolean
  isMinimised: boolean
  openWorkout: (sessionId: string, sessionName: string, startedAt: string) => void
  minimise: () => void
  expand: () => void
  closeWorkout: () => void
}

export const useActiveWorkoutStore = create<ActiveWorkoutStore>(set => ({
  sessionId: null,
  sessionName: null,
  startedAt: null,
  isOpen: false,
  isMinimised: false,
  openWorkout: (sessionId, sessionName, startedAt) =>
    set({ sessionId, sessionName, startedAt, isOpen: true, isMinimised: false }),
  minimise: () => set({ isOpen: false, isMinimised: true }),
  expand: () => set({ isOpen: true, isMinimised: false }),
  closeWorkout: () =>
    set({ sessionId: null, sessionName: null, startedAt: null, isOpen: false, isMinimised: false }),
}))
