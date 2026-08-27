// Tipos del dominio compliance (frontGMAO).
// Espejan el contrato de la API de backPanel (rutas /api/normas-cumplimiento,
// /api/reglas-cumplimiento, /api/escaneos-cumplimiento, /api/cumplimiento/*).

export type EscaneoEstado = 'pendiente' | 'corriendo' | 'completado' | 'error'

export type ObjetivoTipo = 'activo' | 'instalacion'

export type Operador =
  | 'fechaAntiguaMeses'
  | 'numericoMax'
  | 'numericoMin'
  | 'numericoRango'
  | 'enumEn'
  | 'exists'

export type EstadoResultado =
  | 'cumplido'
  | 'incumplido'
  | 'sin_evidencia'
  | 'no_aplicable'
  | 'error'

export interface Norma {
  _id: string
  codigo: string
  familiaNorma: string
  descripcion?: string
  activa: boolean
  createdAt?: string
  updatedAt?: string
}

export interface Regla {
  _id: string
  normaId: string
  nombre: string
  operador: Operador
  parametros: Record<string, unknown>
  objetivoTipo: ObjetivoTipo
  campoNombre?: string
  etiquetaCampoSnapshot?: string
  habilitada: boolean
  createdAt?: string
  updatedAt?: string
}

export interface Escaneo {
  _id: string
  estado: EscaneoEstado
  objetivosTotales: number
  procesados: number
  omitidos: number
  cumplidos: number
  incumplidos: number
  sinEvidencia: number
  errores: number
  iniciadoPor?: string
  startedAt?: string
  finishedAt?: string
  errorDetalle?: string
}

export interface ResumenCumplimiento {
  escaneoId: string | null
  estado?: string | null
  totalResultados: number
  porEstado: {
    cumplido: number
    incumplido: number
    sin_evidencia: number
    error: number
  }
}

export interface ResultadoCumplimiento {
  _id: string
  escaneoId: string
  reglaId: string
  normaId: string
  objetivoTipo: ObjetivoTipo
  objetoId: string
  estado: EstadoResultado
  valorEvidencia?: string
  esperado?: string
  razon: string
  evaluadoEn: string
}

export type NormaPayload = Omit<Norma, '_id' | 'createdAt' | 'updatedAt'>
export type ReglaPayload = Omit<Regla, '_id' | 'createdAt' | 'updatedAt'>