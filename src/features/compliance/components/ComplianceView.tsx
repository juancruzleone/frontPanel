import { useEffect, useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useComplianceData } from "../hooks/useComplianceData"
import { useAuthStore } from "../../../store/authStore"
import { isAdmin } from "../../../shared/utils/roleUtils"
import { useComplianceTour } from "../hooks/useComplianceTour"
import { CatalogPackBrowser } from "./CatalogPackBrowser"
import { ComplianceEvaluationsPanel } from "./ComplianceEvaluationsPanel"
import { LegacyComplianceHistory } from "./LegacyComplianceHistory"
import { RunScanButton } from "./RunScanButton"
import { ComplianceModal } from "./ComplianceModal"
import { NormaForm } from "./NormaForm"
import { ReglaForm } from "./ReglaForm"
import TourButton from "../../../shared/components/Buttons/TourButton"
import type { Norma, Regla, NormaPayload, ReglaPayload } from "../services/complianceTypes"
import styles from "../styles/compliance.module.css"

// ---- tipos de modal ----
type ModalEstado =
  | { tipo: "cerrado" }
  | { tipo: "norma-crear" }
  | { tipo: "norma-editar"; norma: Norma }
  | { tipo: "norma-borrar"; norma: Norma }
  | { tipo: "regla-crear" }
  | { tipo: "regla-editar"; regla: Regla }
  | { tipo: "regla-borrar"; regla: Regla }

export const ComplianceView: React.FC = () => {
  const { t } = useTranslation()
  const role = useAuthStore((state) => state.role)
  const userIsAdmin = isAdmin(role)

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

  const { tourCompleted, startTour, skipTour } = useComplianceTour({ isAdmin: userIsAdmin })

  const [modal, setModal] = useState<ModalEstado>({ tipo: "cerrado" })
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [deleteConfirming, setDeleteConfirming] = useState(false)

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  // Auto-start tour after first load
  useEffect(() => {
    const onboardingDone = localStorage.getItem("onboarding-tour-v2-shown")
    if (!loading && !tourCompleted && onboardingDone === "true") {
      const timer = setTimeout(() => startTour(), 500)
      return () => clearTimeout(timer)
    }
  }, [loading, tourCompleted, startTour])

  const cerrarModal = useCallback(() => {
    setModal({ tipo: "cerrado" })
    setModalError(null)
    setDeleteConfirming(false)
  }, [])

  // ---- handlers normas ----
  const handleCrearNorma = useCallback(async (data: NormaPayload) => {
    setModalLoading(true)
    setModalError(null)
    try {
      await createNorma(data)
      cerrarModal()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : t("common.error"))
    } finally {
      setModalLoading(false)
    }
  }, [createNorma, cerrarModal, t])

  const handleEditarNorma = useCallback(async (data: Partial<NormaPayload>) => {
    if (modal.tipo !== "norma-editar") return
    setModalLoading(true)
    setModalError(null)
    try {
      await updateNorma(modal.norma._id, data)
      cerrarModal()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : t("common.error"))
    } finally {
      setModalLoading(false)
    }
  }, [modal, updateNorma, cerrarModal, t])

  const handleBorrarNorma = useCallback(async () => {
    if (modal.tipo !== "norma-borrar") return
    setDeleteConfirming(true)
    setModalError(null)
    try {
      await deleteNorma(modal.norma._id)
      cerrarModal()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : t("common.error"))
      setDeleteConfirming(false)
    }
  }, [modal, deleteNorma, cerrarModal, t])

  // ---- handlers reglas ----
  const handleCrearRegla = useCallback(async (data: ReglaPayload) => {
    setModalLoading(true)
    setModalError(null)
    try {
      await createRegla(data)
      cerrarModal()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : t("common.error"))
    } finally {
      setModalLoading(false)
    }
  }, [createRegla, cerrarModal, t])

  const handleEditarRegla = useCallback(async (data: ReglaPayload) => {
    if (modal.tipo !== "regla-editar") return
    setModalLoading(true)
    setModalError(null)
    try {
      await updateRegla(modal.regla._id, data)
      cerrarModal()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : t("common.error"))
    } finally {
      setModalLoading(false)
    }
  }, [modal, updateRegla, cerrarModal, t])

  const handleBorrarRegla = useCallback(async () => {
    if (modal.tipo !== "regla-borrar") return
    setDeleteConfirming(true)
    setModalError(null)
    try {
      await deleteRegla(modal.regla._id)
      cerrarModal()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : t("common.error"))
      setDeleteConfirming(false)
    }
  }, [modal, deleteRegla, cerrarModal, t])

  // ---- título del modal activo ----
  const modalTitle = (() => {
    switch (modal.tipo) {
      case "norma-crear": return t("compliance.normas.create")
      case "norma-editar": return t("compliance.normas.edit")
      case "norma-borrar": return t("compliance.normas.delete")
      case "regla-crear": return t("compliance.reglas.create")
      case "regla-editar": return t("compliance.reglas.edit")
      case "regla-borrar": return t("compliance.reglas.delete")
      default: return ""
    }
  })()

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("compliance.title")}</h1>

      {error && <p role="alert" className={styles.errorMessage}>{t("compliance.error")}</p>}

      {/* Botón de escaneo legacy (visible para todos) */}
      <div data-tour="compliance-scan-section">
        <RunScanButton onScanCompleted={refreshStatuses} />
      </div>

      <div data-tour="compliance-catalog">
        <CatalogPackBrowser />
      </div>
      <div data-tour="compliance-evaluations">
        <ComplianceEvaluationsPanel />
      </div>

      <div data-tour="compliance-legacy">
      <LegacyComplianceHistory
        normas={normas}
        reglas={reglas}
        resumen={resumen}
        loading={loading}
        isAdmin={userIsAdmin}
        onCreateNorma={() => setModal({ tipo: "norma-crear" })}
        onEditNorma={(norma) => setModal({ tipo: "norma-editar", norma })}
        onDeleteNorma={(norma) => setModal({ tipo: "norma-borrar", norma })}
        onCreateRegla={() => setModal({ tipo: "regla-crear" })}
        onEditRegla={(regla) => setModal({ tipo: "regla-editar", regla })}
        onDeleteRegla={(regla) => setModal({ tipo: "regla-borrar", regla })}
      />
      </div>

      {/* ---- Tour button ---- */}
      <TourButton
        onClick={tourCompleted ? startTour : skipTour}
        label={tourCompleted ? t("compliance.tour.buttons.restart") : t("compliance.tour.buttons.skip")}
      />

      {/* ---- Modal CRUD ---- */}
      <ComplianceModal
        isOpen={modal.tipo !== "cerrado"}
        title={modalTitle}
        onClose={cerrarModal}
      >
        {/* Crear norma */}
        {modal.tipo === "norma-crear" && (
          <NormaForm
            onSubmit={handleCrearNorma}
            onCancel={cerrarModal}
            isLoading={modalLoading}
          />
        )}

        {/* Editar norma */}
        {modal.tipo === "norma-editar" && (
          <NormaForm
            initialData={modal.norma}
            onSubmit={handleEditarNorma}
            onCancel={cerrarModal}
            isLoading={modalLoading}
          />
        )}

        {/* Borrar norma */}
        {modal.tipo === "norma-borrar" && (
          <DeleteConfirm
            message={t("compliance.normas.deleteConfirm", { codigo: modal.norma.codigo })}
            error={modalError}
            loading={deleteConfirming}
            onConfirm={handleBorrarNorma}
            onCancel={cerrarModal}
          />
        )}

        {/* Crear regla */}
        {modal.tipo === "regla-crear" && (
          <ReglaForm
            normas={normas}
            onSubmit={handleCrearRegla}
            onCancel={cerrarModal}
            isLoading={modalLoading}
          />
        )}

        {/* Editar regla */}
        {modal.tipo === "regla-editar" && (
          <ReglaForm
            initialData={modal.regla}
            normas={normas}
            onSubmit={handleEditarRegla}
            onCancel={cerrarModal}
            isLoading={modalLoading}
          />
        )}

        {/* Borrar regla */}
        {modal.tipo === "regla-borrar" && (
          <DeleteConfirm
            message={t("compliance.reglas.deleteConfirm", { nombre: modal.regla.nombre })}
            error={modalError}
            loading={deleteConfirming}
            onConfirm={handleBorrarRegla}
            onCancel={cerrarModal}
          />
        )}
      </ComplianceModal>
    </div>
  )
}

// ---- Confirmación de borrado ----
interface DeleteConfirmProps {
  message: string
  error: string | null
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}

const DeleteConfirm: React.FC<DeleteConfirmProps> = ({ message, error, loading, onConfirm, onCancel }) => {
  const { t } = useTranslation()
  return (
    <div className={styles.deleteConfirm}>
      <p className={styles.deleteMessage}>{message}</p>
      {error && <p className={styles.formError}>{error}</p>}
      <div className={styles.formActions}>
        <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={loading}>
          {t("common.cancel")}
        </button>
        <button type="button" className={styles.deleteButton} onClick={onConfirm} disabled={loading}>
          {loading ? t("common.loading") : t("common.delete")}
        </button>
      </div>
    </div>
  )
}
