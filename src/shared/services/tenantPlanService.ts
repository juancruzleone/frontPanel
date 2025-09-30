import { getAuthHeaders } from '../utils/apiHeaders';

const API_URL = import.meta.env.VITE_API_URL;

export interface TenantPlanInfo {
  planName: string;
  planId: string;
  limits: {
    users: { current: number; max: number };
    installations: { current: number; max: number };
    assets: { current: number; max: number };
    formTemplates: { current: number; max: number };
    workOrders: { current: number; max: number };
  };
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
  
  // Mapear la respuesta del backend al formato esperado
  return {
    planName: data.plan?.name || 'starter',
    planId: data.plan?.id || 'starter',
    limits: {
      users: {
        current: data.stats?.usersCount || 0,
        max: data.plan?.limits?.users || 3,
      },
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
