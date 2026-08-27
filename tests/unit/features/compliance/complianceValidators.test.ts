import { describe, it, expect } from 'vitest'
import {
  validateNormaForm,
  validateReglaForm,
  validateReglaField,
  buildParametros,
  parametrosFromRule,
  validateParametros,
} from '../../../../src/features/compliance/validators/complianceValidators'

const t = (key: string) => key

describe('complianceValidators — normas', () => {
  it('acepta una norma válida', async () => {
    const result = await validateNormaForm(
      { codigo: 'IRAM 3517', familiaNorma: 'IRAM', descripcion: '', activa: true },
      t,
    )
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('rechaza norma sin codigo', async () => {
    const result = await validateNormaForm({ codigo: '', familiaNorma: 'IRAM', descripcion: '', activa: true }, t)
    expect(result.isValid).toBe(false)
    expect(result.errors.codigo).toBeTruthy()
  })

  it('rechaza norma sin familiaNorma', async () => {
    const result = await validateNormaForm({ codigo: 'IRAM 3517', familiaNorma: '', descripcion: '', activa: true }, t)
    expect(result.isValid).toBe(false)
    expect(result.errors.familiaNorma).toBeTruthy()
  })
})

describe('complianceValidators — reglas', () => {
  const validRegla = {
    nombre: 'Recarga cada 5 años',
    normaId: 'n1',
    operador: 'fechaAntiguaMeses',
    objetivoTipo: 'activo',
    campoNombre: 'fechaRecarga',
    habilitada: true,
  }

  it('acepta una regla válida', async () => {
    const result = await validateReglaForm(validRegla, t)
    expect(result.isValid).toBe(true)
  })

  it('rechaza regla sin nombre', async () => {
    const result = await validateReglaForm({ ...validRegla, nombre: '' }, t)
    expect(result.isValid).toBe(false)
    expect(result.errors.nombre).toBeTruthy()
  })

  it('rechaza regla sin normaId', async () => {
    const result = await validateReglaForm({ ...validRegla, normaId: '' }, t)
    expect(result.isValid).toBe(false)
    expect(result.errors.normaId).toBeTruthy()
  })

  it('rechaza regla con operador fuera del registro cerrado', async () => {
    const result = await validateReglaForm({ ...validRegla, operador: 'boolTrue' }, t)
    expect(result.isValid).toBe(false)
    expect(result.errors.operador).toBeTruthy()
  })

  it('rechaza regla con objetivoTipo inválido', async () => {
    const result = await validateReglaForm({ ...validRegla, objetivoTipo: 'maquina' }, t)
    expect(result.isValid).toBe(false)
    expect(result.errors.objetivoTipo).toBeTruthy()
  })

  it('valida un campo individual', async () => {
    const result = await validateReglaField('nombre', '', t)
    expect(result.isValid).toBe(false)
    expect(result.error).toBeTruthy()
  })
})

describe('buildParametros — forma → contrato del motor', () => {
  it('fechaAntiguaMeses convierte meses a número', () => {
    expect(buildParametros('fechaAntiguaMeses', { meses: '60' })).toEqual({ meses: 60 })
  })

  it('numericoMax convierte max a número', () => {
    expect(buildParametros('numericoMax', { max: '100' })).toEqual({ max: 100 })
  })

  it('numericoRango convierte min y max', () => {
    expect(buildParametros('numericoRango', { min: '0', max: '10' })).toEqual({ min: 0, max: 10 })
  })

  it('enumEn convierte la lista CSV en array sin vacíos ni espacios', () => {
    expect(buildParametros('enumEn', { valores: ' OK , ,FALLA ' })).toEqual({ valores: ['OK', 'FALLA'] })
  })

  it('exists produce parametros vacíos', () => {
    expect(buildParametros('exists', {})).toEqual({})
  })
})

describe('parametrosFromRule — contrato del motor → forma', () => {
  it('fechaAntiguaMeses expone meses como texto', () => {
    expect(parametrosFromRule('fechaAntiguaMeses', { meses: 60 })).toEqual({ meses: '60' })
  })

  it('numericoRango expone min y max', () => {
    expect(parametrosFromRule('numericoRango', { min: 1, max: 5 })).toEqual({ min: '1', max: '5' })
  })

  it('enumEn une los valores con coma', () => {
    expect(parametrosFromRule('enumEn', { valores: ['A', 'B'] })).toEqual({ valores: 'A,B' })
  })

  it('exists devuelve forma vacía', () => {
    expect(parametrosFromRule('exists', {})).toEqual({})
  })
})

describe('validateParametros — reglas por operador', () => {
  it('rechaza meses no numéricos', () => {
    const result = validateParametros('fechaAntiguaMeses', { meses: 'abc' }, t)
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('rechaza meses <= 0', () => {
    const result = validateParametros('fechaAntiguaMeses', { meses: '0' }, t)
    expect(result.isValid).toBe(false)
  })

  it('acepta meses positivos', () => {
    expect(validateParametros('fechaAntiguaMeses', { meses: '24' }, t).isValid).toBe(true)
  })

  it('rechaza rango con min mayor que max', () => {
    const result = validateParametros('numericoRango', { min: '10', max: '5' }, t)
    expect(result.isValid).toBe(false)
  })

  it('acepta rango con min <= max', () => {
    expect(validateParametros('numericoRango', { min: '0', max: '10' }, t).isValid).toBe(true)
  })

  it('rechaza enumEn sin valores', () => {
    const result = validateParametros('enumEn', { valores: ' , ' }, t)
    expect(result.isValid).toBe(false)
  })

  it('acepta enumEn con valores', () => {
    expect(validateParametros('enumEn', { valores: 'OK,FALLA' }, t).isValid).toBe(true)
  })

  it('exists siempre es válido (sin parámetros)', () => {
    expect(validateParametros('exists', {}, t).isValid).toBe(true)
  })

  it('rechaza max no numérico', () => {
    const result = validateParametros('numericoMax', { max: '' }, t)
    expect(result.isValid).toBe(false)
  })
})