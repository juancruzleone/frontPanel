interface ExplicitLogoutDependencies {
  csrfToken: string | null
  logoutSession: (csrfToken?: string | null) => Promise<unknown>
  logout: () => void | Promise<void>
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
  try {
    await endServerSession(csrfToken)
  } catch {
    // Local logout must still complete when the server session is unavailable.
  }

  await logout()
  setLogoutMessage("auth.logoutSuccess")
  navigate("/", { replace: true })
}
