export type AdministrativeTrialPlan = "starter" | "professional" | "enterprise"

export interface AdministrativeTrialRequest {
  companyName: string
  email: string
  password: string
  userName?: string
  plan: AdministrativeTrialPlan
  firstName?: string
  lastName?: string
  phone?: string
  address?: string
  notes?: string
}

export interface AdministrativeTrialResponse {
  success: true
  message: string
  tenant: { tenantId: string; name: string; subdomain: string; plan: AdministrativeTrialPlan }
  user: { userName: string; email: string; role: "admin" }
  administrativeTrial: { id: string; status: string; plan: AdministrativeTrialPlan; startsAt: string; endsAt: string }
}
