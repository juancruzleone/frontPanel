import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

/**
 * Parity gate for the home dashboard namespace.
 *
 * Two distinct defects are guarded here:
 *
 * 1. Missing keys. `fallbackLng: 'es'` means a missing key is silently
 *    rendered in Spanish inside a non-Spanish UI, so key parity under `home.`
 *    is a product contract, not a nicety. es.json is the source of truth for
 *    the key set.
 * 2. Copied values. A key can exist in every locale and still show English (or
 *    Spanish) text to the user, because the value was copied verbatim instead
 *    of translated. i18next cannot detect that and neither can key parity, so
 *    the value check below is the only thing standing between a copy-paste
 *    pass and a broken UI. `home.dashboard.rangeHelp` was English in all nine
 *    non-Spanish locales for exactly this reason.
 *
 * Run as part of `bun run test:unit`; the tables below are the audited report.
 */

const LOCALES = ["ar", "de", "en", "es", "fr", "it", "ja", "ko", "pt", "zh"] as const
const HOME_ROOT = "src/i18n/locales"

type Messages = Record<string, unknown>

const readLocale = (locale: string): Messages =>
  JSON.parse(readFileSync(`${HOME_ROOT}/${locale}.json`, "utf8")) as Messages

/** Flattens a subtree into `a.b.c` -> string for every non-empty string leaf. */
const flatten = (value: unknown, prefix = "", out = new Map<string, string>()): Map<string, string> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value as Messages)) flatten(child, prefix ? `${prefix}.${key}` : key, out)
    return out
  }
  if (typeof value === "string") out.set(prefix, value)
  return out
}

const homeOf = (locale: string): Map<string, string> => {
  const home = readLocale(locale).home
  const flat = flatten(home, "home")
  // Empty strings resolve to the Spanish fallback, which is the defect this
  // gate exists to prevent, so they count as missing.
  for (const [key, value] of [...flat]) if (value.trim() === "") flat.delete(key)
  return flat
}

const placeholders = (value: string): string[] =>
  [...value.matchAll(/\{\{\s*([\w.]+)/g)].map((match) => match[1]).sort()

const esHome = homeOf("es")
const enHome = homeOf("en")
const esKeys = [...esHome.keys()].sort()

/**
 * Values that are *correctly* byte-identical to English or Spanish.
 *
 * An identical string is only a defect when the target language says it
 * differently, so each entry below states why the shared spelling is right.
 * Keep this list empty by default: every entry is a permanent exception a
 * future contributor has to read and trust.
 */
const IDENTICAL_ALLOWLIST: Record<string, Record<string, string>> = {
  de: {
    "home.title": "`Dashboard` is the established term in German admin UIs and is already used in de.json (`home.dashboard.loading`, `home.dashboard.empty.dashboard`).",
    "home.dashboard.inventory.minimum": "`min.` is the same abbreviation in German as in English.",
  },
  fr: {
    // French spells all five of these exactly as English does.
    "home.dashboard.attention.kicker": "`Exceptions` is the French plural as written.",
    "home.dashboard.resources.metrics.installations": "`Installations` is the French plural as written.",
    "home.dashboard.resources.metrics.clients": "`Clients` is the French plural as written.",
    "home.dashboard.date": "`Date` is the French word for date.",
    "home.dashboard.inventory.minimum": "`min.` is the same abbreviation in French as in English.",
  },
  it: {
    "home.dashboard.inventory.minimum": "`min.` is the standard abbreviation of `minimo`.",
    "home.priority.medium": "`Media` is the correct Italian feminine label; `home.priority.media` is its legacy twin.",
    "home.priority.media": "`Media` is the correct Italian feminine label.",
    "home.priority.high": "`Alta` is the correct Italian feminine label, identical to Spanish.",
    "home.priority.alta": "`Alta` is the correct Italian feminine label, identical to Spanish.",
    "home.type.preventive": "`Preventivo` is the correct Italian masculine label, identical to Spanish.",
    "home.type.preventivo": "`Preventivo` is the correct Italian masculine label, identical to Spanish.",
    "home.trend.up": "`Aumento del {{value}}%` is correct Italian, identical to Spanish.",
  },
  pt: {
    // Portuguese and Spanish share the spelling of a lot of Latinate vocabulary.
    "home.range.12m": "`12 meses` is correct Portuguese.",
    "home.dashboard.resources.kicker": "`Cobertura` is correct Portuguese.",
    "home.dashboard.resources.metrics.technicians": "`Técnicos` is correct Portuguese.",
    "home.dashboard.resources.metrics.devices": "`Dispositivos` is correct Portuguese.",
    "home.dashboard.resources.metrics.clients": "`Clientes` is correct Portuguese.",
    "home.dashboard.inventory.minimum": "`mín.` is the correct Portuguese abbreviation.",
    "home.upcomingPreventive": "`Próximos Preventivos` is correct Portuguese and matches `workOrders.orderTypePreventive`.",
    "home.mttrHours": "`Horas` is the Portuguese word for hours.",
    "home.mtbfHours": "`Horas` is the Portuguese word for hours.",
    "home.priority.high": "`Alta` is correct Portuguese.",
    "home.priority.alta": "`Alta` is correct Portuguese.",
    "home.priority.critical": "`Crítica` is correct Portuguese.",
    "home.priority.critica": "`Crítica` is correct Portuguese.",
    "home.type.preventive": "`Preventivo` is correct Portuguese.",
    "home.type.preventivo": "`Preventivo` is correct Portuguese.",
    "home.status.cancelled": "`Cancelada` is correct Portuguese.",
    "home.tour.buttons.previous": "`Anterior` is correct Portuguese.",
    "home.tour.buttons.restart": "`Ver tutorial` is correct Portuguese.",
    "home.tour.progressText": "`{{current}} de {{total}}` is correct Portuguese.",
  },
}

/** Locales written in a non-Latin script must not carry English words. */
const NON_LATIN_LOCALES = ["ar", "ja", "ko", "zh"]
/** Brand names, acronyms and international abbreviations those scripts reuse. */
const LATIN_TOKEN_ALLOWLIST = /^(leonix|sla|mttr|mtbf|csv|iot|api|pdf|vs|id|ok)$/i
const latinWordsIn = (value: string): string[] =>
  (value.replace(/\{\{[^}]*\}\}/g, "").match(/[A-Za-zÀ-ÿ]{2,}/g) ?? []).filter((word) => !LATIN_TOKEN_ALLOWLIST.test(word))

const isAllowlisted = (locale: string, key: string): boolean =>
  Boolean(IDENTICAL_ALLOWLIST[locale]?.[key])

const report: string[] = []
const nonHomeReport: string[] = []

describe("home namespace key parity against es.json", () => {
  it("keeps an identical key set under home.* in all ten locales", () => {
    report.push(`es.json home.* keys: ${esKeys.length}`)
    for (const locale of LOCALES) {
      const keys = homeOf(locale)
      const missing = esKeys.filter((key) => !keys.has(key))
      const extra = [...keys.keys()].filter((key) => !esKeys.includes(key)).sort()
      report.push(`${locale}: total=${keys.size} missing=${missing.length} extra=${extra.length}${missing.length ? ` -> ${missing.join(", ")}` : ""}`)
      expect(missing, `locale ${locale} is missing home.* keys and will fall back to Spanish`).toEqual([])
    }
    console.log("\n== home.* key parity report ==\n" + report.join("\n"))
  })

  it("preserves every interpolation placeholder used by es", () => {
    for (const locale of LOCALES) {
      const messages = homeOf(locale)
      for (const [key, value] of esHome) {
        const expected = placeholders(value)
        if (expected.length === 0) continue
        expect(placeholders(messages.get(key) ?? ""), `${locale}: home.* placeholder mismatch for ${key}`).toEqual(expected)
      }
    }
  })

  it("keeps untranslated English and Spanish values out of home.* in every locale", () => {
    const offenders: string[] = []
    const lines: string[] = []
    for (const locale of LOCALES) {
      if (locale === "en") continue // English is the English source of truth.
      const messages = homeOf(locale)
      const copiedFromEn: string[] = []
      const copiedFromEs: string[] = []
      for (const [key, value] of messages) {
        // English is only legitimate in en.json; Spanish only in es.json.
        if (enHome.get(key) === value && !isAllowlisted(locale, key)) copiedFromEn.push(key)
        if (locale !== "es" && esHome.get(key) === value && enHome.get(key) !== value && !isAllowlisted(locale, key)) copiedFromEs.push(key)
      }
      lines.push(
        `${locale}: sameAsEn=${copiedFromEn.length} sameAsEs=${copiedFromEs.length}` +
          (copiedFromEn.length ? ` -> ${copiedFromEn.join(", ")}` : "") +
          (copiedFromEs.length ? ` -> ${copiedFromEs.join(", ")}` : ""),
      )
      offenders.push(...copiedFromEn.map((key) => `${locale}: ${key} is verbatim English`))
      offenders.push(...copiedFromEs.map((key) => `${locale}: ${key} is verbatim Spanish`))
    }
    console.log("\n== home.* values still identical to en/es (offenders only) ==\n" + lines.join("\n"))
    expect(offenders, "home.* values copied instead of translated").toEqual([])
  })

  it("documents every allowlisted identical value and drops stale entries", () => {
    const stale: string[] = []
    const undocumented: string[] = []
    for (const locale of LOCALES) {
      if (locale === "en" || locale === "es") continue
      for (const [key, reason] of Object.entries(IDENTICAL_ALLOWLIST[locale] ?? {})) {
        const value = homeOf(locale).get(key)
        const stillIdentical = value !== undefined && (value === enHome.get(key) || value === esHome.get(key))
        if (!stillIdentical) stale.push(`${locale}: ${key} is no longer identical to en/es (value=${JSON.stringify(value)})`)
        if (!reason.trim()) undocumented.push(`${locale}: ${key} has no justification`)
      }
    }
    expect(stale, "obsolete allowlist entries must be deleted").toEqual([])
    expect(undocumented, "every allowlist entry needs a reason").toEqual([])
  })

  it("keeps Arabic, Japanese, Korean and Chinese home.* free of English words", () => {
    const offenders: string[] = []
    for (const locale of NON_LATIN_LOCALES) {
      for (const [key, value] of homeOf(locale)) {
        const words = latinWordsIn(value)
        if (words.length) offenders.push(`${locale}: ${key} -> ${words.join(", ")} :: ${JSON.stringify(value)}`)
      }
    }
    expect(offenders, "non-Latin locales carrying Latin-script words").toEqual([])
  })

  it("reports non-home gaps without failing this task's scope", () => {
    const esAll = flatten(readLocale("es"), "")
    const esNonHomeKeys = [...esAll.keys()].filter((key) => !key.startsWith("home.")).sort()
    nonHomeReport.push(`es.json non-home keys: ${esNonHomeKeys.length}`)
    for (const locale of LOCALES) {
      const keys = flatten(readLocale(locale), "")
      const missing = esNonHomeKeys.filter((key) => !keys.has(key))
      nonHomeReport.push(`${locale}: non-home missing=${missing.length}`)
    }
    console.log("\n== non-home missing keys (follow-up scope) ==\n" + nonHomeReport.join("\n"))
    expect(esNonHomeKeys.length).toBeGreaterThan(0)
  })
})
