import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { validateNormaForm, type NormaFormData } from "../validators/complianceValidators"
import type { Norma } from "../services/complianceTypes"
import styles from "../styles/compliance.module.css"
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"

const FAMILIAS_SUGERIDAS = ["IRAM", "AEA", "SRT", "NACIONAL"]

interface NormaFormProps {
  initialData?: Norma | null
  onSubmit: (data: NormaFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export const NormaForm: React.FC<NormaFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<NormaFormData>({
    codigo: initialData?.codigo ?? "",
    familiaNorma: initialData?.familiaNorma ?? "",
    descripcion: initialData?.descripcion ?? "",
    activa: initialData?.activa ?? true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialData) {
      setFormData({
        codigo: initialData.codigo ?? "",
        familiaNorma: initialData.familiaNorma ?? "",
        descripcion: initialData.descripcion ?? "",
        activa: initialData.activa ?? true,
      })
    }
  }, [initialData])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value
    setFormData((prev) => ({ ...prev, [name]: val }))
    setErrors((prev) => ({ ...prev, [name]: "" }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = await validateNormaForm(formData, t)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }
    try {
      await onSubmit(formData)
    } catch (err: unknown) {
      setErrors({ submit: err instanceof Error ? err.message : t("common.error") })
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="codigo">
          {t("compliance.normas.codigo")} *
        </label>
        <input
          id="codigo"
          name="codigo"
          type="text"
          value={formData.codigo}
          onChange={handleChange}
          disabled={isLoading}
          className={`${styles.formInput} ${errors.codigo ? styles.errorInput : ""}`}
        />
        {errors.codigo && <p className={styles.formError}>{errors.codigo}</p>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="familiaNorma">
          {t("compliance.normas.familiaNorma")} *
        </label>
        <input
          id="familiaNorma"
          name="familiaNorma"
          type="text"
          list="familias-norma"
          value={formData.familiaNorma}
          onChange={handleChange}
          disabled={isLoading}
          className={`${styles.formInput} ${errors.familiaNorma ? styles.errorInput : ""}`}
        />
        <datalist id="familias-norma">
          {FAMILIAS_SUGERIDAS.map((familia) => (
            <option key={familia} value={familia} />
          ))}
        </datalist>
        {errors.familiaNorma && <p className={styles.formError}>{errors.familiaNorma}</p>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="descripcion">
          {t("compliance.normas.descripcion")}
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          value={formData.descripcion}
          onChange={handleChange}
          disabled={isLoading}
          className={styles.formInput}
          rows={3}
        />
      </div>

      <div className={styles.checkboxGroup}>
        <input
          id="activa"
          name="activa"
          type="checkbox"
          checked={formData.activa}
          onChange={handleChange}
          disabled={isLoading}
        />
        <label htmlFor="activa">{t("compliance.normas.activa")}</label>
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