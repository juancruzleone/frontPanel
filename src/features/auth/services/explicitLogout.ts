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
  await logout()
  setLogoutMessage("auth.logoutSuccess")
  navigate("/", { replace: true })
}
