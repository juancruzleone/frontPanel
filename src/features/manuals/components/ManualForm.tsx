import { useState, ChangeEvent, useEffect } from "react";
import { Manual } from '../hooks/useManuals';
import { fetchAssets } from '../services/assetServices';
import styles from '../styles/manualForm.module.css';

interface ManualFormProps {
  onCancel: () => void;
  onSuccess: (message: string) => void;
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
    onAdd?: (data: Manual) => Promise<{ message: string }>,
    onEdit?: (id: string, data: Manual) => Promise<{ message: string }>
  ) => void;
  isSubmitting: boolean;
}

interface Asset {
  _id: string;
  nombre: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
}

const ManualForm = ({
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
}: ManualFormProps) => {
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [tagsInput, setTagsInput] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const categories = [
    "Manual de usuario",
    "Manual técnico",
    "Manual de mantenimiento",
    "Guía de instalación",
    "Otros"
  ];

  const languages = [
    { value: "es", label: "Español" },
    { value: "en", label: "Inglés" },
    { value: "pt", label: "Portugués" },
    { value: "fr", label: "Francés" },
  ];

  useEffect(() => {
    const loadAssets = async () => {
      setLoadingAssets(true);
      try {
        const assetsData = await fetchAssets();
        setAssets(assetsData);
      } catch (error) {
        console.error("Error al cargar activos:", error);
      } finally {
        setLoadingAssets(false);
      }
    };

    loadAssets();
  }, []);

  const handleFieldBlur = (fieldName: string) => {
    if (!touchedFields[fieldName]) {
      setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    }
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
      handleFieldChange('archivo', null as any);
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

  const showError = (fieldName: string) => touchedFields[fieldName] && formErrors[fieldName];

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
        handleSubmitForm(e, isEditMode, initialData || null, onSuccess, onAdd, onEdit)
      }
      className={styles.form}
    >
      <div className={styles.formInner}>
        <div className={styles.formGroup}>
          <label>Nombre *</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={(e) => handleFieldChange('nombre', e.target.value)}
            onBlur={() => handleFieldBlur('nombre')}
            disabled={isSubmitting}
            className={showError('nombre') ? styles.errorInput : ''}
          />
          {showError('nombre') && (
            <p className={styles.inputError}>{formErrors['nombre']}</p>
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
            rows={3}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Activo *</label>
          <select
            name="assetId"
            value={formData.assetId}
            onChange={(e) => handleFieldChange('assetId', e.target.value)}
            onBlur={() => handleFieldBlur('assetId')}
            disabled={isSubmitting || loadingAssets}
            className={showError('assetId') ? styles.errorInput : ''}
          >
            <option value="">Seleccione un activo</option>
            {assets.map((asset) => (
              <option key={asset._id} value={asset._id}>
                {asset.nombre} - {asset.marca} {asset.modelo} (S/N: {asset.numeroSerie})
              </option>
            ))}
          </select>
          {showError('assetId') && (
            <p className={styles.inputError}>{formErrors['assetId']}</p>
          )}
          {loadingAssets && (
            <p className={styles.loadingText}>Cargando activos...</p>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>Categoría</label>
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
          <label>Versión</label>
          <input
            type="text"
            name="version"
            value={formData.version || ''}
            onChange={(e) => handleFieldChange('version', e.target.value)}
            onBlur={() => handleFieldBlur('version')}
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Idioma</label>
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
          <label>Autor</label>
          <input
            type="text"
            name="autor"
            value={formData.autor || ''}
            onChange={(e) => handleFieldChange('autor', e.target.value)}
            onBlur={() => handleFieldBlur('autor')}
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Archivo PDF {!isEditMode && '*'}</label>
          <div className={styles.fileInputContainer}>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              onBlur={() => handleFieldBlur('archivo')}
              disabled={isSubmitting}
              className={showError('archivo') ? styles.errorInput : styles.fileInput}
            />
            {getFileName() && (
              <p className={styles.fileName}>
                Archivo seleccionado: {getFileName()}
              </p>
            )}
            {showError('archivo') && (
              <p className={styles.inputError}>{formErrors['archivo']}</p>
            )}
            {!isEditMode && (
              <p className={styles.fileHint}>
                * Se requiere un archivo PDF para crear el manual
              </p>
            )}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Tags</label>
          <div className={styles.tagsInputContainer}>
            <input
              type="text"
              value={tagsInput}
              onChange={handleTagsChange}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              placeholder="Escribe un tag y presiona Enter"
              className={styles.tagInput}
            />
            <button
              type="button"
              onClick={addTag}
              disabled={isSubmitting || !tagsInput.trim()}
              className={styles.addTagButton}
            >
              Añadir
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

export default ManualForm;