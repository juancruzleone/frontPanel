import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const installationForm = readFileSync(
  resolve(process.cwd(), 'src/features/installations/components/InstallationForm.tsx'),
  'utf8',
)

const expectedTranslations: Record<string, string> = {
  ar: 'المعلومات الأساسية',
  de: 'Grundinformationen',
  en: 'Basic Information',
  es: 'Información básica',
  fr: 'Informations de base',
  it: 'Informazioni di base',
  ja: '基本情報',
  ko: '기본 정보',
  pt: 'Informações básicas',
  zh: '基本信息',
}

describe('InstallationForm content contract', () => {
  it('titula el primer bloque como detalles sin duplicar el label de nombre', () => {
    expect(installationForm).toContain("t('installations.basicInformation')")
    expect(installationForm).toContain("label: t('installations.company')")
    expect(installationForm).not.toContain("t('installations.companyInfo')")
  })

  it('mantiene la nueva clave profesionalmente traducida en todos los locales', () => {
    for (const [locale, translation] of Object.entries(expectedTranslations)) {
      const messages = JSON.parse(
        readFileSync(resolve(process.cwd(), `src/i18n/locales/${locale}.json`), 'utf8'),
      ) as { installations?: Record<string, unknown> }

      expect(messages.installations?.basicInformation, locale).toBe(translation)
    }
  })
})
