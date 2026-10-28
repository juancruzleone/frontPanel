import { useState } from "react"
import { useTranslation } from "react-i18next"
import ModalManageInstallationTypes from "../../settings/components/ModalManageInstallationTypes"
import ModalManageDeviceCategories from "../../settings/components/ModalManageDeviceCategories"
import ModalManageFormCategories from "../../settings/components/ModalManageFormCategories"
import ModalCreateForm from "../../forms/components/ModalCreateForm"
import useForms, { type FormTemplate } from "../../forms/hooks/useForms"
import { useTenantOnboarding } from "../hooks/useTenantOnboarding"
import { TenantOnboardingError, type OnboardingCheckKey } from "../../../shared/services/tenantOnboardingService"
import { SETUP_STEP_ORDER } from "../setupPaths"

type ModalKey = Exclude<OnboardingCheckKey, "company">

const STEP_MODAL: Record<ModalKey, ModalKey> = {
  installationTypes: "installationTypes",
  deviceCategories: "deviceCategories",
  formCategories: "formCategories",
  maintenanceTemplate: "maintenanceTemplate",
}

type StepState = "done" | "current" | "locked"

/**
 * Creador de plantillas de mantenimiento reutilizando el UI existente
 * (ModalCreateForm + useForms). Solo se monta al abrir el paso.
 */
const MaintenanceTemplateCreator = ({ onClose }: { onClose: () => void }) => {
  const { categories, addTemplate } = useForms()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSuccess = async (data: FormTemplate): Promise<void> => {
    setSubmitError(null)
    await addTemplate(data)
    onClose()
  }

  return (
    <>
      {submitError && <p role="alert">{submitError}</p>}
      <ModalCreateForm
        isOpen
        onRequestClose={onClose}
        onSubmitSuccess={handleSuccess}
        onSubmitError={(message) => setSubmitError(message)}
        initialData={null}
        categories={categories}
      />
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
      <div role="status" aria-busy="true">
        {t("setup.wizard.loading", { defaultValue: "Cargando configuración inicial…" })}
      </div>
    )
  }

  if (error && !status) {
    return (
      <div role="alert">
        <p>
          {t("setup.wizard.loadError", {
            defaultValue: "No se pudo cargar el estado de configuración.",
          })}
        </p>
        <button type="button" onClick={() => void retry()}>
          {t("setup.gate.retry", { defaultValue: "Reintentar" })}
        </button>
      </div>
    )
  }

  const checks = status?.checks
  const firstPendingIndex = SETUP_STEP_ORDER.findIndex((key) => !checks?.[key])
  const allDone = firstPendingIndex === -1

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
      <div role="status">
        <p>{t("setup.wizard.alreadyComplete", { defaultValue: "La configuración inicial ya está completa." })}</p>
      </div>
    )
  }

  return (
    <div>
      <ol>
        {SETUP_STEP_ORDER.map((key) => {
          const state = stepState(key)
          const actionable = canComplete && (state === "current" || state === "done")
          return (
            <li key={key} data-testid="setup-step" data-step={key} data-state={state}>
              <h3>{t(`setup.steps.${key}.title`, { defaultValue: key })}</h3>
              <p>{t(`setup.steps.${key}.description`, { defaultValue: "" })}</p>
              <span>{t(`setup.steps.${key}.state.${state}`, { defaultValue: state })}</span>
              {key === "company" ? (
                <button type="button" onClick={() => void refresh()} disabled={!canComplete && state !== "current"}>
                  {t("setup.steps.company.verify", { defaultValue: "Volver a comprobar" })}
                </button>
              ) : (
                actionable && (
                  <button type="button" onClick={() => setOpenModal(STEP_MODAL[key])}>
                    {t("setup.wizard.manage", { defaultValue: "Gestionar" })}
                  </button>
                )
              )}
            </li>
          )
        })}
      </ol>

      {canComplete ? (
        <div>
          <button type="button" onClick={() => void handleComplete()} disabled={!allDone || isCompleting}>
            {t("setup.wizard.complete", { defaultValue: "Completar configuración" })}
          </button>
          {!allDone && (
            <p>{t("setup.wizard.completeHint", { defaultValue: "Completá todos los pasos en orden para habilitar el cierre." })}</p>
          )}
        </div>
      ) : (
        <p role="status">
          {t("setup.wizard.waitingAdmin", {
            defaultValue: "En espera: un administrador del tenant debe completar la configuración inicial. Ya podrás acceder cuando termine.",
          })}
        </p>
      )}

      {completeError && (
        <div role="alert">
          <p>
            {t("setup.wizard.completeError", {
              defaultValue: "No se pudo completar la configuración. El servidor indicó que faltan requisitos:",
            })}
          </p>
          {completeError.missing.length > 0 && (
            <ul>
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
      )}

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
