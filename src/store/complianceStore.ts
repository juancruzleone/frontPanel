import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import type {
  Escaneo,
  Norma,
  Regla,
  ResumenCumplimiento,
  CatalogAssignment, CatalogPackDetail, CatalogPackSummary, CatalogRunDetail, CatalogRunSummary, CatalogFinding, PagedResult,
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
  scopeEpoch: number
  catalogPacks: PagedResult<CatalogPackSummary> | null
  catalogPack: CatalogPackDetail | null
  assignments: CatalogAssignment[]
  catalogRuns: PagedResult<CatalogRunSummary> | null
  catalogRun: CatalogRunDetail | null
  catalogFindings: PagedResult<CatalogFinding> | null
  setOwnerId: (id: string | null) => void
  setNormas: (normas: Norma[]) => void
  setReglas: (reglas: Regla[]) => void
  setResumen: (resumen: ResumenCumplimiento | null) => void
  setLastScan: (escaneo: Escaneo | null) => void
  setActiveScanId: (id: string | null) => void
  setLoading: (loading: boolean) => void
  clearAll: () => void
  beginScopeRequest: () => number
  setCatalogPacks: (value: PagedResult<CatalogPackSummary>, epoch?: number) => boolean
  setCatalogPack: (value: CatalogPackDetail, epoch?: number) => boolean
  setAssignments: (value: CatalogAssignment[], epoch?: number) => boolean
  setCatalogRuns: (value: PagedResult<CatalogRunSummary>, epoch?: number) => boolean
  setCatalogRun: (value: CatalogRunDetail, epoch?: number) => boolean
  setCatalogFindings: (value: PagedResult<CatalogFinding>, epoch?: number) => boolean
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
  scopeEpoch: 0, catalogPacks: null, catalogPack: null, assignments: [], catalogRuns: null, catalogRun: null, catalogFindings: null,
}
const clearScopedData = (scopeEpoch: number) => ({ scopeEpoch, normas: [], reglas: [], resumen: null, lastScan: null, activeScanId: null, lastUpdated: null, catalogPacks: null, catalogPack: null, assignments: [], catalogRuns: null, catalogRun: null, catalogFindings: null })

export const useComplianceStore = create<ComplianceState>()(
  persist(
    (set) => ({
      ...initialState,
      setOwnerId: (id) =>
        set((state) => {
          if (state.ownerId === id) return state
          return {
            ownerId: id, ...clearScopedData(state.scopeEpoch + 1),
          }
        }),
      setNormas: (normas) => set({ normas, lastUpdated: Date.now() }),
      setReglas: (reglas) => set({ reglas }),
      setResumen: (resumen) => set({ resumen }),
      setLastScan: (lastScan) => set({ lastScan }),
      setActiveScanId: (activeScanId) => set({ activeScanId }),
      setLoading: (loading) => set({ loading }),
      clearAll: () => set(initialState),
      beginScopeRequest: () => { let epoch = 0; set((state) => { epoch = state.scopeEpoch + 1; return { scopeEpoch: epoch } }); return epoch },
      setCatalogPacks: (value, epoch) => { if (epoch !== undefined && epoch !== useComplianceStore.getState().scopeEpoch) return false; set({ catalogPacks: value }); return true },
      setCatalogPack: (value, epoch) => { if (epoch !== undefined && epoch !== useComplianceStore.getState().scopeEpoch) return false; set({ catalogPack: value }); return true },
      setAssignments: (value, epoch) => { if (epoch !== undefined && epoch !== useComplianceStore.getState().scopeEpoch) return false; set({ assignments: value }); return true },
      setCatalogRuns: (value, epoch) => { if (epoch !== undefined && epoch !== useComplianceStore.getState().scopeEpoch) return false; set({ catalogRuns: value }); return true },
      setCatalogRun: (value, epoch) => { if (epoch !== undefined && epoch !== useComplianceStore.getState().scopeEpoch) return false; set({ catalogRun: value }); return true },
      setCatalogFindings: (value, epoch) => { if (epoch !== undefined && epoch !== useComplianceStore.getState().scopeEpoch) return false; set({ catalogFindings: value }); return true },
    }),
    {
      name: "compliance-storage",
      storage: createJSONStorage(() => localStorage),
       version: 2,
       migrate: (persistedState) => ({ ...initialState, ...(persistedState as Partial<ComplianceState>), scopeEpoch: 0 }),
       partialize: (state) => ({
        normas: state.normas,
        reglas: state.reglas,
        resumen: state.resumen,
        lastScan: state.lastScan,
        activeScanId: state.activeScanId,
         ownerId: state.ownerId,
         catalogPacks: state.catalogPacks, assignments: state.assignments,
      }),
    },
  ),
)
