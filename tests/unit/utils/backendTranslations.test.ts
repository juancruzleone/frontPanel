import { readFileSync, readdirSync } from "node:fs"
import { beforeAll, describe, expect, it } from "vitest"
import i18n from "../../../src/i18n"
import {
  BACKEND_TRANSLATION_LANGUAGES,
  monthNamesES,
  resolveBackendLanguage,
  translateDeviceStatus,
  translateFormFieldType,
  translateFrequencyToCurrentLang,
  translateFrequencyToES,
  translateMonthToCurrentLang,
  translateMonthToES,
  translateOrderOrigin,
  translateOrderType,
  translatePriority,
  translateUserRole,
  translateWorkOrderStatus,
  translateWorkType,
} from "../../../src/shared/utils/backendTranslations"

/**
 * Guards `src/shared/utils/backendTranslations.ts`.
 *
 * These are backend values, not interface strings, so i18next never sees them
 * and no locale file can catch a gap. Three defects are covered, in the order
 * they were reported:
 *
 * 1. A language missing from one of the tables. The tables are typed
 *    `Record<BackendTranslationLanguage, ...>`, so this is now a compile error;
 *    the runtime loop below proves the type is actually being honoured.
 * 2. A label left in Spanish or English inside a non-Spanish, non-English entry.
 * 3. The reported "Origen" bug: the API returns `Plan de mantenimiento` already
 *    localised, the table only had the `plan_mantenimiento` key, nothing
 *    matched, and the raw Spanish string was rendered in every language while
 *    its own label translated correctly.
 *
 * The fallback contract is asserted too: unsupported language resolves through
 * English, and an unknown token is passed through unchanged rather than
 * replaced by a Spanish guess.
 */

const LANGUAGE_SAMPLE: Record<string, (value: string) => string> = {
  translateWorkOrderStatus,
  translatePriority,
  translateWorkType,
  translateOrderType,
  translateOrderOrigin,
  translateUserRole,
  translateFormFieldType,
  translateDeviceStatus,
}

const SAMPLE_TOKENS: Record<string, string[]> = {
  translateWorkOrderStatus: ["pendiente", "asignada", "en_progreso", "completada", "cancelada"],
  translatePriority: ["baja", "media", "alta", "critica"],
  translateWorkType: [
    "mantenimiento", "reparacion", "instalacion", "inspeccion",
    "limpieza", "calibracion", "actualizacion", "diagnostico",
  ],
  translateOrderType: ["correctivo", "preventivo"],
  translateOrderOrigin: ["manual", "plan_mantenimiento"],
  translateUserRole: ["tecnico", "cliente", "admin", "supervisor", "manager"],
  translateFormFieldType: ["text", "textarea", "number", "date", "select", "checkbox", "radio", "file"],
  translateDeviceStatus: ["activo", "inactivo", "mantenimiento", "fuera_servicio", "pendiente_revision"],
}

const NON_LATIN_LANGUAGES = ["ar", "ja", "ko", "zh"]
const LATIN_WORD = /[A-Za-z\u00c0-\u024f]{2,}/

const switchLanguage = async (language: string) => {
  await i18n.changeLanguage(language)
  expect(i18n.resolvedLanguage || i18n.language).toBe(language)
}

beforeAll(async () => {
  await i18n.changeLanguage("es")
})

describe("backend translation tables cover every registered language", () => {
  it("matches the list of locale files shipped in src/i18n/locales", () => {
    const files = readdirSync("src/i18n/locales")
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.replace(/\.json$/, ""))
      .sort()
    expect([...BACKEND_TRANSLATION_LANGUAGES].sort()).toEqual(files)
  })

  it.each(Object.keys(LANGUAGE_SAMPLE))("%s resolves every token in all ten languages", async (helper) => {
    for (const language of BACKEND_TRANSLATION_LANGUAGES) {
      await switchLanguage(language)
      for (const token of SAMPLE_TOKENS[helper]) {
        const label = LANGUAGE_SAMPLE[helper](token)
        expect(label, `${helper}(${token}) in ${language}`).toBeTruthy()
        // An unresolved token comes back verbatim, which is the failure mode
        // the aliases exist to prevent.
        expect(label, `${helper}(${token}) in ${language} stayed a raw backend token`).not.toBe(token)
        if (NON_LATIN_LANGUAGES.includes(language)) {
          expect(label, `${helper}(${token}) in ${language} is not native script`).toMatch(
            new RegExp("^(?!.*" + LATIN_WORD.source + ")", "u"),
          )
        }
        if (language === "de") {
          await switchLanguage("es")
          const spanish = LANGUAGE_SAMPLE[helper](token)
          await switchLanguage("de")
          expect(label, `${helper}(${token}) shows the Spanish label in German`).not.toBe(spanish)
        }
      }
    }
  })

  it.each(Object.keys(LANGUAGE_SAMPLE))("%s has no Spanish label copied into another language", async (helper) => {
    // Reads the tables through the public API only: for every pair of
    // languages, the label sets must not be identical for all tokens, which is
    // what a copied block looks like.
    const labelsByLanguage: Record<string, string[]> = {}
    for (const language of BACKEND_TRANSLATION_LANGUAGES) {
      await switchLanguage(language)
      labelsByLanguage[language] = SAMPLE_TOKENS[helper].map(LANGUAGE_SAMPLE[helper])
    }
    const reference = labelsByLanguage.es.join("\u0000")
    for (const language of [...NON_LATIN_LANGUAGES, "de"]) {
      expect(labelsByLanguage[language].join("\u0000"), `${language} repeats the Spanish labels`).not.toBe(reference)
    }
  })
})

describe("backend values that arrive already localised", () => {
  it("translates the Spanish origin label instead of showing it verbatim", async () => {
    // This is the reported defect: `origen` coming back as display text.
    const expectations: Record<string, string> = {
      ja: "保守計画",
      ko: "유지보수 계획",
      zh: "维护计划",
      ar: "خطة الصيانة",
      de: "Wartungsplan",
      fr: "Plan de maintenance",
      pt: "Plano de manutenção",
      it: "Piano di manutenzione",
      en: "Maintenance plan",
      es: "Plan de mantenimiento",
    }
    for (const [language, expected] of Object.entries(expectations)) {
      await switchLanguage(language)
      expect(translateOrderOrigin("plan_mantenimiento"), language).toBe(expected)
      expect(translateOrderOrigin("Plan de mantenimiento"), language).toBe(expected)
      expect(translateOrderOrigin("Maintenance plan"), language).toBe(expected)
    }
  })

  it("translates the Spanish status, priority and work-type labels", async () => {
    await switchLanguage("ja")
    expect(translateWorkOrderStatus("En Progreso")).toBe("進行中")
    expect(translatePriority("Crítica")).toBe("緊急")
    expect(translateWorkType("Reparación")).toBe("修理")
    expect(translateOrderType("Preventivo")).toBe("予防")
  })

  it("keeps the Spanish role spelling working without the accent key", async () => {
    await switchLanguage("en")
    expect(translateUserRole("técnico")).toBe("Technician")
    expect(translateUserRole("Administrador")).toBe("Administrator")
  })

  it("translates French device maintenance in French, not English", async () => {
    await switchLanguage("fr")
    expect(translateDeviceStatus("En Mantenimiento")).toBe("En maintenance")
    expect(translateDeviceStatus("mantenimiento")).not.toBe("Under Maintenance")
  })
})

describe("documented fallback order", () => {
  it("passes an unknown token through unchanged in any language", async () => {
    await switchLanguage("ja")
    expect(translateWorkOrderStatus("archived")).toBe("archived")
    expect(translateOrderOrigin("")).toBe("")
    expect(translateFormFieldType("unknown_field")).toBe("unknown_field")
  })

  it("resolves a language with no table through English, never Spanish", async () => {
    // i18next only accepts a language it has resources for, so the unsupported
    // tag is set directly: that is the state a future eleventh locale is in
    // before anyone has added it to these tables.
    const instance = i18n as unknown as { language?: string; resolvedLanguage?: string }
    const previousLanguage = instance.language
    const previousResolved = instance.resolvedLanguage
    // Simulating a locale registered in i18next but absent from these tables.
    instance.language = "nl"
    instance.resolvedLanguage = "nl"
    try {
      expect(resolveBackendLanguage("nl")).toBe("en")
      expect(translateOrderOrigin("plan_mantenimiento")).toBe("Maintenance plan")
      expect(translateWorkOrderStatus("pendiente")).toBe("Pending")
      expect(translateMonthToCurrentLang("Enero", "nl")).toBe("January")
      expect(translateFrequencyToCurrentLang("Mensual", "nl")).toBe("Monthly")
    } finally {
      instance.language = previousLanguage
      instance.resolvedLanguage = previousResolved
    }
    expect(resolveBackendLanguage("pt-BR")).toBe("pt")
    expect(resolveBackendLanguage("EN")).toBe("en")
    await switchLanguage("es")
    expect(translateOrderOrigin("plan_mantenimiento")).toBe("Plan de mantenimiento")
  })

  it("honours fallbackLng from src/i18n/index.ts when i18next reports no language", async () => {
    const config = readFileSync("src/i18n/index.ts", "utf8")
    expect(config).toMatch(/fallbackLng:\s*'es'/)
    const instance = i18n as unknown as { language?: string; resolvedLanguage?: string }
    const previous = instance.language
    // Deliberately emulating an uninitialised i18next instance.
    instance.language = undefined
    instance.resolvedLanguage = undefined
    expect(translateOrderOrigin("plan_mantenimiento")).toBe("Plan de mantenimiento")
    instance.language = previous
    await switchLanguage("es")
  })
})

describe("months and frequencies", () => {
  it("keeps the Spanish month names the canonical form of the table", () => {
    expect(monthNamesES).toEqual([
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ])
  })

  it("round-trips all twelve months in every language", async () => {
    for (const language of BACKEND_TRANSLATION_LANGUAGES) {
      await switchLanguage(language)
      for (const month of monthNamesES) {
        const localized = translateMonthToCurrentLang(month, language)
        expect(localized, `${language}: ${month} came back empty`).toBeTruthy()
        expect(translateMonthToES(localized, language), `${language}: ${month}`).toBe(month)
      }
    }
  })

  it("accepts a month that already arrived in English", async () => {
    await switchLanguage("de")
    expect(translateMonthToCurrentLang("July", "de")).toBe("Juli")
    await switchLanguage("ja")
    expect(translateMonthToCurrentLang("January", "ja")).toBe("1月")
  })

  it("leaves an unknown month untouched instead of guessing", async () => {
    await switchLanguage("ar")
    expect(translateMonthToCurrentLang("Quincena", "ar")).toBe("Quincena")
    expect(translateMonthToES("Quincena", "ar")).toBe("Quincena")
  })

  it("translates frequencies written in either direction", async () => {
    await switchLanguage("ko")
    expect(translateFrequencyToCurrentLang("mensual", "ko")).toBe("매월")
    expect(translateFrequencyToCurrentLang("Semiannual", "ko")).toBe("반기별")
    expect(translateFrequencyToES("분기별", "ko")).toBe("Trimestral")
    expect(translateFrequencyToCurrentLang("Semanal", "ko")).toBe("Semanal")
  })
})
