import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface SettingCategory {
  _id: string
  nombre: string
  tipo: 'instalacion' | 'activo' | 'dispositivo' | 'formulario' | 'instalacion_tipo' | 'dispositivo_categoria' | 'activo_categoria'
  descripcion?: string
  activa?: boolean
  activo?: boolean
  fechaCreacion?: string
}

export interface InstallationTypeItem {
  _id: string
  nombre: string
  descripcion?: string
  activo: boolean
  fechaCreacion?: string
}

export interface CategoryItem {
  _id: string
  nombre: string
  descripcion?: string
  activa?: boolean
  fechaCreacion?: string
}

export interface FormCategoryItem {
  _id: string
  nombre: string
  descripcion?: string
  activa?: boolean
  fechaCreacion?: string
}

interface SettingsState {
  // Entidades independientes para evitar condiciones de carrera entre fetch concurrentes
  installationTypes: InstallationTypeItem[]
  assetCategories: CategoryItem[]
  formCategories: FormCategoryItem[]

  // Compatibilidad hacia atrás con código existente
  categories: SettingCategory[]
  lastUpdated: number | null
  ownerId: string | null

  // Acciones
  setOwnerId: (id: string | null) => void
  setInstallationTypes: (types: InstallationTypeItem[]) => void
  setAssetCategories: (categories: CategoryItem[]) => void
  setFormCategories: (categories: FormCategoryItem[]) => void
  setCategories: (categories: SettingCategory[]) => void
  resetSettings: () => void
}

const buildLegacyCategories = (
  types: InstallationTypeItem[],
  assets: CategoryItem[],
  forms: FormCategoryItem[]
): SettingCategory[] => {
  const mappedTypes: SettingCategory[] = types.map((t) => ({
    _id: t._id,
    nombre: t.nombre,
    descripcion: t.descripcion,
    activo: t.activo,
    activa: t.activo,
    tipo: 'instalacion_tipo',
    fechaCreacion: t.fechaCreacion,
  }))

  const mappedAssets: SettingCategory[] = assets.map((a) => ({
    _id: a._id,
    nombre: a.nombre,
    descripcion: a.descripcion,
    activa: a.activa !== undefined ? a.activa : true,
    activo: a.activa !== undefined ? a.activa : true,
    tipo: 'instalacion',
    fechaCreacion: a.fechaCreacion,
  }))

  const mappedForms: SettingCategory[] = forms.map((f) => ({
    _id: f._id,
    nombre: f.nombre,
    descripcion: f.descripcion,
    activa: f.activa !== undefined ? f.activa : true,
    activo: f.activa !== undefined ? f.activa : true,
    tipo: 'formulario',
    fechaCreacion: f.fechaCreacion,
  }))

  return [...mappedTypes, ...mappedAssets, ...mappedForms]
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      installationTypes: [],
      assetCategories: [],
      formCategories: [],
      categories: [],
      lastUpdated: null,
      ownerId: null,

      setOwnerId: (id) =>
        set((state) => {
          if (state.ownerId === id) return state
          return {
            ownerId: id,
            installationTypes: [],
            assetCategories: [],
            formCategories: [],
            categories: [],
            lastUpdated: null,
          }
        }),

      setInstallationTypes: (types) =>
        set((state) => ({
          installationTypes: types,
          categories: buildLegacyCategories(types, state.assetCategories, state.formCategories),
          lastUpdated: Date.now(),
        })),

      setAssetCategories: (categories) =>
        set((state) => ({
          assetCategories: categories,
          categories: buildLegacyCategories(state.installationTypes, categories, state.formCategories),
          lastUpdated: Date.now(),
        })),

      setFormCategories: (categories) =>
        set((state) => ({
          formCategories: categories,
          categories: buildLegacyCategories(state.installationTypes, state.assetCategories, categories),
          lastUpdated: Date.now(),
        })),

      setCategories: (categories) =>
        set((state) => {
          const types: InstallationTypeItem[] = categories
            .filter((c) => c.tipo === 'instalacion_tipo')
            .map((c) => ({
              _id: c._id,
              nombre: c.nombre,
              descripcion: c.descripcion,
              activo: c.activo !== undefined ? c.activo : c.activa !== undefined ? c.activa : true,
              fechaCreacion: c.fechaCreacion,
            }))

          const assets: CategoryItem[] = categories
            .filter((c) => c.tipo === 'instalacion' || c.tipo === 'activo_categoria' || c.tipo === 'dispositivo_categoria')
            .map((c) => ({
              _id: c._id,
              nombre: c.nombre,
              descripcion: c.descripcion,
              activa: c.activa !== undefined ? c.activa : c.activo !== undefined ? c.activo : true,
              fechaCreacion: c.fechaCreacion,
            }))

          const forms: FormCategoryItem[] = categories
            .filter((c) => c.tipo === 'formulario')
            .map((c) => ({
              _id: c._id,
              nombre: c.nombre,
              descripcion: c.descripcion,
              activa: c.activa !== undefined ? c.activa : c.activo !== undefined ? c.activo : true,
              fechaCreacion: c.fechaCreacion,
            }))

          return {
            installationTypes: types.length > 0 ? types : state.installationTypes,
            assetCategories: assets.length > 0 ? assets : state.assetCategories,
            formCategories: forms.length > 0 ? forms : state.formCategories,
            categories,
            lastUpdated: Date.now(),
          }
        }),

      resetSettings: () =>
        set({
          installationTypes: [],
          assetCategories: [],
          formCategories: [],
          categories: [],
          lastUpdated: null,
          ownerId: null,
        }),
    }),
    {
      name: "settings-storage",
      version: 2,
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== "object") {
          return {
            installationTypes: [],
            assetCategories: [],
            formCategories: [],
            categories: [],
            lastUpdated: null,
            ownerId: null,
          }
        }
        const state = persistedState as Partial<SettingsState>
        const categories = Array.isArray(state.categories) ? state.categories : []
        const types: InstallationTypeItem[] = categories
          .filter((c) => c.tipo === 'instalacion_tipo')
          .map((c) => ({
            _id: c._id,
            nombre: c.nombre,
            descripcion: c.descripcion,
            activo: c.activo !== undefined ? c.activo : c.activa !== undefined ? c.activa : true,
            fechaCreacion: c.fechaCreacion,
          }))

        const assets: CategoryItem[] = categories
          .filter((c) => c.tipo === 'instalacion' || c.tipo === 'activo_categoria' || c.tipo === 'dispositivo_categoria')
          .map((c) => ({
            _id: c._id,
            nombre: c.nombre,
            descripcion: c.descripcion,
            activa: c.activa !== undefined ? c.activa : c.activo !== undefined ? c.activo : true,
            fechaCreacion: c.fechaCreacion,
          }))

        const forms: FormCategoryItem[] = categories
          .filter((c) => c.tipo === 'formulario')
          .map((c) => ({
            _id: c._id,
            nombre: c.nombre,
            descripcion: c.descripcion,
            activa: c.activa !== undefined ? c.activa : c.activo !== undefined ? c.activo : true,
            fechaCreacion: c.fechaCreacion,
          }))

        return {
          ...state,
          installationTypes: Array.isArray(state.installationTypes) && state.installationTypes.length > 0 ? state.installationTypes : types,
          assetCategories: Array.isArray(state.assetCategories) && state.assetCategories.length > 0 ? state.assetCategories : assets,
          formCategories: Array.isArray(state.formCategories) && state.formCategories.length > 0 ? state.formCategories : forms,
          categories,
        }
      },
    }
  )
)
