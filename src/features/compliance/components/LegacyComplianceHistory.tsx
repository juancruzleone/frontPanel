import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
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
  isAdmin: boolean
  onCreateNorma: () => void
  onEditNorma: (norma: Norma) => void
  onDeleteNorma: (norma: Norma) => void
  onCreateRegla: () => void
  onEditRegla: (regla: Regla) => void
  onDeleteRegla: (regla: Regla) => void
}

export const LegacyComplianceHistory: React.FC<LegacyComplianceHistoryProps> = ({
  normas,
  reglas,
  resumen,
  loading,
  isAdmin,
  onCreateNorma,
  onEditNorma,
  onDeleteNorma,
  onCreateRegla,
  onEditRegla,
  onDeleteRegla,
}) => {
  const { t } = useTranslation()

  return (
    <section className={styles.legacyHistory} aria-labelledby="legacy-compliance-title">
      <h2 id="legacy-compliance-title" className={styles.sectionTitle}>
        {t("compliance.legacy.title")}
      </h2>
      <p className={styles.legacyNotice}>{t("compliance.legacy.description")}</p>

      <ComplianceDashboard resumen={resumen} />

      {loading ? (
        <p className={styles.emptyText}>{t("compliance.legacy.loading")}</p>
      ) : (
        <>
          {/* ---- Normas ---- */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>{t("compliance.legacy.normas")}</h3>
              {isAdmin && (
                <button
                  type="button"
                  className={styles.createButton}
                  onClick={onCreateNorma}
                >
                  <Plus size={16} />
                  {t("compliance.normas.create")}
                </button>
              )}
            </div>
            <NormasList
              normas={normas}
              isAdmin={isAdmin}
              onEdit={onEditNorma}
              onDelete={onDeleteNorma}
            />
          </div>

          {/* ---- Reglas ---- */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>{t("compliance.legacy.reglas")}</h3>
              {isAdmin && (
                <button
                  type="button"
                  className={styles.createButton}
                  onClick={onCreateRegla}
                >
                  <Plus size={16} />
                  {t("compliance.reglas.create")}
                </button>
              )}
            </div>
            <ReglasList
              reglas={reglas}
              normas={normas}
              isAdmin={isAdmin}
              onEdit={onEditRegla}
              onDelete={onDeleteRegla}
            />
          </div>
        </>
      )}
    </section>
  )
}
