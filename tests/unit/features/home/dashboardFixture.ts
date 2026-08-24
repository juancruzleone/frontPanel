import type { DashboardScope, DashboardStatsDto } from "../../../../src/features/home/types/homeTypes"

export const createDashboardDto = (scope: DashboardScope): DashboardStatsDto => ({
  metadata: { lastUpdate: "2026-08-24T12:00:00.000Z", range: "30d", scope, fallbackApplied: false },
  kpis: {
    installations: 3, assets: 7, workOrders: 12, technicians: 2, openWorkOrders: 5,
    overdueWorkOrders: 2, criticalWorkOrders: 1, mttrHours: 4.5, mtbfHours: 90,
    preventiveComplianceRate: 82, slaRate: 91, responseTimeHours: 1.2,
  },
  operationalKpis: {
    openWorkOrders: 5, overdueWorkOrders: 2, criticalWorkOrders: 1, mttrHours: 4.5,
    mtbfHours: 90, preventiveComplianceRate: 82, slaRate: 91, responseTimeHours: 1.2,
  },
  charts: {
    byStatus: [{ name: "Pendiente", value: 3 }], byType: [], byPriority: [{ name: "critical", value: 1 }],
    preventiveVsCorrective: [], deviceHealth: [{ name: "active", value: 8 }, { name: "maintenance", value: 2 }],
    evolution: [{ name: "2026-08-24", created: 2, completed: 1 }],
  },
  recentWorkOrders: [{ _id: "wo-1", titulo: "Revisar bomba", estado: "pendiente" }],
  topIncidentInstallations: [{ _id: "inst-1", name: "Planta Norte", count: 4 }],
  upcomingPreventive: [{ _id: "pm-1", installationName: "Planta Norte", fechaProgramada: "2026-08-30", titulo: "Inspección" }],
})
