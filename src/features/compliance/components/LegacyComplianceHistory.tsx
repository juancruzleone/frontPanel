import { useTranslation } from "react-i18next"
import { ComplianceDashboard } from "./ComplianceDashboard"
import { NormasList } from "./NormasList"
import { ReglasList } from "./ReglasList"
import type { Norma, Regla, ResumenCumplimiento } from "../services/complianceTypes"
import styles from "../styles/compliance.module.css"

interface LegacyComplianceHistoryProps {
  normas: Norma[]
  reglas: Regla[]
  resumen: ResumenCumplimiento | null
  loading: boolean
}

export const LegacyComplianceHistory: React.FC<LegacyComplianceHistoryProps> = ({ normas, reglas, resumen, loading }) => {
  const { t } = useTranslation()
  return (
    <section className={styles.legacyHistory} aria-labelledby="legacy-compliance-title">
      <h2 id="legacy-compliance-title" className={styles.sectionTitle}>{t("compliance.legacy.title")}</h2>
      <p className={styles.legacyNotice}>{t("compliance.legacy.description")}</p>
      <ComplianceDashboard resumen={resumen} />
      {loading ? <p className={styles.emptyText}>{t("compliance.legacy.loading")}</p> : (
        <>
          <div><h3>{t("compliance.legacy.normas")}</h3><NormasList normas={normas} isAdmin={false} onEdit={() => undefined} onDelete={() => undefined} /></div>
          <div><h3>{t("compliance.legacy.reglas")}</h3><ReglasList reglas={reglas} normas={normas} isAdmin={false} onEdit={() => undefined} onDelete={() => undefined} /></div>
        </>
      )}
    </section>
  )
}
