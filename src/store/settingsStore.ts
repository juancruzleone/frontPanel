import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface SettingCategory {
  _id: string
  nombre: string
  tipo: 'instalacion' | 'activo' | 'dispositivo' | 'formulario' | 'instalacion_tipo' | 'dispositivo_categoria' | 'activo_categoria'
  descripcion?: string
  activa?: boolean
}

interface SettingsState {
  categories: SettingCategory[]
  lastUpdated: number | null
  ownerId: string | null
  setOwnerId: (id: string | null) => void
  setCategories: (categories: SettingCategory[]) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      categories: [],
      lastUpdated: null,
      ownerId: null,
      setOwnerId: (id) =>
        set((state) => {
          if (state.ownerId === id) return state
          return {
            ownerId: id,
            categories: [],
            lastUpdated: null,
          }
        }),
      setCategories: (categories) => set({ categories, lastUpdated: Date.now() }),
    }),
    { name: "settings-storage" }
  )
)
