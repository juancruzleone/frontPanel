import { useState } from "react";
import { Category } from "../hooks/useCategories";
import styles from "../styles/installationForm.module.css"; // Usamos los mismos estilos

interface CategoryFormProps {
  onCancel: () => void;
  onSuccess: (message: string) => void;
  onCreate: (data: Category) => Promise<{ message: string }>;
  formData: Category;
  formErrors: Record<string, string>;
  handleFieldChange: (name: string, value: string | boolean) => void;
  handleSubmitForm: (
    e: React.FormEvent,
    onSuccess: (message: string) => void,
    onCreate: (data: Category) => Promise<{ message: string }>
  ) => void;
  isSubmitting: boolean;
}

const CategoryForm = ({
  onCancel,
  onSuccess,
  onCreate,
  formData,
  formErrors,
  handleFieldChange,
  handleSubmitForm,
  isSubmitting,
}: CategoryFormProps) => {
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const handleFieldBlur = (fieldName: string) => {
    if (!touchedFields[fieldName]) {
      setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    }
  };

  const showError = (fieldName: string) => touchedFields[fieldName] && formErrors[fieldName];

  return (
    <form
      onSubmit={(e) => handleSubmitForm(e, onSuccess, onCreate)}
      className={styles.form}
    >
      <div className={styles.formInner}>
        <div className={styles.formGroup}>
          <label>Nombre *</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre || ""}
            onChange={(e) => handleFieldChange("nombre", e.target.value)}
            onBlur={() => handleFieldBlur("nombre")}
            disabled={isSubmitting}
            className={showError("nombre") ? styles.errorInput : ""}
          />
          {showError("nombre") && (
            <p className={styles.inputError}>{formErrors["nombre"]}</p>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>Descripción</label>
          <textarea
            name="descripcion"
            value={formData.descripcion || ""}
            onChange={(e) => handleFieldChange("descripcion", e.target.value)}
            onBlur={() => handleFieldBlur("descripcion")}
            disabled={isSubmitting}
            className={showError("descripcion") ? styles.errorInput : ""}
            rows={3}
          />
          {showError("descripcion") && (
            <p className={styles.inputError}>{formErrors["descripcion"]}</p>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="activa"
              checked={formData.activa === true}
              onChange={(e) => handleFieldChange("activa", e.target.checked)}
              disabled={isSubmitting}
              className={styles.checkboxInput}
            />
            <span className={styles.checkboxCustom}></span>
            Activa
          </label>
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
            {isSubmitting ? "Guardando..." : "Crear"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default CategoryForm;
