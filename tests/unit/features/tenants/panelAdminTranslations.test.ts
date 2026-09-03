import { describe, it, expect } from 'vitest'
import ar from '@/i18n/locales/ar.json'
import de from '@/i18n/locales/de.json'
import en from '@/i18n/locales/en.json'
import es from '@/i18n/locales/es.json'
import fr from '@/i18n/locales/fr.json'
import ita from '@/i18n/locales/it.json'
import ja from '@/i18n/locales/ja.json'
import ko from '@/i18n/locales/ko.json'
import pt from '@/i18n/locales/pt.json'
import zh from '@/i18n/locales/zh.json'

const locales: Record<string, any> = { ar, de, en, es, fr, it: ita, ja, ko, pt, zh }

describe('panelAdmin translations parity', () => {
  it.each(Object.entries(locales))('provides superAdmin.dashboard keys in %s', (_locale, messages) => {
    const d = (messages as any).superAdmin?.dashboard
    expect(d).toBeTruthy()
    expect(d.eyebrow).toBeTruthy()
    expect(d.title).toBeTruthy()
    expect(d.subtitle).toBeTruthy()
    expect(d.scopeLabel).toBeTruthy()
    expect(d.scope.global).toBeTruthy()
    expect(d.loading).toBeTruthy()
    expect(d.sections.immediate).toBeTruthy()
    expect(d.sections.analysis).toBeTruthy()
    expect(d.sections.recent).toBeTruthy()
    expect(d.kpi.totalTenants).toBeTruthy()
    expect(d.kpi.activeTenants).toBeTruthy()
    expect(d.kpi.totalUsers).toBeTruthy()
    expect(d.kpi.totalAssets).toBeTruthy()
  })

  it('no locale has empty superAdmin.dashboard leaf', () => {
    for (const [locale, messages] of Object.entries(locales)) {
      const d = (messages as any).superAdmin.dashboard
      const leaves = [
        d.eyebrow, d.title, d.subtitle, d.scopeLabel, d.scope.global,
        d.kpi.totalTenants, d.kpi.activeTenants, d.kpi.totalUsers, d.kpi.totalAssets
      ]
      for (const leaf of leaves) {
        expect(String(leaf).trim().length, `${locale} leaf ${leaf}`).toBeGreaterThan(0)
      }
    }
  })
})
