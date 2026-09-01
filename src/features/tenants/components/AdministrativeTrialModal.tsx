import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { tenantServices } from "../services/tenantServices"
import type { AdministrativeTrialPlan, AdministrativeTrialRequest } from "../types/administrativeTrial.types"
import styles from "../styles/administrativeTrial.module.css"

export interface AdministrativeTrialModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void | Promise<void>
}

const initialForm: AdministrativeTrialRequest = {
  companyName: "",
  email: "",
  password: "",
  userName: "",
  plan: "professional",
  firstName: "",
  lastName: "",
  phone: "",
  address: "",
  notes: "",
}

export const AdministrativeTrialModal = ({ isOpen, onClose, onSuccess }: AdministrativeTrialModalProps) => {
  const { t } = useTranslation()
  const [form, setForm] = useState<AdministrativeTrialRequest>(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const resetAndClose = useCallback(() => {
    setForm(initialForm)
    setLoading(false)
    setError(null)
    setSuccess(false)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    closeButtonRef.current?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) resetAndClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isOpen, loading, resetAndClose])

  if (!isOpen) return null

  const update = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setError(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!(["starter", "professional", "enterprise"] as string[]).includes(form.plan)) {
      setError(t("administrativeTrial.validation.plan"))
      return
    }

    setLoading(true)
    setError(null)
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, value]) => typeof value !== "string" || value.trim() !== ""),
      ) as unknown as AdministrativeTrialRequest
      await tenantServices.createAdministrativeTrial(payload)
      setSuccess(true)
      await onSuccess()
      resetAndClose()
    } catch (creationError) {
      setError(creationError instanceof Error ? creationError.message : t("administrativeTrial.error"))
    } finally {
      setLoading(false)
    }
  }

  const plans: AdministrativeTrialPlan[] = ["starter", "professional", "enterprise"]

  return (
    <div className={styles.backdrop} onMouseDown={(event) => event.target === event.currentTarget && !loading && resetAndClose()}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="administrative-trial-title">
        <header className={styles.header}>
          <div>
            <h2 id="administrative-trial-title">{t("administrativeTrial.title")}</h2>
            <p className={styles.description}>{t("administrativeTrial.duration")}</p>
          </div>
          <button ref={closeButtonRef} className={styles.close} type="button" onClick={resetAndClose} disabled={loading} aria-label={t("common.close")}><X /></button>
        </header>

        <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
          <label className={styles.field}>{t("administrativeTrial.companyName")}<input name="companyName" value={form.companyName} onChange={update} required minLength={2} maxLength={100} /></label>
          <label className={styles.field}>{t("administrativeTrial.email")}<input name="email" type="email" value={form.email} onChange={update} required maxLength={255} /></label>
          <label className={styles.field}>{t("administrativeTrial.password")}<input name="password" type="password" value={form.password} onChange={update} required minLength={8} maxLength={100} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}" /></label>
          <label className={styles.field}>{t("administrativeTrial.userName")}<input name="userName" value={form.userName} onChange={update} minLength={6} maxLength={50} pattern="[a-zA-Z0-9_]+" /></label>
          <label className={styles.field}>{t("administrativeTrial.plan")}<select name="plan" value={form.plan} onChange={update} required>{plans.map((plan) => <option key={plan} value={plan}>{t(`billing.plans.${plan}`)}</option>)}</select></label>
          <label className={styles.field}>{t("administrativeTrial.firstName")}<input name="firstName" value={form.firstName} onChange={update} maxLength={50} /></label>
          <label className={styles.field}>{t("administrativeTrial.lastName")}<input name="lastName" value={form.lastName} onChange={update} maxLength={50} /></label>
          <label className={styles.field}>{t("administrativeTrial.phone")}<input name="phone" value={form.phone} onChange={update} maxLength={50} /></label>
          <label className={`${styles.field} ${styles.wide}`}>{t("administrativeTrial.address")}<input name="address" value={form.address} onChange={update} maxLength={255} /></label>
          <label className={`${styles.field} ${styles.wide}`}>{t("administrativeTrial.notes")}<textarea name="notes" value={form.notes} onChange={update} maxLength={1000} rows={3} /></label>
          <div className={styles.wide} aria-live="polite">
            {error && <p className={styles.error} role="alert">{error}</p>}
            {success && <p className={styles.success}>{t("administrativeTrial.success")}</p>}
          </div>
          <div className={styles.actions}>
            <button className={styles.secondaryButton} type="button" onClick={resetAndClose} disabled={loading}>{t("common.cancel")}</button>
            <button className={styles.button} type="submit" disabled={loading}>{loading ? t("administrativeTrial.creating") : t("administrativeTrial.submit")}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
