import * as yup from "yup"
import type { TFunction } from "i18next"
import type { ObjetivoTipo, Operador } from "../services/complianceTypes"

export const OPERADORES: Operador[] = [
  "fechaAntiguaMeses",
  "numericoMax",
  "numericoMin",
  "numericoRango",
  "enumEn",
  "exists",
]

export const OBJETIVO_TIPOS: ObjetivoTipo[] = ["activo", "instalacion"]

// Valores de la forma de parámetros por operador (textos crudos del form).
export interface ParametrosFormValues {
  meses?: string
  min?: string
  max?: string
  valores?: string
}

const toFiniteNumber = (value: string | undefined): number | null => {
  if (value === undefined || value.trim() === "") return null
  const n = Number(value.trim())
  return Number.isFinite(n) ? n : null
}

/**
 * Convierte los valores del formulario de parámetros al contrato del motor.
 * Pura: misma entrada → misma salida.
 */
export const buildParametros = (
  operador: Operador,
  valores: ParametrosFormValues,
): Record<string, unknown> => {
  switch (operador) {
    case "fechaAntiguaMeses": {
      const meses = toFiniteNumber(valores.meses)
      return meses === null ? {} : { meses }
    }
    case "numericoMax": {
      const max = toFiniteNumber(valores.max)
      return max === null ? {} : { max }
    }
    case "numericoMin": {
      const min = toFiniteNumber(valores.min)
      return min === null ? {} : { min }
    }
    case "numericoRango": {
      const min = toFiniteNumber(valores.min)
      const max = toFiniteNumber(valores.max)
      if (min === null || max === null) return {}
      return { min, max }
    }
    case "enumEn": {
      const valoresLista = (valores.valores ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
      return valoresLista.length === 0 ? {} : { valores: valoresLista }
    }
    case "exists":
      return {}
  }
}

/**
 * Convierte los parámetros del contrato del motor a valores de formulario.
 * Pura: misma entrada → misma salida.
 */
export const parametrosFromRule = (
  operador: Operador,
  parametros: Record<string, unknown>,
): ParametrosFormValues => {
  const p = parametros as Record<string, unknown>
  switch (operador) {
    case "fechaAntiguaMeses":
      return { meses: p.meses === undefined ? "" : String(p.meses) }
    case "numericoMax":
      return { max: p.max === undefined ? "" : String(p.max) }
    case "numericoMin":
      return { min: p.min === undefined ? "" : String(p.min) }
    case "numericoRango":
      return {
        min: p.min === undefined ? "" : String(p.min),
        max: p.max === undefined ? "" : String(p.max),
      }
    case "enumEn":
      return { valores: Array.isArray(p.valores) ? p.valores.join(",") : "" }
    case "exists":
      return {}
  }
}

/**
 * Valida los parámetros según el operador seleccionado.
 * Pura: misma entrada → misma salida.
 */
export const validateParametros = (
  operador: Operador,
  valores: ParametrosFormValues,
  t: TFunction,
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  const requireNumber = (value: string | undefined, label: string): number | null => {
    const n = toFiniteNumber(value)
    if (n === null) errors.push(t(label))
    return n
  }

  switch (operador) {
    case "fechaAntiguaMeses": {
      const meses = toFiniteNumber(valores.meses)
      if (meses === null || meses <= 0) {
        errors.push(t("compliance.validation.mesesPositivo"))
      }
      break
    }
    case "numericoMax":
      requireNumber(valores.max, "compliance.validation.maxNumerico")
      break
    case "numericoMin":
      requireNumber(valores.min, "compliance.validation.minNumerico")
      break
    case "numericoRango": {
      const min = toFiniteNumber(valores.min)
      const max = toFiniteNumber(valores.max)
      if (min === null || max === null) {
        errors.push(t("compliance.validation.rangoNumerico"))
      } else if (min > max) {
        errors.push(t("compliance.validation.rangoInvertido"))
      }
      break
    }
    case "enumEn": {
      const lista = (valores.valores ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
      if (lista.length === 0) {
        errors.push(t("compliance.validation.enumValores"))
      }
      break
    }
    case "exists":
      break
  }

  return { isValid: errors.length === 0, errors }
}

// ---- Norma ----

export interface NormaFormData {
  codigo: string
  familiaNorma: string
  descripcion?: string
  activa: boolean
}

export const getNormaSchema = (t: TFunction) =>
  yup.object().shape({
    codigo: yup.string().required(t("compliance.validation.codigoRequired")),
    familiaNorma: yup.string().required(t("compliance.validation.familiaRequired")),
    descripcion: yup.string().optional(),
    activa: yup.boolean().default(true),
  })

export const validateNormaForm = async (data: NormaFormData, t: TFunction) => {
  const schema = getNormaSchema(t)
  try {
    await schema.validate(data, { abortEarly: false })
    return { isValid: true, errors: {} as Record<string, string> }
  } catch (err: unknown) {
    const errors: Record<string, string> = {}
    if (err instanceof yup.ValidationError) {
      err.inner.forEach((error) => {
        // Primer error por path: para '' gana el mensaje de required sobre el de oneOf.
        if (error.path && !errors[error.path]) errors[error.path] = error.message
      })
    }
    return { isValid: false, errors }
  }
}

// ---- Regla ----

export interface ReglaFormData {
  nombre: string
  normaId: string
  operador: Operador
  objetivoTipo: ObjetivoTipo
  campoNombre?: string
  etiquetaCampoSnapshot?: string
  habilitada: boolean
}

export const getReglaSchema = (t: TFunction) =>
  yup.object().shape({
    nombre: yup.string().required(t("compliance.validation.nombreRequired")),
    normaId: yup.string().required(t("compliance.validation.normaIdRequired")),
    operador: yup
      .string()
      .required(t("compliance.validation.operadorRequired"))
      .test(
        "operador-registro-cerrado",
        t("compliance.validation.operadorInvalido"),
        (value) => {
          if (!value) return true // '' lo cubre required; acá solo valores no vacíos
          return OPERADORES.includes(value as Operador)
        },
      ),
    objetivoTipo: yup
      .string()
      .required(t("compliance.validation.objetivoTipoRequired"))
      .test(
        "objetivo-tipo-valido",
        t("compliance.validation.objetivoTipoInvalido"),
        (value) => {
          if (!value) return true // '' lo cubre required; acá solo valores no vacíos
          return OBJETIVO_TIPOS.includes(value as ObjetivoTipo)
        },
      ),
    campoNombre: yup.string().optional(),
    etiquetaCampoSnapshot: yup.string().optional(),
    habilitada: yup.boolean().default(true),
  })

export const validateReglaForm = async (data: ReglaFormData, t: TFunction) => {
  const schema = getReglaSchema(t)
  try {
    await schema.validate(data, { abortEarly: false })
    return { isValid: true, errors: {} as Record<string, string> }
  } catch (err: unknown) {
    const errors: Record<string, string> = {}
    if (err instanceof yup.ValidationError) {
      err.inner.forEach((error) => {
        // Primer error por path: para '' gana el mensaje de required sobre el de oneOf.
        if (error.path && !errors[error.path]) errors[error.path] = error.message
      })
    }
    return { isValid: false, errors }
  }
}

export const validateReglaField = async (name: string, value: unknown, t: TFunction) => {
  const schema = getReglaSchema(t)
  try {
    await schema.validateAt(name, { [name]: value })
    return { isValid: true, error: "" }
  } catch (err: unknown) {
    if (err instanceof yup.ValidationError) {
      return { isValid: false, error: err.message }
    }
    return { isValid: false, error: "Invalid field" }
  }
}