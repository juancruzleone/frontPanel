import { useEffect, useState, useCallback } from "react";
import {
  fetchAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  assignTemplateToAsset as apiAssignTemplateToAsset,
} from "../services/assetServices";
import { validateAssetForm } from "../validators/assetValidations";

export type Asset = {
  _id?: string;
  nombre: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  categoria?: string;
  ubicacion?: string;
  estado?: string;
  templateId?: string;
  fechaAdquisicion?: Date;
  fechaUltimoMantenimiento?: Date;
  frecuenciaMantenimiento?: number;
  responsable?: string;
  notas?: string;
  especificaciones?: Record<string, any>;
};

const useAssets = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Asset, '_id'>>({
    nombre: '',
    marca: '',
    modelo: '',
    numeroSerie: '',
    estado: 'Activo'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const extractCategories = useCallback((assets: Asset[]) => {
    const uniqueCategories = new Set<string>();
    assets.forEach(asset => {
      if (asset.categoria) {
        uniqueCategories.add(asset.categoria);
      }
    });
    return Array.from(uniqueCategories);
  }, []);

  const extractStates = useCallback((assets: Asset[]) => {
    const uniqueStates = new Set<string>([
      'Activo',
      'Inactivo',
      'En mantenimiento',
      'Fuera de servicio',
      'Pendiente de revisión'
    ]);
    
    assets.forEach(asset => {
      if (asset.estado) {
        uniqueStates.add(asset.estado);
      }
    });
    return Array.from(uniqueStates);
  }, []);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAssets();
      setAssets(data);
      setCategories(extractCategories(data));
      setStates(extractStates(data));
    } catch (err: any) {
      console.error("Error al cargar activos:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [extractCategories, extractStates]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleFieldChange = async (name: string, value: string) => {
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);
    const validation = await validateAssetForm(updatedData);
    setFormErrors(validation.errors);
  };

  const handleSubmitForm = async (
    e: React.FormEvent,
    isEditMode: boolean,
    initialData: Asset | null,
    onSuccess: (message: string) => void,
    onAdd: (data: Asset) => Promise<{ message: string }>,
    onEdit: (id: string, data: Asset) => Promise<{ message: string }>
  ) => {
    e.preventDefault();
    setIsSubmitting(true);

    const validation = await validateAssetForm(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      setIsSubmitting(false);
      return;
    }

    try {
      let message: string;
      if (isEditMode && initialData?._id) {
        const result = await onEdit(initialData._id, formData);
        message = result.message;
      } else {
        const result = await onAdd(formData);
        message = result.message;
      }
      onSuccess(message);
      resetForm();
    } catch (err) {
      console.error("Error al guardar activo:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAsset = async (asset: Asset): Promise<{ message: string }> => {
    try {
      const newAsset = await createAsset(asset);
      setAssets((prev) => [newAsset, ...prev]);
      if (newAsset.categoria && !categories.includes(newAsset.categoria)) {
        setCategories(prev => [...prev, newAsset.categoria]);
      }
      if (newAsset.estado && !states.includes(newAsset.estado)) {
        setStates(prev => [...prev, newAsset.estado]);
      }
      return { message: "Activo creado con éxito" };
    } catch (err: any) {
      console.error("Error al crear activo:", err);
      throw err;
    }
  };

  const editAsset = async (id: string, updatedData: Asset): Promise<{ message: string }> => {
    try {
      const updatedAsset = await updateAsset(id, updatedData);
      setAssets((prev) =>
        prev.map((asset) => (asset._id === id ? updatedAsset : asset))
      );
      
      if (updatedAsset.categoria && !categories.includes(updatedAsset.categoria)) {
        setCategories(prev => [...prev, updatedAsset.categoria]);
      }
      if (updatedAsset.estado && !states.includes(updatedAsset.estado)) {
        setStates(prev => [...prev, updatedAsset.estado]);
      }
      
      return { message: "Activo actualizado con éxito" };
    } catch (err: any) {
      console.error("Error al actualizar activo:", err);
      throw err;
    }
  };

  const removeAsset = async (id: string): Promise<void> => {
    try {
      await deleteAsset(id);
      setAssets((prev) => prev.filter((asset) => asset._id !== id));
    } catch (err: any) {
      console.error("Error al eliminar activo:", err);
      throw err;
    }
  };

  const assignTemplateToAsset = async (
    assetId: string,
    templateId: string
  ): Promise<{ message: string }> => {
    try {
      const result = await apiAssignTemplateToAsset(assetId, templateId);
      
      setAssets(prev =>
        prev.map(asset =>
          asset._id === assetId
            ? { ...asset, templateId }
            : asset
        )
      );

      return { message: result.message || "Plantilla asignada con éxito" };
    } catch (err: any) {
      console.error("Error al asignar plantilla:", err);
      throw err;
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      marca: '',
      modelo: '',
      numeroSerie: '',
      estado: 'Activo'
    });
    setFormErrors({});
  };

  const setFormValues = (data: Partial<Asset>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  return {
    assets,
    categories,
    states,
    loading,
    error,
    loadAssets,
    addAsset,
    editAsset,
    removeAsset,
    assignTemplateToAsset,
    formData,
    setFormData,
    formErrors,
    handleFieldChange,
    handleSubmitForm,
    isSubmitting,
    setFormErrors,
    resetForm,
    setFormValues,
  };
};

export default useAssets;