import { CreateTenantData, EditTenantData } from '../types/tenant.types'

export interface ValidationErrors {
  [key: string]: string
}

// Validaciones para crear tenant
export const validateCreateTenant = (data: CreateTenantData): ValidationErrors => {
  const errors: ValidationErrors = {}

  // Validar nombre
  if (!data.name || data.name.trim() === '') {
    errors.name = 'El nombre de la empresa es obligatorio'
  } else if (data.name.trim().length < 2) {
    errors.name = 'El nombre debe tener al menos 2 caracteres'
  } else if (data.name.trim().length > 100) {
    errors.name = 'El nombre no puede tener más de 100 caracteres'
  }

  // Validar subdominio
  if (!data.subdomain || data.subdomain.trim() === '') {
    errors.subdomain = 'El subdominio es obligatorio'
  } else if (data.subdomain.trim().length < 3) {
    errors.subdomain = 'El subdominio debe tener al menos 3 caracteres'
  } else if (data.subdomain.trim().length > 50) {
    errors.subdomain = 'El subdominio no puede tener más de 50 caracteres'
  } else if (!/^[a-z0-9-]+$/.test(data.subdomain.trim())) {
    errors.subdomain = 'El subdominio solo puede contener letras minúsculas, números y guiones'
  }

  // Validar email
  if (!data.email || data.email.trim() === '') {
    errors.email = 'El email es obligatorio'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = 'Email inválido'
  }

  // Validar teléfono (opcional)
  if (data.phone && data.phone.trim() !== '') {
    if (data.phone.trim().length < 8) {
      errors.phone = 'El teléfono debe tener al menos 8 caracteres'
    } else if (data.phone.trim().length > 20) {
      errors.phone = 'El teléfono no puede tener más de 20 caracteres'
    }
  }

  // Validar dirección (opcional)
  if (data.address && data.address.trim().length > 200) {
    errors.address = 'La dirección no puede tener más de 200 caracteres'
  }

  // Validar plan
  if (data.plan && !['basic', 'professional', 'enterprise'].includes(data.plan)) {
    errors.plan = 'Plan inválido'
  }

  // Validar maxUsers
  if (data.maxUsers !== undefined) {
    if (!Number.isInteger(data.maxUsers) || data.maxUsers < 1) {
      errors.maxUsers = 'Mínimo 1 usuario'
    } else if (data.maxUsers > 1000) {
      errors.maxUsers = 'Máximo 1000 usuarios'
    }
  }

  // Validar maxAssets
  if (data.maxAssets !== undefined) {
    if (!Number.isInteger(data.maxAssets) || data.maxAssets < 1) {
      errors.maxAssets = 'Mínimo 1 activo'
    } else if (data.maxAssets > 10000) {
      errors.maxAssets = 'Máximo 10000 activos'
    }
  }

  return errors
}

// Validaciones para editar tenant
export const validateEditTenant = (data: EditTenantData): ValidationErrors => {
  const errors: ValidationErrors = {}

  // Validar nombre (opcional en edición)
  if (data.name !== undefined) {
    if (data.name.trim() === '') {
      errors.name = 'El nombre de la empresa es obligatorio'
    } else if (data.name.trim().length < 2) {
      errors.name = 'El nombre debe tener al menos 2 caracteres'
    } else if (data.name.trim().length > 100) {
      errors.name = 'El nombre no puede tener más de 100 caracteres'
    }
  }

  // Validar email (opcional en edición)
  if (data.email !== undefined) {
    if (data.email.trim() === '') {
      errors.email = 'El email es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errors.email = 'Email inválido'
    }
  }

  // Validar teléfono (opcional)
  if (data.phone !== undefined && data.phone.trim() !== '') {
    if (data.phone.trim().length < 8) {
      errors.phone = 'El teléfono debe tener al menos 8 caracteres'
    } else if (data.phone.trim().length > 20) {
      errors.phone = 'El teléfono no puede tener más de 20 caracteres'
    }
  }

  // Validar dirección (opcional)
  if (data.address !== undefined && data.address.trim().length > 200) {
    errors.address = 'La dirección no puede tener más de 200 caracteres'
  }

  // Validar plan
  if (data.plan !== undefined && !['basic', 'professional', 'enterprise'].includes(data.plan)) {
    errors.plan = 'Plan inválido'
  }

  // Validar maxUsers
  if (data.maxUsers !== undefined) {
    if (!Number.isInteger(data.maxUsers) || data.maxUsers < 1) {
      errors.maxUsers = 'Mínimo 1 usuario'
    } else if (data.maxUsers > 1000) {
      errors.maxUsers = 'Máximo 1000 usuarios'
    }
  }

  // Validar maxAssets
  if (data.maxAssets !== undefined) {
    if (!Number.isInteger(data.maxAssets) || data.maxAssets < 1) {
      errors.maxAssets = 'Mínimo 1 activo'
    } else if (data.maxAssets > 10000) {
      errors.maxAssets = 'Máximo 10000 activos'
    }
  }

  // Validar status
  if (data.status !== undefined && !['active', 'suspended', 'cancelled'].includes(data.status)) {
    errors.status = 'Estado inválido'
  }

  return errors
}

// Validación individual para onBlur
export const validateField = (field: string, value: any, isEdit: boolean = false): string => {
  const fieldData = { [field]: value }
  
  if (isEdit) {
    const errors = validateEditTenant(fieldData as EditTenantData)
    return errors[field] || ''
  } else {
    const errors = validateCreateTenant(fieldData as CreateTenantData)
    return errors[field] || ''
  }
} 