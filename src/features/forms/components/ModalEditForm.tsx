import { useEffect } from "react";
import FormTemplateForm from "./formTemplateForm";
import styles from "../styles/Modal.module.css";
import { FormTemplate } from "../hooks/useForms";

interface ModalEditFormProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmitSuccess: (message: string) => void;
  onEdit: (id: string, data: FormTemplate) => Promise<FormTemplate>;
  initialData: FormTemplate | null;
  categories: string[];
}

const ModalEditForm = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onEdit,
  initialData,
  categories,
}: ModalEditFormProps) => {
  if (!isOpen || !initialData) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Editar Plantilla</h2>
          <button 
            className={styles.closeButton}
            onClick={onRequestClose}
          >
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <FormTemplateForm
            onCancel={onRequestClose}
            onSuccess={onSubmitSuccess}
            onSubmit={onEdit}
            isEditMode={true}
            initialData={initialData}
            categories={categories}
          />
        </div>
      </div>
    </div>
  );
};

export default ModalEditForm;