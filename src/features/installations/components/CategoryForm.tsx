import { useState } from "react";
import { Category } from "../hooks/useCategories";
import styles from "../styles/installationForm.module.css"; // Usamos los mismos estilos
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"
import formCheckboxStyles from "../../../shared/components/Buttons/formCheckboxes.module.css"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation()
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const handleFieldBlur = (fieldName: string) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Marcar todos los campos como tocados para mostrar errores
    setTouchedFields({ nombre: true, descripcion: true });
    // Llamar a handleSubmitForm original
    handleSubmitForm(e, onSuccess, onCreate);
  };

  const showError = (fieldName: string) => touchedFields[fieldName] && formErrors[fieldName];

  return (
    <form
      onSubmit={handleSubmit}
      className={styles.form}
    >
      <div className={styles.formInner}>
        <div className={styles.formGroup}>
          <label>{t('installations.categoryName')} *</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre || ""}
            onChange={(e) => handleFieldChange("nombre", e.target.value)}
            onBlur={() => handleFieldBlur("nombre")}
            disabled={isSubmitting}
            className={showError("nombre") ? styles.errorInput : ""}
            placeholder={t('installations.categoryNamePlaceholder')}
          />
          {showError("nombre") && (
            <p className={styles.inputError}>{formErrors["nombre"]}</p>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>{t('installations.categoryDescription')}</label>
          <textarea
            name="descripcion"
            value={formData.descripcion || ""}
            onChange={(e) => handleFieldChange("descripcion", e.target.value)}
            onBlur={() => handleFieldBlur("descripcion")}
            disabled={isSubmitting}
            className={showError("descripcion") ? styles.errorInput : ""}
            rows={3}
            placeholder={t('installations.categoryDescriptionPlaceholder')}
          />
          {showError("descripcion") && (
            <p className={styles.inputError}>{formErrors["descripcion"]}</p>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={formCheckboxStyles.checkboxLabel}>
            <input
              type="checkbox"
              name="activa"
              checked={formData.activa === true}
              onChange={(e) => handleFieldChange("activa", e.target.checked)}
              disabled={isSubmitting}
              className={formCheckboxStyles.checkboxInput}
            />
            <span className={formCheckboxStyles.checkboxCustom}></span>
            {t('installations.active')}
          </label>
        </div>

        <div className={formButtonStyles.actions}>
          <button
            type="submit"
            disabled={isSubmitting}
            className={formButtonStyles.submitButton}
          >
            {isSubmitting ? t('common.saving') : t('common.create')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={formButtonStyles.cancelButton}
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </form>
  );
};

export default CategoryForm;
