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

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    total: 0
  })

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
      const result = await fetchAssets({ page: 1, limit: 1000 }); // All assets for filter/select
      
      // La API devuelve: {assets: Array, total: number, totalPages: number}
      if (result.assets && Array.isArray(result.assets)) {
        setAssets(result.assets);
        if (result.assets.length === 0) {
          setErrorLoadingAssets("No hay activos disponibles. Crea activos primero.");
        }
      } else if (result.success && result.data) {
        // Formato alternativo con success
        const assetsData = Array.isArray(result.data) ? result.data : [];
        setAssets(assetsData);
        if (assetsData.length === 0) {
          setErrorLoadingAssets("No hay activos disponibles. Crea activos primero.");
        }
      } else if (Array.isArray(result)) {
        // Fallback para array directo
        setAssets(result);
        if (result.length === 0) {
          setErrorLoadingAssets("No hay activos disponibles. Crea activos primero.");
        }
      } else {
        setAssets([]);
        setErrorLoadingAssets("Formato de respuesta inválido del servidor");
      }
    } catch (err: any) {
      console.error("Error al cargar activos:", err);
      setAssets([]); // Asegurar que assets sea un array vacío en caso de error
      const errorMessage = err.message || "Error al cargar activos";
      setErrorLoadingAssets(errorMessage);
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  const loadManuals = useCallback(async (params: { page?: number, limit?: number, search?: string, assetId?: string, categoria?: string } = {}) => {
    setLoading(true);
    try {
      const result = await fetchManuals(params);
      if (result.success && result.pagination) {
        setManuals(result.data);
        setPagination(result.pagination);
        setCategories(extractCategories(result.data));
      } else {
        // Fallback para formato antiguo
        setManuals(result);
        setCategories(extractCategories(result));
      }
    } catch (err: any) {
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
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadManuals({ page: 1, limit: 10 });
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar una vez al montar el componente

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
      if (onError && typeof onError === 'function') {
        onError(err.message || "Error al guardar manual");
      }
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
      throw err;
    }
  }, []);

  const removeManual = useCallback(async (id: string): Promise<void> => {
    try {
      await deleteManual(id);
      setManuals((prev) => prev.filter((manual) => manual._id !== id));
    } catch (err: any) {
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
    pagination,
  };
};

export default useManuals;