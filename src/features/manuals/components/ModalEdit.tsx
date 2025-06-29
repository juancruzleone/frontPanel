import { useEffect } from "react";
import ManualForm from "../../../../src/features/manuals/components/ManualForm";
import useManuals from "../../../../src/features/manuals/hooks/useManuals";
import { Manual } from "../hooks/useManuals";
import styles from "../styles/Modal.module.css";

interface ModalEditProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmitSuccess: (message: string) => void;
  onEdit: (id: string, data: Manual) => Promise<{ message: string }>;
  initialData: Manual | null;
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
  } = useManuals();

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
  }, [isOpen, initialData, setFormValues, setFormErrors]);

  if (!isOpen || !initialData) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Editar Manual</h2>
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