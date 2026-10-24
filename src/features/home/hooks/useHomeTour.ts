import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "../../installations/styles/tour.css";
import { useTheme } from "../../../shared/hooks/useTheme";
import {
  completeGlobalOnboarding,
  isGlobalOnboardingCompleted,
} from "../../../shared/services/onboardingService";

interface GlobalStep {
  element?: string;
  titleKey: string;
  titleFallback: string;
  descKey: string;
  descFallback: string;
}

/**
 * Tour global inicial: explica el mapa completo de la web sin navegar.
 * Los tours por sección (12 existentes) se auto-lanzan al visitar su página.
 * Los pasos cuyo [data-tour] no existe para el rol actual se omiten solos.
 */
export const useHomeTour = () => {
  const { t } = useTranslation();
  const { dark } = useTheme();
  const [tourCompleted, setTourCompleted] = useState<boolean>(false);

  useEffect(() => {
    setTourCompleted(isGlobalOnboardingCompleted());
  }, []);

  const startTour = useCallback(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const allSteps: GlobalStep[] = [
      {
        titleKey: "home.tour.welcome.title",
        titleFallback: "¡Bienvenido/a a Leonix!",
        descKey: "home.tour.welcome.description",
        descFallback:
          "Este es tu panel de inicio. Te muestro el mapa completo para que uses todo sin ayuda: mirá cada sección y al final cada página tiene su propio tutorial.",
      },
      {
        element: '[data-tour="nav-work-orders"]',
        titleKey: "onboarding.tour.workOrders.title",
        titleFallback: "Órdenes de trabajo",
        descKey: "onboarding.tour.workOrders.description",
        descFallback:
          "Acá vive el trabajo diario: listado de órdenes y calendario. Crear, asignar, iniciar y completar órdenes pasa por acá.",
      },
      {
        element: '[data-tour="nav-maintenance"]',
        titleKey: "onboarding.tour.maintenance.title",
        titleFallback: "Mantenimiento",
        descKey: "onboarding.tour.maintenance.description",
        descFallback:
          "Plan de mantenimiento preventivo: frecuencias y vencimientos para que nada se rompa por olvido.",
      },
      {
        element: '[data-tour="nav-installations"]',
        titleKey: "onboarding.tour.installations.title",
        titleFallback: "Instalaciones y clientes",
        descKey: "onboarding.tour.installations.description",
        descFallback:
          "Tus sitios y tus clientes. Cada instalación junta sus equipos, órdenes e historial en un solo lugar.",
      },
      {
        element: '[data-tour="nav-assets"]',
        titleKey: "onboarding.tour.assets.title",
        titleFallback: "Activos, formularios y manuales",
        descKey: "onboarding.tour.assets.description",
        descFallback:
          "Equipos, plantillas de formularios para las visitas y manuales de ayuda. Todo lo que el técnico necesita en campo.",
      },
      {
        element: '[data-tour="nav-operation"]',
        titleKey: "onboarding.tour.operation.title",
        titleFallback: "Operación: inventario, personal y proveedores",
        descKey: "onboarding.tour.operation.description",
        descFallback:
          "Stock con alertas de faltantes, tu equipo de técnicos y tus proveedores. Si algo falta en una orden, se resuelve acá.",
      },
      // Paso de Cumplimiento oculto por decisión de producto (se conserva el
      // ancla data-tour y las keys onboarding.tour.compliance por si vuelve).
      {
        element: '[data-tour="open-settings"]',
        titleKey: "home.tour.settings.title",
        titleFallback: "Configuración: empezá por acá",
        descKey: "home.tour.settings.description",
        descFallback:
          "Antes de operar, entrá a Configuración y completá los 3 pasos: tipos de instalación, categorías de activos y de formularios. Sin eso, el resto queda vacío.",
      },
      {
        element: '[data-tour="topbar-actions"]',
        titleKey: "onboarding.tour.topbar.title",
        titleFallback: "Barra superior: idioma, tema y avisos",
        descKey: "onboarding.tour.topbar.description",
        descFallback:
          "Cambiá idioma (10 disponibles), modo claro/oscuro y revisá las notificaciones. Todo queda guardado para tu usuario.",
      },
      {
        element: '[data-tour="home-dashboard-attention"]',
        titleKey: "onboarding.tour.attention.title",
        titleFallback: "Tu panel: qué necesita atención",
        descKey: "onboarding.tour.attention.description",
        descFallback:
          "KPIs, alertas críticas, instalaciones con incidentes y próximos preventivos. Si está vacío, es un período tranquilo o faltan datos base.",
      },
      {
        element: '[data-tour="home-dashboard-recent"]',
        titleKey: "onboarding.tour.recent.title",
        titleFallback: "Órdenes recientes y análisis",
        descKey: "onboarding.tour.recent.description",
        descFallback:
          "Últimas órdenes con detalle rápido, evolución creada vs completada y distribución por estado. Abajo, cada sección tiene su botón de ayuda (?) para rever su tutorial.",
      },
      {
        titleKey: "onboarding.tour.closing.title",
        titleFallback: "Listo: cada sección tiene su guía",
        descKey: "onboarding.tour.closing.description",
        descFallback:
          "Este fue el mapa general. La primera vez que entres a cada sección vas a ver su tutorial corto. Podés saltarlos u omitirlos y relanzarlos con el botón de ayuda.",
      },
    ];

    // Omitir pasos cuyo ancla no existe para este rol/viewport.
    const steps = allSteps
      .filter(
        (s) =>
          !s.element ||
          (typeof document !== "undefined" &&
            document.querySelector(s.element) !== null),
      )
      .map((s) => ({
        ...(s.element ? { element: s.element } : {}),
        popover: {
          title: t(s.titleKey, { defaultValue: s.titleFallback }),
          description: t(s.descKey, { defaultValue: s.descFallback }),
          side: "bottom" as const,
          align: "start" as const,
        },
      }));

    const homeTour = driver({
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      progressText: t("home.tour.progressText"),
      nextBtnText: t("home.tour.buttons.next"),
      prevBtnText: t("home.tour.buttons.previous"),
      doneBtnText: t("home.tour.buttons.done"),
      allowClose: true,
      animate: !reduceMotion,
      smoothScroll: !reduceMotion,
      popoverClass: dark ? "driverjs-dark-theme" : "driverjs-light-theme",
      steps,
      onDestroyed: () => {
        completeGlobalOnboarding();
        setTourCompleted(true);
      },
    });

    homeTour.drive();
  }, [dark, t]);

  return {
    tourCompleted,
    startTour,
  };
};
