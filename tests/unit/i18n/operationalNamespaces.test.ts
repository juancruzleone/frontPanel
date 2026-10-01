import { describe, expect, it } from "vitest"
import {
  AUDIT_NAMESPACES,
  IDENTICAL_TO_EN_ALLOWLIST,
  LOCALES,
  SPANISH_IS_NEVER_LEGITIMATE,
  collectAudit,
  flatten,
  formatReport,
  readLocale,
  staleAllowlistEntries,
} from "../../scripts/i18nAudit.mjs"

/**
 * Gate for the operational namespaces: `nav`, `common`, `workOrders`,
 * `csvImport`, plus every key ending in `.csv.import`.
 *
 * Why a gate and not just a one-off fix: both defects below are invisible at
 * runtime. A missing key is silently replaced by Spanish because
 * `fallbackLng: 'es'`; a copied value is silently replaced by English because
 * i18next only checks whether a key exists. Each one only shows up as a
 * half-translated screen — the sidebar reading "Cumplimiento" in a Japanese UI,
 * the CSV button reading "Import CSV" in Arabic.
 *
 * Report and assertions share `tests/scripts/i18nAudit.mjs`, so the numbers a
 * reviewer sees and the numbers CI enforces cannot drift.
 *
 * What this gate does NOT check: values copied from Spanish. The Italian and
 * Portuguese locale files have many of those under `workOrders`, and both
 * languages also share legitimate Latinate spellings with Spanish, so deciding
 * them needs its own pass; the list goes to the handoff report instead of an
 * assertion here. The rest of the application is a separate backlog as well.
 *
 * The allowlist in the audit module is the only place an English value is
 * permitted, and every entry needs a reason.
 */

const report = collectAudit()
const messages = Object.fromEntries(LOCALES.map((locale) => [locale, flatten(readLocale(locale))]))

const inScope = (key: string) =>
  AUDIT_NAMESPACES.some((ns) => key === ns || key.startsWith(`${ns}.`)) || key.endsWith(".csv.import")

const describeRows = (pick: (row) => string[], message: string) => {
  const offenders = report.rows
    .filter((row) => pick(row).length > 0)
    .map((row) => `${row.locale}: ${pick(row).join(", ")}`)
  expect(offenders, message).toEqual([])
}

describe(`i18n ${AUDIT_NAMESPACES.join("/")} namespaces`, () => {
  it("prints the audited report", () => {
    console.log(`\n${formatReport(report)}`)
    expect(report.rows.length).toBe(LOCALES.length - 1)
  })

  it("keeps every es key present in all ten locales", () => {
    describeRows((row) => row.missing, "missing keys fall back to Spanish in a non-Spanish UI")
  })

  it("keeps English values out of the eight non-English, non-Spanish locales", () => {
    describeRows((row) => row.identicalToEn, "values copied from en.json instead of translated")
  })

  it("preserves every interpolation placeholder used by es", () => {
    describeRows((row) => row.placeholderMismatch, "interpolation placeholders must match es exactly")
  })

  it("keeps the identical-value allowlist current and documented", () => {
    // An entry whose value no longer matches en.json hides nothing, so it must go.
    expect(staleAllowlistEntries(report), "stale allowlist entries must be deleted").toEqual([])

    const undocumented: string[] = []
    for (const row of report.rows) {
      const entries = IDENTICAL_TO_EN_ALLOWLIST[row.locale] ?? {}
      for (const key of row.allowlisted) {
        if (!entries[key]?.trim()) undocumented.push(`${row.locale}: ${key} has no justification`)
      }
    }
    expect(undocumented, "every allowlisted value needs a reason").toEqual([])
  })

  it("keeps Arabic, Japanese, Korean and Chinese free of English words", () => {
    // CSV column names the guidance quotes verbatim, file formats and the brand:
    // the interface has to spell those exactly like the backend does.
    const technicalToken = new RegExp(
      [
        "leonix", "sla", "mttr", "mtbf", "csv", "iot", "api", "pdf", "url", "id", "ok", "vs",
        "excel", "utf", "xls", "xlsx", "mb", "hh", "mm",
        "name", "unit", "installations", "externalid", "schemaversion",
        "templateexternalid", "supplierexternalid", "installationtype",
      ].join("|"),
      "i",
    )
    const offenders: string[] = []
    for (const locale of SPANISH_IS_NEVER_LEGITIMATE) {
      for (const [key, value] of Object.entries(messages[locale])) {
        if (!inScope(key)) continue
        const words = (value.replace(/\{\{[^}]*\}\}/g, "").match(/[A-Za-zÀ-ÿ]{2,}/g) ?? []).filter(
          (word) => !technicalToken.test(word),
        )
        if (words.length) offenders.push(`${locale}: ${key} -> ${words.join(", ")} :: ${JSON.stringify(value)}`)
      }
    }
    expect(offenders, "non-Latin locales carrying Latin-script words").toEqual([])
  })
})
