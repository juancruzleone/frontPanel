import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import ManualForm from "../../../../src/features/manuals/components/ManualForm";
import useManuals from "../../../../src/features/manuals/hooks/useManuals";
import styles from "../styles/Modal.module.css";

interface ModalCreateProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmitSuccess: (message: string) => void;
  onSubmitError: (message: string) => void;
  onAdd: (data: any) => Promise<{ message: string }>;
}

const ModalCreate = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onSubmitError,
  onAdd,
}: ModalCreateProps) => {
  const { t } = useTranslation();
  const {
    formData,
    formErrors,
    handleFieldChange,
    handleSubmitForm,
    isSubmitting,
    resetForm,
    setFormErrors,
    assets,
    loadingAssets,
    errorLoadingAssets,
    loadAssets,
  } = useManuals();

  const handleClose = () => {
    resetForm();
    onRequestClose();
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
      setFormErrors({});
    }
  }, [isOpen, resetForm, setFormErrors]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('manuals.createManual')}</h2>
          <button 
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <ManualForm
            onCancel={handleClose}
            onSuccess={onSubmitSuccess}
            onError={onSubmitError}
            onAdd={onAdd}
            isEditMode={false}
            formData={formData}
            formErrors={formErrors}
            handleFieldChange={handleFieldChange}
            handleSubmitForm={handleSubmitForm}
            isSubmitting={isSubmitting}
            assets={assets}
            loadingAssets={loadingAssets}
            errorLoadingAssets={errorLoadingAssets}
            onRetryLoadAssets={loadAssets}
          />
        </div>
      </div>
    </div>
  );
};

export default ModalCreate;