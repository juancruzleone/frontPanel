import { useCallback, useEffect, useRef, useState } from "react"
import { driver, type Driver } from "driver.js"
import "driver.js/dist/driver.css"
import "../../installations/styles/tour.css"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../../shared/hooks/useTheme"

const STORAGE_KEY = "complianceTourCompleted"

interface UseComplianceTourOptions {
  isAdmin: boolean
}

export const useComplianceTour = ({ isAdmin }: UseComplianceTourOptions) => {
  const { t } = useTranslation()
  const { dark } = useTheme()
  const [tourCompleted, setTourCompleted] = useState<boolean>(false)
  const driverRef = useRef<Driver | null>(null)

  useEffect(() => {
    setTourCompleted(localStorage.getItem(STORAGE_KEY) === "true")
  }, [])

  useEffect(() => {
    return () => {
      const activeDriver = driverRef.current
      driverRef.current = null
      activeDriver?.destroy()
    }
  }, [])

  const completeTour = useCallback((activeDriver: Driver) => {
    localStorage.setItem(STORAGE_KEY, "true")
    setTourCompleted(true)
    activeDriver.destroy()
  }, [])

  const startTour = useCallback(() => {
    if (driverRef.current?.isActive()) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const baseSteps = [
      {
        popover: {
          title: t("compliance.tour.welcome.title"),
          description: t("compliance.tour.welcome.description"),
          showButtons: ["next", "close"] as ("next" | "previous" | "close")[],
          side: "bottom" as const,
          align: "start" as const,
        },
      },
      {
        element: '[data-tour="nav-compliance"]',
        popover: {
          title: t("compliance.tour.navCompliance.title"),
          description: t("compliance.tour.navCompliance.description"),
          side: "right" as const,
          align: "start" as const,
        },
      },
      {
        element: '[data-tour="compliance-scan-section"]',
        popover: {
          title: t("compliance.tour.runScan.title"),
          description: t("compliance.tour.runScan.description"),
          side: "bottom" as const,
          align: "start" as const,
        },
      },
      {
        element: '[data-tour="compliance-catalog"]',
        popover: {
          title: t("compliance.tour.catalog.title"),
          description: t("compliance.tour.catalog.description"),
          side: "bottom" as const,
          align: "start" as const,
        },
      },
      {
        element: '[data-tour="compliance-evaluations"]',
        popover: {
          title: t("compliance.tour.evaluations.title"),
          description: t("compliance.tour.evaluations.description"),
          side: "bottom" as const,
          align: "start" as const,
        },
      },
      {
        element: '[data-tour="compliance-legacy"]',
        popover: {
          title: t("compliance.tour.legacy.title"),
          description: t("compliance.tour.legacy.description"),
          side: "bottom" as const,
          align: "start" as const,
        },
      },
    ]

    const adminSteps = isAdmin
      ? [
          {
            element: '[data-tour="compliance-create-norma"]',
            popover: {
              title: t("compliance.tour.createNorma.title"),
              description: t("compliance.tour.createNorma.description"),
              side: "bottom" as const,
              align: "start" as const,
            },
          },
          {
            element: '[data-tour="compliance-create-regla"]',
            popover: {
              title: t("compliance.tour.createRegla.title"),
              description: t("compliance.tour.createRegla.description"),
              side: "bottom" as const,
              align: "start" as const,
            },
          },
        ]
      : []

    const driverObj = driver({
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      progressText: t("compliance.tour.progressText"),
      animate: !reduceMotion,
      smoothScroll: !reduceMotion,
      popoverClass: dark ? "driverjs-dark-theme" : "driverjs-light-theme",
      allowClose: true,
      skipMissingElement: true,
      waitForElement: 1000,
      steps: [...baseSteps, ...adminSteps],
      nextBtnText: t("compliance.tour.buttons.next"),
      prevBtnText: t("compliance.tour.buttons.previous"),
      doneBtnText: t("compliance.tour.buttons.done"),
      onCloseClick: (_element, _step, { driver: activeDriver }) => {
        completeTour(activeDriver)
      },
      onDoneClick: (_element, _step, { driver: activeDriver }) => {
        completeTour(activeDriver)
      },
      onDestroyed: () => {
        if (driverRef.current === driverObj) {
          driverRef.current = null
        }
      },
    })

    driverRef.current = driverObj
    driverObj.drive()
  }, [completeTour, dark, isAdmin, t])

  const resetTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setTourCompleted(false)
  }, [])

  const skipTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true")
    setTourCompleted(true)
  }, [])

  return { tourCompleted, startTour, resetTour, skipTour }
}
