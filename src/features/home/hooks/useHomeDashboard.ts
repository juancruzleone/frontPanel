import { useEffect, useState } from "react"
import { Home, Package, ClipboardList, User } from "lucide-react"
import { fetchInstallations, fetchAssets } from "../../installations/services/installationServices"
import { fetchWorkOrders } from "../../workOrders/services/workOrderServices"
import { fetchTechnicians } from "../../workOrders/services/technicianServices"
import { useTranslation } from "react-i18next"

// Los labels de estado se manejarán dinámicamente con traducciones

const estadoColors: Record<string, string> = {
  pendiente: "#fbc02d",
  asignada: "var(--color-primary)",
  en_progreso: "#ff9800", // Cambiado a naranja para diferenciar
  completada: "#388e3c",
  cancelada: "#e53935",
}

const tipoColors = ["var(--color-primary)", "#057E74", "#fbc02d", "#e53935", "#388e3c"]

const useHomeDashboard = () => {
  const { t } = useTranslation()
  const [kpis, setKpis] = useState<any[]>([])
  const [barChartData, setBarChartData] = useState<any[]>([])
  const [pieChartData, setPieChartData] = useState<any[]>([])
  const [lineChartData, setLineChartData] = useState<any[]>([])
  const [recentWorkOrders, setRecentWorkOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const API_URL = import.meta.env.VITE_API_URL
        const response = await fetch(`${API_URL}dashboard/stats`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`, // Ajustar según el store real
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) throw new Error('Error al cargar datos del dashboard')

        const result = await response.json()
        const { kpis: kpisRaw, charts, recentWorkOrders: recent } = result.data

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
          let typeClave = item.name.toLowerCase()
          // Normalización mínima si es necesario
          return {
            name: typeClave,
            value: item.value,
            color: tipoColors[Math.floor(Math.random() * tipoColors.length)]
          }
        })
        setBarChartData(barData)

        // 3. Pie Chart (Órdenes por estado)
        const pieData = (charts.byStatus || []).map((item: any) => ({
          name: item.name.toLowerCase(),
          value: item.value,
          color: estadoColors[item.name.toLowerCase()] || "#ccc"
        }))
        setPieChartData(pieData)

        // 4. Line Chart
        setLineChartData(charts.evolution || [])

        // 5. Órdenes recientes
        setRecentWorkOrders(recent || [])

      } catch (e: any) {
        console.error("Error en useHomeDashboard:", e)
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