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

describe("home dashboard translations", () => {
  it.each(Object.entries(locales))("provides complete dashboard keys in %s", (_locale, messages) => {
    expect(messages.home.dashboard.roles.admin.title).toBeTruthy()
    expect(messages.home.dashboard.roles.technician.title).toBeTruthy()
    expect(messages.home.dashboard.roles.client.title).toBeTruthy()
    expect(messages.home.dashboard.scope.assigned_installations).toBeTruthy()
    expect(messages.home.dashboard.notices.fallback).toBeTruthy()
    expect(messages.home.range["30d"]).toBeTruthy()
  })
})
