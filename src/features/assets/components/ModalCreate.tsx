import { useEffect } from "react";
import AssetForm from "../../../../src/features/assets/components/AssetForm";
import useAssets from "../../../../src/features/assets/hooks/useAssets";
import styles from "../styles/Modal.module.css";

interface ModalCreateProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmitSuccess: (message: string) => void;
  onAdd: (data: Asset) => Promise<{ message: string }>;
}

const ModalCreate = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onAdd,
}: ModalCreateProps) => {
  const {
    formData,
    formErrors,
    handleFieldChange,
    handleSubmitForm,
    isSubmitting,
    resetForm,
    setFormErrors,
  } = useAssets();

  const handleClose = () => {
    resetForm();
    onRequestClose();
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
      setFormErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Crear Activo</h2>
          <button 
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <AssetForm
            onCancel={handleClose}
            onSuccess={onSubmitSuccess}
            onAdd={onAdd}
            isEditMode={false}
            formData={formData}
            formErrors={formErrors}
            handleFieldChange={handleFieldChange}
            handleSubmitForm={handleSubmitForm}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};

export default ModalCreate;