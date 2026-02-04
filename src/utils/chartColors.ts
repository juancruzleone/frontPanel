/**
 * Paleta de colores consistente para gráficos
 * Basada en las variables CSS del diseño de la aplicación
 * 
 * Estos colores son fijos y no cambiarán con cada actualización de datos,
 * garantizando una experiencia visual consistente.
 */

// Colores para planes de tenants (gráfico de barras)
export const PLAN_COLORS: { [key: string]: string } = {
  'basic': 'var(--color-primary)',      // Negro/Blanco según tema
  'professional': 'var(--color-secondary)', // #057E74 - Verde Leonix
  'enterprise': 'var(--color-accent)',   // #fbc02d - Amarillo/Dorado
}

// Colores para estados de tenants (gráfico de torta)
export const TENANT_STATUS_COLORS: { [key: string]: string } = {
  'active': 'var(--color-success)',      // #388e3c - Verde éxito
  'suspended': 'var(--color-accent)',    // #fbc02d - Amarillo/Advertencia
  'cancelled': 'var(--color-danger)',    // #e53935 - Rojo peligro
}

// Colores para tipos de órdenes de trabajo (gráfico de barras)
export const WORK_ORDER_TYPE_COLORS: { [key: string]: string } = {
  'maintenance': 'var(--color-secondary)',   // #057E74 - Verde Leonix
  'repair': '#e53935',                       // Rojo - Reparaciones urgentes
  'installation': '#2196F3',                 // Azul - Instalaciones
  'inspection': 'var(--color-accent)',       // #fbc02d - Amarillo - Inspecciones
  'other': 'var(--color-primary)',           // Negro/Blanco según tema
}

// Colores para estados de órdenes de trabajo (gráfico de torta)
export const WORK_ORDER_STATUS_COLORS: { [key: string]: string } = {
  'pending': 'var(--color-accent)',          // #fbc02d - Amarillo
  'assigned': '#2196F3',                     // Azul
  'inProgress': 'var(--color-secondary)',    // #057E74 - Verde Leonix
  'completed': 'var(--color-success)',       // #388e3c - Verde éxito
  'cancelled': 'var(--color-danger)',        // #e53935 - Rojo
}

// Color para gráficos de línea (evolución temporal)
export const LINE_CHART_COLOR = 'var(--color-secondary)' // #057E74 - Verde Leonix (más distintivo que primary)

// Función helper para obtener un color por defecto si no existe en el mapa
export const getChartColor = (colorMap: { [key: string]: string }, key: string, fallback: string = 'var(--color-primary)'): string => {
  return colorMap[key] || fallback
}
