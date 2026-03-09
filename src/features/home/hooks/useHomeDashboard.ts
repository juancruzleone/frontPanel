import { useEffect, useState } from "react"
import { Home, Package, ClipboardList, User } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../../../store/authStore"
import { WORK_ORDER_TYPE_COLORS, WORK_ORDER_STATUS_COLORS } from "../../../utils/chartColors"

const useHomeDashboard = () => {
  const { t } = useTranslation()
  const token = useAuthStore(state => state.token)
  const [kpis, setKpis] = useState<any[]>([])
  const [barChartData, setBarChartData] = useState<any[]>([])
  const [pieChartData, setPieChartData] = useState<any[]>([])
  const [lineChartData, setLineChartData] = useState<any[]>([])
  const [recentWorkOrders, setRecentWorkOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const API_URL = import.meta.env.VITE_API_URL
        const response = await fetch(`${API_URL}dashboard/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) throw new Error('Error al cargar datos del dashboard')

        const result = await response.json()
        const { kpis: kpisRaw, charts, recentWorkOrders: recent, metadata } = result.data
        const backendColors = metadata?.suggestedStatusColors || {}

        // 1. Mapear KPIs
        const kpisData = [
          {
            label: 'installations.title',
            value: kpisRaw.installations,
            icon: Home,
            color: "var(--color-primary)",
            path: "/instalaciones"
          },
          {
            label: 'assets.title',
            value: kpisRaw.assets,
            icon: Package,
            color: "#057E74",
            path: "/activos"
          },
          {
            label: 'workOrders.title',
            value: kpisRaw.workOrders,
            icon: ClipboardList,
            color: "#fbc02d",
            path: "/ordenes-trabajo"
          },
          {
            label: 'personal.title',
            value: kpisRaw.technicians,
            icon: User,
            color: "#e53935",
            path: "/personal"
          }
        ]
        setKpis(kpisData)

        // 2. Bar Chart (Órdenes por tipo)
        const barData = (charts.byType || []).map((item: any) => {
          // Normalizar el nombre del tipo a minúsculas
          const typeName = item.name.toLowerCase()
          
          // Mapear nombres en español a inglés para las traducciones
          const typeMapping: { [key: string]: string } = {
            'mantenimiento': 'maintenance',
            'reparación': 'repair',
            'reparacion': 'repair',
            'instalación': 'installation',
            'instalacion': 'installation',
            'inspección': 'inspection',
            'inspeccion': 'inspection',
            'otro': 'other'
          }
          
          // Usar el mapeo si existe, sino usar el nombre tal cual
          const mappedName = typeMapping[typeName] || typeName
          
          return {
            name: mappedName,
            value: item.value,
            color: WORK_ORDER_TYPE_COLORS[mappedName] || 'var(--color-primary)'
          }
        })
        setBarChartData(barData)

        // 3. Pie Chart (Órdenes por estado)
        const pieData = (charts.byStatus || []).map((item: any) => {
          // Normalizar el nombre del estado a minúsculas
          const statusName = item.name.toLowerCase()
          
          // Mapear nombres en español a inglés para las traducciones
          const statusMapping: { [key: string]: string } = {
            'pendiente': 'pending',
            'asignada': 'assigned',
            'en progreso': 'inProgress',
            'en_progreso': 'inProgress',
            'completada': 'completed',
            'cancelada': 'cancelled'
          }
          
          // Usar el mapeo si existe, sino usar el nombre tal cual
          const mappedName = statusMapping[statusName] || statusName
          
          return {
            name: mappedName,
            value: item.value,
            color: WORK_ORDER_STATUS_COLORS[mappedName] || backendColors[statusName] || '#ccc'
          }
        })
        setPieChartData(pieData)

        // 4. Line Chart
        setLineChartData(charts.evolution || [])

        // 5. Órdenes recientes
        setRecentWorkOrders(recent || [])

      } catch (e: any) {
        setError(e.message || "Error al cargar el dashboard")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { kpis, barChartData, pieChartData, lineChartData, recentWorkOrders, loading, error }
}

export default useHomeDashboard