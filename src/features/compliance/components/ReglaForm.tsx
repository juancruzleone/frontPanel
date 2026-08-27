import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  OPERADORES,
  OBJETIVO_TIPOS,
  validateReglaForm,
  validateParametros,
  buildParametros,
  parametrosFromRule,
  type ReglaFormData,
  type ParametrosFormValues,
} from "../validators/complianceValidators"
import type { Norma, Operador, Regla, ReglaPayload } from "../services/complianceTypes"
import styles from "../styles/compliance.module.css"
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"

interface ReglaFormProps {
  initialData?: Regla | null
  normas: Norma[]
  onSubmit: (data: ReglaPayload) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export const ReglaForm: React.FC<ReglaFormProps> = ({
  initialData,
  normas,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<ReglaFormData>({
    nombre: initialData?.nombre ?? "",
    normaId: initialData?.normaId ?? "",
    operador: initialData?.operador ?? ("" as Operador),
    objetivoTipo: initialData?.objetivoTipo ?? ("" as ReglaFormData["objetivoTipo"]),
    campoNombre: initialData?.campoNombre ?? "",
    etiquetaCampoSnapshot: initialData?.etiquetaCampoSnapshot ?? "",
    habilitada: initialData?.habilitada ?? true,
  })
  const [parametros, setParametros] = useState<ParametrosFormValues>(() =>
    initialData
      ? parametrosFromRule(initialData.operador, initialData.parametros)
      : {},
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [parametrosErrors, setParametrosErrors] = useState<string[]>([])

  useEffect(() => {
    if (initialData) {
      setFormData({
        nombre: initialData.nombre ?? "",
        normaId: initialData.normaId ?? "",
        operador: initialData.operador,
        objetivoTipo: initialData.objetivoTipo,
        campoNombre: initialData.campoNombre ?? "",
        etiquetaCampoSnapshot: initialData.etiquetaCampoSnapshot ?? "",
        habilitada: initialData.habilitada ?? true,
      })
      setParametros(parametrosFromRule(initialData.operador, initialData.parametros))
    }
  }, [initialData])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value
    setFormData((prev) => ({ ...prev, [name]: val }))
    setErrors((prev) => ({ ...prev, [name]: "" }))

    if (name === "operador") {
      setParametros(parametrosFromRule(value as Operador, {}))
      setParametrosErrors([])
    }
  }

  const handleParametroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setParametros((prev) => ({ ...prev, [name]: value }))
    setParametrosErrors([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = await validateReglaForm(formData, t)
    const parametrosValidation = validateParametros(formData.operador, parametros, t)

    if (!validation.isValid || !parametrosValidation.isValid) {
      setErrors(validation.errors)
      setParametrosErrors(parametrosValidation.errors)
      return
    }

    const payload: ReglaPayload = {
      nombre: formData.nombre,
      normaId: formData.normaId,
      operador: formData.operador,
      objetivoTipo: formData.objetivoTipo,
      campoNombre: formData.campoNombre || undefined,
      etiquetaCampoSnapshot: formData.etiquetaCampoSnapshot || undefined,
      habilitada: formData.habilitada,
      parametros: buildParametros(formData.operador, parametros),
    }

    try {
      await onSubmit(payload)
    } catch (err: unknown) {
      setErrors({ submit: err instanceof Error ? err.message : t("common.error") })
    }
  }

  const operadorSeleccionado = formData.operador as Operador

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="nombre">
          {t("compliance.reglas.nombre")} *
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          value={formData.nombre}
          onChange={handleChange}
          disabled={isLoading}
          className={`${styles.formInput} ${errors.nombre ? styles.errorInput : ""}`}
        />
        {errors.nombre && <p className={styles.formError}>{errors.nombre}</p>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="normaId">
          {t("compliance.reglas.norma")} *
        </label>
        <select
          id="normaId"
          name="normaId"
          value={formData.normaId}
          onChange={handleChange}
          disabled={isLoading}
          className={`${styles.formSelect} ${errors.normaId ? styles.errorInput : ""}`}
        >
          <option value="">—</option>
          {normas.map((norma) => (
            <option key={norma._id} value={norma._id}>
              {norma.codigo}
            </option>
          ))}
        </select>
        {errors.normaId && <p className={styles.formError}>{errors.normaId}</p>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="operador">
          {t("compliance.reglas.operador")} *
        </label>
        <select
          id="operador"
          name="operador"
          value={formData.operador}
          onChange={handleChange}
          disabled={isLoading}
          className={`${styles.formSelect} ${errors.operador ? styles.errorInput : ""}`}
        >
          <option value="">—</option>
          {OPERADORES.map((operador) => (
            <option key={operador} value={operador}>
              {t(`compliance.operador.${operador}`)}
            </option>
          ))}
        </select>
        {errors.operador && <p className={styles.formError}>{errors.operador}</p>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="objetivoTipo">
          {t("compliance.reglas.objetivoTipo")} *
        </label>
        <select
          id="objetivoTipo"
          name="objetivoTipo"
          value={formData.objetivoTipo}
          onChange={handleChange}
          disabled={isLoading}
          className={`${styles.formSelect} ${errors.objetivoTipo ? styles.errorInput : ""}`}
        >
          <option value="">—</option>
          {OBJETIVO_TIPOS.map((tipo) => (
            <option key={tipo} value={tipo}>
              {t(`compliance.reglas.objetivoTipoOptions.${tipo}`)}
            </option>
          ))}
        </select>
        {errors.objetivoTipo && <p className={styles.formError}>{errors.objetivoTipo}</p>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="campoNombre">
          {t("compliance.reglas.campoNombre")}
        </label>
        <input
          id="campoNombre"
          name="campoNombre"
          type="text"
          value={formData.campoNombre}
          onChange={handleChange}
          disabled={isLoading}
          className={styles.formInput}
          placeholder={t("compliance.reglas.etiquetaCampo")}
        />
      </div>

      {operadorSeleccionado && (
        <fieldset className={styles.formGroup}>
          <legend className={styles.formLabel}>{t("compliance.reglas.parametros")}</legend>

          {operadorSeleccionado === "fechaAntiguaMeses" && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="parametros-meses">
                {t("compliance.reglas.parametrosMeses")}
              </label>
              <input
                id="parametros-meses"
                name="meses"
                type="number"
                min={1}
                value={parametros.meses ?? ""}
                onChange={handleParametroChange}
                disabled={isLoading}
                className={styles.formInput}
              />
            </div>
          )}

          {(operadorSeleccionado === "numericoMax" ||
            operadorSeleccionado === "numericoRango") && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="parametros-max">
                {t("compliance.reglas.parametrosMax")}
              </label>
              <input
                id="parametros-max"
                name="max"
                type="number"
                value={parametros.max ?? ""}
                onChange={handleParametroChange}
                disabled={isLoading}
                className={styles.formInput}
              />
            </div>
          )}

          {(operadorSeleccionado === "numericoMin" ||
            operadorSeleccionado === "numericoRango") && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="parametros-min">
                {t("compliance.reglas.parametrosMin")}
              </label>
              <input
                id="parametros-min"
                name="min"
                type="number"
                value={parametros.min ?? ""}
                onChange={handleParametroChange}
                disabled={isLoading}
                className={styles.formInput}
              />
            </div>
          )}

          {operadorSeleccionado === "enumEn" && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="parametros-valores">
                {t("compliance.reglas.parametrosValores")}
              </label>
              <input
                id="parametros-valores"
                name="valores"
                type="text"
                value={parametros.valores ?? ""}
                onChange={handleParametroChange}
                disabled={isLoading}
                className={styles.formInput}
              />
            </div>
          )}

          {operadorSeleccionado === "exists" && (
            <p className={styles.parametrosHint}>—</p>
          )}

          {parametrosErrors.map((message) => (
            <p key={message} className={styles.formError}>
              {message}
            </p>
          ))}
        </fieldset>
      )}

      <div className={styles.checkboxGroup}>
        <input
          id="habilitada"
          name="habilitada"
          type="checkbox"
          checked={formData.habilitada}
          onChange={handleChange}
          disabled={isLoading}
        />
        <label htmlFor="habilitada">{t("compliance.reglas.habilitada")}</label>
      </div>

      <div className={formButtonStyles.actions}>
        <button
          type="button"
          onClick={onCancel}
          className={formButtonStyles.cancelButton}
          disabled={isLoading}
        >
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          className={formButtonStyles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? t("common.loading") : t("common.save")}
        </button>
      </div>
      {errors.submit && <p className={styles.formError}>{errors.submit}</p>}
    </form>
  )
}