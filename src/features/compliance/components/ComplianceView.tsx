import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import { useAuthStore } from "../../../store/authStore"
import { useComplianceData } from "../hooks/useComplianceData"
import type { Norma, Regla, ReglaPayload } from "../services/complianceTypes"
import type { NormaFormData } from "../validators/complianceValidators"
import { RunScanButton } from "./RunScanButton"
import { ComplianceDashboard } from "./ComplianceDashboard"
import { NormasList } from "./NormasList"
import { NormaForm } from "./NormaForm"
import { ReglasList } from "./ReglasList"
import { ReglaForm } from "./ReglaForm"
import { ComplianceModal } from "./ComplianceModal"
import { CatalogPackBrowser } from "./CatalogPackBrowser"
import ConfirmModal from "../../../shared/components/ConfirmModal"
import styles from "../styles/compliance.module.css"

type NormaModalState = { open: boolean; norma: Norma | null }
type ReglaModalState = { open: boolean; regla: Regla | null }
type DeleteTarget = { tipo: "norma" | "regla"; id: string; label: string } | null

/**
 * Vista principal del dominio compliance.
 * - Admin: listas + editores de normas/reglas + escaneo + dashboard.
 * - Técnico: SOLO escaneo + dashboard (cero controles de authoring);
 *   el servidor rechaza igualmente cualquier escritura forjada.
 */
export const ComplianceView: React.FC = () => {
  const { t } = useTranslation()
  const role = useAuthStore((s) => s.role)
  const isAdmin = role === "admin"

  const {
    normas,
    reglas,
    resumen,
    loading,
    error,
    loadAll,
    refreshStatuses,
    createNorma,
    updateNorma,
    deleteNorma,
    createRegla,
    updateRegla,
    deleteRegla,
  } = useComplianceData()

  const [normaModal, setNormaModal] = useState<NormaModalState>({ open: false, norma: null })
  const [reglaModal, setReglaModal] = useState<ReglaModalState>({ open: false, regla: null })
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const handleScanCompleted = useCallback(() => {
    void refreshStatuses()
  }, [refreshStatuses])

  const handleNormaSubmit = async (data: NormaFormData) => {
    if (normaModal.norma) {
      await updateNorma(normaModal.norma._id, data)
    } else {
      await createNorma(data)
    }
    setNormaModal({ open: false, norma: null })
  }

  const handleReglaSubmit = async (data: ReglaPayload) => {
    if (reglaModal.regla) {
      await updateRegla(reglaModal.regla._id, data)
    } else {
      await createRegla(data)
    }
    setReglaModal({ open: false, regla: null })
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      if (deleteTarget.tipo === "norma") {
        await deleteNorma(deleteTarget.id)
      } else {
        await deleteRegla(deleteTarget.id)
      }
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("compliance.title")}</h1>

      {error && <p role="alert" className={styles.errorMessage}>{error}</p>}

      <RunScanButton onScanCompleted={handleScanCompleted} />

      <ComplianceDashboard resumen={resumen} />

      <CatalogPackBrowser />

      {isAdmin && (
        <>
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t("compliance.normas.title")}</h2>
              <button
                type="button"
                className={styles.createButton}
                onClick={() => setNormaModal({ open: true, norma: null })}
              >
                <Plus size={16} />
                {t("compliance.normas.create")}
              </button>
            </div>
            {loading ? (
              <p className={styles.emptyText}>{t("compliance.loading")}</p>
            ) : (
              <NormasList
                normas={normas}
                isAdmin
                onEdit={(norma) => setNormaModal({ open: true, norma })}
                onDelete={(norma) =>
                  setDeleteTarget({ tipo: "norma", id: norma._id, label: norma.codigo })
                }
              />
            )}
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t("compliance.reglas.title")}</h2>
              <button
                type="button"
                className={styles.createButton}
                onClick={() => setReglaModal({ open: true, regla: null })}
              >
                <Plus size={16} />
                {t("compliance.reglas.create")}
              </button>
            </div>
            {loading ? (
              <p className={styles.emptyText}>{t("compliance.loading")}</p>
            ) : (
              <ReglasList
                reglas={reglas}
                normas={normas}
                isAdmin
                onEdit={(regla) => setReglaModal({ open: true, regla })}
                onDelete={(regla) =>
                  setDeleteTarget({ tipo: "regla", id: regla._id, label: regla.nombre })
                }
              />
            )}
          </section>
        </>
      )}

      <ComplianceModal
        isOpen={normaModal.open}
        title={
          normaModal.norma
            ? t("compliance.normas.edit")
            : t("compliance.normas.create")
        }
        onClose={() => setNormaModal({ open: false, norma: null })}
      >
        <NormaForm
          key={normaModal.norma?._id ?? "nueva"}
          initialData={normaModal.norma}
          onSubmit={handleNormaSubmit}
          onCancel={() => setNormaModal({ open: false, norma: null })}
        />
      </ComplianceModal>

      <ComplianceModal
        isOpen={reglaModal.open}
        title={
          reglaModal.regla
            ? t("compliance.reglas.edit")
            : t("compliance.reglas.create")
        }
        onClose={() => setReglaModal({ open: false, regla: null })}
      >
        <ReglaForm
          key={reglaModal.regla?._id ?? "nueva"}
          initialData={reglaModal.regla}
          normas={normas}
          onSubmit={handleReglaSubmit}
          onCancel={() => setReglaModal({ open: false, regla: null })}
        />
      </ComplianceModal>

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onRequestClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={
          deleteTarget?.tipo === "norma"
            ? t("compliance.normas.delete")
            : t("compliance.reglas.delete")
        }
        message={
          deleteTarget?.tipo === "norma"
            ? t("compliance.normas.deleteConfirm", { codigo: deleteTarget?.label })
            : t("compliance.reglas.deleteConfirm", { nombre: deleteTarget?.label })
        }
        isLoading={isDeleting}
      />
    </div>
  )
}
