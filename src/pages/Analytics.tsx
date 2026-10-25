import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router"
import { useTranslation } from "react-i18next"
import {
  Clock,
  Activity,
  CalendarCheck,
  ShieldCheck,
  Zap,
  ArrowRight,
  ArrowUpRight,
  Download,
  ChevronRight,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { fetchAnalyticsData, exportRecordsToCsv } from "../features/analytics/services/analyticsService"
import type { IndicatorId, IndicatorSummary, ContributingRecord, MetricTrendPoint, BreakdownItem } from "../features/analytics/types/analyticsTypes"
import type { RangeOption } from "../features/home/types/homeTypes"
import styles from "../features/analytics/styles/analytics.module.css"

const INDICATOR_ICONS = {
  mttr: Clock,
  mtbf: Activity,
  "cumplimiento-preventivo": CalendarCheck,
  "cumplimiento-sla": ShieldCheck,
  "primera-respuesta": Zap,
}

const RANGE_OPTIONS: RangeOption[] = ["7d", "30d", "90d", "12m"]

const Analytics = () => {
  const { indicatorId } = useParams<{ indicatorId?: string }>()
  const { t } = useTranslation()

  const [range, setRange] = useState<RangeOption>("30d")
  const [selectedInstallation, setSelectedInstallation] = useState<string>("")
  const [summaries, setSummaries] = useState<Record<IndicatorId, IndicatorSummary> | null>(null)
  const [installations, setInstallations] = useState<Array<{ id: string; name: string }>>([])
  const [records, setRecords] = useState<Record<IndicatorId, ContributingRecord[]>>({
    mttr: [],
    mtbf: [],
    "cumplimiento-preventivo": [],
    "cumplimiento-sla": [],
    "primera-respuesta": [],
  })
  const [trends, setTrends] = useState<Record<IndicatorId, MetricTrendPoint[]>>({
    mttr: [],
    mtbf: [],
    "cumplimiento-preventivo": [],
    "cumplimiento-sla": [],
    "primera-respuesta": [],
  })

  useEffect(() => {
    let isMounted = true

    fetchAnalyticsData(range, selectedInstallation || undefined)
      .then((data) => {
        if (!isMounted) return
        setSummaries(data.summaries)
        setInstallations(data.installations)
        setRecords(data.recordsByIndicator)
        setTrends(data.trendsByIndicator)
      })
      .catch((err) => {
        console.error("Error cargando analíticas:", err)
      })

    return () => {
      isMounted = false
    }
  }, [range, selectedInstallation])

  const activeIndicator = indicatorId && summaries ? summaries[indicatorId as IndicatorId] : null
  const activeRecords = indicatorId ? records[indicatorId as IndicatorId] || [] : []
  const activeTrends = indicatorId ? trends[indicatorId as IndicatorId] || [] : []

  const handleExport = () => {
    if (!activeIndicator) return
    exportRecordsToCsv(activeIndicator.shortTitle, activeRecords)
  }

  return (
    <div className={styles.containerAnalytics}>
      {/* Top Header / Breadcrumbs */}
      <div className={styles.topSection}>
        <div className={styles.titleContainer}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link to="/inicio" className={styles.breadcrumbLink}>{t("nav.home", { defaultValue: "Inicio" })}</Link>
            <ChevronRight size={13} aria-hidden />
            {indicatorId ? (
              <>
                <Link to="/dashboard/indicadores" className={styles.breadcrumbLink}>
                  {t("nav.analytics", { defaultValue: "Indicadores operativos" })}
                </Link>
                <ChevronRight size={13} aria-hidden />
                <span className={styles.breadcrumbCurrent}>{activeIndicator?.title || indicatorId}</span>
              </>
            ) : (
              <span className={styles.breadcrumbCurrent}>{t("nav.analytics", { defaultValue: "Indicadores operativos" })}</span>
            )}
          </nav>
          <h1 className={styles.title}>
            {activeIndicator ? activeIndicator.title : t("nav.analytics", { defaultValue: "Indicadores operativos" })}
          </h1>
          <p className={styles.subtitle}>
            {activeIndicator
              ? activeIndicator.description
              : t("home.dashboard.roles.admin.description", {
                  defaultValue: "Centro de analíticas y métricas de rendimiento operacional de Leonix CMMS.",
                })}
          </p>
        </div>
      </div>

      {/* Global Controls & Filters */}
      <div className={styles.controlsBar}>
        <div className={styles.filterGroup}>
          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>{t("home.dashboard.period", { defaultValue: "Período" })}:</span>
            <div className={styles.rangeButtons} role="radiogroup" aria-label="Período analizado">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`${styles.rangeBtn} ${range === opt ? styles.rangeBtnActive : ""}`}
                  onClick={() => setRange(opt)}
                >
                  {t(`home.range.${opt}`, { defaultValue: opt })}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>{t("installations.title", { defaultValue: "Instalación" })}:</span>
            <select
              className={styles.selectInput}
              value={selectedInstallation}
              onChange={(e) => setSelectedInstallation(e.target.value)}
              aria-label="Filtrar por instalación"
            >
              <option value="">{t("common.all", { defaultValue: "Todas las instalaciones" })}</option>
              {installations.map((inst) => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          </div>
        </div>

        {activeIndicator && (
          <button type="button" className={styles.exportBtn} onClick={handleExport}>
            <Download size={14} aria-hidden />
            <span>{t("common.export", { defaultValue: "Exportar CSV" })}</span>
          </button>
        )}
      </div>

      {/* Overview Hub View (when !indicatorId) */}
      {!indicatorId && summaries && (
        <div className={styles.indicatorsGrid}>
          {(Object.keys(summaries) as IndicatorId[]).map((id) => {
            const item = summaries[id]
            const Icon = INDICATOR_ICONS[id] || Activity

            return (
              <Link key={id} to={`/dashboard/indicadores/${id}`} className={styles.indicatorCard}>
                <div className={styles.indicatorCardHeader}>
                  <div className={styles.indicatorIconTitle}>
                    <Icon size={16} aria-hidden />
                    <span className={styles.indicatorCardTitle}>{item.title}</span>
                  </div>
                  <ArrowUpRight size={14} aria-hidden />
                </div>

                <div className={styles.indicatorCardBody}>
                  <span className={styles.indicatorCardValue}>{item.formattedValue}</span>
                  <span className={styles.indicatorCardSub}>
                    {item.delta !== null
                      ? `${item.delta > 0 ? "↑" : "↓"} ${Math.abs(item.delta)}% vs anterior`
                      : item.statusMessage}
                  </span>
                </div>

                <div className={styles.indicatorCardFooter}>
                  <span
                    className={`${styles.statusBadge} ${
                      item.status === "available" ? styles.statusAvailable : styles.statusInsufficient
                    }`}
                  >
                    {item.status === "available" ? "Disponible" : "Datos insuficientes"}
                  </span>
                  <ArrowRight size={13} aria-hidden />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Individual Indicator Detail View */}
      {indicatorId && activeIndicator && (
        <>
          <div className={styles.detailGrid}>
            {/* Hero & Evolution Chart */}
            <div className={styles.heroPanel}>
              <div className={styles.heroHeader}>
                <div>
                  <span className={styles.filterLabel}>{activeIndicator.shortTitle} · Resumen</span>
                  <div className={styles.heroValueWrap}>
                    <span className={styles.heroValue}>{activeIndicator.formattedValue}</span>
                  </div>
                  <p className={styles.heroStatus}>{activeIndicator.statusMessage}</p>
                </div>
                <span
                  className={`${styles.statusBadge} ${
                    activeIndicator.status === "available" ? styles.statusAvailable : styles.statusInsufficient
                  }`}
                >
                  {activeIndicator.status === "available" ? "Cálculo activo" : "N/D"}
                </span>
              </div>

              {/* Chart */}
              <div className={styles.chartContainer}>
                {activeTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={activeTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-card-border)" />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                      />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="value"
                        name={activeIndicator.shortTitle}
                        stroke="var(--color-secondary, #057E74)"
                        fill="var(--state-neutral-surface)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={styles.emptyRecords}>
                    <p>{activeIndicator.statusMessage}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Methodology & Formula Panel */}
            <div className={styles.infoPanel}>
              <div className={styles.infoSection}>
                <h3>Metodología de cálculo</h3>
                <p>{activeIndicator.description}</p>
                <div className={styles.formulaBox}>
                  <code>{activeIndicator.formula}</code>
                </div>
              </div>

              <div className={styles.infoSection}>
                <h3>Criterios de validez</h3>
                <p>
                  Leonix calcula este indicador a partir de eventos y órdenes registradas en el sistema. Los períodos
                  sin actividad representativa muestran N/D para garantizar transparencia operativa.
                </p>
              </div>
            </div>
          </div>

          {/* Contributing Records Table */}
          <div className={styles.recordsSection}>
            <div className={styles.recordsHeader}>
              <h2 className={styles.title} style={{ fontSize: "1.2rem" }}>Registros evaluados ({activeRecords.length})</h2>
            </div>

            {activeRecords.length === 0 ? (
              <div className={styles.emptyRecords}>
                <p>{activeIndicator.statusMessage}</p>
              </div>
            ) : (
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Orden / Registro</th>
                    <th>Instalación</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRecords.slice(0, 15).map((rec) => (
                    <tr key={rec.id}>
                      <td>
                        <Link to={`/ordenes-trabajo?search=${encodeURIComponent(rec.title)}`} className={styles.recordLink}>
                          {rec.title}
                        </Link>
                      </td>
                      <td>{rec.installationName}</td>
                      <td>{rec.priority}</td>
                      <td>{rec.status}</td>
                      <td>{rec.date ? rec.date.slice(0, 10) : "—"}</td>
                      <td>
                        <strong>{rec.calculatedValue}{rec.unit ? ` ${rec.unit}` : ""}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Analytics
