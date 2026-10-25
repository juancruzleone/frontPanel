import React, { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { HomeDashboard } from "../features/home/components/HomeDashboard"

const Home: React.FC = () => {
  const { t } = useTranslation()
  useEffect(() => {
    document.title = t("home.titlePage", { defaultValue: "Inicio | Leonix" })
  }, [t])
  return <HomeDashboard />
}

export default Home
