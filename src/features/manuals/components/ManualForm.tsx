import { useState, ChangeEvent, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Manual } from '../hooks/useManuals';
import styles from '../styles/manualForm.module.css';
import { validateManualForm, validateManualField } from '../validators/manualValidations';
import ButtonCreate from '../../../shared/components/Buttons/buttonCreate'

interface ManualFormProps {
  onCancel: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onAdd?: (data: Manual) => Promise<{ message: string }>;
  onEdit?: (id: string, data: Manual) => Promise<{ message: string }>;
  isEditMode?: boolean;
  initialData?: Manual | null;
  formData: Manual;
  formErrors: Record<string, string>;
  handleFieldChange: (name: string, value: string | string[] | File) => void;
  handleSubmitForm: (
    e: React.FormEvent,
    isEditMode: boolean,
    initialData: Manual | null,
    onSuccess: (message: string) => void,
    onError: (message: string) => void,
    onAdd?: (data: Manual) => Promise<{ message: string }>,
    onEdit?: (id: string, data: Manual) => Promise<{ message: string }>
  ) => void;
  isSubmitting: boolean;
}

const ManualForm = ({
  onCancel,
  onSuccess,
  onError,
  onAdd,
  onEdit,
  isEditMode = false,
  initialData,
  formData,
  formErrors,
  handleFieldChange,
  handleSubmitForm,
  isSubmitting,
}: ManualFormProps) => {
  const { t } = useTranslation();
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [tagsInput, setTagsInput] = useState('');

  const categories = [
    t('manuals.userManual'),
    t('manuals.technicalManual'),
    t('manuals.maintenanceManual'),
    t('manuals.installationGuide'),
    t('manuals.others')
  ];

  const languages = [
    { value: "es", label: t('manuals.spanish') },
    { value: "en", label: t('manuals.english') },
    { value: "pt", label: t('manuals.portuguese') },
    { value: "fr", label: t('manuals.french') },
  ];

  const handleFieldBlur = async (fieldName: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    // Validar solo el campo que perdió el foco
    const value = formData[fieldName as keyof typeof formData];
    const result = await validateManualField(fieldName, value, formData, t);
    handleSetFieldError(fieldName, result.isValid ? '' : result.error);
  };

  const handleSetFieldError = (fieldName: string, error: string) => {
    handleSetErrors((prev: Record<string, string>) => ({ ...prev, [fieldName]: error }));
  };

  // Para poder actualizar los errores desde la validación por campo y por formulario
  const [formErrorsState, setFormErrorsState] = useState<Record<string, string>>(formErrors);
  const handleSetErrors = (updater: (prev: Record<string, string>) => Record<string, string>) => {
    setFormErrorsState(updater);
    if (typeof formErrors === 'object') {
      Object.assign(formErrors, updater(formErrors));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Marcar todos los campos como tocados para mostrar errores
    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach((name) => { allTouched[name] = true });
    setTouchedFields(allTouched);
    // Validar formulario
    const validation = await validateManualForm(formData, t);
    setFormErrorsState(validation.errors);
    if (!validation.isValid) return;
    // Lógica de submit original
    handleSubmitForm(e, isEditMode, initialData || null, onSuccess, onError, onAdd, onEdit);
  };

  const handleTagsChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTagsInput(e.target.value);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFieldChange('archivo', file);
      setTouchedFields(prev => ({ ...prev, archivo: true }));
    } else {
      handleFieldChange('archivo', '');
      setTouchedFields(prev => ({ ...prev, archivo: true }));
    }
  };

  const addTag = () => {
    const tag = tagsInput.trim();
    if (tag && !(formData.tags || []).includes(tag)) {
      const newTags = [...(formData.tags || []), tag];
      handleFieldChange('tags', newTags);
      setTagsInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = (formData.tags || []).filter(tag => tag !== tagToRemove);
    handleFieldChange('tags', newTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const showError = (fieldName: string) => touchedFields[fieldName] && formErrorsState[fieldName];

  const getFileName = () => {
    if (formData.archivo instanceof File) {
      return formData.archivo.name;
    }
    if (formData.archivo && typeof formData.archivo === 'object' && 'nombreOriginal' in formData.archivo) {
      return formData.archivo.nombreOriginal;
    }
    return null;
  };

  return (
    <form
      onSubmit={(e) =>
        handleSubmit(e)
      }
      className={styles.form}
    >
      <div className={styles.formInner}>
        <div className={styles.formGroup}>
          <label>{t('manuals.name')} *</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={(e) => handleFieldChange('nombre', e.target.value)}
            onBlur={() => handleFieldBlur('nombre')}
            disabled={isSubmitting}
            className={showError('nombre') ? styles.errorInput : ''}
            placeholder={t('manuals.enterName')}
          />
          {showError('nombre') && (
            <p className={styles.inputError}>{formErrorsState['nombre']}</p>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>{t('manuals.description')}</label>
          <textarea
            name="descripcion"
            value={formData.descripcion || ''}
            onChange={(e) => handleFieldChange('descripcion', e.target.value)}
            onBlur={() => handleFieldBlur('descripcion')}
            disabled={isSubmitting}
            rows={3}
            placeholder={t('manuals.enterDescription')}
          />
        </div>

        <div className={styles.formGroup}>
          <label>{t('manuals.active')} *</label>
          <input
            type="text"
            name="assetId"
            value={formData.assetId}
            onChange={(e) => handleFieldChange('assetId', e.target.value)}
            onBlur={() => handleFieldBlur('assetId')}
            disabled={isSubmitting}
            className={showError('assetId') ? styles.errorInput : ''}
            placeholder={t('manuals.selectAsset')}
          />
          {showError('assetId') && (
            <p className={styles.inputError}>{formErrorsState['assetId']}</p>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>{t('manuals.category')}</label>
          <select
            name="categoria"
            value={formData.categoria}
            onChange={(e) => handleFieldChange('categoria', e.target.value)}
            onBlur={() => handleFieldBlur('categoria')}
            disabled={isSubmitting}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>{t('manuals.version')}</label>
          <input
            type="text"
            name="version"
            value={formData.version || ''}
            onChange={(e) => handleFieldChange('version', e.target.value)}
            onBlur={() => handleFieldBlur('version')}
            disabled={isSubmitting}
            placeholder={t('manuals.enterVersion')}
          />
        </div>

        <div className={styles.formGroup}>
          <label>{t('manuals.language')}</label>
          <select
            name="idioma"
            value={formData.idioma || 'es'}
            onChange={(e) => handleFieldChange('idioma', e.target.value)}
            onBlur={() => handleFieldBlur('idioma')}
            disabled={isSubmitting}
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>{t('manuals.author')}</label>
          <input
            type="text"
            name="autor"
            value={formData.autor || ''}
            onChange={(e) => handleFieldChange('autor', e.target.value)}
            onBlur={() => handleFieldBlur('autor')}
            disabled={isSubmitting}
            placeholder={t('manuals.enterAuthor')}
          />
        </div>

        <div className={styles.formGroup}>
          <label>{t('manuals.pdfFile')} {!isEditMode && '*'}</label>
          <div className={styles.fileInputContainer}>
            <input
              type="file"
              id="archivoUpload"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              onBlur={() => handleFieldBlur('archivo')}
              disabled={isSubmitting}
              className={styles.hiddenInput}
            />
            <ButtonCreate
              onClick={() => document.getElementById('archivoUpload')?.click()}
              title={t('manuals.selectFile')}
              className={styles.fileSelectButton}
            />
            {getFileName() && (
              <p className={styles.fileName}>
                {t('manuals.selectedFile')}: {getFileName()}
              </p>
            )}
            {showError('archivo') && (
              <p className={styles.inputError}>{formErrorsState['archivo']}</p>
            )}
            {!isEditMode && (
              <p className={styles.fileHint}>
                * {t('manuals.fileRequired')}
              </p>
            )}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>{t('manuals.tags')}</label>
          <div className={styles.tagsInputContainer}>
            <input
              type="text"
              value={tagsInput}
              onChange={handleTagsChange}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              placeholder={t('manuals.tagPlaceholder')}
              className={styles.tagInput}
            />
            <button
              type="button"
              onClick={addTag}
              disabled={isSubmitting || !tagsInput.trim()}
              className={styles.addTagButton}
            >
              {t('manuals.addTag')}
            </button>
          </div>
          <div className={styles.tagsList}>
            {(formData.tags || []).map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  disabled={isSubmitting}
                  className={styles.removeTagButton}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={styles.cancelButton}
          >
            {t('manuals.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={styles.submitButton}
          >
            {isSubmitting ? t('manuals.saving') : isEditMode ? t('manuals.update') : t('manuals.create')}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ManualForm;