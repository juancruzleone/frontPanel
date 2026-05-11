import { create } from "zustand"
import { persist } from "zustand/middleware"
import { Installation, Asset, Device } from "../features/installations/hooks/useInstallations"

interface InstallationState {
  installations: Installation[]
  assets: Asset[]
  lastUpdated: number | null
  ownerId: string | null
  setOwnerId: (id: string | null) => void
  setInstallations: (installations: Installation[]) => void
  setAssets: (assets: Asset[]) => void
  updateInstallation: (id: string, data: Partial<Installation>) => void
  addInstallation: (installation: Installation) => void
  removeInstallation: (id: string) => void
}

export const useInstallationStore = create<InstallationState>()(
  persist(
    (set) => ({
      installations: [],
      assets: [],
      lastUpdated: null,
      ownerId: null,
      setOwnerId: (id) => set({ ownerId: id }),
      setInstallations: (installations) => set({ installations, lastUpdated: Date.now() }),
      setAssets: (assets) => set({ assets }),
      updateInstallation: (id, data) =>
        set((state) => ({
          installations: state.installations.map((inst) =>
            inst._id === id ? { ...inst, ...data } : inst
          ),
        })),
      addInstallation: (installation) =>
        set((state) => ({
          installations: [installation, ...state.installations],
        })),
      removeInstallation: (id) =>
        set((state) => ({
          installations: state.installations.filter((inst) => inst._id !== id),
        })),
    }),
    { name: "installation-storage" }
  )
)
