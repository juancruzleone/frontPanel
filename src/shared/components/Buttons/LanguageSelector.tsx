import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './buttons.module.css'
import esFlag from '../../../../src/assets/flags/es.svg'
import frFlag from '../../../../src/assets/flags/fr.svg'
import usFlag from '../../../../src/assets/flags/us.svg'
import deFlag from '../../../../src/assets/flags/de.svg'
import jpFlag from '../../../../src/assets/flags/jp.svg'
import krFlag from '../../../../src/assets/flags/kr.svg'
import saFlag from '../../../../src/assets/flags/sa.svg'
import brFlag from '../../../../src/assets/flags/br.svg'
import cnFlag from '../../../../src/assets/flags/cn.svg'
import itFlag from '../../../../src/assets/flags/it.svg'

const flagMap: Record<string, string> = {
  es: esFlag,
  fr: frFlag,
  en: usFlag,
  us: usFlag,
  de: deFlag,
  it: itFlag,
  ja: jpFlag,
  jp: jpFlag,
  ko: krFlag,
  kr: krFlag,
  ar: saFlag,
  pt: brFlag,
  br: brFlag,
  zh: cnFlag,
  cn: cnFlag,
}

interface LanguageSelectorProps {
  direction?: 'up' | 'down'
}

const LanguageSelector = ({ direction = 'up' }: LanguageSelectorProps) => {
  const { i18n, t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Lista fija con bandera y nombre traducido
  const languages = [
    { code: 'es', name: t('languageSelector.spanish'), flag: '🇪🇸' },
    { code: 'en', name: t('languageSelector.english'), flag: '🇺🇸' },
    { code: 'fr', name: t('languageSelector.french'), flag: '🇫🇷' },
    { code: 'pt', name: t('languageSelector.portuguese'), flag: '🇵🇹' },
    { code: 'de', name: t('languageSelector.german'), flag: '🇩🇪' },
    { code: 'it', name: t('languageSelector.italian'), flag: '🇮🇹' },
    { code: 'ja', name: t('languageSelector.japanese'), flag: '🇯🇵' },
    { code: 'ko', name: t('languageSelector.korean'), flag: '🇰🇷' },
    { code: 'zh', name: t('languageSelector.chinese'), flag: '🇨🇳' },
    { code: 'ar', name: t('languageSelector.arabic'), flag: '🇸🇦' }
  ]

  const currentLangCode = (i18n.resolvedLanguage || i18n.language || 'es').split('-')[0]

  const currentFlag = flagMap[currentLangCode] || esFlag

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode)
    setIsOpen(false)
  }

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const dropdownClass = `${styles.languageDropdown} ${direction === 'up' ? styles.languageDropdownUp : styles.languageDropdownDown
    }`

  return (
    <div className={styles.languageSelectorContainer} ref={dropdownRef}>
      <img
        src={currentFlag}
        alt={i18n.language}
        className={styles.flagImg}
        onClick={toggleDropdown}
        style={{ cursor: 'pointer' }}
      />

      {isOpen && (
        <div className={dropdownClass}>
          {languages.map((language) => (
            <button
              type="button"
              key={language.code}
              className={`${styles.languageOption} ${currentLangCode === language.code ? styles.active : ''
                }`}
              onClick={() => handleLanguageChange(language.code)}
            >
              <span className={styles.flag}>{language.flag}</span>
              <span className={styles.languageName}>{language.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LanguageSelector
