interface ExplicitLogoutDependencies {
  csrfToken: string | null
  logoutSession: (csrfToken?: string | null) => Promise<unknown>
  logout: () => Promise<void>
  setLogoutMessage: (message: string) => void
  navigate: (path: string, options: { replace: boolean }) => void
}

export const runExplicitLogout = async ({
  csrfToken,
  logoutSession: endServerSession,
  logout,
  setLogoutMessage,
  navigate,
}: ExplicitLogoutDependencies): Promise<void> => {
  // A local-only logout would leave the HttpOnly session cookie valid. Keep the
  // current session visible and retryable unless the server confirms revocation.
  await endServerSession(csrfToken)

  // logout() clears the local auth state and only re-throws when the offline
  // identity purge (IndexedDB cache cleanup, best-effort) failed. The session
  // is already revoked server-side and the local state already cleared at that
  // point, so the user-facing flow must continue: show the confirmation modal
  // and land on the login page instead of dying with a toast and no feedback.
  try {
    await logout()
  } catch (error) {
    console.warn("runExplicitLogout: offline purge failed after logout", error)
  }
  setLogoutMessage("auth.logoutSuccess")
  navigate("/", { replace: true })
}
