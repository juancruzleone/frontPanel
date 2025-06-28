import { useEffect } from "react";
import WorkOrderForm from "./WorkOrderForm";
import styles from "../styles/Modal.module.css";
import useWorkOrders from "../hooks/useWorkOrders";

interface ModalEditProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmitSuccess: (message: string) => void;
  onEdit: (id: string, data: WorkOrder) => Promise<{ message: string }>;
  initialData: WorkOrder | null;
  installations: any[];
  loadingInstallations: boolean;
  errorLoadingInstallations: string | null;
}

const ModalEdit = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onEdit,
  initialData,
  installations,
  loadingInstallations,
  errorLoadingInstallations,
}: ModalEditProps) => {
  const {
    formData,
    formErrors,
    handleFieldChange,
    handleSubmitForm,
    isSubmitting,
    resetForm,
    setFormErrors,
    setFormValues,
  } = useWorkOrders();

  const handleClose = () => {
    resetForm();
    onRequestClose();
  };

  useEffect(() => {
    if (isOpen && initialData) {
      setFormValues(initialData);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Editar Orden de Trabajo</h2>
          <button 
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <WorkOrderForm
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
            installations={installations}
            loadingInstallations={loadingInstallations}
            errorLoadingInstallations={errorLoadingInstallations}
          />
        </div>
      </div>
    </div>
  );
};

export default ModalEdit;