import { describe, expect, it } from "vitest"
import ar from "../../../../src/i18n/locales/ar.json"
import de from "../../../../src/i18n/locales/de.json"
import en from "../../../../src/i18n/locales/en.json"
import es from "../../../../src/i18n/locales/es.json"
import fr from "../../../../src/i18n/locales/fr.json"
import italian from "../../../../src/i18n/locales/it.json"
import ja from "../../../../src/i18n/locales/ja.json"
import ko from "../../../../src/i18n/locales/ko.json"
import pt from "../../../../src/i18n/locales/pt.json"
import zh from "../../../../src/i18n/locales/zh.json"

const locales = { ar, de, en, es, fr, it: italian, ja, ko, pt, zh }

describe("oauth start translations", () => {
  it.each(Object.entries(locales))("proves every social login string in %s", (_locale, messages) => {
    const oauth = messages.auth?.oauth
    expect(oauth).toBeTruthy()
    expect(oauth.google).toBeTruthy()
    expect(oauth.microsoft).toBeTruthy()
    expect(oauth.divider).toBeTruthy()
    expect(oauth.redirecting).toBeTruthy()
    expect(oauth.unavailable).toBeTruthy()
  })

  it.each(Object.entries(locales))("keeps provider brand names intact in %s", (_locale, messages) => {
    expect(messages.auth.oauth.google).toContain("Google")
    expect(messages.auth.oauth.microsoft).toContain("Microsoft")
  })

  it.each(Object.entries(locales))("interpolates the provider name in %s", (_locale, messages) => {
    expect(messages.auth.oauth.redirecting).toContain("{{provider}}")
  })

  it("keeps the two provider labels distinguishable", () => {
    expect(es.auth.oauth.google).not.toBe(es.auth.oauth.microsoft)
  })
})
