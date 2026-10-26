import { useState, useEffect, useMemo } from "react"
import { useParams, Link } from "react-router"
import { useTranslation } from "react-i18next"
import {
  Clock,
  Activity,
  CalendarCheck,
  ShieldCheck,
  Zap,
  ArrowRight,
  Download,
  ChevronRight,
  ChevronDown,
  Info,
  X,
  Wrench,
  Package,
  Building2,
  FileText,
  SlidersHorizontal,
  Search,
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
import Skeleton from "../shared/components/Skeleton"
import HybridSelect from "../shared/components/HybridSelect"
import { fetchAnalyticsData, exportRecordsToCsv } from "../features/analytics/services/analyticsService"
import type {
  IndicatorId,
  IndicatorSummary,
  ContributingRecord,
  MetricTrendPoint,
  BreakdownItem,
  IndicatorDetailMetrics,
} from "../features/analytics/types/analyticsTypes"
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

const RANGE_LABELS: Record<RangeOption, string> = {
  "7d": "7 días",
  "30d": "30 días",
  "90d": "90 días",
  "12m": "12 meses",
}

const Analytics = () => {
  const { indicatorId } = useParams<{ indicatorId?: string }>()
  const { t } = useTranslation()

  const [range, setRange] = useState<RangeOption>("30d")
  const [selectedInstallation, setSelectedInstallation] = useState<string>("")
  const [selectedEvolutionMetric, setSelectedEvolutionMetric] = useState<IndicatorId>("mttr")
  const [loading, setLoading] = useState<boolean>(true)
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
  const [breakdowns, setBreakdowns] = useState<Record<IndicatorId, BreakdownItem[]>>({
    mttr: [],
    mtbf: [],
    "cumplimiento-preventivo": [],
    "cumplimiento-sla": [],
    "primera-respuesta": [],
  })
  const [assetBreakdowns, setAssetBreakdowns] = useState<Record<IndicatorId, BreakdownItem[]>>({
    mttr: [],
    mtbf: [],
    "cumplimiento-preventivo": [],
    "cumplimiento-sla": [],
    "primera-respuesta": [],
  })
  const [detailMetrics, setDetailMetrics] = useState<Record<IndicatorId, IndicatorDetailMetrics> | null>(null)
  const [attentionInstallations, setAttentionInstallations] = useState<Array<{ id: string; name: string; count: number }>>([])

  // Detail view state
  const [isHowModalOpen, setIsHowModalOpen] = useState(false)
  const [tableSearch, setTableSearch] = useState("")

  const activeIndicator = indicatorId && summaries ? summaries[indicatorId as IndicatorId] : null
  const activeRecords = indicatorId ? records[indicatorId as IndicatorId] || [] : []
  const activeTrends = indicatorId ? trends[indicatorId as IndicatorId] || [] : []
  const activeBreakdown = indicatorId ? breakdowns[indicatorId as IndicatorId] || [] : []
  const activeAssetBreakdown = indicatorId ? assetBreakdowns[indicatorId as IndicatorId] || [] : []
  const activeDetailMetric = indicatorId && detailMetrics ? detailMetrics[indicatorId as IndicatorId] : null

  // Browser Tab Title (document.title)
  useEffect(() => {
    if (indicatorId && activeIndicator) {
      const localizedTitle = t(`analytics.indicators.${indicatorId}.title`, { defaultValue: activeIndicator.title })
      document.title = `${localizedTitle} | Leonix`
    } else {
      document.title = t("analytics.titlePage", { defaultValue: "Analíticas | Leonix" })
    }
  }, [indicatorId, activeIndicator, t])

  useEffect(() => {
    let isMounted = true
    setLoading(true)

    fetchAnalyticsData(range, selectedInstallation || undefined)
      .then((data) => {
        if (!isMounted) return
        setSummaries(data.summaries)
        setInstallations(data.installations)
        setRecords(data.recordsByIndicator)
        setTrends(data.trendsByIndicator)
        setBreakdowns(data.breakdownsByIndicator)
        setAssetBreakdowns(data.assetBreakdownsByIndicator)
        setDetailMetrics(data.detailMetricsByIndicator)
        setAttentionInstallations(data.attentionInstallations)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error cargando analíticas:", err)
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [range, selectedInstallation])

  const handleExport = () => {
    if (!activeIndicator) return
    exportRecordsToCsv(activeIndicator.shortTitle, activeRecords)
  }

  // Installation options for HybridSelect
  const installationOptions = useMemo(
    () => [
      { value: "", label: t("analytics.allInstallations", { defaultValue: "Todas las instalaciones" }) },
      ...installations.map((inst) => ({ value: inst.id, label: inst.name })),
    ],
    [installations, t],
  )

  // Filtered records for detail table search
  const filteredDetailRecords = useMemo(() => {
    if (!tableSearch.trim()) return activeRecords
    const query = tableSearch.toLowerCase()
    return activeRecords.filter(
      (r) =>
        (r.orderNumber && r.orderNumber.toLowerCase().includes(query)) ||
        (r.title && r.title.toLowerCase().includes(query)) ||
        (r.installationName && r.installationName.toLowerCase().includes(query)) ||
        (r.assetName && r.assetName.toLowerCase().includes(query)),
    )
  }, [activeRecords, tableSearch])

  // Trend data for hub evolution card
  const hubTrend = trends[selectedEvolutionMetric] || []

  return (
    <div className={styles.containerAnalytics}>
      {/* Detail View Breadcrumb: Analíticas > [Indicador] (No "Inicio") */}
      {indicatorId && activeIndicator && (
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link to="/dashboard/indicadores" className={styles.breadcrumbLink}>
            {t("nav.analytics", { defaultValue: "Analíticas" })}
          </Link>
          <ChevronRight size={13} aria-hidden />
          <span className={styles.breadcrumbCurrent}>
            {t(`analytics.indicators.${indicatorId}.title`, { defaultValue: activeIndicator.title })}
          </span>
        </nav>
      )}

      {/* Header Row */}
      <div className={styles.topSection}>
        <div className={styles.titleContainer}>
          <h1 className={styles.title}>
            {indicatorId && activeIndicator
              ? t(`analytics.indicators.${indicatorId}.title`, { defaultValue: activeIndicator.title })
              : t("nav.analytics", { defaultValue: "Analíticas" })}
          </h1>
          <p className={styles.subtitle}>
            {indicatorId && activeIndicator
              ? t(`analytics.indicators.${indicatorId}.description`, { defaultValue: activeIndicator.description })
              : t("analytics.subtitle", {
                  defaultValue: "Excepciones, capacidad y evolución de toda la operación.",
                })}
          </p>
        </div>

        {/* Top Right Button in Detail View: Cómo se calcula */}
        {indicatorId && activeIndicator && (
          <button
            type="button"
            className={styles.howItWorksBtn}
            onClick={() => setIsHowModalOpen(true)}
          >
            <Info size={15} aria-hidden />
            <span>{t("analytics.howItIsCalculated", { defaultValue: "Cómo se calcula" })}</span>
          </button>
        )}
      </div>

      {/* Filter Card */}
      <div className={styles.controlsBar}>
        <div className={styles.controlsLeft}>
          <div className={styles.controlGroup}>
            <span className={styles.controlLabel}>
              {t("analytics.periodAnalyzed", { defaultValue: "Período analizado" })}
            </span>
            <div className={styles.rangeButtons} role="radiogroup" aria-label="Período analizado">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`${styles.rangeBtn} ${range === opt ? styles.rangeBtnActive : ""}`}
                  onClick={() => setRange(opt)}
                >
                  {t(`home.range.${opt}`, { defaultValue: RANGE_LABELS[opt] })}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.divider} aria-hidden />

          <div className={styles.controlGroup}>
            <span className={styles.controlLabel}>
              {t("installations.title", { defaultValue: "Instalaciones" })}:
            </span>
            <HybridSelect
              value={selectedInstallation}
              onChange={setSelectedInstallation}
              options={installationOptions}
              variant="compact"
              className={styles.hybridSelectInstallations}
              placeholder={t("analytics.filterByInstallation", { defaultValue: "Filtrar por instalación..." })}
            />
          </div>
        </div>

        {indicatorId && activeIndicator && (
          <div className={styles.controlsRight}>
            <button type="button" className={styles.exportBtn} onClick={handleExport}>
              <Download size={14} aria-hidden />
              <span>{t("analytics.export", { defaultValue: "Exportar" })}</span>
              <ChevronDown size={14} aria-hidden />
            </button>
          </div>
        )}
      </div>

      {/* --- HUB VIEW (when !indicatorId) --- */}
      {!indicatorId && (
        <>
          {/* Top 5 KPI Cards Grid (3 in row 1, 2 in row 2) */}
          {loading ? (
            <div className={styles.indicatorsGrid} aria-busy="true" aria-label="Cargando indicadores">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={styles.skeletonCard}>
                  <div className={styles.skeletonCardHeader}>
                    <Skeleton height={18} width={18} style={{ borderRadius: "50%", margin: 0, flexShrink: 0 }} />
                    <Skeleton height={16} width="65%" style={{ borderRadius: 4, margin: 0 }} />
                  </div>
                  <div className={styles.skeletonCardBody}>
                    <Skeleton height={38} width="45%" style={{ borderRadius: 6, margin: 0 }} />
                    <Skeleton height={14} width="95%" style={{ borderRadius: 4, margin: "6px 0 0" }} />
                    <Skeleton height={14} width="80%" style={{ borderRadius: 4, margin: "4px 0 0" }} />
                  </div>
                  <div className={styles.skeletonCardFooter}>
                    <Skeleton height={14} width="35%" style={{ borderRadius: 4, margin: 0 }} />
                    <Skeleton height={16} width={16} style={{ borderRadius: 4, margin: 0 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : summaries ? (
            <div className={styles.indicatorsGrid}>
              {(Object.keys(summaries) as IndicatorId[]).map((id) => {
                const item = summaries[id]
                const Icon = INDICATOR_ICONS[id] || Activity

                const title = t(`analytics.indicators.${id}.title`, { defaultValue: item.title })
                const statusMessage =
                  item.value !== null
                    ? t(`analytics.indicators.${id}.statusAvailable`, { defaultValue: item.statusMessage })
                    : t(`analytics.indicators.${id}.statusEmpty`, { defaultValue: item.statusMessage })

                return (
                  <Link key={id} to={`/dashboard/indicadores/${id}`} className={styles.indicatorCard}>
                    <div className={styles.indicatorCardHeader}>
                      <Icon size={16} className={styles.indicatorIcon} aria-hidden />
                      <span className={styles.indicatorCardTitle}>{title}</span>
                    </div>

                    <div className={styles.indicatorCardBody}>
                      <div className={styles.indicatorCardValue}>{item.formattedValue}</div>
                      <p className={styles.indicatorCardSub}>{statusMessage}</p>
                    </div>

                    <div className={styles.indicatorCardFooter}>
                      <span className={styles.analysisLinkText}>
                        {t("analytics.viewAnalysis", { defaultValue: "Ver análisis" })}
                      </span>
                      <ArrowRight size={16} aria-hidden />
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : null}

          {/* Bottom 2 Cards Side-by-Side */}
          <div className={styles.bottomGrid}>
            {/* Card Left: Evolución de indicadores */}
            <div className={styles.bottomCard}>
              <div className={styles.bottomCardHeader}>
                <div className={styles.bottomCardTitleGroup}>
                  <h2 className={styles.bottomCardTitle}>
                    {t("analytics.evolutionTitle", { defaultValue: "Evolución de indicadores" })}
                  </h2>
                  <p className={styles.bottomCardSubtitle}>
                    {t("analytics.evolutionSubtitle", {
                      defaultValue: "Tendencia de las principales métricas en el período seleccionado.",
                    })}
                  </p>
                </div>
                <div className={styles.metricSelectWrapper}>
                  <select
                    className={styles.metricSelect}
                    value={selectedEvolutionMetric}
                    onChange={(e) => setSelectedEvolutionMetric(e.target.value as IndicatorId)}
                    aria-label="Seleccionar indicador para evolución"
                  >
                    <option value="mttr">MTTR</option>
                    <option value="mtbf">MTBF</option>
                    <option value="cumplimiento-preventivo">
                      {t("analytics.indicators.cumplimiento-preventivo.shortTitle", { defaultValue: "Cumplimiento preventivo" })}
                    </option>
                    <option value="cumplimiento-sla">
                      {t("analytics.indicators.cumplimiento-sla.shortTitle", { defaultValue: "Cumplimiento SLA" })}
                    </option>
                    <option value="primera-respuesta">
                      {t("analytics.indicators.primera-respuesta.shortTitle", { defaultValue: "Primera respuesta" })}
                    </option>
                  </select>
                  <ChevronDown size={14} className={styles.selectIcon} aria-hidden />
                </div>
              </div>

              <div className={styles.bottomCardContent}>
                {loading ? (
                  <div className={styles.skeletonChartPlaceholder}>
                    <div style={{ display: "flex", gap: 12, height: 160, alignItems: "flex-end", padding: "0 16px" }}>
                      {[40, 65, 30, 85, 55, 70, 45, 90].map((h, idx) => (
                        <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                          <Skeleton height={`${h}%`} width="100%" style={{ borderRadius: "4px 4px 0 0", margin: 0 }} />
                          <Skeleton height={10} width="60%" style={{ borderRadius: 2, margin: 0 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : hubTrend.length > 0 ? (
                  <div className={styles.chartWrap}>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={hubTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                          stroke="var(--color-secondary, #057E74)"
                          fill="var(--state-neutral-surface)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIconWrap}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <rect width="18" height="18" x="3" y="3" rx="4" />
                        <path d="M7 16v-4" />
                        <path d="M12 16v-8" />
                        <path d="M17 16v-6" />
                      </svg>
                    </div>
                    <p className={styles.emptyTitle}>
                      {t("common.noDataAvailable", { defaultValue: "No hay datos disponibles" })}
                    </p>
                    <p className={styles.emptySubtitle}>
                      {t("analytics.evolutionEmpty", {
                        defaultValue: "Aún no hay información suficiente para mostrar la evolución de los indicadores.",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Card Right: Instalaciones que requieren atención */}
            <div className={styles.bottomCard}>
              <div className={styles.bottomCardHeader}>
                <div className={styles.bottomCardTitleGroup}>
                  <h2 className={styles.bottomCardTitle}>
                    {t("analytics.attentionTitle", { defaultValue: "Instalaciones que requieren atención" })}
                  </h2>
                  <p className={styles.bottomCardSubtitle}>
                    {t("analytics.attentionSubtitle", {
                      defaultValue: "Instalaciones con mayores oportunidades de mejora.",
                    })}
                  </p>
                </div>
              </div>

              <div className={styles.bottomCardContent}>
                {loading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 0" }}>
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} height={42} width="100%" style={{ borderRadius: 8, margin: 0 }} />
                    ))}
                  </div>
                ) : attentionInstallations.length > 0 ? (
                  <ul className={styles.attentionList}>
                    {attentionInstallations.map((inst) => (
                      <li key={inst.id} className={styles.attentionItem}>
                        <div className={styles.attentionItemLeft}>
                          <Building2 size={16} className={styles.attentionIcon} aria-hidden />
                          <span className={styles.attentionItemName}>{inst.name}</span>
                        </div>
                        <span className={styles.attentionBadge}>
                          {inst.count} {inst.count === 1 ? t("analytics.incident", { defaultValue: "incidencia" }) : t("analytics.incidents", { defaultValue: "incidencias" })}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIconWrap}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <rect width="18" height="18" x="3" y="3" rx="4" />
                        <path d="M7 8h10" />
                        <path d="M7 12h10" />
                        <path d="M7 16h4" />
                      </svg>
                    </div>
                    <p className={styles.emptyTitle}>
                      {t("common.noDataAvailable", { defaultValue: "No hay datos disponibles" })}
                    </p>
                    <p className={styles.emptySubtitle}>
                      {t("analytics.attentionEmpty", {
                        defaultValue:
                          "No se encontraron instalaciones con indicadores que requieran atención en el período seleccionado.",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* --- DETAIL VIEW (when indicatorId exists) --- */}
      {indicatorId && activeIndicator && (
        <div className={styles.detailContainer}>
          {/* Top 3 KPI Cards */}
          {loading ? (
            <div className={styles.detailKpisGrid} aria-busy="true" aria-label="Cargando métricas de detalle">
              {[1, 2, 3].map((i) => (
                <div key={i} className={styles.skeletonDetailKpiCard}>
                  <div className={styles.skeletonCardHeader}>
                    <Skeleton height={18} width={18} style={{ borderRadius: "50%", margin: 0, flexShrink: 0 }} />
                    <Skeleton height={16} width="60%" style={{ borderRadius: 4, margin: 0 }} />
                  </div>
                  <Skeleton height={36} width="45%" style={{ borderRadius: 6, margin: "6px 0" }} />
                  <Skeleton height={14} width="85%" style={{ borderRadius: 4, margin: 0 }} />
                </div>
              ))}
            </div>
          ) : activeDetailMetric ? (
            <div className={styles.detailKpisGrid}>
              {/* Card 1: Main Metric */}
              <div className={styles.detailKpiCard}>
                <div className={styles.detailKpiHeader}>
                  <Clock size={16} className={styles.detailKpiIcon} aria-hidden />
                  <span className={styles.detailKpiTitle}>
                    {t(`analytics.indicators.${indicatorId}.mainLabel`, { defaultValue: activeDetailMetric.mainMetric.label })}
                  </span>
                </div>
                <div className={styles.detailKpiValue}>{activeDetailMetric.mainMetric.value}</div>
                <p className={styles.detailKpiSubtitle}>
                  {activeIndicator.value !== null
                    ? t(`analytics.indicators.${indicatorId}.statusAvailable`, { defaultValue: activeDetailMetric.mainMetric.subtitle })
                    : t(`analytics.indicators.${indicatorId}.mainSubtitle`, { defaultValue: activeDetailMetric.mainMetric.subtitle })}
                </p>
              </div>

              {/* Card 2: Completed / Total */}
              <div className={styles.detailKpiCard}>
                <div className={styles.detailKpiHeader}>
                  <Wrench size={16} className={styles.detailKpiIcon} aria-hidden />
                  <span className={styles.detailKpiTitle}>
                    {t(`analytics.indicators.${indicatorId}.metric1Label`, { defaultValue: activeDetailMetric.metric1.label })}
                  </span>
                </div>
                <div className={styles.detailKpiValue}>{activeDetailMetric.metric1.value}</div>
                <p className={styles.detailKpiSubtitle}>
                  {t("analytics.inSelectedPeriod", { defaultValue: "En el período seleccionado." })}
                </p>
              </div>

              {/* Card 3: Affected Assets */}
              <div className={styles.detailKpiCard}>
                <div className={styles.detailKpiHeader}>
                  <Package size={16} className={styles.detailKpiIcon} aria-hidden />
                  <span className={styles.detailKpiTitle}>
                    {t(`analytics.indicators.${indicatorId}.metric2Label`, { defaultValue: activeDetailMetric.metric2.label })}
                  </span>
                </div>
                <div className={styles.detailKpiValue}>{activeDetailMetric.metric2.value}</div>
                <p className={styles.detailKpiSubtitle}>
                  {t(`analytics.indicators.${indicatorId}.metric2Subtitle`, { defaultValue: activeDetailMetric.metric2.subtitle })}
                </p>
              </div>
            </div>
          ) : null}

          {/* Evolution Chart Card */}
          <div className={styles.chartPanel}>
            <div className={styles.chartPanelHeader}>
              <div className={styles.bottomCardTitleGroup}>
                <h2 className={styles.bottomCardTitle}>
                  {t("analytics.evolutionOf", {
                    indicator: activeIndicator.shortTitle,
                    defaultValue: `Evolución del ${activeIndicator.shortTitle}`,
                  })}
                </h2>
                <p className={styles.bottomCardSubtitle}>
                  {t("analytics.evolutionOfSubtitle", {
                    defaultValue: "Tendencia en el período seleccionado.",
                  })}
                </p>
              </div>
              <div className={styles.metricSelectWrapper}>
                <div className={styles.staticMetricTag}>{activeIndicator.shortTitle}</div>
              </div>
            </div>

            <div className={styles.chartPanelBody}>
              {loading ? (
                <div className={styles.skeletonChartPlaceholder}>
                  <div style={{ display: "flex", gap: 16, height: 200, alignItems: "flex-end", padding: "0 24px" }}>
                    {[35, 60, 45, 75, 50, 90, 65, 80, 55, 70].map((h, idx) => (
                      <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                        <Skeleton height={`${h}%`} width="100%" style={{ borderRadius: "4px 4px 0 0", margin: 0 }} />
                        <Skeleton height={10} width="60%" style={{ borderRadius: 2, margin: 0 }} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : activeTrends.length > 0 ? (
                <div className={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height={260}>
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
                        unit={` ${activeIndicator.unit}`}
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
                </div>
              ) : (
                <div className={styles.emptyChartGrid}>
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIconWrap}>
                      <svg
                        width="36"
                        height="36"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <rect width="18" height="18" x="3" y="3" rx="4" />
                        <path d="M7 16v-4" />
                        <path d="M12 16v-8" />
                        <path d="M17 16v-6" />
                      </svg>
                    </div>
                    <p className={styles.emptyTitle}>
                      {t("common.noDataAvailable", { defaultValue: "No hay datos disponibles" })}
                    </p>
                    <p className={styles.emptySubtitle}>
                      {t(`analytics.indicators.${indicatorId}.statusEmpty`, { defaultValue: activeIndicator.statusMessage })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Middle 2 Breakdown Cards */}
          <div className={styles.bottomGrid}>
            {/* Left Card: Por instalación */}
            <div className={styles.bottomCard}>
              <div className={styles.bottomCardHeader}>
                <div className={styles.bottomCardTitleGroup}>
                  <h2 className={styles.bottomCardTitle}>
                    {activeIndicator.shortTitle} {t("analytics.byInstallation", { defaultValue: "por instalación" })}
                  </h2>
                  <p className={styles.bottomCardSubtitle}>
                    {t("analytics.byInstallationSubtitle", { defaultValue: "Comparativa por instalación en el período seleccionado." })}
                  </p>
                </div>
              </div>

              <div className={styles.bottomCardContent}>
                {loading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 0" }}>
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} height={42} width="100%" style={{ borderRadius: 8, margin: 0 }} />
                    ))}
                  </div>
                ) : activeBreakdown.length > 0 ? (
                  <ul className={styles.breakdownList}>
                    {activeBreakdown.map((item) => (
                      <li key={item.id} className={styles.breakdownItem}>
                        <div className={styles.breakdownItemName}>{item.name}</div>
                        <div className={styles.breakdownItemVal}>
                          <strong>
                            {item.value} {activeIndicator.unit}
                          </strong>
                          <span className={styles.breakdownItemCount}>({item.count} reg.)</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIconWrap}>
                      <Building2 size={28} className={styles.emptyIcon} aria-hidden />
                    </div>
                    <p className={styles.emptyTitle}>
                      {t("common.noDataAvailable", { defaultValue: "No hay datos disponibles" })}
                    </p>
                    <p className={styles.emptySubtitle}>
                      {t("analytics.noCompletedRecords", { defaultValue: "No existen registros completados en el período seleccionado." })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Card: Activos con mayores tiempos */}
            <div className={styles.bottomCard}>
              <div className={styles.bottomCardHeader}>
                <div className={styles.bottomCardTitleGroup}>
                  <h2 className={styles.bottomCardTitle}>
                    {t("analytics.topAssets", { defaultValue: "Activos con mayores tiempos de reparación" })}
                  </h2>
                  <p className={styles.bottomCardSubtitle}>
                    {t("analytics.topAssetsSubtitle", { defaultValue: "Top de activos según el indicador seleccionado." })}
                  </p>
                </div>
              </div>

              <div className={styles.bottomCardContent}>
                {loading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 0" }}>
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} height={42} width="100%" style={{ borderRadius: 8, margin: 0 }} />
                    ))}
                  </div>
                ) : activeAssetBreakdown.length > 0 ? (
                  <ul className={styles.breakdownList}>
                    {activeAssetBreakdown.map((item) => (
                      <li key={item.id} className={styles.breakdownItem}>
                        <div className={styles.breakdownItemName}>{item.name}</div>
                        <div className={styles.breakdownItemVal}>
                          <strong>
                            {item.value} {activeIndicator.unit}
                          </strong>
                          <span className={styles.breakdownItemCount}>({item.count} reg.)</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIconWrap}>
                      <Package size={28} className={styles.emptyIcon} aria-hidden />
                    </div>
                    <p className={styles.emptyTitle}>
                      {t("common.noDataAvailable", { defaultValue: "No hay datos disponibles" })}
                    </p>
                    <p className={styles.emptySubtitle}>
                      {t("analytics.noCompletedRecords", { defaultValue: "No existen registros completados en el período seleccionado." })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Table Card */}
          <div className={styles.tableCard}>
            <div className={styles.tableCardHeader}>
              <div className={styles.bottomCardTitleGroup}>
                <h2 className={styles.bottomCardTitle}>
                  {activeIndicator.shortTitle === "MTTR"
                    ? `${t("analytics.analyzedRepairs", { defaultValue: "Reparaciones analizadas" })} (${filteredDetailRecords.length})`
                    : `${t("analytics.analyzedOrders", { defaultValue: "Órdenes analizadas" })} (${filteredDetailRecords.length})`}
                </h2>
                <p className={styles.bottomCardSubtitle}>
                  {t("analytics.ordersIncluded", { defaultValue: "Órdenes de trabajo incluidas en el cálculo." })}
                </p>
              </div>

              <div className={styles.tableCardActions}>
                <div className={styles.tableSearchWrap}>
                  <Search size={14} className={styles.tableSearchIcon} aria-hidden />
                  <input
                    type="text"
                    className={styles.tableSearchInput}
                    placeholder={t("analytics.searchPlaceholder", { defaultValue: "Buscar por orden, activo o instalación..." })}
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    aria-label="Buscar en la tabla"
                  />
                </div>
                <button type="button" className={styles.tableFilterBtn} aria-label="Filtros adicionales">
                  <SlidersHorizontal size={14} aria-hidden />
                </button>
              </div>
            </div>

            <div className={styles.tableCardBody}>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 0" }}>
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} height={40} width="100%" style={{ borderRadius: 6, margin: 0 }} />
                  ))}
                </div>
              ) : filteredDetailRecords.length > 0 ? (
                <div className={styles.tableScrollWrap}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>{t("analytics.orderNumber", { defaultValue: "N° de orden" })}</th>
                        <th>{t("analytics.installation", { defaultValue: "Instalación" })}</th>
                        <th>{t("analytics.asset", { defaultValue: "Activo" })}</th>
                        <th>{t("analytics.startDate", { defaultValue: "Fecha de inicio" })}</th>
                        <th>{t("analytics.closeDate", { defaultValue: "Fecha de cierre" })}</th>
                        <th>{t("analytics.duration", { defaultValue: "Duración" })}</th>
                        <th>{t("analytics.status", { defaultValue: "Estado" })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDetailRecords.map((rec) => (
                        <tr key={rec.id}>
                          <td>
                            <Link
                              to={`/ordenes-trabajo?search=${encodeURIComponent(rec.title)}`}
                              className={styles.recordLink}
                            >
                              {rec.orderNumber || rec.id}
                            </Link>
                          </td>
                          <td>{rec.installationName}</td>
                          <td>{rec.assetName || "—"}</td>
                          <td>{rec.startDate ? rec.startDate.slice(0, 10) : "—"}</td>
                          <td>{rec.completionDate ? rec.completionDate.slice(0, 10) : "—"}</td>
                          <td>
                            <strong>{rec.duration || rec.calculatedValue}</strong>
                          </td>
                          <td>
                            <span className={styles.statusChip}>{rec.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.emptyTableState}>
                  <div className={styles.emptyIconWrap}>
                    <FileText size={32} className={styles.emptyIcon} aria-hidden />
                  </div>
                  <p className={styles.emptyTitle}>
                    {activeIndicator.shortTitle === "MTTR"
                      ? t("analytics.noRepairs", { defaultValue: "No hay reparaciones para mostrar" })
                      : t("analytics.noOrders", { defaultValue: "No hay órdenes para mostrar" })}
                  </p>
                  <p className={styles.emptySubtitle}>
                    {activeIndicator.shortTitle === "MTTR"
                      ? t("analytics.noRepairsSubtitle", { defaultValue: "Todavía no hay órdenes de trabajo con reparaciones completadas en el período seleccionado." })
                      : t("analytics.noOrdersSubtitle", { defaultValue: "Todavía no hay órdenes de trabajo registradas en el período seleccionado." })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cómo se calcula */}
      {isHowModalOpen && activeIndicator && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="modal-how-title">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3 id="modal-how-title" className={styles.modalTitle}>
                {t("analytics.howItIsCalculatedTitle", {
                  indicator: t(`analytics.indicators.${indicatorId}.title`, { defaultValue: activeIndicator.title }),
                  defaultValue: `Cómo se calcula: ${activeIndicator.title}`,
                })}
              </h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsHowModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalSection}>
                <h4 className={styles.modalSectionTitle}>
                  {t("analytics.methodology", { defaultValue: "Metodología de cálculo" })}
                </h4>
                <p className={styles.modalSectionText}>
                  {t(`analytics.indicators.${indicatorId}.description`, { defaultValue: activeIndicator.description })}
                </p>
              </div>

              <div className={styles.modalSection}>
                <h4 className={styles.modalSectionTitle}>
                  {t("analytics.formula", { defaultValue: "Fórmula" })}
                </h4>
                <div className={styles.formulaBox}>
                  <code>{activeIndicator.formula}</code>
                </div>
              </div>

              <div className={styles.modalSection}>
                <h4 className={styles.modalSectionTitle}>
                  {t("analytics.validityCriteria", { defaultValue: "Criterios de validez" })}
                </h4>
                <p className={styles.modalSectionText}>
                  {t("analytics.validityText", {
                    defaultValue:
                      "Leonix calcula este indicador de forma continua y transparente a partir de las órdenes registradas en el sistema. Si no existen suficientes datos en el período seleccionado, el indicador mostrará N/D para evitar sesgos operativos.",
                  })}
                </p>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.modalActionBtn}
                onClick={() => setIsHowModalOpen(false)}
              >
                {t("common.close", { defaultValue: "Cerrar" })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Analytics
