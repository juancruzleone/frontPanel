// Types for the PlanLimitsModal component
export interface PlanLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  limits: {
    users: { current: number; max: number };
    internalUsers?: { current: number; max: number };
    clients?: { current: number; max: number };
    installations: { current: number; max: number };
    assets: { current: number; max: number };
    formTemplates: { current: number; max: number };
    workOrders: { current: number; max: number };
  };
  currentPlan: string;
  limitType: 'users' | 'internalUsers' | 'clients' | 'installations' | 'assets' | 'formTemplates' | 'workOrders';
}

export interface PlanLimitError {
  isLimitError: boolean;
  limitType?: 'users' | 'internalUsers' | 'clients' | 'installations' | 'assets' | 'formTemplates' | 'workOrders';
  currentCount?: number;
  maxLimit?: number;
  planName?: string;
}

/**
 * Detecta si un error de API es relacionado con límites de plan
 * @param errorMessage Mensaje de error de la API
 * @returns Información sobre el error de límite o null si no es un error de límite
 */
export const detectPlanLimitError = (errorMessage: string): PlanLimitError | null => {
  const message = errorMessage.toLowerCase();
  // Código machine-readable tiene precedencia (case-insensitive)
  if (message.includes('limit_internal_users_reached')) {
    const m = errorMessage.match(/\((\d+)\)/);
    return { isLimitError: true, limitType: 'internalUsers', maxLimit: m ? parseInt(m[1]) : undefined };
  }
  if (message.includes('limit_clients_reached') || message.includes('limit_clients')) {
    const m = errorMessage.match(/\((\d+)\)/);
    return { isLimitError: true, limitType: 'clients', maxLimit: m ? parseInt(m[1]) : undefined };
  }
  
  // Patrones para detectar diferentes tipos de límites (más específico primero)
  const limitPatterns = [
    { pattern: /l[ií]mite de usuarios internos alcanzado/i, type: 'internalUsers' as const },
    { pattern: /l[ií]mite de clientes alcanzado/i, type: 'clients' as const },
    { pattern: /l[ií]mite de users? alcanzado/i, type: 'users' as const },
    { pattern: /l[ií]mite de usuarios? alcanzado/i, type: 'users' as const },
    { pattern: /l[ií]mite de instalaciones? alcanzado/i, type: 'installations' as const },
    { pattern: /l[ií]mite de installations? alcanzado/i, type: 'installations' as const },
    { pattern: /l[ií]mite de activos? alcanzado/i, type: 'assets' as const },
    { pattern: /l[ií]mite de assets? alcanzado/i, type: 'assets' as const },
    { pattern: /l[ií]mite de plantillas? alcanzado/i, type: 'formTemplates' as const },
    { pattern: /l[ií]mite de form.?templates? alcanzado/i, type: 'formTemplates' as const },
    { pattern: /l[ií]mite de [oó]rdenes? alcanzado/i, type: 'workOrders' as const },
    { pattern: /l[ií]mite de work.?orders? alcanzado/i, type: 'workOrders' as const },
  ];

  for (const { pattern, type } of limitPatterns) {
    if (pattern.test(errorMessage)) {
      const countMatch = message.match(/(\d+)\/(\d+)/);
      const parenMatch = errorMessage.match(/\((\d+)\)/);
      const planMatch = message.match(/plan (\w+)/i);
      return {
        isLimitError: true,
        limitType: type,
        currentCount: countMatch ? parseInt(countMatch[1]) : undefined,
        maxLimit: countMatch ? parseInt(countMatch[2]) : parenMatch ? parseInt(parenMatch[1]) : undefined,
        planName: planMatch ? planMatch[1] : undefined,
      };
    }
  }

  return null;
};

/**
 * Convierte la información del error de límite en props para el modal
 * @param limitError Información del error de límite
 * @param tenantPlan Información del plan del tenant (opcional)
 * @returns Props para el PlanLimitsModal
 */
export const createPlanLimitsModalProps = (
  limitError: PlanLimitError,
  tenantPlan?: any
): Omit<PlanLimitsModalProps, 'isOpen' | 'onClose' | 'onUpgrade'> => {
  const { limitType, currentCount, maxLimit } = limitError;
  
  // Configuración por defecto basada en el tipo de límite
  const defaultLimits: Record<string, { current: number; max: number }> = {
    users: { current: currentCount || 0, max: maxLimit || 3 },
    internalUsers: { current: currentCount || 0, max: maxLimit || 3 },
    clients: { current: currentCount || 0, max: maxLimit || 2 },
    installations: { current: currentCount || 0, max: maxLimit || 2 },
    assets: { current: currentCount || 0, max: maxLimit || 6 },
    formTemplates: { current: currentCount || 0, max: maxLimit || 6 },
    workOrders: { current: currentCount || 0, max: maxLimit || 100 },
  };

  // Si tenemos información del plan del tenant, usarla
  const limits = tenantPlan?.limits || {
    users: defaultLimits.users,
    installations: defaultLimits.installations,
    assets: defaultLimits.assets,
    formTemplates: defaultLimits.formTemplates,
    workOrders: defaultLimits.workOrders,
  };

  // Actualizar el límite específico que causó el error
  if (limitType && defaultLimits[limitType]) {
    limits[limitType] = {
      current: currentCount || limits[limitType]?.current || 0,
      max: maxLimit || limits[limitType]?.max || defaultLimits[limitType].max,
    };
  }

  return {
    limits,
    currentPlan: tenantPlan?.planName || limitError.planName || 'starter',
    limitType: limitType || 'users',
  };
};

/**
 * Hook personalizado para manejar errores de límites de plan
 * @returns Funciones para detectar y manejar errores de límites
 */
export const usePlanLimitErrorHandler = () => {
  const handleApiError = (error: Error): PlanLimitError | null => {
    return detectPlanLimitError(error.message);
  };

  const shouldShowPlanLimitsModal = (error: Error): boolean => {
    const limitError = detectPlanLimitError(error.message);
    return limitError?.isLimitError || false;
  };

  return {
    handleApiError,
    shouldShowPlanLimitsModal,
    detectPlanLimitError,
    createPlanLimitsModalProps,
  };
};
