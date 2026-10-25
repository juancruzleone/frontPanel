import { fetchWorkOrders } from "../../features/workOrders/services/workOrderServices"
import { fetchAssets } from "../../features/assets/services/assetServices"
import { fetchInstallations } from "../../features/installations/services/installationServices"

export interface GlobalSearchResult {
  id: string
  title: string
  subtitle?: string
  category: "workOrders" | "assets" | "installations"
  url: string
}

export const executeGlobalSearch = async (
  query: string,
): Promise<GlobalSearchResult[]> => {
  const q = query.trim()
  if (q.length < 2) return []

  const results: GlobalSearchResult[] = []

  const [ordersRes, assetsRes, instRes] = await Promise.allSettled([
    fetchWorkOrders(1, 4, { search: q }),
    fetchAssets({ page: 1, limit: 4, search: q }),
    fetchInstallations({ page: 1, limit: 4, search: q }),
  ])

  // Extract work orders
  if (ordersRes.status === "fulfilled" && ordersRes.value?.data) {
    const list = Array.isArray(ordersRes.value.data) ? ordersRes.value.data : []
    for (const item of list) {
      results.push({
        id: item._id,
        title: item.titulo || "Orden de trabajo",
        subtitle: item.instalacion?.company || item.estado,
        category: "workOrders",
        url: `/ordenes-trabajo?search=${encodeURIComponent(item.titulo || "")}`,
      })
    }
  }

  // Extract assets
  if (assetsRes.status === "fulfilled") {
    const raw = assetsRes.value
    const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : []
    for (const item of list) {
      results.push({
        id: item._id,
        title: item.name || item.nombre || "Activo",
        subtitle: typeof item.category === "string" ? item.category : item.categoria?.name,
        category: "assets",
        url: `/activos?search=${encodeURIComponent(item.name || item.nombre || "")}`,
      })
    }
  }

  // Extract installations
  if (instRes.status === "fulfilled") {
    const raw = instRes.value
    const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : []
    for (const item of list) {
      results.push({
        id: item._id,
        title: item.company || "Instalación",
        subtitle: [item.address, item.city].filter(Boolean).join(", "),
        category: "installations",
        url: `/instalaciones/${item._id}`,
      })
    }
  }

  return results
}
