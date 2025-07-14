import { useEffect, useState } from "react"
import { Home, Package, ClipboardList, User } from "lucide-react"
import { fetchInstallations, fetchAssets } from "../../installations/services/installationServices"
import { fetchWorkOrders } from "../../workOrders/services/workOrderServices"
import { fetchTechnicians } from "../../workOrders/services/technicianServices"
import { useTranslation } from "react-i18next"

// Los labels de estado se manejarán dinámicamente con traducciones

const estadoColors: Record<string, string> = {
  pendiente: "#fbc02d",
  asignada: "#1976d2",
  en_progreso: "#ff9800", // Cambiado a naranja para diferenciar
  completada: "#388e3c",
  cancelada: "#e53935",
}

const tipoColors = ["#1976d2", "#057E74", "#fbc02d", "#e53935", "#388e3c"]

const useHomeDashboard = () => {
  const { t, i18n } = useTranslation()
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
        
        // Si no hay datos de APIs, usar datos de ejemplo
        const workOrdersData = workOrders.length > 0 ? workOrders : [
          { tipoTrabajo: "Mantenimiento", estado: "pendiente", fechaCreacion: "2024-01-01" },
          { tipoTrabajo: "Reparación", estado: "asignada", fechaCreacion: "2024-01-02" },
          { tipoTrabajo: "Instalación", estado: "en_progreso", fechaCreacion: "2024-01-03" },
          { tipoTrabajo: "Mantenimiento", estado: "completada", fechaCreacion: "2024-01-04" },
          { tipoTrabajo: "Reparación", estado: "pendiente", fechaCreacion: "2024-01-05" },
        ]
        
        const installationsData = installations.length > 0 ? installations : []
        const assetsData = assets.length > 0 ? assets : []
        const techniciansData = technicians.length > 0 ? technicians : []
        
        // KPIs sin tendencias
        const kpisData = [
          { 
            label: 'installations.title',
            value: installationsData.length, 
            icon: Home, 
            color: "#1976d2"
          },
          { 
            label: 'assets.title',
            value: assetsData.length, 
            icon: Package, 
            color: "#057E74"
          },
          { 
            label: 'workOrders.title',
            value: workOrdersData.length, 
            icon: ClipboardList, 
            color: "#fbc02d"
          },
          { 
            label: 'personal.title',
            value: techniciansData.length, 
            icon: User, 
            color: "#e53935"
          },
        ]
        setKpis(kpisData)
        
        // Bar chart: órdenes por tipoTrabajo
        const tipos = Array.from(new Set(workOrdersData.map((o: any) => o.tipoTrabajo || "Otro")))
        const barData = tipos.map((tipo, idx) => {
          // Mapear tipos de trabajo a claves de traducción
          const tipoKey = tipo.toLowerCase()
          let tipoClave = 'other'
          if (tipoKey === 'mantenimiento') {
            tipoClave = 'maintenance'
          } else if (tipoKey === 'reparación' || tipoKey === 'reparacion') {
            tipoClave = 'repair'
          } else if (tipoKey === 'instalación' || tipoKey === 'instalacion') {
            tipoClave = 'installation'
          } else if (tipoKey === 'inspección' || tipoKey === 'inspeccion') {
            tipoClave = 'inspection'
          }
          return {
            name: tipoClave,
            value: workOrdersData.filter((o: any) => o.tipoTrabajo === tipo).length,
            color: tipoColors[idx % tipoColors.length],
          }
        })
        setBarChartData(barData)
        
        // Pie chart: órdenes por estado
        const estados = ["pendiente", "asignada", "en_progreso", "completada", "cancelada"]
        const pieData = estados.map((estado, idx) => ({
          name: estado, // Guardar la clave, no el texto traducido
          value: workOrdersData.filter((o: any) => o.estado === estado).length,
          color: estadoColors[estado],
        }))
        setPieChartData(pieData)
        
        // Line chart: evolución temporal de órdenes
        const ordersByDate: Record<string, number> = {}
        workOrdersData.forEach((o: any) => {
          const date = (o.fechaCreacion || "").slice(0, 10)
          if (date) ordersByDate[date] = (ordersByDate[date] || 0) + 1
        })
        const sortedDates = Object.keys(ordersByDate).sort()
        const lineData = sortedDates.map((date) => ({ name: date, value: ordersByDate[date] }))
        setLineChartData(lineData)
        
        // Últimas órdenes
        const recentData = workOrdersData
          .sort((a: any, b: any) => (b.fechaCreacion || "").localeCompare(a.fechaCreacion || ""))
          .slice(0, 6)
        setRecentWorkOrders(recentData)
        
      } catch (e: any) {
        console.error("Error en useHomeDashboard:", e)
        setError(e.message || "Error al cargar el dashboard")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, []) // <--- Solo al montar, no depende de i18n.language

  return { kpis, barChartData, pieChartData, lineChartData, recentWorkOrders, loading, error }
}

export default useHomeDashboard 