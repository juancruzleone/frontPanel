export type IncidentType =
  | 'falla_detectada'
  | 'desgaste_anomalo'
  | 'riesgo_seguridad'
  | 'operacion_defectuosa'
  | 'otro'

export type IncidentPriority = 'baja' | 'media' | 'alta'

export interface CreateIncidentData {
  instalacionId: string
  dispositivoId: string
  tipoIncidencia: IncidentType
  prioridadSugerida: IncidentPriority
  descripcion: string
  fotos?: string[]
  ordenPreventivaOrigenId?: string | null
  observaciones?: string
  titulo?: string
}

export interface IncidentReportResponse {
  success: boolean
  message: string
  data?: {
    _id?: string
    titulo?: string
    estado?: string
    origen?: string
    instalacion?: {
      _id: string
      company: string
      address?: string
    }
    dispositivo?: {
      _id: string
      nombre: string
    }
  }
}
