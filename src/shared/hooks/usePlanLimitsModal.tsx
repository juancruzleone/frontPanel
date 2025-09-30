import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { detectPlanLimitError, createPlanLimitsModalProps, PlanLimitError } from '../utils/planLimitErrorHandler';
import { getCachedTenantPlanInfo, TenantPlanInfo } from '../services/tenantPlanService';

export const usePlanLimitsModal = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalProps, setModalProps] = useState<any>(null);
  const [tenantPlan, setTenantPlan] = useState<TenantPlanInfo | null>(null);

  const handleApiError = useCallback(async (error: Error): Promise<boolean> => {
    const limitError = detectPlanLimitError(error.message);
    
    if (!limitError?.isLimitError) {
      return false; // No es un error de límites
    }

    try {
      // Obtener información actualizada del plan del tenant
      const planInfo = await getCachedTenantPlanInfo(true);
      setTenantPlan(planInfo);
      
      // Crear props para el modal
      const props = createPlanLimitsModalProps(limitError, planInfo);
      setModalProps(props);
      setIsModalOpen(true);
      
      return true; // Es un error de límites y se manejó
    } catch (planError) {
      console.error('Error al obtener información del plan:', planError);
      
      // Fallback: mostrar modal con información básica
      const props = createPlanLimitsModalProps(limitError);
      setModalProps(props);
      setIsModalOpen(true);
      
      return true;
    }
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalProps(null);
  }, []);

  const handleUpgrade = useCallback(() => {
    // Redirigir a la página de planes
    window.location.href = '/plans';
  }, []);

  const shouldShowPlanLimitsModal = useCallback((error: Error): boolean => {
    const limitError = detectPlanLimitError(error.message);
    return limitError?.isLimitError || false;
  }, []);

  return {
    isModalOpen,
    modalProps: modalProps ? {
      ...modalProps,
      isOpen: isModalOpen,
      onClose: closeModal,
      onUpgrade: handleUpgrade,
    } : null,
    handleApiError,
    shouldShowPlanLimitsModal,
    tenantPlan,
  };
};
