import { useState, useCallback } from "react";
import { createInstallationType, fetchInstallationTypes } from "../services/installationTypeServices";
import { validateInstallationTypeForm } from "../validators/installationTypeValidations";

export type InstallationType = {
  _id?: string;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
};

const useInstallationTypes = () => {
  const [installationTypes, setInstallationTypes] = useState<InstallationType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<InstallationType, "_id">>({
    nombre: "",
    descripcion: "",
    activo: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadInstallationTypes = useCallback(async (includeInactive = false) => {
    setLoading(true);
    try {
      const data = await fetchInstallationTypes(includeInactive);
      setInstallationTypes(data);
    } catch (err: any) {
      console.error("Error al cargar tipos de instalación:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFieldChange = (name: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitForm = async (
    e: React.FormEvent,
    onSuccess: (message: string) => void,
    onCreate: (data: InstallationType) => Promise<{ message: string }>
  ) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const validation = validateInstallationTypeForm(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await onCreate(formData);
      onSuccess(result.message);
      resetForm();
      await loadInstallationTypes();
    } catch (err) {
      console.error("Error al guardar tipo de instalación:", err);
      setError("Error al guardar tipo de instalación");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addInstallationType = async (type: InstallationType): Promise<{ message: string }> => {
    try {
      await createInstallationType(type);
      return { message: "Tipo de instalación creado con éxito" };
    } catch (err: any) {
      console.error("Error al crear tipo de instalación:", err);
      throw err;
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      activo: true,
    });
    setFormErrors({});
  };

  return {
    installationTypes,
    loading,
    error,
    formData,
    formErrors,
    loadInstallationTypes,
    handleFieldChange,
    handleSubmitForm,
    isSubmitting,
    addInstallationType,
    resetForm,
    setFormErrors,
  };
};

export default useInstallationTypes;