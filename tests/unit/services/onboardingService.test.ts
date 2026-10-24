import { describe, it, expect, beforeEach } from "vitest";
import {
  GLOBAL_ONBOARDING_KEY,
  LEGACY_HOME_TOUR_KEY,
  completeGlobalOnboarding,
  isGlobalOnboardingCompleted,
  resetGlobalOnboarding,
  shouldAutoStartGlobalTour,
} from "../../../src/shared/services/onboardingService";

describe("onboardingService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("no está completado al inicio", () => {
    expect(isGlobalOnboardingCompleted()).toBe(false);
  });

  it("complete marca global y legacy para no re-disparar el flujo viejo", () => {
    completeGlobalOnboarding();
    expect(localStorage.getItem(GLOBAL_ONBOARDING_KEY)).toBe("true");
    expect(localStorage.getItem(LEGACY_HOME_TOUR_KEY)).toBe("true");
    expect(isGlobalOnboardingCompleted()).toBe(true);
  });

  it("reset permite relanzar el tour", () => {
    completeGlobalOnboarding();
    resetGlobalOnboarding();
    expect(isGlobalOnboardingCompleted()).toBe(false);
  });

  it("no auto-lanza si ya está completado", () => {
    completeGlobalOnboarding();
    expect(shouldAutoStartGlobalTour()).toBe(false);
  });
});
