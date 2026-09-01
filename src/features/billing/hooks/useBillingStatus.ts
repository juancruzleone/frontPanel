import { useCallback, useEffect, useState } from "react"
import { getBillingStatus, promoteBillingSession } from "../services/billingService"
import type { BillingStatus } from "../types/billing.types"
import { useAuthStore } from "@/store/authStore"
import { useCSRFStore } from "@/store/csrfStore"

export const useBillingStatus = () => {
  const [data, setData] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const setBillingContext = useAuthStore((state) => state.setBillingContext)
  const hydrateSession = useAuthStore((state) => state.hydrateSession)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const status = await getBillingStatus()
      const authState = useAuthStore.getState()
      if (status.accessMode === "full" && !authState.isAuthenticated) {
        const promotedSession = await promoteBillingSession()
        hydrateSession(promotedSession)
        if (promotedSession.csrfToken) {
          useCSRFStore.setState({ token: promotedSession.csrfToken, error: null })
        }
      } else {
        setBillingContext({ accessMode: status.accessMode, tenant: status.tenant, trial: status.trial })
      }
      setData(status)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "billing.errors.status")
    } finally {
      setLoading(false)
    }
  }, [hydrateSession, setBillingContext])

  useEffect(() => { void load() }, [load])

  return { data, loading, error, retry: load }
}
