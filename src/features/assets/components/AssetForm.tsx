import { useState } from "react";
import { Asset } from '../hooks/useAssets';
import styles from '../styles/assetForm.module.css';

interface AssetFormProps {
  onCancel: () => void;
  onSuccess: (message: string) => void;
  onAdd?: (data: Asset) => Promise<{ message: string }>;
  onEdit?: (id: string, data: Asset) => Promise<{ message: string }>;
  isEditMode?: boolean;
  initialData?: Asset | null;
  formData: Asset;
  formErrors: Record<string, string>;
  handleFieldChange: (name: string, value: string) => void;
  handleSubmitForm: (
    e: React.FormEvent,
    isEditMode: boolean,
    initialData: Asset | null,
    onSuccess: (message: string) => void,
    onAdd?: (data: Asset) => Promise<{ message: string }>,
    onEdit?: (id: string, data: Asset) => Promise<{ message: string }>
  ) => void;
  isSubmitting: boolean;
}

const AssetForm = ({
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
}: AssetFormProps) => {
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const requiredFields = [
    { name: 'nombre', label: 'Nombre' },
    { name: 'marca', label: 'Marca' },
    { name: 'modelo', label: 'Modelo' },
    { name: 'numeroSerie', label: 'Número de Serie' },
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
        {requiredFields.map(({ name, label }) => (
          <div className={styles.formGroup} key={name}>
            <label>{label} *</label>
            <input
              type="text"
              name={name}
              value={formData[name] || ''}
              onChange={(e) => handleFieldChange(name, e.target.value)}
              onBlur={() => handleFieldBlur(name)}
              disabled={isSubmitting}
              className={showError(name) ? styles.errorInput : ''}
            />
            {showError(name) && (
              <p className={styles.inputError}>{formErrors[name]}</p>
            )}
          </div>
        ))}

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

export default AssetForm;