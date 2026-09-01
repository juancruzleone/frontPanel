import type { BillingTenantSummary, TrialSummary } from "@/store/authStore"

export type BillingCycle = "monthly" | "yearly"
export type CheckoutStatus = "pending" | "paid" | "failed" | "cancelled"

export interface AvailablePlan {
  planId: "starter" | "professional" | "enterprise"
  name: string
  monthlyPrice: number
  yearlyPrice: number
}

export interface BillingStatus {
  accessMode: "full" | "billing_only" | "denied"
  tenant: BillingTenantSummary
  trial: TrialSummary | null
  subscription: {
    id: string
    status: string
    planId: string
    billingCycle: BillingCycle
    provider: string
    expiresAt: string | null
  } | null
  availablePlans: AvailablePlan[]
}

export interface CheckoutRequest {
  planId: AvailablePlan["planId"]
  billingCycle: BillingCycle
}

export interface CheckoutIntent {
  checkoutIntentId: string
  checkoutUrl: string
  provider: string
  status: "pending"
}

export interface CheckoutStatusResponse {
  checkoutIntentId: string
  status: CheckoutStatus
  accessMode: "full" | "billing_only" | "denied"
}
