"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { createCategory, fetchCategories } from "../services/categoryServices"
import { validateCategoryForm } from "../validators/categoryValidations"

export type Category = {
  _id?: string
  nombre: string
  descripcion?: string
  activa?: boolean
}

const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<Omit<Category, "_id">>({
    nombre: "",
    descripcion: "",
    activa: true,
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadCategories = useCallback(async (includeInactive = false) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCategories(includeInactive)
      setCategories(data)
    } catch (err: any) {
      console.error("Error al cargar categorías:", err)
      setError(err.message || "Error al cargar categorías")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleFieldChange = (name: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmitForm = async (
    e: React.FormEvent,
    onSuccess: (message: string) => void,
    onCreate: (data: Category) => Promise<{ message: string }>,
  ) => {
    e.preventDefault()
    setIsSubmitting(true)

    const validation = validateCategoryForm(formData)
    if (!validation.isValid) {
      setFormErrors(validation.errors)
      setIsSubmitting(false)
      return
    }

    try {
      const result = await onCreate(formData)
      onSuccess(result.message)
      resetForm()
      await loadCategories()
    } catch (err) {
      console.error("Error al guardar categoría:", err)
      setError("Error al guardar categoría")
    } finally {
      setIsSubmitting(false)
    }
  }

  const addCategory = async (category: Category): Promise<{ message: string }> => {
    try {
      await createCategory(category)
      return { message: "Categoría creada con éxito" }
    } catch (err: any) {
      console.error("Error al crear categoría:", err)
      throw err
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      activa: true,
    })
    setFormErrors({})
  }

  return {
    categories,
    loading,
    error,
    formData,
    formErrors,
    loadCategories,
    handleFieldChange,
    handleSubmitForm,
    isSubmitting,
    addCategory,
    resetForm,
    setFormErrors,
  }
}

export default useCategories
