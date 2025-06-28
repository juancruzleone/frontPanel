import { useState } from "react";
import { WorkOrder } from '../hooks/useWorkOrders';
import styles from '../styles/workOrderForm.module.css';

interface WorkOrderFormProps {
  onCancel: () => void;
  onSuccess: (message: string) => void;
  onAdd?: (data: WorkOrder) => Promise<{ message: string }>;
  onEdit?: (id: string, data: WorkOrder) => Promise<{ message: string }>;
  isEditMode?: boolean;
  initialData?: WorkOrder | null;
  formData: WorkOrder;
  formErrors: Record<string, string>;
  handleFieldChange: (name: string, value: string) => void;
  handleSubmitForm: (
    e: React.FormEvent,
    isEditMode: boolean,
    initialData: WorkOrder | null,
    onSuccess: (message: string) => void,
    onAdd?: (data: WorkOrder) => Promise<{ message: string }>,
    onEdit?: (id: string, data: WorkOrder) => Promise<{ message: string }>
  ) => void;
  isSubmitting: boolean;
  installations?: any[];
  loadingInstallations?: boolean;
  errorLoadingInstallations?: string | null;
}

const WorkOrderForm = ({
  onCancel,
  onSuccess,
  onAdd,
  onEdit,
  isEditMode = false,
  initialData,
  formData,
  formErrors,
  handleFieldChange,
  handleSubmitForm,
  isSubmitting,
  installations = [],
  loadingInstallations = false,
  errorLoadingInstallations = null,
}: WorkOrderFormProps) => {
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const workTypes = [
    { value: "mantenimiento", label: "Mantenimiento" },
    { value: "reparacion", label: "Reparación" },
    { value: "instalacion", label: "Instalación" },
    { value: "inspeccion", label: "Inspección" },
    { value: "otro", label: "Otro" },
  ];

  const priorities = [
    { value: "baja", label: "Baja" },
    { value: "media", label: "Media" },
    { value: "alta", label: "Alta" },
    { value: "critica", label: "Crítica" },
  ];

  const handleFieldBlur = (fieldName: string) => {
    if (!touchedFields[fieldName]) {
      setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    }
  };

  const showError = (fieldName: string) => touchedFields[fieldName] && formErrors[fieldName];

  return (
    <form
      onSubmit={(e) =>
        handleSubmitForm(e, isEditMode, initialData || null, onSuccess, onAdd, onEdit)
      }
      className={styles.form}
    >
      <div className={styles.formInner}>
        <div className={styles.formGroup}>
          <label>Título</label>
          <input
            type="text"
            name="titulo"
            value={formData.titulo || ''}
            onChange={(e) => handleFieldChange('titulo', e.target.value)}
            onBlur={() => handleFieldBlur('titulo')}
            disabled={isSubmitting}
            className={showError('titulo') ? styles.errorInput : ''}
          />
          {showError('titulo') && (
            <p className={styles.inputError}>{formErrors['titulo']}</p>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>Descripción</label>
          <textarea
            name="descripcion"
            value={formData.descripcion || ''}
            onChange={(e) => handleFieldChange('descripcion', e.target.value)}
            onBlur={() => handleFieldBlur('descripcion')}
            disabled={isSubmitting}
            className={showError('descripcion') ? styles.errorInput : ''}
            rows={4}
          />
          {showError('descripcion') && (
            <p className={styles.inputError}>{formErrors['descripcion']}</p>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>Instalación</label>
          {loadingInstallations ? (
            <p>Cargando instalaciones...</p>
          ) : errorLoadingInstallations ? (
            <p className={styles.inputError}>{errorLoadingInstallations}</p>
          ) : (
            <select
              name="instalacionId"
              value={formData.instalacionId || ''}
              onChange={(e) => handleFieldChange('instalacionId', e.target.value)}
              onBlur={() => handleFieldBlur('instalacionId')}
              disabled={isSubmitting}
              className={showError('instalacionId') ? styles.errorInput : ''}
            >
              <option value="">Seleccione una instalación</option>
              {installations.map((inst) => (
                <option key={inst._id} value={inst._id}>
                  {inst.company} - {inst.address} {inst.city ? `(${inst.city})` : ''}
                </option>
              ))}
            </select>
          )}
          {showError('instalacionId') && (
            <p className={styles.inputError}>{formErrors['instalacionId']}</p>
          )}
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Tipo de trabajo</label>
            <select
              name="tipoTrabajo"
              value={formData.tipoTrabajo || ''}
              onChange={(e) => handleFieldChange('tipoTrabajo', e.target.value)}
              onBlur={() => handleFieldBlur('tipoTrabajo')}
              disabled={isSubmitting}
              className={showError('tipoTrabajo') ? styles.errorInput : ''}
            >
              {workTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {showError('tipoTrabajo') && (
              <p className={styles.inputError}>{formErrors['tipoTrabajo']}</p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Prioridad</label>
            <select
              name="prioridad"
              value={formData.prioridad || ''}
              onChange={(e) => handleFieldChange('prioridad', e.target.value)}
              onBlur={() => handleFieldBlur('prioridad')}
              disabled={isSubmitting}
              className={showError('prioridad') ? styles.errorInput : ''}
            >
              {priorities.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
            {showError('prioridad') && (
              <p className={styles.inputError}>{formErrors['prioridad']}</p>
            )}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Fecha programada</label>
            <input
              type="date"
              name="fechaProgramada"
              value={formData.fechaProgramada instanceof Date 
                ? formData.fechaProgramada.toISOString().split('T')[0] 
                : formData.fechaProgramada || ''}
              onChange={(e) => handleFieldChange('fechaProgramada', e.target.value)}
              onBlur={() => handleFieldBlur('fechaProgramada')}
              disabled={isSubmitting}
              className={showError('fechaProgramada') ? styles.errorInput : ''}
            />
            {showError('fechaProgramada') && (
              <p className={styles.inputError}>{formErrors['fechaProgramada']}</p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Hora programada</label>
            <input
              type="time"
              name="horaProgramada"
              value={formData.horaProgramada || ''}
              onChange={(e) => handleFieldChange('horaProgramada', e.target.value)}
              onBlur={() => handleFieldBlur('horaProgramada')}
              disabled={isSubmitting}
              className={showError('horaProgramada') ? styles.errorInput : ''}
            />
            {showError('horaProgramada') && (
              <p className={styles.inputError}>{formErrors['horaProgramada']}</p>
            )}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Observaciones</label>
          <textarea
            name="observaciones"
            value={formData.observaciones || ''}
            onChange={(e) => handleFieldChange('observaciones', e.target.value)}
            disabled={isSubmitting}
            rows={2}
          />
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onCancel}
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
            {isSubmitting ? 'Guardando...' : isEditMode ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default WorkOrderForm;
