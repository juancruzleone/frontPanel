import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import styles from './buttons.module.css'

const LanguageSelector = () => {
  const { i18n, t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0]

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode)
    setIsOpen(false)
  }

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
        <span className={styles.flag}>{currentLanguage.flag}</span>
        <ChevronDown size={12} className={`${styles.chevron} ${isOpen ? styles.chevronUp : ''}`} />
      </button>

      {isOpen && (
        <div className={styles.languageDropdown}>
          {languages.map((language) => (
            <button
              key={language.code}
              className={`${styles.languageOption} ${i18n.language === language.code ? styles.active : ''}`}
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