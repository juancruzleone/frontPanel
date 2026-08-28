import { describe, expect, it } from "vitest"
import ar from "../../../src/i18n/locales/ar.json"
import de from "../../../src/i18n/locales/de.json"
import en from "../../../src/i18n/locales/en.json"
import es from "../../../src/i18n/locales/es.json"
import fr from "../../../src/i18n/locales/fr.json"
import itLocale from "../../../src/i18n/locales/it.json"
import ja from "../../../src/i18n/locales/ja.json"
import ko from "../../../src/i18n/locales/ko.json"
import pt from "../../../src/i18n/locales/pt.json"
import zh from "../../../src/i18n/locales/zh.json"

const locales = { ar, de, en, es, fr, it: itLocale, ja, ko, pt, zh }

const paths = (value: unknown, prefix = ""): string[] => Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
  const path = prefix ? `${prefix}.${key}` : key
  return child && typeof child === "object" ? paths(child, path) : [path]
})

describe("CSV import translations", () => {
  it.each(Object.entries(locales))("provides the complete guidance contract in %s", (_locale, messages) => {
    expect(paths(messages.csvImport).sort()).toEqual(paths(en.csvImport).sort())
    expect(paths(messages.installations.csv).sort()).toEqual(paths(en.installations.csv).sort())
  })

  it.each(Object.entries({ ar, de, es, fr, it: itLocale, ja, ko, pt, zh }))("does not leak English guidance into %s", (_locale, messages) => {
    expect(messages.csvImport.chooseFile).not.toBe(en.csvImport.chooseFile)
    expect(messages.csvImport.guidance.preview).not.toBe(en.csvImport.guidance.preview)
    expect(messages.csvImport.guidance.entities.installations.updates).not.toBe(en.csvImport.guidance.entities.installations.updates)
    expect(messages.installations.csv.importTitle).not.toBe(en.installations.csv.importTitle)
  })
})
