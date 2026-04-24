import { useEffect } from "react";
import WorkOrderForm from "./WorkOrderForm";
import styles from "../styles/Modal.module.css";
import useWorkOrders from "../hooks/useWorkOrders";
import { WorkOrder } from "../hooks/useWorkOrders";
import { useTranslation } from "react-i18next";

interface ModalCreateProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmitSuccess: (message: string) => void;
  onSubmitError: (message: string) => void;
  onAdd: (data: WorkOrder) => Promise<{ message: string }>;
  installations: { _id: string; company: string; address: string; city?: string }[];
  technicians: { _id: string; userName: string; role: string }[];
  loadingInstallations: boolean;
  errorLoadingInstallations: string | null;
}

const ModalCreate = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onSubmitError,
  onAdd,
  installations,
  technicians,
  loadingInstallations,
  errorLoadingInstallations,
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
  } = useWorkOrders();

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
          <h2 className={styles.title}>{t('workOrders.createWorkOrder')}</h2>
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
            onError={onSubmitError}
            onAdd={onAdd}
            isEditMode={false}
            formData={formData}
            formErrors={formErrors}
            handleFieldChange={handleFieldChange}
            handleSubmitForm={handleSubmitForm}
            isSubmitting={isSubmitting}
            installations={installations}
            technicians={technicians}
            loadingInstallations={loadingInstallations}
            errorLoadingInstallations={errorLoadingInstallations}
            setFormErrors={setFormErrors}
          />
        </div>
      </div>
    </div>
  );
};

export default ModalCreate;
