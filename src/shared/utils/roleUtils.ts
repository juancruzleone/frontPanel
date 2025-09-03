export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  TECHNICIAN: 'tecnico',
  TECHNICIAN_ALT: 'técnico'
} as const

export type UserRole = typeof ROLES[keyof typeof ROLES]

export const isTechnician = (role: string | null): boolean => {
  return role && [ROLES.TECHNICIAN, ROLES.TECHNICIAN_ALT].includes(role.toLowerCase() as any)
}

export const isSuperAdmin = (role: string | null): boolean => {
  return role === ROLES.SUPER_ADMIN
}

export const isAdmin = (role: string | null): boolean => {
  return role === ROLES.ADMIN
}

// Secciones que NO debe ver el super_admin
export const SUPER_ADMIN_RESTRICTED_SECTIONS = [
  'inicio',
  'instalaciones',
  'activos', 
  'formularios',
  'calendario',
  'ordenes-trabajo',
  'personal'
] as const

// Secciones que SOLO puede ver el super_admin
export const SUPER_ADMIN_ONLY_SECTIONS = [
  'panel-admin',
  'tenants'
] as const

export const canAccessSection = (role: string | null, section: string): boolean => {
  if (!role) return false
  
  // Super admin solo puede acceder a sus secciones específicas y perfil
  if (isSuperAdmin(role)) {
    return SUPER_ADMIN_ONLY_SECTIONS.includes(section as any) || section === 'perfil'
  }
  
  // Técnicos no pueden acceder a ciertas secciones
  if (isTechnician(role)) {
    const technicianRestrictedSections = ['activos', 'formularios', 'personal']
    return !technicianRestrictedSections.includes(section)
  }
  
  // Admin puede acceder a todo excepto las secciones exclusivas del super_admin
  if (isAdmin(role)) {
    return !SUPER_ADMIN_ONLY_SECTIONS.includes(section as any)
  }
  
  return true
} 