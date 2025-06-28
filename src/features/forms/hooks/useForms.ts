import { useEffect, useState, useCallback } from "react";
import {
  fetchFormTemplates,
  fetchFormTemplateById,
  fetchFormTemplatesByCategory,
  createFormTemplate,
  updateFormTemplate,
  deleteFormTemplate,
} from "../services/formServices";

export type FormField = {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  defaultValue?: any;
  min?: number;
  max?: number;
  step?: number;
  helpText?: string;
};

export type FormTemplate = {
  _id?: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  campos: FormField[];
  createdAt?: Date;
  updatedAt?: Date;
};

const useForms = () => {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFormTemplates();
      setTemplates(data);
      
      const uniqueCategories = Array.from(new Set(data.map(t => t.categoria)));
      setCategories(uniqueCategories);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTemplateById = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const data = await fetchFormTemplateById(id);
      setCurrentTemplate(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTemplatesByCategory = useCallback(async (category: string) => {
    setLoading(true);
    try {
      const data = await fetchFormTemplatesByCategory(category);
      return data;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const addTemplate = async (template: FormTemplate): Promise<FormTemplate> => {
    try {
      const newTemplate = await createFormTemplate(template);
      setTemplates(prev => [...prev, newTemplate]);
      
      if (!categories.includes(newTemplate.categoria)) {
        setCategories(prev => [...prev, newTemplate.categoria]);
      }
      
      return newTemplate;
    } catch (err: any) {
      throw err;
    }
  };

  const editTemplate = async (id: string, updatedData: FormTemplate): Promise<FormTemplate> => {
    try {
      const updatedTemplate = await updateFormTemplate(id, updatedData);
      setTemplates(prev => 
        prev.map(t => t._id === id ? updatedTemplate : t)
      );
      
      if (updatedTemplate.categoria !== updatedData.categoria) {
        const uniqueCategories = Array.from(new Set(templates.map(t => t.categoria)));
        setCategories(uniqueCategories);
      }
      
      return updatedTemplate;
    } catch (err: any) {
      throw err;
    }
  };

  const removeTemplate = async (id: string): Promise<void> => {
    try {
      await deleteFormTemplate(id);
      setTemplates(prev => prev.filter(t => t._id !== id));
      
      const uniqueCategories = Array.from(new Set(templates.map(t => t.categoria)));
      setCategories(uniqueCategories);
    } catch (err: any) {
      throw err;
    }
  };

  const resetCurrentTemplate = () => {
    setCurrentTemplate(null);
  };

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    currentTemplate,
    categories,
    loading,
    error,
    loadTemplates,
    loadTemplateById,
    loadTemplatesByCategory,
    addTemplate,
    editTemplate,
    removeTemplate,
    resetCurrentTemplate,
    setCurrentTemplate,
  };
};

export default useForms;