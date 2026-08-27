import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import type {
  Escaneo,
  Norma,
  Regla,
  ResumenCumplimiento,
} from "../features/compliance/services/complianceTypes"

interface ComplianceState {
  normas: Norma[]
  reglas: Regla[]
  resumen: ResumenCumplimiento | null
  lastScan: Escaneo | null
  activeScanId: string | null
  loading: boolean
  lastUpdated: number | null
  ownerId: string | null
  setOwnerId: (id: string | null) => void
  setNormas: (normas: Norma[]) => void
  setReglas: (reglas: Regla[]) => void
  setResumen: (resumen: ResumenCumplimiento | null) => void
  setLastScan: (escaneo: Escaneo | null) => void
  setActiveScanId: (id: string | null) => void
  setLoading: (loading: boolean) => void
  clearAll: () => void
}

const initialState = {
  normas: [],
  reglas: [],
  resumen: null,
  lastScan: null,
  activeScanId: null,
  loading: false,
  lastUpdated: null,
  ownerId: null,
}

export const useComplianceStore = create<ComplianceState>()(
  persist(
    (set) => ({
      ...initialState,
      setOwnerId: (id) =>
        set((state) => {
          if (state.ownerId === id) return state
          return {
            ownerId: id,
            normas: [],
            reglas: [],
            resumen: null,
            lastScan: null,
            activeScanId: null,
            lastUpdated: null,
          }
        }),
      setNormas: (normas) => set({ normas, lastUpdated: Date.now() }),
      setReglas: (reglas) => set({ reglas }),
      setResumen: (resumen) => set({ resumen }),
      setLastScan: (lastScan) => set({ lastScan }),
      setActiveScanId: (activeScanId) => set({ activeScanId }),
      setLoading: (loading) => set({ loading }),
      clearAll: () => set(initialState),
    }),
    {
      name: "compliance-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        normas: state.normas,
        reglas: state.reglas,
        resumen: state.resumen,
        lastScan: state.lastScan,
        activeScanId: state.activeScanId,
        ownerId: state.ownerId,
      }),
    },
  ),
)