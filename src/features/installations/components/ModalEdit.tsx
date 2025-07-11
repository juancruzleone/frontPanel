import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import InstallationForm from "../../../../src/features/installations/components/InstallationForm";
import useInstallations from "../../../../src/features/installations/hooks/useInstallations";
import { Installation } from "../hooks/useInstallations";
import styles from "../styles/Modal.module.css";

interface ModalEditProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmitSuccess: (message: string) => void;
  onEdit: (id: string, data: Installation) => Promise<{ message: string }>;
  initialData: Installation | null;
}

const ModalEdit = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onEdit,
  initialData,
}: ModalEditProps) => {
  const { t } = useTranslation();
  const {
    formData,
    formErrors,
    handleFieldChange,
    handleSubmitForm,
    isSubmitting,
    resetForm,
    setFormValues,
    setFormErrors,
  } = useInstallations();

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
          <h2 className={styles.title}>{t('installations.editInstallation')}</h2>
          <button 
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <InstallationForm
            onCancel={handleClose}
            onSuccess={onSubmitSuccess}
            onError={() => {}}
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