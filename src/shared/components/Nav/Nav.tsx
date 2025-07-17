import { NavLink, useNavigate } from "react-router-dom"
import { useAuthStore } from "../../../store/authStore"
import {
  LogOut, Home, Package, FileText, BookOpen,
  ClipboardList, Calendar, Sun, Moon, Menu, X, Building, User, Globe
} from "lucide-react"
import styles from "./Nav.module.css"
import { useState, useEffect } from "react"
import { useTheme } from "../../hooks/useTheme"
import { useTranslation } from "react-i18next"
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

const Nav = () => {
  const { t, i18n } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const logout = useAuthStore((s) => s.logout)
  const setLogoutMessage = useAuthStore((s) => s.setLogoutMessage)
  const navigate = useNavigate()
  const { dark, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLanguageOpen, setIsLanguageOpen] = useState(false)

  // Normalizar el rol para aceptar 'tecnico' y 'técnico'
  const isTechnician = role && ["tecnico", "técnico"].includes(role.toLowerCase())

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
  const currentFlag = flagMap[i18n.language] || esFlag

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode)
    setIsLanguageOpen(false)
  }

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : ""
  }, [isMenuOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const languageBox = document.querySelector(`.${styles.languageBox}`)
      
      if (languageBox && !languageBox.contains(target)) {
        setIsLanguageOpen(false)
      }
    }

    if (isLanguageOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isLanguageOpen, styles.languageBox])

  const handleLogout = () => {
    setLogoutMessage("Sesión cerrada con éxito.")
    logout()
    navigate("/", { replace: true })
    setIsMenuOpen(false)
  }

  return (
    <>
      <button
        className={isMenuOpen ? `${styles.menuToggle} open` : styles.menuToggle}
        onClick={() => setIsMenuOpen(prev => !prev)}
        aria-label={isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
      >
        {isMenuOpen ? <X size={28} color="#fff" /> : <Menu size={28} />}
      </button>

      <nav className={`${styles.nav} ${isMenuOpen ? styles.open : ""}`}>
        <div className={styles.logoArea}>
          <h2 className={styles.logo}>{/* LeoneSuite */}</h2>
        </div>
        <ul className={styles.menu}>
          <li>
            <NavLink to="/inicio" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
              <Home size={20} /> {t('nav.home')}
            </NavLink>
          </li>
          <li>
            <NavLink to="/instalaciones" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
              <Building size={20} /> {t('nav.installations')}
            </NavLink>
          </li>
          {!isTechnician && (
            <>
              <li>
                <NavLink to="/activos" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
                  <Package size={20} /> {t('nav.assets')}
                </NavLink>
              </li>
              <li>
                <NavLink to="/formularios" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
                  <FileText size={20} /> {t('nav.forms')}
                </NavLink>
              </li>
              <li>
                <NavLink to="/personal" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
                  <User size={20} /> {t('nav.personal')}
                </NavLink>
              </li>
            </>
          )}
          <li>
            <NavLink to="/manuales" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
              <BookOpen size={20} /> {t('nav.manuals')}
            </NavLink>
          </li>
          <li>
            <NavLink to="/ordenes-trabajo" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
              <ClipboardList size={20} /> {t('nav.workOrders')}
            </NavLink>
          </li>
          <li>
            <NavLink to="/calendario" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
              <Calendar size={20} /> {t('nav.calendar')}
            </NavLink>
          </li>
        </ul>
        <div className={styles.bottomSection}>
          <div className={styles.controlsContainer}>
            <div className={styles.languageBox}>
              <button 
                className={styles.languageButton} 
                onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                aria-label={t('languageSelector.title')}
              >
                <img src={currentFlag} alt={i18n.language} className={styles.flagImg} />
              </button>
              {isLanguageOpen && (
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
            <div className={styles.themeBox}>
              <button 
                className={styles.themeButton} 
                onClick={toggleTheme} 
                aria-label={t('nav.toggleTheme')}
              >
                {dark ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </div>
          </div>
          <div className={styles.userSection}>
            {user && (
              <div className={styles.userInfo}>
                <div className={styles.userDetails}>
                  <span className={styles.userName}>{user}</span>
                  <span className={styles.userRole}>{t('nav.user')}</span>
                </div>
                <button className={styles.logoutButton} onClick={handleLogout}>
                  <LogOut size={16} />
                  <span>{t('nav.logout')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}

export default Nav
