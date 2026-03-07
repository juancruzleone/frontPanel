import { useEffect, useState } from "react";
import styles from "../styles/Modal.module.css";
import { WorkOrder } from "../hooks/useWorkOrders";
import AssignTechnicianForm from "./AssignTechnicianForm";
import { useTranslation } from "react-i18next"

interface ModalAssignTechnicianProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmitSuccess: (message: string) => void;
  onAssign: (workOrderId: string, technicianIds: string[]) => Promise<{ message: string }>;
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

  const handleAssign = async (technicianIds: string[]) => {
    if (!workOrder?._id) {
      throw new Error(t('workOrders.invalidWorkOrder'))
    }
    
    setIsSubmitting(true);
    try {
      const result = await onAssign(workOrder._id, technicianIds);
      return result;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !workOrder) return null;

  const initialSelectedTechnicians = Array.from(
    new Set(
      [
        ...(Array.isArray(workOrder.tecnicosAsignados) ? workOrder.tecnicosAsignados : []),
        ...(Array.isArray(workOrder.tecnicosIds) ? workOrder.tecnicosIds : []),
        workOrder.tecnicoAsignado,
      ]
        .filter(Boolean)
        .map((id) => String(id))
    )
  );

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
            initialSelectedTechnicians={initialSelectedTechnicians}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};

export default ModalAssignTechnician;
