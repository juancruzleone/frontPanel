import { describe, expect, it } from "vitest"
import ar from "../../../../src/i18n/locales/ar.json"
import de from "../../../../src/i18n/locales/de.json"
import en from "../../../../src/i18n/locales/en.json"
import es from "../../../../src/i18n/locales/es.json"
import fr from "../../../../src/i18n/locales/fr.json"
import itLocale from "../../../../src/i18n/locales/it.json"
import ja from "../../../../src/i18n/locales/ja.json"
import ko from "../../../../src/i18n/locales/ko.json"
import pt from "../../../../src/i18n/locales/pt.json"
import zh from "../../../../src/i18n/locales/zh.json"

const locales = { ar, de, en, es, fr, it: itLocale, ja, ko, pt, zh }
const paths = [
  "title", "loading", "error",
  ...["title", "pack", "version", "action", "view", "loading", "detailLoading", "empty", "unavailable", "detailUnavailable", "retry", "controls", "rights", "assignment", "noAssignment"].map((key) => `catalog.${key}`),
  ...["parameterRequired", "parameterInvalid", "select", "submit", "pending", "forbidden", "mutationError"].map((key) => `assignment.${key}`),
  ...["title", "loading", "detailLoading", "findingsLoading", "empty", "findingsEmpty", "error", "detailError", "retry", "history", "id", "state", "action", "view", "assignments", "start", "snapshot", "controls", "evaluators", "rights", "scope", "timestamp", "score", "progress", "findings", "reason", "assignment", "pack", "notAvailable"].map((key) => `evaluations.${key}`),
  ...["title", "description", "loading", "normas", "reglas"].map((key) => `legacy.${key}`),
  ...["title", "total", "noData", "estado.cumplido", "estado.incumplido", "estado.sin_evidencia", "estado.error"].map((key) => `dashboard.${key}`),
  ...["fechaAntiguaMeses", "numericoMax", "numericoMin", "numericoRango", "enumEn", "exists"].map((key) => `operador.${key}`),
  ...["codigo", "familiaNorma", "descripcion", "activa", "empty"].map((key) => `normas.${key}`),
  ...["nombre", "norma", "operador", "objetivoTipo", "objetivoTipoOptions.activo", "objetivoTipoOptions.instalacion", "habilitada", "empty"].map((key) => `reglas.${key}`),
]

const valueAt = (locale: typeof es, path: string) => path.split(".").reduce((value, key) => value?.[key], locale.compliance as any)

describe("compliance locale contract", () => {
  it("provides the active compliance key set in every locale without raw keys", () => {
    for (const [locale, messages] of Object.entries(locales)) {
      for (const path of paths) {
        const value = valueAt(messages, path)
        expect(value, `${locale}.${path}`).toBeTypeOf("string")
        expect(value, `${locale}.${path}`).not.toMatch(/^compliance\./)
      }
    }
  })

  it("preserves the required Spanish labels and localized representative copy", () => {
    expect(es.compliance.evaluations.title).toBe("Evaluación Leonix")
    expect(es.compliance.legacy.title).toBe("Historial anterior")
    expect(de.compliance.evaluations.title).toBe("Leonix-Evaluierung")
    expect(ja.compliance.legacy.title).not.toBe(es.compliance.legacy.title)
    expect(en.compliance.evaluations.title).toBe("Leonix Evaluation")
  })
})
