import { useState, useEffect } from 'react'
import { tenantServices } from '../services/tenantServices'
import { Tenant } from '../types/tenant.types'

interface TenantStats {
  totalTenants: number
  activeTenants: number
  suspendedTenants: number
  cancelledTenants: number
  totalUsers: number
  totalAssets: number
  totalWorkOrders: number
  planDistribution: {
    basic: number
    professional: number
    enterprise: number
  }
  statusDistribution: {
    active: number
    suspended: number
    cancelled: number
  }
  evolutionData: Array<{
    name: string
    value: number
  }>
  recentTenants: Tenant[]
}

const usePanelAdminDashboard = () => {
  const [stats, setStats] = useState<TenantStats>({
    totalTenants: 0,
    activeTenants: 0,
    suspendedTenants: 0,
    cancelledTenants: 0,
    totalUsers: 0,
    totalAssets: 0,
    totalWorkOrders: 0,
    planDistribution: {
      basic: 0,
      professional: 0,
      enterprise: 0
    },
    statusDistribution: {
      active: 0,
      suspended: 0,
      cancelled: 0
    },
    evolutionData: [],
    recentTenants: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Obtener todos los tenants
        const tenants = await tenantServices.getTenants()

        // Calcular estadísticas
        const totalTenants = tenants.length
        const activeTenants = tenants.filter(t => t.status === 'active').length
        const suspendedTenants = tenants.filter(t => t.status === 'suspended').length
        const cancelledTenants = tenants.filter(t => t.status === 'cancelled').length

        // Calcular totales de recursos
        const totalUsers = tenants.reduce((sum, t) => sum + (t.stats?.totalUsers || 0), 0)
        const totalAssets = tenants.reduce((sum, t) => sum + (t.stats?.totalAssets || 0), 0)
        const totalWorkOrders = tenants.reduce((sum, t) => sum + (t.stats?.totalWorkOrders || 0), 0)

        // Distribución de planes
        const planDistribution = {
          basic: tenants.filter(t => t.plan === 'basic').length,
          professional: tenants.filter(t => t.plan === 'professional').length,
          enterprise: tenants.filter(t => t.plan === 'enterprise').length
        }

        // Distribución de estados
        const statusDistribution = {
          active: tenants.filter(t => t.status === 'active').length,
          suspended: tenants.filter(t => t.status === 'suspended').length,
          cancelled: tenants.filter(t => t.status === 'cancelled').length
        }

        // Datos de evolución temporal (últimos 6 meses)
        const evolutionData = []
        const currentDate = new Date()
        for (let i = 5; i >= 0; i--) {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
          const monthName = date.toLocaleDateString('es-ES', { month: 'short' })
          const tenantsInMonth = tenants.filter(t => {
            const tenantDate = new Date(t.createdAt)
            return tenantDate.getMonth() === date.getMonth() && tenantDate.getFullYear() === date.getFullYear()
          }).length
          evolutionData.push({ name: monthName, value: tenantsInMonth })
        }

        // Tenants más recientes (últimos 5)
        const recentTenants = tenants
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)

        setStats({
          totalTenants,
          activeTenants,
          suspendedTenants,
          cancelledTenants,
          totalUsers,
          totalAssets,
          totalWorkOrders,
          planDistribution,
          statusDistribution,
          evolutionData,
          recentTenants
        })
      } catch (err) {
        console.error('Error loading dashboard data:', err)
        setError('Error al cargar los datos del panel')
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  return {
    stats,
    loading,
    error
  }
}

export default usePanelAdminDashboard 