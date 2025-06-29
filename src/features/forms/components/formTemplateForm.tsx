import { useState, useEffect } from "react";
import { FormTemplate, FormField } from "../hooks/useForms";
import styles from "../styles/formTemplateForm.module.css";
import { validateFormTemplate } from "../validators/formValidations";

interface FormTemplateFormProps {
  onCancel: () => void;
  onSuccess: (message: string) => void;
  onSubmit: (data: FormTemplate) => Promise<any> | ((id: string, data: FormTemplate) => Promise<any>);
  isEditMode: boolean;
  initialData: FormTemplate | null;
  categories: string[];
}

const fieldTypes = [
  "text",
  "textarea", 
  "number",
  "date",
  "select",
  "checkbox",
  "radio",
  "file",
];

const FormTemplateForm = ({
  onCancel,
  onSuccess,
  onSubmit,
  isEditMode,
  initialData,
  categories,
}: FormTemplateFormProps) => {
  const [formData, setFormData] = useState<FormTemplate>({
    nombre: "",
    categoria: "",
    campos: [],
    ...initialData,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newField, setNewField] = useState<FormField>({
    name: "",
    type: "text",
    label: "",
    required: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Validación en tiempo real cuando el campo pierde el foco
    if (touchedFields[name]) {
      validateField(name, value);
    }
  };

  const handleFieldBlur = (fieldName: string) => {
    if (!touchedFields[fieldName]) {
      setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
      validateField(fieldName, formData[fieldName as keyof FormTemplate]);
    }
  };

  const validateField = async (fieldName: string, value: any) => {
    const validation = await validateFormTemplate({ [fieldName]: value });
    setErrors(prev => ({
      ...prev,
      [fieldName]: validation.errors[fieldName] || ''
    }));
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setNewField(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
    
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleOptionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const options = e.target.value.split("\n").filter(opt => opt.trim() !== "");
    setNewField(prev => ({
      ...prev,
      options,
    }));
  };

  const validateNewField = (field: FormField): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!field.name.trim()) {
      newErrors.name = "El nombre del campo es obligatorio";
    } else if (!/^[a-zA-Z0-9_]+$/.test(field.name)) {
      newErrors.name = "Solo letras, números y guiones bajos";
    }
    
    if (!field.label.trim()) {
      newErrors.label = "La etiqueta es obligatoria";
    }
    
    if ((field.type === "select" || field.type === "radio") && 
        (!field.options || field.options.length === 0)) {
      newErrors.options = "Debe agregar al menos una opción";
    }
    
    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addField = () => {
    if (!validateNewField(newField)) return;
    
    setFormData(prev => ({
      ...prev,
      campos: [...prev.campos, newField],
    }));
    
    setNewField({
      name: "",
      type: "text",
      label: "",
      required: false,
    });
  };

  const removeField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      campos: prev.campos.filter((_, i) => i !== index),
    }));
  };

  const validateForm = async (): Promise<boolean> => {
    const validation = await validateFormTemplate(formData);
    setErrors(validation.errors);
    return validation.isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!(await validateForm())) return;
    
    setIsSubmitting(true);
    try {
      let result;
      if (isEditMode && formData._id) {
        result = await (onSubmit as (id: string, data: FormTemplate) => Promise<any>)(
          formData._id,
          formData
        );
      } else {
        result = await (onSubmit as (data: FormTemplate) => Promise<any>)(formData);
      }
      
      onSuccess(isEditMode ? "Plantilla actualizada con éxito" : "Plantilla creada con éxito");
    } catch (err) {
      console.error("Error al guardar plantilla:", err);
      setErrors({
        submit: "Error al guardar la plantilla. Por favor intente nuevamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showError = (fieldName: string) => touchedFields[fieldName] && errors[fieldName];

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formInner}>
        <div className={styles.basicInfoSection}>
          <div className={styles.formGroup}>
            <label>Nombre de la plantilla *</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              onBlur={() => handleFieldBlur('nombre')}
              disabled={isSubmitting}
              className={showError('nombre') ? styles.errorInput : ''}
            />
            {showError('nombre') && <span className={styles.inputError}>{errors.nombre}</span>}
          </div>
          
          <div className={styles.formGroup}>
            <label>Categoría *</label>
            <select
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              onBlur={() => handleFieldBlur('categoria')}
              disabled={isSubmitting}
              className={showError('categoria') ? styles.errorInput : ''}
            >
              <option value="">Seleccione una categoría</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {showError('categoria') && <span className={styles.inputError}>{errors.categoria}</span>}
          </div>
          
          <div className={styles.formGroup}>
            <label>Descripción (opcional)</label>
            <textarea
              name="descripcion"
              value={formData.descripcion || ""}
              onChange={handleChange}
              onBlur={() => handleFieldBlur('descripcion')}
              disabled={isSubmitting}
              rows={3}
            />
          </div>
        </div>
        
        <div className={styles.fieldsSection}>
          <h3 className={styles.sectionTitle}>Campos del formulario *</h3>
          {showError('campos') && <span className={styles.inputError}>{errors.campos}</span>}
          
          <div className={styles.fieldsList}>
            {formData.campos.map((field, index) => (
              <div key={index} className={styles.fieldItem}>
                <div className={styles.fieldHeader}>
                  <div className={styles.fieldInfo}>
                    <span className={styles.fieldLabel}>{field.label}</span>
                    <span className={styles.fieldType}>({field.type})</span>
                    {field.required && <span className={styles.requiredBadge}>Requerido</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    disabled={isSubmitting}
                    className={styles.removeFieldButton}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
                {field.options && (
                  <div className={styles.fieldOptions}>
                    <strong>Opciones:</strong> {field.options.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className={styles.addFieldForm}>
            <h4 className={styles.addFieldTitle}>Agregar nuevo campo</h4>
            
            <div className={styles.fieldFormRow}>
              <div className={styles.fieldFormGroup}>
                <label>Nombre del campo *</label>
                <input
                  type="text"
                  name="name"
                  value={newField.name}
                  onChange={handleFieldChange}
                  disabled={isSubmitting}
                  className={fieldErrors.name ? styles.errorInput : ''}
                />
                {fieldErrors.name && <span className={styles.inputError}>{fieldErrors.name}</span>}
              </div>
              
              <div className={styles.fieldFormGroup}>
                <label>Tipo *</label>
                <select
                  name="type"
                  value={newField.type}
                  onChange={handleFieldChange}
                  disabled={isSubmitting}
                >
                  {fieldTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className={styles.fieldFormGroup}>
              <label>Etiqueta *</label>
              <input
                type="text"
                name="label"
                value={newField.label}
                onChange={handleFieldChange}
                disabled={isSubmitting}
                className={fieldErrors.label ? styles.errorInput : ''}
              />
              {fieldErrors.label && <span className={styles.inputError}>{fieldErrors.label}</span>}
            </div>
            
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="required"
                  checked={newField.required || false}
                  onChange={handleFieldChange}
                  disabled={isSubmitting}
                />
                <span className={styles.checkboxText}>¿Campo requerido?</span>
              </label>
            </div>
            
            {(newField.type === "select" || newField.type === "radio") && (
              <div className={styles.fieldFormGroup}>
                <label>Opciones (una por línea) *</label>
                <textarea
                  value={newField.options?.join("\n") || ""}
                  onChange={handleOptionsChange}
                  disabled={isSubmitting}
                  rows={3}
                  className={fieldErrors.options ? styles.errorInput : ''}
                />
                {fieldErrors.options && <span className={styles.inputError}>{fieldErrors.options}</span>}
              </div>
            )}
            
            <button
              type="button"
              onClick={addField}
              disabled={isSubmitting}
              className={styles.addFieldButton}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Agregar Campo
            </button>
          </div>
        </div>
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
          {isSubmitting ? "Guardando..." : isEditMode ? "Actualizar" : "Crear"}
        </button>
      </div>
      
      {errors.submit && <div className={styles.formError}>{errors.submit}</div>}
    </form>
  );
};

export default FormTemplateForm;