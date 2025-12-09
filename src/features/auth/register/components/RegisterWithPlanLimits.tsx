import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../../store/authStore';
import { userRegister } from '../services/registerServices';
import { usePlanLimitsModal } from '../../../../shared/hooks/usePlanLimitsModal';
import PlanLimitsModal from '../../../../shared/components/PlanLimitsModal/PlanLimitsModal';
import ModalError from '../../../subscriptions/components/ModalError';
import styles from '../styles/Register.module.css';

interface RegisterWithPlanLimitsProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const RegisterWithPlanLimits: React.FC<RegisterWithPlanLimitsProps> = ({
  onSuccess,
  onCancel
}) => {
  const { t } = useTranslation();
  const { token } = useAuthStore();
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showGeneralError, setShowGeneralError] = useState(false);
  
  // Hook para manejar errores de límites de plan
  const { 
    isModalOpen, 
    modalProps, 
    handleApiError, 
    shouldShowPlanLimitsModal 
  } = usePlanLimitsModal();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.username.trim()) {
      setGeneralError(t('validation.usernameRequired'));
      setShowGeneralError(true);
      return false;
    }

    if (!formData.fullName.trim()) {
      setGeneralError(t('validation.fullNameRequired', { defaultValue: 'El nombre completo es requerido' }));
      setShowGeneralError(true);
      return false;
    }

    if (!formData.password) {
      setGeneralError(t('validation.passwordRequired'));
      setShowGeneralError(true);
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setGeneralError(t('validation.passwordsDoNotMatch'));
      setShowGeneralError(true);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setGeneralError(null);
    setShowGeneralError(false);

    try {
      await userRegister(formData.username, formData.password, formData.fullName, token || '');
      
      // Éxito: limpiar formulario y ejecutar callback
      setFormData({
        username: '',
        fullName: '',
        password: '',
        confirmPassword: ''
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error al registrar técnico:', error);
      
      // Verificar si es un error de límites de plan
      const isLimitError = await handleApiError(error as Error);
      
      if (!isLimitError) {
        // Si no es un error de límites, mostrar error general
        setGeneralError((error as Error).message);
        setShowGeneralError(true);
      }
      // Si es un error de límites, el modal se mostrará automáticamente
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseGeneralError = () => {
    setShowGeneralError(false);
    setGeneralError(null);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className={styles.registerForm}>
        <div className={styles.formGroup}>
          <label htmlFor="username" className={styles.label}>
            {t('auth.username')}
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            className={styles.input}
            placeholder={t('auth.usernamePlaceholder')}
            disabled={isLoading}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="fullName" className={styles.label}>
            {t('auth.fullName', { defaultValue: 'Nombre Completo' })}
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            className={styles.input}
            placeholder={t('auth.fullNamePlaceholder', { defaultValue: 'Ingrese el nombre completo' })}
            disabled={isLoading}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>
            {t('auth.password')}
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={styles.input}
            placeholder={t('auth.passwordPlaceholder')}
            disabled={isLoading}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword" className={styles.label}>
            {t('auth.confirmPassword')}
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className={styles.input}
            placeholder={t('auth.confirmPasswordPlaceholder')}
            disabled={isLoading}
            required
          />
        </div>

        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? t('common.loading') : t('auth.createTechnician')}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </button>
          )}
        </div>
      </form>

      {/* Modal de error general */}
      <ModalError
        isOpen={showGeneralError}
        onRequestClose={handleCloseGeneralError}
        mensaje={generalError || ''}
      />

      {/* Modal de límites de plan */}
      {modalProps && (
        <PlanLimitsModal {...modalProps} />
      )}
    </>
  );
};

export default RegisterWithPlanLimits;
