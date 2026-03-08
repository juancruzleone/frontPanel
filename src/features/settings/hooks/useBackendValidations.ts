import { useState, useCallback } from 'react'
import { getHeadersWithContentType } from '../../../shared/utils/apiHeaders'

const API_URL = import.meta.env.VITE_API_URL || ''

interface ValidationRule {
  field: string
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'unique' | 'custom'
  value?: any
  message: string
}

interface ValidationSchema {
  rules: ValidationRule[]
}

interface ValidationError {
  field: string
  message: string
}

/**
 * Hook para obtener y aplicar validaciones dinámicas desde el backend
 * Evita duplicar lógica de negocio en el frontend
 */
const useBackendValidations = () => {
  const [validationSchemas, setValidationSchemas] = useState<Record<string, ValidationSchema>>({})
  const [isLoadingSchema, setIsLoadingSchema] = useState(false)

  /**
   * Obtiene el esquema de validación desde el backend
   * @param entity - Nombre de la entidad (installationType, deviceCategory, formCategory)
   */
  const fetchValidationSchema = useCallback(async (entity: string) => {
    if (validationSchemas[entity]) {
      return validationSchemas[entity]
    }

    setIsLoadingSchema(true)
    try {
      const response = await fetch(`${API_URL}validations/${entity}`, {
        headers: getHeadersWithContentType()
      })
      
      if (!response.ok) {
        throw new Error(`Error fetching validation schema for ${entity}`)
      }
      
      const schema = await response.json()
      setValidationSchemas(prev => ({ ...prev, [entity]: schema }))
      return schema
    } catch (error) {
      console.error(`Error fetching validation schema for ${entity}:`, error)
      return null
    } finally {
      setIsLoadingSchema(false)
    }
  }, [validationSchemas])

  /**
   * Valida datos contra el backend directamente
   * @param entity - Nombre de la entidad
   * @param data - Datos a validar
   * @param excludeId - ID a excluir en validaciones de unicidad (para edición)
   */
  const validateWithBackend = useCallback(async (
    entity: string,
    data: Record<string, any>,
    excludeId?: string
  ): Promise<ValidationError[]> => {
    try {
      const response = await fetch(`${API_URL}validations/${entity}/validate`, {
        method: 'POST',
        headers: getHeadersWithContentType(),
        body: JSON.stringify({
          data,
          excludeId
        })
      })
      
      const result = await response.json()
      
      if (result.valid) {
        return []
      }
      
      return result.errors || []
    } catch (error: any) {
      // Si el backend devuelve errores de validación en el error
      if (error.response?.data?.errors) {
        return error.response.data.errors
      }
      
      // Error genérico
      return [{
        field: 'general',
        message: error.response?.data?.message || 'Error de validación'
      }]
    }
  }, [])

  /**
   * Aplica validaciones del esquema localmente (para feedback inmediato)
   * @param schema - Esquema de validación
   * @param data - Datos a validar
   * @param existingItems - Items existentes para validar unicidad
   * @param excludeId - ID a excluir en validaciones de unicidad
   */
  const applyLocalValidation = useCallback((
    schema: ValidationSchema,
    data: Record<string, any>,
    existingItems?: any[],
    excludeId?: string
  ): ValidationError[] => {
    const errors: ValidationError[] = []

    for (const rule of schema.rules) {
      const value = data[rule.field]

      switch (rule.type) {
        case 'required':
          if (!value || (typeof value === 'string' && !value.trim())) {
            errors.push({ field: rule.field, message: rule.message })
          }
          break

        case 'minLength':
          if (typeof value === 'string' && value.trim().length < rule.value) {
            errors.push({ field: rule.field, message: rule.message })
          }
          break

        case 'maxLength':
          if (typeof value === 'string' && value.trim().length > rule.value) {
            errors.push({ field: rule.field, message: rule.message })
          }
          break

        case 'pattern':
          if (typeof value === 'string' && !new RegExp(rule.value).test(value)) {
            errors.push({ field: rule.field, message: rule.message })
          }
          break

        case 'unique':
          if (existingItems && typeof value === 'string') {
            const isDuplicate = existingItems.some(item => {
              const itemValue = item[rule.field]
              const isSameValue = typeof itemValue === 'string' 
                ? itemValue.toLowerCase() === value.trim().toLowerCase()
                : itemValue === value
              const isDifferentItem = excludeId ? item._id !== excludeId : true
              return isSameValue && isDifferentItem
            })
            if (isDuplicate) {
              errors.push({ field: rule.field, message: rule.message })
            }
          }
          break
      }
    }

    return errors
  }, [])

  return {
    fetchValidationSchema,
    validateWithBackend,
    applyLocalValidation,
    isLoadingSchema,
    validationSchemas
  }
}

export default useBackendValidations
