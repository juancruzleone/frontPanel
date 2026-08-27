import { useTranslation } from "react-i18next"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import styles from "../styles/compliance.module.css"
import type { ResumenCumplimiento } from "../services/complianceTypes"

export interface DashboardSlice {
  name: string
  value: number
  color: string
}

const ESTADO_ORDEN = ["cumplido", "incumplido", "sin_evidencia", "error"] as const

const ESTADO_COLORS: Record<string, string> = {
  cumplido: "var(--color-success)",
  incumplido: "var(--color-danger)",
  sin_evidencia: "var(--color-accent)",
  error: "#9e9e9e",
}

/**
 * Mapea el resumen (conteos por estado del último escaneo) a los slices del
 * gráfico. Pura: misma entrada → misma salida.
 */
export const buildResumenChartData = (
  resumen: ResumenCumplimiento | null,
): DashboardSlice[] => {
  if (!resumen) return []
  return ESTADO_ORDEN.map((estado) => ({
    name: estado,
    value: resumen.porEstado[estado] ?? 0,
    color: ESTADO_COLORS[estado],
  }))
}

interface ComplianceDashboardProps {
  resumen: ResumenCumplimiento | null
}

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({ resumen }) => {
  const { t } = useTranslation()
  const data = buildResumenChartData(resumen)
  const total = resumen?.totalResultados ?? 0

  if (!resumen || data.every((slice) => slice.value === 0)) {
    return (
      <section className={styles.dashboardCard}>
        <h3 className={styles.dashboardTitle}>{t("compliance.dashboard.title")}</h3>
        <p className={styles.dashboardEmpty}>{t("compliance.dashboard.noData")}</p>
      </section>
    )
  }

  return (
    <section className={styles.dashboardCard}>
      <div className={styles.dashboardHeader}>
        <h3 className={styles.dashboardTitle}>{t("compliance.dashboard.title")}</h3>
        <span className={styles.dashboardTotal}>
          {total} {t("compliance.dashboard.total")}
        </span>
      </div>
      <div className={styles.dashboardBody}>
        <div className={styles.pieContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                dataKey="value"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className={styles.legendList}>
          {data.map((entry) => (
            <li key={entry.name} className={styles.legendItem}>
              <span
                className={styles.legendColor}
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              <span className={styles.legendLabel}>
                {t(`compliance.dashboard.estado.${entry.name}`)}
              </span>
              <strong className={styles.legendValue}>{entry.value}</strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}