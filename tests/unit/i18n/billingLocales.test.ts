import { describe, expect, it } from "vitest"
import en from "../../../src/i18n/locales/en.json"
import de from "../../../src/i18n/locales/de.json"
import fr from "../../../src/i18n/locales/fr.json"
import itLocale from "../../../src/i18n/locales/it.json"
import pt from "../../../src/i18n/locales/pt.json"
import ja from "../../../src/i18n/locales/ja.json"
import ko from "../../../src/i18n/locales/ko.json"
import zh from "../../../src/i18n/locales/zh.json"
import ar from "../../../src/i18n/locales/ar.json"

const localizedResources = { de, fr, it: itLocale, pt, ja, ko, zh, ar }

const keyPaths = (value: object, prefix = ""): string[] => Object.entries(value).flatMap(([key, child]) => {
  const path = prefix ? `${prefix}.${key}` : key
  return child && typeof child === "object" ? keyPaths(child as object, path) : [path]
})

describe("billing locale resources", () => {
  it.each(Object.entries(localizedResources))("loads %s with every billing and administrative trial key", (_locale, resource) => {
    expect(keyPaths(resource.billing).sort()).toEqual(keyPaths(en.billing).sort())
    expect(keyPaths(resource.administrativeTrial).sort()).toEqual(keyPaths(en.administrativeTrial).sort())
  })

  it.each(Object.entries(localizedResources))("does not copy the English billing/demo blocks into %s", (_locale, resource) => {
    expect(resource.billing).not.toEqual(en.billing)
    expect(resource.administrativeTrial).not.toEqual(en.administrativeTrial)
  })
})
