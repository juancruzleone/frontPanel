import { useState, useEffect } from "react";
import { Device, Installation } from "../hooks/useInstallations";
import styles from "../styles/modalAddDevice.module.css";
import { validateForm, assetSchema } from "../validators/deviceValidations";

interface DeviceFormProps {
  installation: Installation;
  onSubmitSuccess: (message: string) => void;
  onAddDevice: (installationId: string, device: Device) => Promise<{ message: string }>;
  onCancel: () => void;
  assets: any[];
}

const DeviceForm = ({
  installation,
  onSubmitSuccess,
  onAddDevice,
  onCancel,
  assets,
}: DeviceFormProps) => {
  const [formData, setFormData] = useState({
    assetId: "",
    ubicacion: "",
    categoria: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  useEffect(() => {
    if (formData.assetId) {
      const asset = assets.find(a => a._id === formData.assetId);
      setSelectedAsset(asset);
    } else {
      setSelectedAsset(null);
    }
  }, [formData.assetId, assets]);

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (touchedFields[field]) {
      validateField(field, value);
    }
  };

  const validateField = async (field: string, value: string) => {
    try {
      await assetSchema.validateAt(field, { [field]: value });
      setFormErrors(prev => ({ ...prev, [field]: "" }));
    } catch (err: any) {
      setFormErrors(prev => ({ ...prev, [field]: err.message }));
    }
  };

  const handleFieldBlur = (field: string) => {
    if (!touchedFields[field]) {
      setTouchedFields(prev => ({ ...prev, [field]: true }));
    }
    validateField(field, formData[field as keyof typeof formData]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const allFields = Object.keys(formData);
    const newTouchedFields = allFields.reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {} as Record<string, boolean>);
    
    setTouchedFields(newTouchedFields);

    const validation = await validateForm(assetSchema, formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      setIsSubmitting(false);
      return;
    }

    try {
      if (!selectedAsset) {
        throw new Error("El activo seleccionado no existe");
      }

      const deviceData = {
        assetId: formData.assetId,
        nombre: selectedAsset.nombre,
        ubicacion: formData.ubicacion,
        categoria: formData.categoria,
        estado: selectedAsset.estado || "Activo",
        marca: selectedAsset.marca,
        modelo: selectedAsset.modelo,
        numeroSerie: selectedAsset.numeroSerie,
        templateId: selectedAsset.templateId,
      };

      const result = await onAddDevice(installation._id!, deviceData);
      onSubmitSuccess(result.message);
      
      setFormData({
        assetId: "",
        ubicacion: "",
        categoria: "",
      });
      setFormErrors({});
      setTouchedFields({});
    } catch (err: any) {
      setFormErrors({
        general: err.message || "Error al agregar el dispositivo. Por favor intente nuevamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showError = (field: string) => touchedFields[field] && formErrors[field];

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formContent}>
        <div className={styles.formGroup}>
          <label>Activo*</label>
          <select
            value={formData.assetId}
            onChange={(e) => handleFieldChange("assetId", e.target.value)}
            onBlur={() => handleFieldBlur("assetId")}
            disabled={isSubmitting}
            className={showError("assetId") ? styles.errorInput : ""}
          >
            <option value="">Seleccione un activo</option>
            {assets.map((asset) => (
              <option key={asset._id} value={asset._id}>
                {asset.nombre} - {asset.marca} {asset.modelo} (Serie: {asset.numeroSerie})
              </option>
            ))}
          </select>
          {showError("assetId") && <p className={styles.error}>{formErrors.assetId}</p>}
        </div>

        {selectedAsset && (
          <div className={styles.assetInfo}>
            <h4>Información del activo seleccionado:</h4>
            <p><strong>Nombre:</strong> {selectedAsset.nombre}</p>
            <p><strong>Marca:</strong> {selectedAsset.marca}</p>
            <p><strong>Modelo:</strong> {selectedAsset.modelo}</p>
            <p><strong>N° Serie:</strong> {selectedAsset.numeroSerie}</p>
          </div>
        )}

        <div className={styles.formGroup}>
          <label>Ubicación exacta en la instalación*</label>
          <input
            type="text"
            name="ubicacion"
            value={formData.ubicacion}
            onChange={(e) => handleFieldChange("ubicacion", e.target.value)}
            onBlur={() => handleFieldBlur("ubicacion")}
            disabled={isSubmitting}
            className={showError("ubicacion") ? styles.errorInput : ""}
            placeholder="Ej: Piso 2, Oficina 201"
          />
          {showError("ubicacion") && <p className={styles.error}>{formErrors.ubicacion}</p>}
        </div>

        <div className={styles.formGroup}>
          <label>Categoría*</label>
          <input
            type="text"
            name="categoria"
            value={formData.categoria}
            onChange={(e) => handleFieldChange("categoria", e.target.value)}
            onBlur={() => handleFieldBlur("categoria")}
            disabled={isSubmitting}
            className={showError("categoria") ? styles.errorInput : ""}
            placeholder="Ej: Aire acondicionado, Servidor, etc."
          />
          {showError("categoria") && <p className={styles.error}>{formErrors.categoria}</p>}
        </div>
      </div>

      {formErrors.general && (
        <p className={styles.generalError}>{formErrors.general}</p>
      )}

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
          disabled={isSubmitting || !selectedAsset}
          className={styles.submitButton}
        >
          {isSubmitting ? "Agregando..." : "Agregar Dispositivo"}
        </button>
      </div>
    </form>
  );
};

export default DeviceForm;