/**
 * Servicio central del onboarding visual.
 *
 * El tour global vive en Inicio y explica el mapa completo sin navegar.
 * Los 12 tours por sección ya existentes se auto-lanzan al visitar su
 * página, así no se pisan con el global.
 */

export const GLOBAL_ONBOARDING_KEY = "leonix-global-onboarding-v2-completed";

/** Clave legacy del tour anterior (solo bienvenida + settings). */
export const LEGACY_HOME_TOUR_KEY = "home-onboarding-tour-v1-shown";

export const isGlobalOnboardingCompleted = (): boolean => {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(GLOBAL_ONBOARDING_KEY) === "true";
  } catch {
    return true;
  }
};

export const completeGlobalOnboarding = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GLOBAL_ONBOARDING_KEY, "true");
    // Marcar también la clave legacy para que el flujo viejo no re-dispare.
    window.localStorage.setItem(LEGACY_HOME_TOUR_KEY, "true");
  } catch {
    // localStorage puede estar bloqueado (modo incógnito): no romper la app.
  }
};

export const resetGlobalOnboarding = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GLOBAL_ONBOARDING_KEY);
  } catch {
    // noop
  }
};

export const shouldAutoStartGlobalTour = (): boolean => {
  if (typeof window === "undefined") return false;
  if (isGlobalOnboardingCompleted()) return false;
  // Solo desktop: en mobile el drawer oculta los [data-tour] del Nav.
  try {
    if (!window.matchMedia("(min-width: 1024px)").matches) return false;
  } catch {
    return false;
  }
  return true;
};
