import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { indexedDBStorage } from "../utils/indexedDBStorage"
import { Asset, Template } from "../features/assets/hooks/useAssets"

interface AssetState {
  assets: Asset[]
  templates: Template[]
  categories: string[]
  lastUpdated: number | null
  setAssets: (assets: Asset[]) => void
  setTemplates: (templates: Template[]) => void
  setCategories: (categories: string[]) => void
  updateAsset: (id: string, data: Partial<Asset>) => void
}

export const useAssetStore = create<AssetState>()(
  persist(
    (set) => ({
      assets: [],
      templates: [],
      categories: [],
      lastUpdated: null,
      setAssets: (assets) => set({ assets, lastUpdated: Date.now() }),
      setTemplates: (templates) => set({ templates }),
      setCategories: (categories) => set({ categories }),
      updateAsset: (id, data) =>
        set((state) => ({
          assets: state.assets.map((asset) =>
            asset._id === id ? { ...asset, ...data } : asset
          ),
        })),
    }),
    { 
      name: "asset-storage",
      storage: createJSONStorage(() => indexedDBStorage)
    }
  )
)
