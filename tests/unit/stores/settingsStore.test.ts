import { beforeEach, describe, expect, it } from "vitest"
import { useSettingsStore } from "../../../src/store/settingsStore"

describe("useSettingsStore", () => {
  beforeEach(() => {
    useSettingsStore.getState().resetSettings()
  })

  it("stores installationTypes, assetCategories, and formCategories independently without race overwrite", () => {
    const store = useSettingsStore.getState()

    // 1. Set installation types
    store.setInstallationTypes([
      { _id: "type-1", nombre: "Oficina", activo: true },
      { _id: "type-2", nombre: "Planta", activo: true },
    ])

    expect(useSettingsStore.getState().installationTypes).toHaveLength(2)
    expect(useSettingsStore.getState().assetCategories).toHaveLength(0)
    expect(useSettingsStore.getState().formCategories).toHaveLength(0)

    // 2. Set asset categories concurrently (simulating async arrival)
    store.setAssetCategories([
      { _id: "asset-1", nombre: "Climatización", activa: true },
    ])

    // Verify installationTypes was NOT wiped out!
    expect(useSettingsStore.getState().installationTypes).toHaveLength(2)
    expect(useSettingsStore.getState().assetCategories).toHaveLength(1)
    expect(useSettingsStore.getState().formCategories).toHaveLength(0)

    // 3. Set form categories
    store.setFormCategories([
      { _id: "form-1", nombre: "Inspección mensual", activa: true },
      { _id: "form-2", nombre: "Checklist preventivo", activa: true },
    ])

    // Verify all 3 slices retain their independent data
    const finalState = useSettingsStore.getState()
    expect(finalState.installationTypes).toHaveLength(2)
    expect(finalState.assetCategories).toHaveLength(1)
    expect(finalState.formCategories).toHaveLength(2)

    // Check legacy categories projection also contains all 5 items
    expect(finalState.categories).toHaveLength(5)
  })

  it("handles setCategories backward compatibility correctly", () => {
    const store = useSettingsStore.getState()

    store.setCategories([
      { _id: "t1", nombre: "Tipo 1", tipo: "instalacion_tipo", activo: true },
      { _id: "a1", nombre: "Cat 1", tipo: "instalacion", activa: true },
      { _id: "f1", nombre: "Form 1", tipo: "formulario", activa: true },
    ])

    const state = useSettingsStore.getState()
    expect(state.installationTypes).toEqual([
      { _id: "t1", nombre: "Tipo 1", descripcion: undefined, activo: true, fechaCreacion: undefined },
    ])
    expect(state.assetCategories).toEqual([
      { _id: "a1", nombre: "Cat 1", descripcion: undefined, activa: true, fechaCreacion: undefined },
    ])
    expect(state.formCategories).toEqual([
      { _id: "f1", nombre: "Form 1", descripcion: undefined, activa: true, fechaCreacion: undefined },
    ])
  })

  it("resets when ownerId changes to avoid data leaking between accounts", () => {
    const store = useSettingsStore.getState()

    store.setOwnerId("user-A")
    store.setInstallationTypes([{ _id: "t1", nombre: "Tipo A", activo: true }])
    expect(useSettingsStore.getState().installationTypes).toHaveLength(1)

    // Same owner does not reset
    store.setOwnerId("user-A")
    expect(useSettingsStore.getState().installationTypes).toHaveLength(1)

    // Different owner resets
    store.setOwnerId("user-B")
    expect(useSettingsStore.getState().installationTypes).toHaveLength(0)
    expect(useSettingsStore.getState().ownerId).toBe("user-B")
  })
})
