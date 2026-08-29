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

// Catalog contracts are intentionally separate from the historical Norma/Regla model.
export type CatalogState = 'PASS' | 'WARN' | 'FAIL' | 'NOT_APPLICABLE' | 'INSUFFICIENT_EVIDENCE' | 'ERROR'
export type CatalogParameterType = 'string' | 'number' | 'boolean' | 'enum'
export interface CatalogParameterDefinition { key: string; type: CatalogParameterType; min?: number; max?: number; allowed?: string[] }
export interface CatalogControlReference { controlKey: string; version: number; scope: string; parameterDefinitions: CatalogParameterDefinition[] }
export interface CatalogEvaluatorDescriptor { evaluatorKey: string; version: number; operationId: string; implementationVersion: string }
export interface CatalogRights { author: 'Leonix'; rightsStatus: 'original_operational_content' }
export interface CatalogPackSummary {
  packKey: string; version: number; state: 'published'
  controlRefs: Array<{ controlKey: string; version: number }>
  evaluatorRefs: Array<{ evaluatorKey: string; version: number }>
  rights: CatalogRights
}
export interface CatalogPackDetail { packKey: string; version: number; state: 'published'; rights: CatalogRights; controls: CatalogControlReference[]; evaluators: CatalogEvaluatorDescriptor[] }
export interface CatalogAssignment {
  assignmentKey: string; packKey: string; version: number; status: 'active' | 'inactive'; scope: string
  parameters: Record<string, unknown>; controlScopes: Array<{ controlKey: string; version: number; scope: string }>; createdAt?: string; updatedAt?: string
}
export interface CatalogRunSummary {
  _id: string; source: 'catalog'; estado: EscaneoEstado
  progress: { total: number; processed: number; skipped: number }
  counts: Record<CatalogState, number>; score: number | null; createdAt?: string; startedAt?: string; finishedAt?: string
}
export interface CatalogRunDetail extends CatalogRunSummary {
  assignment: CatalogAssignment
  pack: { packKey: string; version: number; state: 'published' | 'disabled'; controlRefs: Array<{ controlKey: string; version: number }>; evaluatorRefs: Array<{ evaluatorKey: string; version: number }> }
  controls: CatalogControlReference[]; evaluators: CatalogEvaluatorDescriptor[]; rights: CatalogRights; applicability: { scope: string }; snapshotAt?: string
}
export interface CatalogFinding { id: string; state: CatalogState; reason: string | null; evaluatedAt: string; targetId: string; controlKey: string; controlVersion: number; dataHash: string | null }
export interface PagedResult<T> { items: T[]; page: number; limit: number; total: number; totalPages: number }
