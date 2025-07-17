import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
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

const flagMap: Record<string, string> = {
  es: esFlag,
  fr: frFlag,
  en: usFlag,
  us: usFlag,
  de: deFlag,
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

const LanguageSelector = () => {
  const { i18n, t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Lista fija con bandera y nombre nativo
  const languages = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' }
  ]

  const currentLanguage =
    languages.find((lang) => lang.code === i18n.language) || languages[0]

  const currentFlag = flagMap[i18n.language] || esFlag

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

  return (
    <div className={styles.languageSelectorContainer} ref={dropdownRef}>
      <button
        className={styles.languageButton}
        onClick={toggleDropdown}
        aria-label={t('languageSelector.title')}
      >
        <img src={currentFlag} alt={i18n.language} className={styles.flagImg} />
        {/* Eliminado el ChevronDown para que la bandera ocupe el 100% */}
      </button>

      {isOpen && (
        <div className={styles.languageDropdown}>
          {languages.map((language) => (
            <button
              key={language.code}
              className={`${styles.languageOption} ${
                i18n.language === language.code ? styles.active : ''
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
