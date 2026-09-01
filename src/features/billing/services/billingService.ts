import { fetchWithAuthRetry, getApiHeaders } from "@/shared/utils/apiHeaders"
import { parseJsonResponse, throwApiError } from "@/shared/services/ApiError"
import type { LoginResponse } from "@/store/authStore"
import type { BillingStatus, CheckoutIntent, CheckoutRequest, CheckoutStatusResponse } from "../types/billing.types"

const API_URL = import.meta.env.VITE_API_URL || "/api/"
const CHECKOUT_STORAGE_KEY = "billing-checkout-intent"
let promotionPromise: Promise<LoginResponse> | null = null

interface DataResponse<T> {
  success: true
  data: T
}

const requestData = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetchWithAuthRetry(`${API_URL}billing/${path}`, options)
  if (!response.ok) return throwApiError(response, "No se pudo completar la solicitud de facturación")
  const payload = await parseJsonResponse<DataResponse<T>>(response)
  if (!payload?.success) throw new Error("La respuesta de facturación no es válida")
  return payload.data
}

export const getBillingStatus = (): Promise<BillingStatus> => requestData<BillingStatus>("status")

export const createCheckout = (request: CheckoutRequest): Promise<CheckoutIntent> => requestData<CheckoutIntent>("checkout", {
  method: "POST",
  headers: getApiHeaders(true, "POST"),
  body: JSON.stringify({ planId: request.planId, billingCycle: request.billingCycle }),
})

export const getCheckoutStatus = (checkoutIntentId: string): Promise<CheckoutStatusResponse> => (
  requestData<CheckoutStatusResponse>(`checkouts/${encodeURIComponent(checkoutIntentId)}`)
)

const requestBillingSessionPromotion = async (): Promise<LoginResponse> => {
  const response = await fetchWithAuthRetry(`${API_URL}billing/session/promote`, {
    method: "POST",
    headers: getApiHeaders(false, "POST"),
  })
  if (!response.ok) return throwApiError(response, "No se pudo habilitar el acceso completo")
  const payload = await parseJsonResponse<LoginResponse>(response)
  if (!payload?.authenticated || payload.accessMode !== "full" || !payload.user) {
    throw new Error("La promoción de la sesión devolvió una respuesta inválida")
  }
  return payload
}

export const promoteBillingSession = (): Promise<LoginResponse> => {
  if (!promotionPromise) {
    promotionPromise = requestBillingSessionPromotion().finally(() => {
      promotionPromise = null
    })
  }
  return promotionPromise
}

export const saveCheckoutIntentId = (checkoutIntentId: string): void => {
  sessionStorage.setItem(CHECKOUT_STORAGE_KEY, checkoutIntentId)
}

export const readCheckoutIntentId = (): string | null => {
  const value = sessionStorage.getItem(CHECKOUT_STORAGE_KEY)
  return value && /^[a-zA-Z0-9-]{8,128}$/.test(value) ? value : null
}

export const clearCheckoutIntentId = (): void => sessionStorage.removeItem(CHECKOUT_STORAGE_KEY)

export const navigateToCheckout = (
  checkoutUrl: string,
  assign: (target: string) => void = (target) => window.location.assign(target),
): void => {
  const url = new URL(checkoutUrl)
  if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) {
    throw new Error("La URL de pago no es segura")
  }
  assign(url.toString())
}
