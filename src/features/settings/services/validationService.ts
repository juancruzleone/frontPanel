import { getHeadersWithContentType } from '../../../shared/utils/apiHeaders'

const API_URL = import.meta.env.VITE_API_URL || ''

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResponse {
  valid: boolean
  errors?: ValidationError[]
}

/**
 * Servicio para interactuar con las validaciones del backend
 * Mantiene toda la lógica de negocio en el backend
 */
class ValidationService {
  /**
   * Valida datos de tipo de instalación
   */
  async validateInstallationType(
    data: { nombre: string },
    excludeId?: string
  ): Promise<ValidationResponse> {
    try {
      const response = await fetch(`${API_URL}installation-types/validate`, {
        method: 'POST',
        headers: getHeadersWithContentType(),
        body: JSON.stringify({
          ...data,
          excludeId
        })
      })

      if (response.ok) {
        return { valid: true }
      }

      if (response.status === 400) {
        const errorData = await response.json()
        return {
          valid: false,
          errors: errorData.errors || [
            { field: 'nombre', message: errorData.message }
          ]
        }
      }

      throw new Error('Error al validar tipo de instalación')
    } catch (error: any) {
      throw error
    }
  }

  /**
   * Valida datos de categoría de dispositivo
   */
  async validateDeviceCategory(
    data: { nombre: string },
    excludeId?: string
  ): Promise<ValidationResponse> {
    try {
      const response = await fetch(`${API_URL}device-categories/validate`, {
        method: 'POST',
        headers: getHeadersWithContentType(),
        body: JSON.stringify({
          ...data,
          excludeId
        })
      })

      if (response.ok) {
        return { valid: true }
      }

      if (response.status === 400) {
        const errorData = await response.json()
        return {
          valid: false,
          errors: errorData.errors || [
            { field: 'nombre', message: errorData.message }
          ]
        }
      }

      throw new Error('Error al validar categoría de dispositivo')
    } catch (error: any) {
      throw error
    }
  }

  /**
   * Valida datos de categoría de formulario
   */
  async validateFormCategory(
    data: { nombre: string },
    excludeId?: string
  ): Promise<ValidationResponse> {
    try {
      const response = await fetch(`${API_URL}form-categories/validate`, {
        method: 'POST',
        headers: getHeadersWithContentType(),
        body: JSON.stringify({
          ...data,
          excludeId
        })
      })

      if (response.ok) {
        return { valid: true }
      }

      if (response.status === 400) {
        const errorData = await response.json()
        return {
          valid: false,
          errors: errorData.errors || [
            { field: 'nombre', message: errorData.message }
          ]
        }
      }

      throw new Error('Error al validar categoría de formulario')
    } catch (error: any) {
      throw error
    }
  }

  /**
   * Obtiene las reglas de validación desde el backend
   * Esto permite que el backend defina las reglas y el frontend las aplique
   */
  async getValidationRules(entity: string) {
    try {
      const response = await fetch(`${API_URL}validations/${entity}/rules`, {
        headers: getHeadersWithContentType()
      })
      
      if (!response.ok) {
        throw new Error(`Error fetching validation rules for ${entity}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error(`Error fetching validation rules for ${entity}:`, error)
      return null
    }
  }
}

export default new ValidationService()
