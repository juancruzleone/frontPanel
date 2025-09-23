import { NavLink, useNavigate } from "react-router-dom"
import { useAuthStore } from "../../../store/authStore"
import {
  LogOut, Home, Package, FileText, BookOpen,
  ClipboardList, Calendar, Sun, Moon, Menu, X, Building, User, Globe, CreditCard, Settings, Database
} from "lucide-react"
import styles from "./Nav.module.css"
import { useState, useEffect, useRef } from "react"
import { useTheme } from "../../hooks/useTheme"
import { useTranslation } from "react-i18next"
import { isTechnician, isSuperAdmin, canAccessSection } from "../../utils/roleUtils"
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
  const languageDropdownRef = useRef<HTMLDivElement>(null)

  // Usar las utilidades de roles
  const isTechnicianUser = isTechnician(role)
  const isSuperAdminUser = isSuperAdmin(role)

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
      if (
        languageDropdownRef.current &&
        !languageDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLanguageOpen(false)
      }
    }

    if (isLanguageOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isLanguageOpen])

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
          <div className={styles.logoContainer}>
            <img src="/logo leonix 5.svg" alt="Leonix Logo" className={styles.logoImage} />
            <span className={styles.logoText}>Leonix</span>
          </div>
        </div>
        <ul className={styles.menu}>
          {!isSuperAdminUser && (
            <li>
              <NavLink to="/inicio" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
                <Home size={20} /> {t('nav.home')}
              </NavLink>
            </li>
          )}
          {!isSuperAdminUser && (
            <li>
              <NavLink to="/instalaciones" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
                <Building size={20} /> {t('nav.installations')}
              </NavLink>
            </li>
          )}
          {!isTechnicianUser && !isSuperAdminUser && (
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

          {/* Botón de abonos vigentes solo para no técnicos y no super_admin */}
          {!isTechnicianUser && !isSuperAdminUser && (
            <li>
              <NavLink to="/abonos-vigentes" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
                <CreditCard size={20} /> {t('nav.subscriptions')}
              </NavLink>
            </li>
          )}
          {!isSuperAdminUser && (
            <li>
              <NavLink to="/ordenes-trabajo" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
                <ClipboardList size={20} /> {t('nav.workOrders')}
              </NavLink>
            </li>
          )}
          {!isSuperAdminUser && (
            <li>
              <NavLink to="/calendario" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
                <Calendar size={20} /> {t('nav.calendar')}
              </NavLink>
            </li>
          )}
          {/* Panel Admin solo para super_admin */}
          {isSuperAdminUser && (
            <li>
              <NavLink to="/panel-admin" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
                <Settings size={20} /> Panel Admin
              </NavLink>
            </li>
          )}
          {/* Tenants solo para super_admin */}
          {isSuperAdminUser && (
            <li>
              <NavLink to="/tenants" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
                <Database size={20} /> Tenants
              </NavLink>
            </li>
          )}
        </ul>
        <div className={styles.bottomSection}>
          <div className={styles.controlsContainer}>
            <div className={styles.languageSelectorContainer} ref={languageDropdownRef}>
              <button 
                type="button"
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
                      type="button"
                      key={language.code}
                      className={`${styles.languageOption} ${i18n.language === language.code ? styles.active : ''}`}
                      onClick={() => handleLanguageChange(language.code)}
                    >
                      <img src={flagMap[language.code] || esFlag} alt={language.code} className={styles.flagImg} />
                      <span className={styles.languageName}>{language.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.themeBox}>
              <button 
                type="button"
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
                  <span className={styles.userName} style={{cursor: 'pointer', marginBottom: 10, display: 'inline-block'}} onClick={() => { setIsMenuOpen(false); navigate('/perfil'); }}>
                    {user}
                  </span>
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
