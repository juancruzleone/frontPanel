import { useEffect, useState, useCallback } from "react";
import {
  fetchManuals,
  fetchManualById,
  fetchManualsByAssetId,
  createManual,
  updateManual,
  patchManual,
  deleteManual,
  updateManualFile,
} from "../services/manualServices";
import { validateManualForm } from "../validators/manualValidations";
import { useTranslation } from 'react-i18next';
import { fetchAssets } from "../../assets/services/assetServices";

export type Manual = {
  _id?: string;
  nombre: string;
  descripcion?: string;
  version?: string;
  assetId: string;
  categoria: string;
  idioma?: string;
  autor?: string;
  tags?: string[];
  archivo?: File | {
    url: string;
    publicId: string;
    nombreOriginal: string;
    tamaño: number;
    formato: string;
    resourceType: string;
    fechaSubida: Date;
  };
  fechaCreacion?: Date;
  fechaActualizacion?: Date;
};

const useManuals = () => {
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [errorLoadingAssets, setErrorLoadingAssets] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Manual, '_id'>>({
    nombre: '',
    descripcion: '',
    version: '1.0',
    assetId: '',
    categoria: 'Manual de usuario',
    idioma: 'es',
    autor: '',
    tags: [],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const extractCategories = useCallback((manuals: Manual[]) => {
    const uniqueCategories = new Set<string>();
    manuals.forEach(manual => {
      if (manual.categoria) {
        uniqueCategories.add(manual.categoria);
      }
    });
    return Array.from(uniqueCategories);
  }, []);

  const loadAssets = useCallback(async () => {
    setLoadingAssets(true);
    setErrorLoadingAssets(null);
    try {
      const data = await fetchAssets();
      setAssets(data);
    } catch (err: any) {
      console.error("Error al cargar activos:", err);
      setErrorLoadingAssets(err.message);
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  const loadManuals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchManuals();
      setManuals(data);
      setCategories(extractCategories(data));
    } catch (err: any) {
      console.error("Error al cargar manuales:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [extractCategories]);

  const loadManualsByAssetId = useCallback(async (assetId: string) => {
    setLoading(true);
    try {
      const data = await fetchManualsByAssetId(assetId);
      return data;
    } catch (err: any) {
      console.error("Error al cargar manuales del activo:", err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadManuals();
    loadAssets();
  }, [loadManuals, loadAssets]);

  const { t } = useTranslation();
  const validateForm = useCallback(async (data: Partial<Manual>) => {
    const validation = await validateManualForm(data, t);
    setFormErrors(validation.errors);
    return validation;
  }, [t]);

  const handleFieldChange = useCallback(async (name: string, value: string | string[] | File) => {
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    // Validación inmediata para el campo cambiado
    const validation = await validateManualForm({ [name]: value }, t);
    setFormErrors(prev => ({
      ...prev,
      [name]: validation.errors[name] || ''
    }));
  }, [formData, t]);

  const handleSubmitForm = useCallback(async (
    e: React.FormEvent,
    isEditMode: boolean,
    initialData: Manual | null,
    onSuccess: (message: string) => void,
    onError: (message: string) => void,
    onAdd?: (data: Manual) => Promise<{ message: string }>,
    onEdit?: (id: string, data: Manual) => Promise<{ message: string }>
  ) => {
    e.preventDefault();
    setIsSubmitting(true);

    const validation = await validateForm(formData);
    if (!validation.isValid) {
      setIsSubmitting(false);
      return;
    }

    try {
      let message: string;
      if (isEditMode && initialData?._id && onEdit) {
        const result = await onEdit(initialData._id, formData);
        message = result.message;
      } else if (!isEditMode && onAdd) {
        const result = await onAdd(formData);
        message = result.message;
      } else {
        throw new Error('Función de guardado no disponible');
      }
      onSuccess(message);
      resetForm();
    } catch (err: any) {
      console.error("Error al guardar manual:", err);
      onError(err.message || "Error al guardar manual");
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm]);

  const addManual = useCallback(async (manual: Manual): Promise<{ message: string }> => {
    try {
      const newManual = await createManual(manual);
      setManuals((prev) => [newManual, ...prev]);
      setCategories(prev => {
        if (!prev.includes(newManual.categoria)) {
          return [...prev, newManual.categoria];
        }
        return prev;
      });
      return { message: "Manual creado con éxito" };
    } catch (err: any) {
      console.error("Error al crear manual:", err);
      throw err;
    }
  }, []);

  const editManual = useCallback(async (id: string, updatedData: Manual): Promise<{ message: string }> => {
    try {
      const updatedManual = await updateManual(id, updatedData);
      setManuals((prev) =>
        prev.map((manual) => (manual._id === id ? updatedManual : manual))
      );
      setCategories(prev => {
        if (!prev.includes(updatedManual.categoria)) {
          return [...prev, updatedManual.categoria];
        }
        return prev;
      });
      return { message: "Manual actualizado con éxito" };
    } catch (err: any) {
      console.error("Error al actualizar manual:", err);
      throw err;
    }
  }, []);

  const removeManual = useCallback(async (id: string): Promise<void> => {
    try {
      await deleteManual(id);
      setManuals((prev) => prev.filter((manual) => manual._id !== id));
    } catch (err: any) {
      console.error("Error al eliminar manual:", err);
      throw err;
    }
  }, []);

  const updateFile = useCallback(async (id: string, file: File): Promise<{ message: string }> => {
    try {
      const updatedManual = await updateManualFile(id, file);
      setManuals(prev =>
        prev.map(manual =>
          manual._id === id ? updatedManual : manual
        )
      );
      return { message: "Archivo actualizado con éxito" };
    } catch (err: any) {
      console.error("Error al actualizar archivo:", err);
      throw err;
    }
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      nombre: '',
      descripcion: '',
      version: '1.0',
      assetId: '',
      categoria: 'Manual de usuario',
      idioma: 'es',
      autor: '',
      tags: [],
    });
    setFormErrors({});
  }, []);

  const setFormValues = useCallback((data: Partial<Manual>) => {
    setFormData(prev => ({ ...prev, ...data }));
  }, []);

  return {
    manuals,
    categories,
    assets,
    loadingAssets,
    errorLoadingAssets,
    loadAssets,
    loading,
    error,
    loadManuals,
    loadManualsByAssetId,
    addManual,
    editManual,
    removeManual,
    updateFile,
    formData,
    setFormData,
    formErrors,
    setFormErrors,
    handleFieldChange,
    handleSubmitForm,
    isSubmitting,
    resetForm,
    setFormValues,
    validateForm,
  };
};

export default useManuals;