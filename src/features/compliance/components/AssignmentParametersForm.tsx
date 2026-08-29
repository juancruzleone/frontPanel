import { FormEvent, useState } from "react"
import { useTranslation } from "react-i18next"
import type {
  CatalogParameterDefinition,
  CatalogParameterValue,
} from "../services/complianceTypes"
import styles from "../styles/compliance.module.css"

export type AssignmentFormError = "forbidden" | "mutationError"

export interface AssignmentParametersFormProps {
  definitions: CatalogParameterDefinition[]
  canSubmit: boolean
  disabled?: boolean
  pending?: boolean
  error?: AssignmentFormError
  onSubmit: (parameters: Record<string, CatalogParameterValue>) => Promise<void>
}

export type AssignmentValidationIssue = "required" | "invalid"

const hasOwn = (values: Record<string, CatalogParameterValue>, key: string) =>
  Object.prototype.hasOwnProperty.call(values, key)

const parseValue = (definition: CatalogParameterDefinition, raw: string | boolean) => {
  if (definition.type === "boolean") return raw === true || raw === "true"
  if (definition.type === "string") return String(raw)
  return Number(raw)
}

export const validateAssignmentParameters = (
  definitions: CatalogParameterDefinition[],
  values: Record<string, CatalogParameterValue>,
): Record<string, AssignmentValidationIssue> => {
  const issues: Record<string, AssignmentValidationIssue> = {}
  for (const definition of definitions) {
    const value = values[definition.key]
    if (!hasOwn(values, definition.key) || (definition.type === "string" && value === "")) {
      issues[definition.key] = "required"
      continue
    }
    if (typeof value === "number" && (!Number.isFinite(value)
      || (definition.type === "integer" && !Number.isInteger(value))
      || (definition.min !== undefined && value < definition.min)
      || (definition.max !== undefined && value > definition.max))) {
      issues[definition.key] = "invalid"
      continue
    }
    if (definition.allowed && !definition.allowed.some((allowed) => allowed === value)) {
      issues[definition.key] = "invalid"
    }
  }
  return issues
}

export const AssignmentParametersForm: React.FC<AssignmentParametersFormProps> = ({
  definitions,
  canSubmit,
  disabled = false,
  pending = false,
  error,
  onSubmit,
}) => {
  const { t } = useTranslation()
  const [values, setValues] = useState<Record<string, CatalogParameterValue>>({})
  const [issues, setIssues] = useState<Record<string, AssignmentValidationIssue>>({})
  const [submitting, setSubmitting] = useState(false)
  const busy = pending || submitting

  const updateValue = (definition: CatalogParameterDefinition, raw: string | boolean) => {
    setValues((current) => {
      if (raw === "" && definition.type !== "string") {
        const next = { ...current }
        delete next[definition.key]
        return next
      }
      return { ...current, [definition.key]: parseValue(definition, raw) }
    })
    setIssues((current) => {
      const next = { ...current }
      delete next[definition.key]
      return next
    })
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit || disabled || busy) return
    const nextIssues = validateAssignmentParameters(definitions, values)
    if (Object.keys(nextIssues).length) {
      setIssues(nextIssues)
      return
    }
    const payload = Object.fromEntries(
      definitions.map((definition) => [definition.key, values[definition.key]]),
    ) as Record<string, CatalogParameterValue>
    setSubmitting(true)
    try {
      await onSubmit(payload)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={busy}>
      {!canSubmit && <p role="alert">{t("compliance.assignment.forbidden")}</p>}
      {error && <p role="alert">{t(`compliance.assignment.${error}`)}</p>}
      {definitions.map((definition) => {
        const issue = issues[definition.key]
        const inputId = `assignment-${definition.key}`
        return (
          <div className={styles.formGroup} key={definition.key}>
            <label className={styles.formLabel} htmlFor={inputId}>{definition.key}</label>
            <ParameterInput
              definition={definition}
              id={inputId}
              value={values[definition.key]}
              invalid={Boolean(issue)}
              describedBy={issue ? `${inputId}-error` : undefined}
              onChange={updateValue}
            />
            {issue && <p id={`${inputId}-error`} className={styles.formError}>{t(`compliance.assignment.parameter${issue === "required" ? "Required" : "Invalid"}`)}</p>}
          </div>
        )
      })}
      <button type="submit" className={styles.createButton} disabled={!canSubmit || disabled || busy}>
        {busy ? t("compliance.assignment.pending") : t("compliance.assignment.submit")}
      </button>
    </form>
  )
}

interface ParameterInputProps {
  definition: CatalogParameterDefinition
  id: string
  value: CatalogParameterValue | undefined
  invalid: boolean
  describedBy?: string
  onChange: (definition: CatalogParameterDefinition, value: string | boolean) => void
}

const ParameterInput: React.FC<ParameterInputProps> = ({ definition, id, value, invalid, describedBy, onChange }) => {
  const { t } = useTranslation()
  const common = { id, "aria-invalid": invalid, "aria-describedby": describedBy }
  if (definition.allowed) {
    return <select {...common} className={styles.formSelect} value={value === undefined ? "" : String(value)} onChange={(event) => onChange(definition, event.target.value)}><option value="">{t("compliance.assignment.select")}</option>{definition.allowed.map((allowed) => <option key={String(allowed)} value={String(allowed)}>{String(allowed)}</option>)}</select>
  }
  if (definition.type === "boolean") {
    return <input {...common} type="checkbox" checked={value === true} onChange={(event) => onChange(definition, event.target.checked)} />
  }
  return <input {...common} className={styles.formInput} type={definition.type === "string" ? "text" : "number"} step={definition.type === "integer" ? 1 : "any"} min={definition.min} max={definition.max} value={value === undefined ? "" : String(value)} onChange={(event) => onChange(definition, event.target.value)} />
}
