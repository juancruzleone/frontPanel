/**
 * i18n audit for the operational namespaces.
 *
 * Scope is deliberately narrow: `nav`, `common`, `workOrders`, `csvImport` and
 * every key whose path ends in `.csv.import`. The rest of the application is a
 * separate backlog and is out of scope here on purpose.
 *
 * Two defects are measured, because they are two different failures:
 *
 * 1. MISSING KEY. `fallbackLng: 'es'` (src/i18n/index.ts) means a key that is
 *    absent from a locale renders in Spanish inside an otherwise translated
 *    interface. `es.json` is the source of truth for the key set.
 * 2. COPIED VALUE. A key can exist in every locale and still show English to
 *    the user, because the value was copied verbatim instead of translated.
 *    i18next cannot see this and neither can key parity, so each value is
 *    compared byte-for-byte against `en.json`.
 *
 * Usage (read-only, no dependencies):
 *   node tests/scripts/i18nAudit.mjs                 # working tree
 *   node tests/scripts/i18nAudit.mjs --ref HEAD      # committed baseline
 *   node tests/scripts/i18nAudit.mjs --summary-only  # counts without key lists
 *
 * The companion gate is tests/unit/i18n/operationalNamespaces.test.ts, which
 * imports this module so the report and the assertion can never drift apart.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const LOCALES = ['ar', 'de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
export const AUDIT_NAMESPACES = ['nav', 'common', 'workOrders', 'csvImport']
export const LOCALE_DIR = 'src/i18n/locales'

/** Locales that also fail if a value is copied from Spanish instead of English. */
export const SPANISH_IS_NEVER_LEGITIMATE = ['ar', 'ja', 'ko', 'zh']

/**
 * Values that are *correctly* byte-identical to English.
 *
 * Identical spelling is only a defect when the target language says it
 * differently, so every entry states why the shared spelling is right. Keep
 * this list short: each entry is a permanent exception a future contributor
 * has to read and trust, and a stale entry fails the gate.
 */
export const IDENTICAL_TO_EN_ALLOWLIST = {
  de: {
    'common.details': '`Details` is the German word for details, not the English one.',
    'common.ok': '`OK` is the standard German label for a confirm action.',
    'common.optional': '`optional` is the same adjective in German.',
    'nav.assets': '`Assets` is the established German CMMS term and matches `assets.title` in de.json.',
    'nav.audit': '`Audit` is the German loanword used for audit trails, matching de.json prose.',
    'nav.compliance': '`Compliance` is the German business term and matches `compliance.title` ("Regulatorische Compliance") in de.json.',
    'workOrders.form.installation': '`Installation` is the German word for an installation.',
    'workOrders.installation': '`Installation` is the German word for an installation.',
    'workOrders.minute': '`Minute` is the German word for minute.',
    'workOrders.status': '`Status` is the German word for status.',
  },
  fr: {
    'common.actions': '`Actions` is the French plural as written.',
    'common.date': '`Date` is the French word for date.',
    'common.document': '`Document` is the French word for document.',
    'common.ok': '`OK` is the standard French label for a confirm action.',
    'common.page': '`Page` is the French word for page.',
    'common.total': '`total` is the French word used for a running total.',
    'common.type': '`Type` is the French word for type.',
    'csvImport.action': '`Action` is the French word for action.',
    'nav.audit': '`Audit` is the French word for audit.',
    'nav.clients': '`Clients` is the French plural of client.',
    'nav.installations': '`Installations` is the French plural as written.',
    'nav.maintenance': '`Maintenance` is the French word for maintenance.',
    'nav.personal': '`Personnel` is the French word for staff.',
    'workOrders.description': '`Description` is the French word for description.',
    'workOrders.form.inspection': '`Inspection` is the French word for inspection.',
    'workOrders.form.installation': '`Installation` is the French word for installation.',
    'workOrders.form.maintenance': '`Maintenance` is the French word for maintenance.',
    'workOrders.inspection': '`Inspection` is the French word for inspection.',
    'workOrders.installation': '`Installation` is the French word for installation.',
    'workOrders.maintenance': '`Maintenance` is the French word for maintenance.',
    'workOrders.minute': '`Minute` is the French word for minute.',
    'workOrders.page': '`Page` is the French word for page.',
    'workOrders.type': '`Type` is the French word for type.',
  },
  it: {
    'common.no': '`No` is the Italian answer, written exactly like the English one.',
    'common.ok': '`OK` is the standard Italian label for a confirm action.',
    'nav.audit': '`Audit` is the Italian loanword used for audit trails.',
    'nav.home': '`Home` is the label Italian interfaces use for the landing section.',
  },
  ja: {
    'common.ok': 'OK is written in Latin letters in Japanese UIs.',
  },
  pt: {
    'common.ok': '`OK` is the standard Portuguese label for a confirm action.',
    'common.total': '`total` is the Portuguese word for total.',
  },
}

const isCsvImportKey = (key) => key.endsWith('.csv.import')
const inAuditNamespace = (key) =>
  AUDIT_NAMESPACES.some((ns) => key === ns || key.startsWith(`${ns}.`))

/** Flattens `{a: {b: 'x'}}` into `{'a.b': 'x'}`. */
export const flatten = (value, prefix = '', out = {}) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, out)
    return out
  }
  if (typeof value === 'string') out[prefix] = value
  return out
}

/** Reads one locale file from the working tree, or from `git show <ref>:<path>`. */
export const readLocale = (locale, ref) => {
  const path = `${LOCALE_DIR}/${locale}.json`
  const text = ref
    ? execFileSync('git', ['show', `${ref}:${path}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    : readFileSync(path, 'utf8')
  return JSON.parse(text)
}

/** Every key this audit is responsible for, taken from es.json as the reference. */
export const auditKeysFor = (esFlat, localeFlat) => {
  const keys = new Set()
  for (const key of Object.keys(esFlat)) if (inAuditNamespace(key)) keys.add(key)
  for (const key of Object.keys(localeFlat)) if (inAuditNamespace(key) || isCsvImportKey(key)) keys.add(key)
  return keys
}

/**
 * Builds the report.
 *
 * `missing` lists keys present in es.json but absent in the locale (they fall
 * back to Spanish). `identicalToEn` lists values byte-identical to en.json for
 * locales whose language is neither English nor Spanish, excluding allowlisted
 * homographs. `allowlisted` is reported so a reviewer can see what was skipped.
 */
export const collectAudit = (ref) => {
  const flat = Object.fromEntries(
    LOCALES.map((locale) => [locale, flatten(readLocale(locale, ref))]),
  )
  const es = flat.es
  const en = flat.en
  const rows = []

  for (const locale of LOCALES) {
    if (locale === 'es') continue
    const messages = flat[locale]
    const keys = auditKeysFor(es, messages)
    const missing = [...keys].filter((key) => messages[key] === undefined || messages[key].trim() === '')
    const identicalToEn = locale === 'en'
      ? []
      : Object.keys(messages).filter(
          (key) =>
            (inAuditNamespace(key) || isCsvImportKey(key)) &&
            en[key] !== undefined &&
            messages[key] === en[key] &&
            !IDENTICAL_TO_EN_ALLOWLIST[locale]?.[key],
        )
    const allowlisted = locale === 'en'
      ? []
      : Object.keys(IDENTICAL_TO_EN_ALLOWLIST[locale] ?? {}).filter((key) => messages[key] === en[key])
    const placeholderMismatch = Object.entries(es)
      .filter(([key, value]) => (inAuditNamespace(key) || isCsvImportKey(key)) && /\{\{/.test(value))
      .filter(([key, value]) => {
        const expected = [...value.matchAll(/\{\{\s*([\w.]+)/g)].map((m) => m[1]).sort().join(',')
        const actual = [...(messages[key] ?? '').matchAll(/\{\{\s*([\w.]+)/g)].map((m) => m[1]).sort().join(',')
        return expected !== actual
      })
    rows.push({
      locale,
      auditKeys: keys.size,
      missing: missing.sort(),
      identicalToEn: identicalToEn.sort(),
      allowlisted: allowlisted.sort(),
      placeholderMismatch: placeholderMismatch.map(([key]) => key).sort(),
    })
  }

  return { rows, ref: ref ?? null }
}

/** Stale allowlist entries hide real gaps, so they are reported explicitly. */
export const staleAllowlistEntries = (report) => {
  const flat = Object.fromEntries(LOCALES.map((l) => [l, flatten(readLocale(l, report.ref))]))
  const stale = []
  for (const [locale, entries] of Object.entries(IDENTICAL_TO_EN_ALLOWLIST)) {
    for (const key of Object.keys(entries)) {
      const value = flat[locale][key]
      if (value === undefined || value !== flat.en[key]) stale.push(`${locale}: ${key} = ${JSON.stringify(value)}`)
    }
  }
  return stale
}

export const formatReport = ({ rows, ref }, summaryOnly = false) => {
  const lines = [`== i18n audit: ${AUDIT_NAMESPACES.join(', ')} + *.csv.import (${ref ? `git ${ref}` : 'working tree'}) ==`]
  for (const row of rows) {
    lines.push(
      `${row.locale}: keys=${row.auditKeys} missing=${row.missing.length} untranslated=${row.identicalToEn.length}` +
        ` allowlisted=${row.allowlisted.length} placeholderMismatch=${row.placeholderMismatch.length}`,
    )
    if (!summaryOnly && row.missing.length) lines.push(`    MISSING  ${row.missing.join(', ')}`)
    if (!summaryOnly && row.identicalToEn.length) lines.push(`    EN-VALUE ${row.identicalToEn.join(', ')}`)
    if (!summaryOnly && row.placeholderMismatch.length) lines.push(`    PLACEHOLDER ${row.placeholderMismatch.join(', ')}`)
  }
  return lines.join('\n')
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href

if (invokedDirectly) {
  const refIndex = process.argv.indexOf('--ref')
  const ref = refIndex >= 0 ? process.argv[refIndex + 1] : undefined
  console.log(formatReport(collectAudit(ref), process.argv.includes('--summary-only')))
  const stale = staleAllowlistEntries({ ref })
  if (stale.length) console.log(`\nSTALE ALLOWLIST ENTRIES:\n  ${stale.join('\n  ')}`)
}
