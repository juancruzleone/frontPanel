import { useEffect } from "react";
import CategoryForm from "./CategoryForm";
import useCategories from "../hooks/useCategories";
import styles from "../styles/Modal.module.css";

interface ModalCreateCategoryProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmitSuccess: (message: string) => void;
  onCreate: (data: any) => Promise<{ message: string }>;
}

const ModalCreateCategory = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onCreate,
}: ModalCreateCategoryProps) => {
  const {
    formData,
    formErrors,
    handleFieldChange,
    handleSubmitForm,
    isSubmitting,
    resetForm,
    setFormErrors,
  } = useCategories();

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
          <h2 className={styles.title}>Crear Categoría</h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <CategoryForm
            onCancel={handleClose}
            onSuccess={onSubmitSuccess}
            onCreate={onCreate}
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

export default ModalCreateCategory;