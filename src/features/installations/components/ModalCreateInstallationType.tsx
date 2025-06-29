import { useEffect } from "react";
import InstallationTypeForm from "./InstallationTypeForms";
import useInstallationTypes from "../hooks/useInstallationTypes";
import styles from "../styles/Modal.module.css";

interface ModalCreateInstallationTypeProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmitSuccess: (message: string) => void;
  onCreate: (data: any) => Promise<{ message: string }>;
}

const ModalCreateInstallationType = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onCreate,
}: ModalCreateInstallationTypeProps) => {
  const {
    formData,
    formErrors,
    handleFieldChange,
    handleSubmitForm,
    isSubmitting,
    resetForm,
    setFormErrors,
  } = useInstallationTypes();

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
          <h2 className={styles.title}>Crear Tipo de Instalación</h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <InstallationTypeForm
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

export default ModalCreateInstallationType;