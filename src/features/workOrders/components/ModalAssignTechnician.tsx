import { useEffect, useState } from "react";
import styles from "../styles/Modal.module.css";
import { WorkOrder } from "../hooks/useWorkOrders";
import AssignTechnicianForm from "./AssignTechnicianForm";
import { useTranslation } from "react-i18next"

interface ModalAssignTechnicianProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmitSuccess: (message: string) => void;
  onAssign: (workOrderId: string, technicianId: string) => Promise<{ message: string }>;
  workOrder: WorkOrder | null;
  technicians: any[];
}

const ModalAssignTechnician = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onAssign,
  workOrder,
  technicians,
}: ModalAssignTechnicianProps) => {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (!isSubmitting) {
      onRequestClose();
    }
  };

  const handleAssign = async (technicianId: string) => {
    if (!workOrder?._id) {
      throw new Error(t('workOrders.invalidWorkOrder'))
    }
    
    setIsSubmitting(true);
    try {
      const result = await onAssign(workOrder._id, technicianId);
      return result;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !workOrder) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('workOrders.modals.assignTechnicianTitle')}</h2>
          <button 
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <AssignTechnicianForm
            onCancel={handleClose}
            onSuccess={onSubmitSuccess}
            onAssign={handleAssign}
            workOrder={workOrder}
            technicians={technicians}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};

export default ModalAssignTechnician;