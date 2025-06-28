import { useEffect } from "react";
import AssetForm from "../../../../src/features/assets/components/AssetForm";
import useAssets from "../../../../src/features/assets/hooks/useAssets";
import { Asset } from "../hooks/useAssets";
import styles from "../styles/Modal.module.css";

interface ModalEditProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmitSuccess: (message: string) => void;
  onEdit: (id: string, data: Asset) => Promise<{ message: string }>;
  initialData: Asset | null;
}

const ModalEdit = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onEdit,
  initialData,
}: ModalEditProps) => {
  const {
    formData,
    formErrors,
    handleFieldChange,
    handleSubmitForm,
    isSubmitting,
    resetForm,
    setFormValues,
    setFormErrors,
  } = useAssets();

  const handleClose = () => {
    resetForm();
    onRequestClose();
  };

  useEffect(() => {
    if (isOpen && initialData) {
      const { _id, ...rest } = initialData;
      setFormValues(rest);
      setFormErrors({});
    }
  }, [isOpen, initialData]);

  if (!isOpen || !initialData) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Editar Activo</h2>
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
            onEdit={onEdit}
            isEditMode={true}
            initialData={initialData}
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

export default ModalEdit;