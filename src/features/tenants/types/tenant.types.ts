export interface Tenant {
  _id: string
  tenantId: string
  name: string
  subdomain: string
  email: string
  phone?: string
  address?: string
  plan: 'basic' | 'professional' | 'enterprise'
  maxUsers: number
  maxAssets: number
  features: {
    workOrders: boolean
    assets: boolean
    reports: boolean
    pdfGeneration: boolean
    apiAccess: boolean
    customBranding: boolean
    prioritySupport: boolean
    advancedAnalytics?: boolean
    integrations?: boolean
    whiteLabel?: boolean
    dedicatedSupport?: boolean
  }
  status: 'active' | 'suspended' | 'cancelled'
  createdAt: string
  createdBy?: string
  updatedAt: string
  updatedBy?: string
  deletedAt?: string
  deletedBy?: string
  stats: {
    totalUsers: number
    totalAssets: number
    totalWorkOrders: number
    lastActivity: string
  }
}

export interface CreateTenantData {
  name: string
  subdomain: string
  email: string
  phone?: string
  address?: string
  plan?: 'basic' | 'professional' | 'enterprise'
  maxUsers?: number
  maxAssets?: number
  features?: Partial<Tenant['features']>
}

export interface EditTenantData extends Partial<CreateTenantData> {
  _id: string
  status?: 'active' | 'suspended' | 'cancelled'
}

export interface TenantsResponse {
  message: string
  count: number
  tenants: Tenant[]
} 