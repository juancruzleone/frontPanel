import { useTranslation } from "react-i18next"
import { getOnboardingIncompleteGuidance } from "../../../shared/services/tenantOnboardingService"
import { SETUP_PATH } from "../setupPaths"

interface OnboardingRequiredNoticeProps {
  missing?: string[]
}

/**
 * Aviso que se muestra cuando una llamada operativa es rechazada con
 * 403 ONBOARDING_INCOMPLETE. Guía al setup sin usar localStorage.
 */
export const OnboardingRequiredNotice = ({ missing = [] }: OnboardingRequiredNoticeProps) => {
  const { t } = useTranslation()
  return (
    <div role="alert">
      <p>{getOnboardingIncompleteGuidance(missing)}</p>
      <a href={SETUP_PATH}>
        {t("setup.notice.goToSetup", { defaultValue: "Ir a la configuración inicial" })}
      </a>
    </div>
  )
}
