import { getAuthHeaders } from '../utils/apiHeaders';

const API_URL = import.meta.env.VITE_API_URL || "/api/";

export interface BucketStat { current: number; max: number; percentage?: number }
export interface TenantPlanInfo {
  planName: string;
  planId: string;
  limits: {
    users: { current: number; max: number };
    internalUsers?: BucketStat;
    clients?: BucketStat;
    installations: { current: number; max: number };
    assets: { current: number; max: number };
    formTemplates: { current: number; max: number };
    workOrders: { current: number; max: number };
  };
  warnings?: string[];
  subscriptionStatus: string;
  subscriptionExpiresAt?: string;
}

/**
 * Obtiene la información del plan del tenant actual
 * @returns Información del plan del tenant
 */
export const getTenantPlanInfo = async (): Promise<TenantPlanInfo> => {
  const headers = getAuthHeaders();
  
  const response = await fetch(`${API_URL}tenants/plan-info`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Error al obtener información del plan');
  }

  const data = await response.json();
  const toStat = (s: any, fallback: number) => s ? { current: s.current ?? 0, max: s.max ?? fallback, percentage: s.percentage ?? (s.max ? Math.round((s.current / s.max) * 100) : 0) } : undefined;
  // Mapear la respuesta del backend al formato esperado (soporta split buckets)
  return {
    planName: data.plan?.name || data.plan?.id || 'starter',
    planId: data.plan?.id || data.plan?.name || 'starter',
    limits: {
      users: {
        current: data.stats?.usersCount ?? data.limits?.total?.current ?? 0,
        max: data.plan?.limits?.users ?? data.limits?.total?.max ?? data.maxUsers ?? 3,
      },
      ...(data.limits?.internalUsers ? { internalUsers: toStat(data.limits.internalUsers, 3) } : data.plan?.limits?.internalUsers ? { internalUsers: { current: data.stats?.internalUsersCount ?? 0, max: data.plan.limits.internalUsers } } : {}),
      ...(data.limits?.clients ? { clients: toStat(data.limits.clients, 2) } : data.plan?.limits?.clients ? { clients: { current: data.stats?.clientsCount ?? 0, max: data.plan.limits.clients } } : {}),
      installations: {
        current: data.stats?.installationsCount || 0,
        max: data.plan?.limits?.installations || 2,
      },
      assets: {
        current: data.stats?.assetsCount || 0,
        max: data.plan?.limits?.assets || 6,
      },
      formTemplates: {
        current: data.stats?.formTemplatesCount || 0,
        max: data.plan?.limits?.formTemplates || 6,
      },
      workOrders: {
        current: data.stats?.workOrdersCount || 0,
        max: data.plan?.limits?.workOrders || 100,
      },
    },
    warnings: data.warnings || [],
    subscriptionStatus: data.subscriptionStatus || 'active',
    subscriptionExpiresAt: data.subscriptionExpiresAt,
  };
};

/**
 * Cache simple para la información del plan del tenant
 */
let cachedPlanInfo: TenantPlanInfo | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene la información del plan del tenant con cache
 * @param forceRefresh Forzar actualización del cache
 * @returns Información del plan del tenant
 */
export const getCachedTenantPlanInfo = async (forceRefresh = false): Promise<TenantPlanInfo> => {
  const now = Date.now();
  
  if (!forceRefresh && cachedPlanInfo && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedPlanInfo;
  }
  
  try {
    cachedPlanInfo = await getTenantPlanInfo();
    cacheTimestamp = now;
    return cachedPlanInfo;
  } catch (error) {
    // Si falla, devolver cache anterior si existe
    if (cachedPlanInfo) {
      return cachedPlanInfo;
    }
    throw error;
  }
};

/**
 * Limpia el cache de información del plan
 */
export const clearTenantPlanCache = (): void => {
  cachedPlanInfo = null;
  cacheTimestamp = 0;
};
