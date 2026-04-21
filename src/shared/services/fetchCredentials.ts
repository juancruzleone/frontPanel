const API_URL = import.meta.env.VITE_API_URL || "/api/"

let fetchCredentialsInstalled = false

const shouldAttachCredentials = (input: RequestInfo | URL): boolean => {
  const url = typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url

  return url.startsWith("/api/") || url.startsWith(API_URL)
}

export const installFetchCredentials = () => {
  if (fetchCredentialsInstalled || typeof window === "undefined") {
    return
  }

  const originalFetch = window.fetch.bind(window)

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.credentials || !shouldAttachCredentials(input)) {
      return originalFetch(input, init)
    }

    return originalFetch(input, {
      ...init,
      credentials: "include",
    })
  }

  fetchCredentialsInstalled = true
}
