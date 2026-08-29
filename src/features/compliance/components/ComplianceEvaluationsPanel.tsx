import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { isAdmin, isTechnician } from "../../../shared/utils/roleUtils"
import { useAuthStore } from "../../../store/authStore"
import { useComplianceEvaluations } from "../hooks/useComplianceEvaluations"
import type {
  CatalogAssignment,
  CatalogFinding,
  CatalogRunDetail,
  CatalogRunSummary,
  CatalogState,
} from "../services/complianceTypes"
import styles from "../styles/compliance.module.css"

const STATES: CatalogState[] = [
  "PASS",
  "WARN",
  "FAIL",
  "NOT_APPLICABLE",
  "INSUFFICIENT_EVIDENCE",
  "ERROR",
]

export const ComplianceEvaluationsPanel: React.FC = () => {
  const { t } = useTranslation()
  const role = useAuthStore((state) => state.role)
  const canStart = isAdmin(role) || isTechnician(role)
  const {
    assignments,
    catalogRuns,
    catalogRun,
    catalogFindings,
    loading,
    error,
    loadRuns,
    loadRun,
    loadFindings,
    startEvaluation,
  } = useComplianceEvaluations()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [findingsRunId, setFindingsRunId] = useState<string | null>(null)
  const [findingsPage, setFindingsPage] = useState(1)
  const detail = catalogRun as CatalogRunDetail | null
  const detailMatches = Boolean(selectedId && detail?._id === selectedId)
  const activeAssignments = (assignments ?? []).filter((assignment) => assignment.status === "active")

  useEffect(() => {
    void loadRuns().catch(() => undefined)
  }, [loadRuns])

  const selectRun = (id: string, page = 1) => {
    setSelectedId(id)
    setFindingsRunId(null)
    setFindingsPage(page)
    void Promise.all([
      loadRun(id),
      loadFindings(id, page),
    ]).then(() => setFindingsRunId(id)).catch(() => undefined)
  }

  const start = (assignment: CatalogAssignment) => {
    void startEvaluation(assignment.assignmentKey)
      .then((started) => started?._id && selectRun(started._id))
      .catch(() => undefined)
  }

  const retryList = () => {
    void loadRuns().catch(() => undefined)
  }

  return (
    <section className={styles.sectionCard} aria-labelledby="compliance-evaluations-title">
      <h2 id="compliance-evaluations-title" className={styles.sectionTitle}>
        {t("compliance.evaluations.title")}
      </h2>
      <div role="status" aria-live="polite">
        {loading && t("compliance.evaluations.loading")}
      </div>
      {error && !selectedId && (
        <EvaluationMessage message={t("compliance.evaluations.error")} onRetry={retryList} />
      )}
      {!loading && !error && catalogRuns?.items.length === 0 && (
        <p className={styles.emptyText}>{t("compliance.evaluations.empty")}</p>
      )}
      {canStart && activeAssignments.length > 0 && (
        <div className={styles.sectionHeader}>
          <h3>{t("compliance.evaluations.assignments")}</h3>
          <div>
            {activeAssignments.map((assignment) => (
              <div className={styles.catalogAssignment} key={assignment.assignmentKey}>
                <span>{assignment.assignmentKey} · {assignment.scope}</span>
                <button type="button" className={styles.createButton} disabled={loading} onClick={() => start(assignment)}>
                  {t("compliance.evaluations.start")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {catalogRuns && catalogRuns.items.length > 0 && (
        <RunHistory runs={catalogRuns.items} selectedId={selectedId} onSelect={selectRun} />
      )}
      {selectedId && (
        <RunDetail
          detail={detailMatches ? detail : null}
          findings={findingsRunId === selectedId ? catalogFindings : null}
          loading={loading}
          error={error}
          findingsPage={findingsPage}
          onPageChange={(page) => selectRun(selectedId, page)}
          onRetry={() => selectRun(selectedId)}
        />
      )}
    </section>
  )
}

interface RunHistoryProps {
  runs: CatalogRunSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
}

const RunHistory: React.FC<RunHistoryProps> = ({ runs, selectedId, onSelect }) => {
  const { t } = useTranslation()
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.dataTable}>
        <caption>{t("compliance.evaluations.history")}</caption>
        <thead><tr><th>{t("compliance.evaluations.id")}</th><th>{t("compliance.evaluations.state")}</th><th>{t("compliance.evaluations.action")}</th></tr></thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run._id} aria-selected={run._id === selectedId}>
              <td>{run._id}</td><td>{run.estado}</td>
              <td><button type="button" className={styles.catalogLink} onClick={() => onSelect(run._id)}>{t("compliance.evaluations.view")}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface RunDetailProps {
  detail: CatalogRunDetail | null
  findings: { items: CatalogFinding[]; page: number; totalPages: number } | null
  loading: boolean
  error: string | null
  findingsPage: number
  onPageChange: (page: number) => void
  onRetry: () => void
}

const RunDetail: React.FC<RunDetailProps> = ({ detail, findings, loading, error, findingsPage, onPageChange, onRetry }) => {
  const { t } = useTranslation()
  if (loading && !detail) return <div className={styles.catalogDetail} role="status" aria-live="polite">{t("compliance.evaluations.detailLoading")}</div>
  if (error && !detail) return <EvaluationMessage message={t("compliance.evaluations.detailError")} onRetry={onRetry} />
  if (!detail) return null
  return (
    <div className={styles.catalogDetail} aria-live="polite">
      <h3>{t("compliance.evaluations.snapshot")}</h3>
      <SnapshotMetadata detail={detail} />
      <EvaluationCounters run={detail} />
      <FindingsList findings={findings} loading={loading} page={findingsPage} onPageChange={onPageChange} />
    </div>
  )
}

const SnapshotMetadata: React.FC<{ detail: CatalogRunDetail }> = ({ detail }) => {
  const { t } = useTranslation()
  const metadata = [
    [t("compliance.evaluations.assignment"), `${detail.assignment.assignmentKey} · ${detail.assignment.status} · ${detail.assignment.scope}`],
    [t("compliance.evaluations.pack"), `${detail.pack.packKey} v${detail.pack.version} · ${detail.pack.state}`],
    [t("compliance.evaluations.controls"), detail.controls.map((control) => `${control.controlKey} v${control.version} · ${control.scope}`).join(", ")],
    [t("compliance.evaluations.evaluators"), detail.evaluators.map((evaluator) => `${evaluator.evaluatorKey} v${evaluator.version}`).join(", ")],
    [t("compliance.evaluations.rights"), `${detail.rights.author} · ${detail.rights.rightsStatus}`],
    [t("compliance.evaluations.scope"), detail.applicability.scope],
    [t("compliance.evaluations.timestamp"), detail.snapshotAt ?? t("compliance.evaluations.notAvailable")],
  ]
  return <dl className={styles.evaluationMeta}>{metadata.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
}

const EvaluationCounters: React.FC<{ run: CatalogRunDetail }> = ({ run }) => {
  const { t } = useTranslation()
  return (
    <div className={styles.evaluationCounters}>
      <p>{t("compliance.evaluations.progress")}: {run.progress.processed} / {run.progress.total}</p>
      <p>{t("compliance.evaluations.score")}: {run.score === null ? t("compliance.evaluations.notAvailable") : run.score}</p>
      <ul>{STATES.map((state) => <li key={state}>{state}: {run.counts[state]}</li>)}</ul>
    </div>
  )
}

interface FindingsListProps {
  findings: { items: CatalogFinding[]; page: number; totalPages: number } | null
  loading: boolean
  page: number
  onPageChange: (page: number) => void
}

const FindingsList: React.FC<FindingsListProps> = ({ findings, loading, page, onPageChange }) => {
  const { t } = useTranslation()
  if (loading && !findings) return <p role="status">{t("compliance.evaluations.findingsLoading")}</p>
  if (!findings || findings.items.length === 0) return <p className={styles.emptyText}>{t("compliance.evaluations.findingsEmpty")}</p>
  return (
    <>
      <table className={styles.dataTable}>
        <caption>{t("compliance.evaluations.findings")}</caption>
        <thead><tr><th>{t("compliance.evaluations.state")}</th><th>{t("compliance.evaluations.reason")}</th></tr></thead>
        <tbody>{findings.items.map((finding) => <tr key={finding.id}><td>{finding.state}</td><td>{finding.reason ?? t("compliance.evaluations.notAvailable")}</td></tr>)}</tbody>
      </table>
      {findings.totalPages > 1 && <nav aria-label={t("compliance.evaluations.findingsPagination")}><button type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)}>{t("compliance.evaluations.previous")}</button><span>{page} / {findings.totalPages}</span><button type="button" disabled={page === findings.totalPages} onClick={() => onPageChange(page + 1)}>{t("compliance.evaluations.next")}</button></nav>}
    </>
  )
}

const EvaluationMessage: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => {
  const { t } = useTranslation()
  return <div className={styles.catalogMessage} role="alert"><p>{message}</p><button type="button" onClick={onRetry}>{t("compliance.evaluations.retry")}</button></div>
}
