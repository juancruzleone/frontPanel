import { useEffect, useState } from "react";
import styles from "../styles/Modal.module.css";
import { WorkOrder } from "../hooks/useWorkOrders";

interface ModalCompleteWorkOrderProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmitSuccess: (message: string) => void;
  onComplete: (workOrderId: string, completionData: any) => Promise<{ message: string }>;
  workOrder: WorkOrder | null;
}

const ModalCompleteWorkOrder = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onComplete,
  workOrder,
}: ModalCompleteWorkOrderProps) => {
  const [completionData, setCompletionData] = useState({
    trabajoRealizado: "",
    observaciones: "",
    tiempoTrabajo: 1,
    materialesUtilizados: [],
    estadoDispositivo: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setCompletionData({
      trabajoRealizado: "",
      observaciones: "",
      tiempoTrabajo: 1,
      materialesUtilizados: [],
      estadoDispositivo: "",
    });
    setError("");
    onRequestClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCompletionData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workOrder?._id) return;

    if (!completionData.trabajoRealizado || !completionData.observaciones) {
      setError("Los campos de trabajo realizado y observaciones son obligatorios");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onComplete(workOrder._id, completionData);
      onSubmitSuccess(result.message);
      handleClose();
    } catch (err: any) {
      console.error("Error al completar orden:", err);
      setError(err.message || "Error al completar orden de trabajo");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen && workOrder) {
      setCompletionData({
        trabajoRealizado: "",
        observaciones: "",
        tiempoTrabajo: 1,
        materialesUtilizados: [],
        estadoDispositivo: workOrder.dispositivo?.estado || "Activo",
      });
      setError("");
    }
  }, [isOpen, workOrder]);

  if (!isOpen || !workOrder) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Completar Orden de Trabajo</h2>
          <button 
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formInner}>
              <div className={styles.formGroup}>
                <label>Orden de Trabajo</label>
                <p>{workOrder.titulo}</p>
              </div>

              {workOrder.dispositivo && (
                <div className={styles.formGroup}>
                  <label>Dispositivo</label>
                  <p>{workOrder.dispositivo.nombre} - {workOrder.dispositivo.ubicacion}</p>
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Trabajo Realizado</label>
                <textarea
                  name="trabajoRealizado"
                  value={completionData.trabajoRealizado}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  rows={4}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Observaciones</label>
                <textarea
                  name="observaciones"
                  value={completionData.observaciones}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  rows={3}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Tiempo de Trabajo (horas)</label>
                  <input
                    type="number"
                    name="tiempoTrabajo"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={completionData.tiempoTrabajo}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                {workOrder.dispositivo && (
                  <div className={styles.formGroup}>
                    <label>Estado del Dispositivo</label>
                    <select
                      name="estadoDispositivo"
                      value={completionData.estadoDispositivo}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                      <option value="En mantenimiento">En mantenimiento</option>
                      <option value="Fuera de servicio">Fuera de servicio</option>
                      <option value="Pendiente de revisión">Pendiente de revisión</option>
                    </select>
                  </div>
                )}
              </div>

              {error && <p className={styles.inputError}>{error}</p>}

              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className={styles.cancelButton}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={styles.submitButton}
                >
                  {isSubmitting ? 'Completando...' : 'Completar Orden'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ModalCompleteWorkOrder;