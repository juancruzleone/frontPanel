import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { ComplianceView } from "../features/compliance/components/ComplianceView"

const Compliance = () => {
  const { t } = useTranslation()
  useEffect(() => {
    document.title = t("compliance.titlePage", { defaultValue: "Cumplimiento | Leonix" })
  }, [t])
  return <ComplianceView />
}

export default Compliance