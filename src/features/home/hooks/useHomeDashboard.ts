import { useEffect, useState } from "react"
import { Home, Package, ClipboardList, User } from "lucide-react"
import { fetchInstallations, fetchAssets } from "../../installations/services/installationServices"
import { fetchWorkOrders } from "../../workOrders/services/workOrderServices"
import { fetchTechnicians } from "../../workOrders/services/technicianServices"

const estadoLabels: Record<string, string> = {
  pendiente: "Pendiente",
  asignada: "Asignada",
  en_progreso: "En progreso",
  completada: "Completada",
  cancelada: "Cancelada",
}

const estadoColors: Record<string, string> = {
  pendiente: "#fbc02d",
  asignada: "#1976d2",
  en_progreso: "#1976d2",
  completada: "#388e3c",
  cancelada: "#e53935",
}

const tipoColors = ["#1976d2", "#057E74", "#fbc02d", "#e53935", "#388e3c"]

const useHomeDashboard = () => {
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
        const [installations, assets, workOrders, technicians] = await Promise.all([
          fetchInstallations(),
          fetchAssets(),
          fetchWorkOrders(),
          fetchTechnicians(),
        ])
        
        // KPIs sin tendencias
        setKpis([
          { 
            label: "Instalaciones", 
            value: installations.length, 
            icon: Home, 
            color: "#1976d2"
          },
          { 
            label: "Activos", 
            value: assets.length, 
            icon: Package, 
            color: "#057E74"
          },
          { 
            label: "Órdenes de trabajo", 
            value: workOrders.length, 
            icon: ClipboardList, 
            color: "#fbc02d"
          },
          { 
            label: "Personal", 
            value: technicians.length, 
            icon: User, 
            color: "#e53935"
          },
        ])
        
        // Bar chart: órdenes por tipoTrabajo
        const tipos = Array.from(new Set(workOrders.map((o: any) => o.tipoTrabajo || "Otro")))
        setBarChartData(
          tipos.map((tipo, idx) => ({
            name: tipo,
            value: workOrders.filter((o: any) => o.tipoTrabajo === tipo).length,
            color: tipoColors[idx % tipoColors.length],
          }))
        )
        
        // Pie chart: órdenes por estado
        const estados = ["pendiente", "asignada", "en_progreso", "completada", "cancelada"]
        setPieChartData(
          estados.map((estado, idx) => ({
            name: estadoLabels[estado],
            value: workOrders.filter((o: any) => o.estado === estado).length,
            color: estadoColors[estado],
          }))
        )
        
        // Line chart: evolución temporal de órdenes
        const ordersByDate: Record<string, number> = {}
        workOrders.forEach((o: any) => {
          const date = (o.fechaCreacion || "").slice(0, 10)
          if (date) ordersByDate[date] = (ordersByDate[date] || 0) + 1
        })
        const sortedDates = Object.keys(ordersByDate).sort()
        setLineChartData(
          sortedDates.map((date) => ({ name: date, value: ordersByDate[date] }))
        )
        
        // Últimas órdenes
        setRecentWorkOrders(
          workOrders
            .sort((a: any, b: any) => (b.fechaCreacion || "").localeCompare(a.fechaCreacion || ""))
            .slice(0, 6)
        )
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