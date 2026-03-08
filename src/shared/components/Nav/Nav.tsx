import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { useAuthStore } from "../../../store/authStore"
import {
  LogOut, Home, Package, FileText, BookOpen,
  ClipboardList, Calendar, Sun, Moon, Menu, X, Building, User, Globe, CreditCard, Settings, Database,
  ChevronsLeft, ChevronsRight, ChevronDown
} from "lucide-react"
import { useLayoutStore } from "../../../store/layoutStore"
import styles from "./Nav.module.css"
import { useState, useEffect, useRef } from "react"
import { useTheme } from "../../hooks/useTheme"
import { useTranslation } from "react-i18next"
import { isTechnician, isSuperAdmin, canAccessSection, isClient, isAdmin } from "../../utils/roleUtils"
import { useTranslatedRoutes } from "../../../router"
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
  const location = useLocation()
  const { dark, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isWorkOrdersMenuOpen, setIsWorkOrdersMenuOpen] = useState(true)
  const [isWorkOrdersHovered, setIsWorkOrdersHovered] = useState(false)
  const { isSidebarCollapsed, toggleSidebar } = useLayoutStore()
  const { getRoute } = useTranslatedRoutes()
  const workOrdersTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Usar las utilidades de roles
  const isTechnicianUser = isTechnician(role)
  const isSuperAdminUser = isSuperAdmin(role)
  const isClientUser = isClient(role)
  const isAdminUser = isAdmin(role)

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
  const currentLanguage = languages.find(lang => lang.code === currentLangCode) || languages[0]
  const currentFlag = flagMap[currentLangCode] || esFlag
  const workOrdersRoute = getRoute('workOrders')
  const calendarRoute = getRoute('calendar')
  const maintenancePlanRoute = getRoute('maintenancePlan')
  const isWorkOrdersSectionActive =
    location.pathname.startsWith(workOrdersRoute) ||
    location.pathname.startsWith(calendarRoute) ||
    location.pathname.startsWith(maintenancePlanRoute)

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isMenuOpen])

  useEffect(() => {
    if (isWorkOrdersSectionActive) {
      setIsWorkOrdersMenuOpen(true)
    }
  }, [isWorkOrdersSectionActive])

  useEffect(() => {
    if (isSidebarCollapsed) {
      setIsWorkOrdersMenuOpen(false)
    } else {
      setIsWorkOrdersMenuOpen(true)
    }
  }, [isSidebarCollapsed])

  const handleLogout = () => {
    setLogoutMessage("Sesión cerrada con éxito.")
    logout()
    navigate("/", { replace: true })
    setIsMenuOpen(false)
  }

  const handleWorkOrdersMouseEnter = () => {
    if (isSidebarCollapsed) {
      if (workOrdersTimeoutRef.current) {
        clearTimeout(workOrdersTimeoutRef.current)
      }
      setIsWorkOrdersHovered(true)
    }
  }

  const handleWorkOrdersMouseLeave = () => {
    if (isSidebarCollapsed) {
      workOrdersTimeoutRef.current = setTimeout(() => {
        setIsWorkOrdersHovered(false)
      }, 300)
    }
  }

  const handleSubmenuMouseEnter = () => {
    if (isSidebarCollapsed && workOrdersTimeoutRef.current) {
      clearTimeout(workOrdersTimeoutRef.current)
      setIsWorkOrdersHovered(true)
    }
  }

  const handleSubmenuMouseLeave = () => {
    if (isSidebarCollapsed) {
      workOrdersTimeoutRef.current = setTimeout(() => {
        setIsWorkOrdersHovered(false)
      }, 300)
    }
  }

  return (
    <>
      <button
        className={`${styles.menuToggle} ${isMenuOpen ? styles.menuToggleOpen : ''}`}
        onClick={() => setIsMenuOpen(prev => !prev)}
        aria-label={isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
      >
        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <nav className={`${styles.nav} ${isMenuOpen ? styles.open : ""} ${isSidebarCollapsed ? styles.collapsed : ""}`}>
        <button
          className={styles.collapseButton}
          onClick={toggleSidebar}
          aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
        </button>
        <div className={styles.navContent}>
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
                  <Home size={20} /> <span className={styles.linkText}>{t('nav.home')}</span>
                </NavLink>
              </li>
            )}
            {!isSuperAdminUser && (
              <li data-tour="nav-installations">
                <NavLink to="/instalaciones" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
                  <Building size={20} /> <span className={styles.linkText}>{t('nav.installations')}</span>
                </NavLink>
              </li>
            )}
            {!isTechnicianUser && !isSuperAdminUser && (
              <li data-tour="nav-assets">
                <NavLink to="/activos" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
                  <Package size={20} /> <span className={styles.linkText}>{t('nav.assets')}</span>
                </NavLink>
              </li>
            )}
            {!isTechnicianUser && !isSuperAdminUser && !isClientUser && (
              <>
                <li data-tour="nav-forms">
                  <NavLink to="/formularios" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
                    <FileText size={20} /> <span className={styles.linkText}>{t('nav.forms')}</span>
                  </NavLink>
                </li>
                <li data-tour="nav-personal">
                  <NavLink to="/personal" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
                    <User size={20} /> <span className={styles.linkText}>{t('nav.personal')}</span>
                  </NavLink>
                </li>
              </>
            )}

            {!isSuperAdminUser && !isClientUser && (
              <li className={styles.menuGroup}
                onMouseEnter={handleWorkOrdersMouseEnter}
                onMouseLeave={handleWorkOrdersMouseLeave}
              >
                <button
                  type="button"
                  className={`${styles.groupButton} ${isWorkOrdersSectionActive ? styles.active : ""}`}
                  onClick={() => setIsWorkOrdersMenuOpen((prev) => !prev)}
                >
                  <span className={styles.groupButtonContent}>
                    <ClipboardList size={20} /> <span className={styles.linkText}>{t('nav.workOrders')}</span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={`${styles.groupChevron} ${isWorkOrdersMenuOpen ? styles.groupChevronOpen : ""}`}
                  />
                </button>
                <div 
                  className={`${styles.submenu} ${(isWorkOrdersMenuOpen || (isSidebarCollapsed && isWorkOrdersHovered)) ? styles.submenuOpen : ""}`}
                  onMouseEnter={handleSubmenuMouseEnter}
                  onMouseLeave={handleSubmenuMouseLeave}
                >
                  <NavLink to={workOrdersRoute} className={({ isActive }) => `${styles.submenuLink} ${isActive ? styles.active : ""}`} onClick={() => setIsMenuOpen(false)}>
                    <ClipboardList size={20} /> <span className={styles.linkText}>{t('nav.workOrdersList')}</span>
                  </NavLink>
                  <NavLink to={calendarRoute} className={({ isActive }) => `${styles.submenuLink} ${isActive ? styles.active : ""}`} onClick={() => setIsMenuOpen(false)}>
                    <Calendar size={20} /> <span className={styles.linkText}>{t('nav.calendar')}</span>
                  </NavLink>
                  {!isTechnicianUser && !isSuperAdminUser && !isClientUser && (
                    <NavLink to={maintenancePlanRoute} className={({ isActive }) => `${styles.submenuLink} ${isActive ? styles.active : ""}`} onClick={() => setIsMenuOpen(false)}>
                      <CreditCard size={20} /> <span className={styles.linkText}>{t('nav.maintenancePlan')}</span>
                    </NavLink>
                  )}
                </div>
              </li>
            )}
            {/* Panel Admin solo para super_admin */}
            {isSuperAdminUser && (
              <li>
                <NavLink to="/panel-admin" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
                  <Settings size={20} /> <span className={styles.linkText}>Panel Admin</span>
                </NavLink>
              </li>
            )}
            {/* Tenants solo para super_admin */}
            {isSuperAdminUser && (
              <li>
                <NavLink to="/tenants" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
                  <Database size={20} /> <span className={styles.linkText}>Tenants</span>
                </NavLink>
              </li>
            )}
          </ul>
          <div className={styles.bottomSection}>
            <div className={styles.userSection}>
              {user && (
                <div className={styles.userInfo}>
                  <div
                    className={styles.userAvatar}
                    onClick={() => {
                      if (!isAdminUser) {
                        setIsMenuOpen(false);
                        navigate('/perfil');
                      }
                    }}
                    style={{ cursor: isAdminUser ? 'default' : 'pointer' }}
                    title={!isAdminUser ? (t('common.viewProfile') || 'Ver perfil') : undefined}
                  >
                    {user.substring(0, 2).toUpperCase()}
                  </div>
                  <div className={styles.userDetails}>
                    <span
                      className={styles.userName}
                      onClick={() => {
                        if (!isAdminUser) {
                          setIsMenuOpen(false);
                          navigate('/perfil');
                        }
                      }}
                      style={{ cursor: isAdminUser ? 'default' : 'pointer' }}
                    >
                      {user}
                    </span>
                    <span className={styles.userRole}>
                      <span className={styles.userRole}>
                        {isSuperAdminUser ? t('roles.superAdmin') : isAdminUser ? t('roles.admin') : isTechnicianUser ? t('roles.technician') : isClientUser ? t('roles.client') : t('roles.user')}
                      </span>
                    </span>
                  </div>
                  <button
                    className={styles.logoutButton}
                    onClick={handleLogout}
                    title={t('nav.logout')}
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}

export default Nav
