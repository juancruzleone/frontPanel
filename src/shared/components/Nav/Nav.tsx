import { NavLink, useNavigate } from "react-router-dom"
import { useAuthStore } from "../../../store/authStore"
import {
  LogOut, Home, Package, FileText, BookOpen,
  ClipboardList, Calendar, Sun, Moon, Menu, X, Building, User
} from "lucide-react"
import styles from "./Nav.module.css"
import { useState, useEffect } from "react"
import { useTheme } from "../../hooks/useTheme"
import LanguageSelector from "../Buttons/LanguageSelector"
import { useTranslation } from "react-i18next"

const Nav = () => {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const setLogoutMessage = useAuthStore((s) => s.setLogoutMessage)
  const navigate = useNavigate()
  const { dark, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : ""
  }, [isMenuOpen])

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
          <li>
            <NavLink to="/personal" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
              <User size={20} /> {t('nav.personal')}
            </NavLink>
          </li>
        </ul>
        <div className={styles.bottomSection}>
          <div className={styles.controlsContainer}>
            <div className={styles.themeBox}>
              <button 
                className={styles.themeButton} 
                onClick={toggleTheme} 
                aria-label={t('nav.toggleTheme')}
              >
                {dark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
            <div className={styles.languageBox}>
              <LanguageSelector />
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
