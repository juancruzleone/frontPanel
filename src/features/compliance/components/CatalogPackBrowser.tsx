import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { AssignmentParametersForm } from "./AssignmentParametersForm"
import { useAuthStore } from "../../../store/authStore"
import { useComplianceCatalog } from "../hooks/useComplianceCatalog"
import type { CatalogPackDetail, CatalogPackSummary } from "../services/complianceTypes"
import styles from "../styles/compliance.module.css"

const consumeRejection = (request: Promise<unknown> | undefined) => {
  void Promise.resolve(request).catch(() => undefined)
}

export const CatalogPackBrowser: React.FC = () => {
  const { t } = useTranslation()
  const isAdmin = useAuthStore((state) => state.role === "admin")
  const {
    catalogPacks,
    catalogPack,
    assignments,
    loading,
    error,
    loadPacks,
    loadPack,
    loadAssignments,
    clearCatalogPack,
    saveAssignment,
  } = useComplianceCatalog()
  const [selected, setSelected] = useState<CatalogPackSummary | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    consumeRejection(loadPacks())
    consumeRejection(loadAssignments())
  }, [loadAssignments, loadPacks])

  const detail = catalogPack as CatalogPackDetail | null
  const detailMatches = Boolean(
    selected && detail && detail.packKey === selected.packKey && detail.version === selected.version,
  )
  const assignmentList = assignments ?? []
  const selectedAssignments = assignmentList.filter(
    (assignment) => selected && assignment.packKey === selected.packKey && assignment.version === selected.version,
  )

  const selectPack = (pack: CatalogPackSummary) => {
    setSelected(pack)
    clearCatalogPack()
    consumeRejection(loadPack(pack.packKey, pack.version))
  }

  const retry = () => {
    if (selected) {
      clearCatalogPack()
      consumeRejection(loadPack(selected.packKey, selected.version))
      return
    }
    consumeRejection(loadPacks())
    consumeRejection(loadAssignments())
  }

  const createAssignment = async (parameters: Record<string, string | number | boolean>) => {
    if (!selected) return
    setSaving(true)
    try {
      await saveAssignment({
        assignmentKey: `${selected.packKey}:${selected.version}`,
        packKey: selected.packKey,
        version: selected.version,
        parameters,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={styles.sectionCard} aria-labelledby="compliance-catalog-title">
      <h2 id="compliance-catalog-title" className={styles.sectionTitle}>
        {t("compliance.catalog.title")}
      </h2>
      <div role="status" aria-live="polite">
        {loading && t("compliance.catalog.loading")}
      </div>
      {error && !selected && (
        <CatalogMessage message={t("compliance.catalog.unavailable")} retry={retry} />
      )}
      {!loading && !error && catalogPacks && catalogPacks.items.length === 0 && (
        <p className={styles.emptyText}>{t("compliance.catalog.empty")}</p>
      )}
      {catalogPacks && catalogPacks.items.length > 0 && (
        <div className={styles.catalogGrid}>
          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>{t("compliance.catalog.pack")}</th>
                  <th>{t("compliance.catalog.version")}</th>
                  <th>{t("compliance.catalog.action")}</th>
                </tr>
              </thead>
              <tbody>
                {catalogPacks.items.map((pack) => (
                  <tr key={`${pack.packKey}:${pack.version}`}>
                    <td>{pack.packKey}</td>
                    <td>{pack.version}</td>
                    <td>
                      <button type="button" className={styles.catalogLink} onClick={() => selectPack(pack)}>
                        {t("compliance.catalog.view")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selected && (
            <CatalogPackDetail
              detail={detailMatches ? detail : null}
              selected={selected}
              assignments={selectedAssignments}
              isAdmin={isAdmin}
              loading={loading}
              error={error}
              saving={saving}
              onRetry={retry}
              onSubmit={createAssignment}
            />
          )}
        </div>
      )}
      {!loading && !catalogPacks && !error && <p className={styles.emptyText}>{t("compliance.catalog.unavailable")}</p>}
    </section>
  )
}

interface CatalogPackDetailProps {
  detail: CatalogPackDetail | null
  selected: CatalogPackSummary
  assignments: CatalogPackBrowserAssignment[]
  isAdmin: boolean
  loading: boolean
  error: string | null
  saving: boolean
  onRetry: () => void
  onSubmit: (parameters: Record<string, string | number | boolean>) => Promise<void>
}

type CatalogPackBrowserAssignment = ReturnType<typeof useComplianceCatalog>["assignments"][number]

const CatalogPackDetail: React.FC<CatalogPackDetailProps> = ({ detail, selected, assignments, isAdmin, loading, error, saving, onRetry, onSubmit }) => {
  const { t } = useTranslation()
  if (error && !detail) {
    return <CatalogMessage message={t("compliance.catalog.detailUnavailable")} retry={onRetry} />
  }
  if (loading && !detail) {
    return <div className={styles.catalogDetail} role="status" aria-live="polite">{t("compliance.catalog.detailLoading")}</div>
  }
  if (!detail) {
    return <CatalogMessage message={t("compliance.catalog.detailUnavailable")} retry={onRetry} />
  }
  const definitions = detail.controls.flatMap((control) => control.parameterDefinitions)
  return (
    <div className={styles.catalogDetail} aria-live="polite">
      <h3>{selected.packKey} v{selected.version}</h3>
      <p>{t("compliance.catalog.rights", { author: detail.rights.author })}</p>
      <h4>{t("compliance.catalog.controls")}</h4>
      <ul>{detail.controls.map((control) => <li key={`${control.controlKey}:${control.version}`}>{control.controlKey} v{control.version} · {control.scope}</li>)}</ul>
      <AssignmentSummary assignments={assignments} />
      {isAdmin && <AssignmentParametersForm definitions={definitions} canSubmit pending={saving} onSubmit={onSubmit} />}
    </div>
  )
}

const AssignmentSummary: React.FC<{ assignments: CatalogPackBrowserAssignment[] }> = ({ assignments }) => {
  const { t } = useTranslation()
  return assignments.length ? (
    <ul className={styles.catalogAssignments}>
      {assignments.map((assignment) => <li className={styles.catalogAssignment} key={assignment.assignmentKey}>
        {t("compliance.catalog.assignment", { status: assignment.status, scope: assignment.scope, key: assignment.assignmentKey })}
      </li>)}
    </ul>
  ) : <p className={styles.emptyText}>{t("compliance.catalog.noAssignment")}</p>
}

const CatalogMessage: React.FC<{ message: string; retry: () => void }> = ({ message, retry }) => {
  const { t } = useTranslation()
  return <div className={styles.catalogMessage} role="alert"><p>{message}</p><button type="button" onClick={retry}>{t("compliance.catalog.retry")}</button></div>
}
