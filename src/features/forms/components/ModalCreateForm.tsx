import { useEffect } from "react";
import FormTemplateForm from "./formTemplateForm";
import useForms from "../hooks/useForms";
import styles from "../styles/Modal.module.css";
import { FormTemplate } from "../hooks/useForms";

interface ModalCreateFormProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmitSuccess: (message: string) => void;
  onAdd: (data: FormTemplate) => Promise<FormTemplate>;
  categories: string[];
}

const ModalCreateForm = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onAdd,
  categories,
}: ModalCreateFormProps) => {
  const { currentTemplate, resetCurrentTemplate, setCurrentTemplate } = useForms();

  const handleClose = () => {
    resetCurrentTemplate();
    onRequestClose();
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentTemplate({
        nombre: "",
        categoria: "",
        campos: [],
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Crear Plantilla</h2>
          <button 
            className={styles.closeButton}
            onClick={handleClose}
          >
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <FormTemplateForm
            onCancel={handleClose}
            onSuccess={onSubmitSuccess}
            onSubmit={onAdd}
            isEditMode={false}
            initialData={currentTemplate}
            categories={categories}
          />
        </div>
      </div>
    </div>
  );
};

export default ModalCreateForm;