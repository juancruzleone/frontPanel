import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Check,
  Lock,
  Building2,
  Wrench,
  Cpu,
  FileText,
  ClipboardList,
  ChevronRight,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react"
import ModalManageInstallationTypes from "../../settings/components/ModalManageInstallationTypes"
import ModalManageDeviceCategories from "../../settings/components/ModalManageDeviceCategories"
import ModalManageFormCategories from "../../settings/components/ModalManageFormCategories"
import ModalCreateForm from "../../forms/components/ModalCreateForm"
import SuccessModal from "../../../shared/components/SuccessModal"
import useForms, { type FormTemplate } from "../../forms/hooks/useForms"
import { useTenantOnboarding } from "../hooks/useTenantOnboarding"
import { TenantOnboardingError, type OnboardingCheckKey } from "../../../shared/services/tenantOnboardingService"
import { SETUP_STEP_ORDER } from "../setupPaths"
import styles from "../styles/setupWizard.module.css"

type ModalKey = Exclude<OnboardingCheckKey, "company">

const STEP_MODAL: Record<ModalKey, ModalKey> = {
  installationTypes: "installationTypes",
  deviceCategories: "deviceCategories",
  formCategories: "formCategories",
  maintenanceTemplate: "maintenanceTemplate",
}

const STEP_ICONS: Record<OnboardingCheckKey, React.ComponentType<{ size?: number; className?: string }>> = {
  company: Building2,
  installationTypes: Wrench,
  deviceCategories: Cpu,
  formCategories: FileText,
  maintenanceTemplate: ClipboardList,
}

type StepState = "done" | "current" | "locked"

/**
 * Creador de plantillas de mantenimiento reutilizando el UI existente
 * (ModalCreateForm + useForms). Solo se monta al abrir el paso.
 */
const MaintenanceTemplateCreator = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation()
  const { categories, addTemplate } = useForms()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSuccess = async (data: FormTemplate): Promise<void> => {
    setSubmitError(null)
    try {
      await addTemplate(data)
      setShowSuccess(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al guardar la plantilla"
      setSubmitError(message)
      throw err
    }
  }

  const handleSuccessClose = () => {
    setShowSuccess(false)
    onClose()
  }

  return (
    <>
      {submitError && <p role="alert" style={{ display: "none" }}>{submitError}</p>}
      <ModalCreateForm
        isOpen={!showSuccess}
        onRequestClose={onClose}
        onSubmitSuccess={handleSuccess}
        onSubmitError={(message) => setSubmitError(message)}
        initialData={null}
        categories={categories}
      />
      {showSuccess && (
        <SuccessModal
          isOpen={showSuccess}
          onRequestClose={handleSuccessClose}
          title={t("forms.templateCreated", { defaultValue: "Plantilla creada con éxito" })}
          message={t("forms.templateCreatedMessage", {
            defaultValue: "La plantilla de mantenimiento se creó correctamente y se asoció al sistema.",
          })}
          variant="success"
        />
      )}
      {submitError && (
        <SuccessModal
          isOpen={!!submitError}
          onRequestClose={() => setSubmitError(null)}
          title={t("common.error", { defaultValue: "Error al crear plantilla" })}
          message={submitError}
          variant="error"
        />
      )}
    </>
  )
}

/**
 * Asistente ordenado de configuración inicial obligatoria.
 * Cada paso reutiliza los modales y hooks de gestión existentes sin
 * reimplementar su CRUD; el cierre lo valida el servidor (409 honesto).
 */
export const SetupWizard = () => {
  const { t } = useTranslation()
  const { status, loading, error, refresh, retry, complete, canComplete } = useTenantOnboarding()
  const [openModal, setOpenModal] = useState<ModalKey | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)
  const [completeError, setCompleteError] = useState<TenantOnboardingError | null>(null)

  if (loading && !status) {
    return (
      <div className={styles.loadingContainer} role="status" aria-busy="true">
        <RefreshCw size={24} className={styles.spinner} />
        <p>{t("setup.wizard.loading", { defaultValue: "Cargando configuración inicial…" })}</p>
      </div>
    )
  }

  if (error && !status) {
    return (
      <div className={styles.errorContainer} role="alert">
        <AlertCircle size={28} className={styles.errorIcon} />
        <p>
          {t("setup.wizard.loadError", {
            defaultValue: "No se pudo cargar el estado de configuración.",
          })}
        </p>
        <button type="button" className={styles.btnPrimary} onClick={() => void retry()}>
          <RefreshCw size={14} />
          <span>{t("setup.gate.retry", { defaultValue: "Reintentar" })}</span>
        </button>
      </div>
    )
  }

  const checks = status?.checks
  const firstPendingIndex = SETUP_STEP_ORDER.findIndex((key) => !checks?.[key])
  const allDone = firstPendingIndex === -1
  const completedCount = SETUP_STEP_ORDER.filter((key) => checks?.[key]).length
  const totalSteps = SETUP_STEP_ORDER.length
  const progressPercent = Math.round((completedCount / totalSteps) * 100)

  const stepState = (key: OnboardingCheckKey): StepState => {
    if (checks?.[key]) return "done"
    const index = SETUP_STEP_ORDER.indexOf(key)
    return index === firstPendingIndex ? "current" : "locked"
  }

  const closeAndRefresh = () => {
    setOpenModal(null)
    void refresh()
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    setCompleteError(null)
    try {
      await complete()
      await refresh()
    } catch (err) {
      if (err instanceof TenantOnboardingError) {
        setCompleteError(err)
        await refresh()
      } else {
        setCompleteError(
          new TenantOnboardingError(
            err instanceof Error ? err.message : "No se pudo completar la configuración inicial",
            { code: "ONBOARDING_COMPLETE_FAILED", status: 0, missing: [] },
          ),
        )
      }
    } finally {
      setIsCompleting(false)
    }
  }

  if (status?.status === "complete") {
    return (
      <div className={styles.loadingContainer} role="status">
        <Check size={28} style={{ color: "var(--color-success)" }} />
        <p>{t("setup.wizard.alreadyComplete", { defaultValue: "La configuración inicial ya está completa." })}</p>
      </div>
    )
  }

  return (
    <div>
      <div className={styles.progressSection}>
        <div className={styles.progressMeta}>
          <span className={styles.progressLabel}>
            {t("settings.stepsCompleted", {
              defaultValue: "{{completed}} de {{total}} pasos completados",
              completed: completedCount,
              total: totalSteps,
            })}
          </span>
          <span className={styles.progressPercent}>{progressPercent}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>
        <div className={styles.stepperDots}>
          {SETUP_STEP_ORDER.map((key, index) => {
            const state = stepState(key)
            return (
              <div key={key} className={styles.stepDotItem}>
                <div
                  className={`${styles.stepDotCircle} ${
                    state === "done"
                      ? styles.stepDotDone
                      : state === "current"
                      ? styles.stepDotCurrent
                      : styles.stepDotLocked
                  }`}
                >
                  {state === "done" ? <Check size={14} /> : index + 1}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <ol className={styles.stepsList} style={{ marginTop: "24px" }}>
        {SETUP_STEP_ORDER.map((key) => {
          const state = stepState(key)
          const actionable = canComplete && (state === "current" || state === "done")
          const Icon = STEP_ICONS[key]
          const isCurrent = state === "current"
          const isDone = state === "done"

          return (
            <li
              key={key}
              data-testid="setup-step"
              data-step={key}
              data-state={state}
              className={`${styles.stepCard} ${
                isDone ? styles.stepCardDone : isCurrent ? styles.stepCardCurrent : styles.stepCardLocked
              }`}
            >
              <div className={styles.stepLeading}>
                <div className={styles.stepLeadingCircle}>
                  {isDone ? <Check size={20} /> : <Icon size={20} />}
                </div>
              </div>

              <div className={styles.stepBody}>
                <div className={styles.stepTitleRow}>
                  <h3 className={styles.stepTitle}>
                    {t(`setup.steps.${key}.title`, { defaultValue: key })}
                  </h3>
                  <span
                    className={`${styles.badge} ${
                      isDone ? styles.badgeDone : isCurrent ? styles.badgeCurrent : styles.badgeLocked
                    }`}
                  >
                    {isDone && <Check size={11} />}
                    {state === "locked" && <Lock size={11} />}
                    {t(`setup.steps.${key}.state.${state}`, { defaultValue: state })}
                  </span>
                </div>
                <p className={styles.stepDescription}>
                  {t(`setup.steps.${key}.description`, { defaultValue: "" })}
                </p>
              </div>

              <div className={styles.stepAction}>
                {key === "company" ? (
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => void refresh()}
                    disabled={!canComplete && state !== "current"}
                  >
                    <RefreshCw size={14} />
                    <span>{t("setup.steps.company.verify", { defaultValue: "Volver a comprobar" })}</span>
                  </button>
                ) : (
                  actionable && (
                    <button
                      type="button"
                      className={isCurrent ? styles.btnPrimary : styles.btnSecondary}
                      onClick={() => setOpenModal(STEP_MODAL[key])}
                    >
                      <span>{t("setup.wizard.manage", { defaultValue: "Gestionar" })}</span>
                      <ChevronRight size={14} />
                    </button>
                  )
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <div style={{ marginTop: "24px" }}>
        {canComplete ? (
          <div className={styles.completeSection}>
            <button
              type="button"
              className={styles.completeBtn}
              onClick={() => void handleComplete()}
              disabled={!allDone || isCompleting}
            >
              {isCompleting ? (
                <>
                  <RefreshCw size={16} className={styles.spinner} />
                  <span>{t("setup.wizard.completing", { defaultValue: "Finalizando configuración…" })}</span>
                </>
              ) : (
                <>
                  <span>{t("setup.wizard.complete", { defaultValue: "Completar configuración" })}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
            {!allDone && (
              <p className={styles.completeHint}>
                {t("setup.wizard.completeHint", {
                  defaultValue: "Completá todos los pasos en orden para habilitar el cierre.",
                })}
              </p>
            )}
          </div>
        ) : (
          <div className={styles.waitingAdminBox} role="status">
            <ShieldCheck size={20} />
            <p>
              {t("setup.wizard.waitingAdmin", {
                defaultValue:
                  "En espera: un administrador del tenant debe completar la configuración inicial. Ya podrás acceder cuando termine.",
              })}
            </p>
          </div>
        )}

        {completeError && (
          <div className={styles.completeErrorBox} role="alert" style={{ marginTop: "16px" }}>
            <AlertCircle size={20} className={styles.errorIcon} />
            <div>
              <p className={styles.errorTitle}>
                {t("setup.wizard.completeError", {
                  defaultValue: "No se pudo completar la configuración. El servidor indicó que faltan requisitos:",
                })}
              </p>
              {completeError.missing.length > 0 && (
                <ul className={styles.missingList}>
                  {completeError.missing.map((item) => (
                    <li key={item}>
                      <code>{item}</code>
                      {" — "}
                      {t(`setup.steps.${item}.title`, { defaultValue: item })}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {openModal === "installationTypes" && (
        <ModalManageInstallationTypes isOpen onRequestClose={closeAndRefresh} />
      )}
      {openModal === "deviceCategories" && (
        <ModalManageDeviceCategories isOpen onRequestClose={closeAndRefresh} />
      )}
      {openModal === "formCategories" && (
        <ModalManageFormCategories isOpen onRequestClose={closeAndRefresh} />
      )}
      {openModal === "maintenanceTemplate" && <MaintenanceTemplateCreator onClose={closeAndRefresh} />}
    </div>
  )
}
