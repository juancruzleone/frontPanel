import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useComplianceData } from "../hooks/useComplianceData"
import { CatalogPackBrowser } from "./CatalogPackBrowser"
import { ComplianceEvaluationsPanel } from "./ComplianceEvaluationsPanel"
import { LegacyComplianceHistory } from "./LegacyComplianceHistory"
import styles from "../styles/compliance.module.css"

export const ComplianceView: React.FC = () => {
  const { t } = useTranslation()
  const { normas, reglas, resumen, loading, error, loadAll } = useComplianceData()

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("compliance.title")}</h1>
      {error && <p role="alert" className={styles.errorMessage}>{t("compliance.error")}</p>}
      <CatalogPackBrowser />
      <ComplianceEvaluationsPanel />
      <LegacyComplianceHistory normas={normas} reglas={reglas} resumen={resumen} loading={loading} />
    </div>
  )
}
