import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { useAuthStore } from "../../../store/authStore"
import {
  LogOut, Home, Package, Truck, FileText,
  ClipboardList, Calendar, Menu, X, Building, User, CreditCard, Settings, Database,
  ChevronsLeft, ChevronsRight, ChevronDown, Boxes
} from "lucide-react"
import { useLayoutStore } from "../../../store/layoutStore"
import styles from "./Nav.module.css"
import { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { isTechnician, isSuperAdmin, isClient, isAdmin } from "../../utils/roleUtils"
import { useTranslatedRoutes } from "../../../router"
import { logoutSession } from "../../../features/auth/services/loginServices"
import { useCSRFStore } from "../../../store/csrfStore"

const Nav = () => {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const logout = useAuthStore((s) => s.logout)
  const setLogoutMessage = useAuthStore((s) => s.setLogoutMessage)
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMaintenanceMenuOpen, setIsMaintenanceMenuOpen] = useState(true)
  const [isMaintenanceHovered, setIsMaintenanceHovered] = useState(false)
  const [isInfrastructureMenuOpen, setIsInfrastructureMenuOpen] = useState(true)
  const [isInfrastructureHovered, setIsInfrastructureHovered] = useState(false)
  const [isResourcesMenuOpen, setIsResourcesMenuOpen] = useState(true)
  const [isResourcesHovered, setIsResourcesHovered] = useState(false)
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(true)
  const [isAdminHovered, setIsAdminHovered] = useState(false)
  
  const { isSidebarCollapsed, toggleSidebar } = useLayoutStore()
  const { getRoute } = useTranslatedRoutes()
  const maintenanceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const infrastructureTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const resourcesTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const adminTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Usar las utilidades de roles
  const isTechnicianUser = isTechnician(role)
  const isSuperAdminUser = isSuperAdmin(role)
  const isClientUser = isClient(role)
  const isAdminUser = isAdmin(role)

  const workOrdersRoute = getRoute('workOrders')
  const calendarRoute = getRoute('calendar')
  const maintenancePlanRoute = getRoute('maintenancePlan')
  const installationsRoute = getRoute('installations')
  const assetsRoute = getRoute('assets')
  const inventoryRoute = getRoute('inventory')
  const suppliersRoute = getRoute('suppliers')
  const formsRoute = getRoute('forms')
  const personalRoute = getRoute('personal')
  const panelAdminRoute = getRoute('panelAdmin')
  const tenantsRoute = getRoute('tenants')

  const isMaintenanceSectionActive =
    location.pathname.startsWith(workOrdersRoute) ||
    location.pathname.startsWith(calendarRoute) ||
    location.pathname.startsWith(maintenancePlanRoute)
    
  const isInfrastructureSectionActive =
    location.pathname.startsWith(installationsRoute) ||
    location.pathname.startsWith(assetsRoute)

  const isResourcesSectionActive =
    location.pathname.startsWith(inventoryRoute) ||
    location.pathname.startsWith(suppliersRoute)

  const isAdminSectionActive =
    location.pathname.startsWith(formsRoute) ||
    location.pathname.startsWith(personalRoute) ||
    location.pathname.startsWith(panelAdminRoute) ||
    location.pathname.startsWith(tenantsRoute)

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isMenuOpen])

  useEffect(() => {
    if (isMaintenanceSectionActive) setIsMaintenanceMenuOpen(true)
    if (isInfrastructureSectionActive) setIsInfrastructureMenuOpen(true)
    if (isResourcesSectionActive) setIsResourcesMenuOpen(true)
    if (isAdminSectionActive) setIsAdminMenuOpen(true)
  }, [isMaintenanceSectionActive, isInfrastructureSectionActive, isResourcesSectionActive, isAdminSectionActive])

  useEffect(() => {
    if (isSidebarCollapsed) {
      setIsMaintenanceMenuOpen(false)
      setIsInfrastructureMenuOpen(false)
      setIsResourcesMenuOpen(false)
      setIsAdminMenuOpen(false)
    } else {
      setIsMaintenanceMenuOpen(true)
      setIsInfrastructureMenuOpen(true)
      setIsResourcesMenuOpen(true)
      setIsAdminMenuOpen(true)
    }
  }, [isSidebarCollapsed])

  useEffect(() => {
    const refs = [maintenanceTimeoutRef, infrastructureTimeoutRef, resourcesTimeoutRef, adminTimeoutRef]
    refs.forEach(ref => {
      if (ref.current) clearTimeout(ref.current)
    })
    setIsMaintenanceHovered(false)
    setIsInfrastructureHovered(false)
    setIsResourcesHovered(false)
    setIsAdminHovered(false)
  }, [location.pathname])

  const handleLogout = () => {
    setLogoutMessage("Sesión cerrada con éxito.")
    const csrfToken = useCSRFStore.getState().token

    logoutSession(csrfToken)
      .catch(() => null)
      .finally(() => {
        logout()
        navigate("/", { replace: true })
        setIsMenuOpen(false)
      })
  }

  const handleMouseEnter = (type: 'maintenance' | 'infrastructure' | 'resources' | 'admin') => {
    if (isSidebarCollapsed) {
      const ref = type === 'maintenance' ? maintenanceTimeoutRef : type === 'infrastructure' ? infrastructureTimeoutRef : type === 'resources' ? resourcesTimeoutRef : adminTimeoutRef
      if (ref.current) clearTimeout(ref.current)
      
      if (type === 'maintenance') setIsMaintenanceHovered(true)
      if (type === 'infrastructure') setIsInfrastructureHovered(true)
      if (type === 'resources') setIsResourcesHovered(true)
      if (type === 'admin') setIsAdminHovered(true)
    }
  }

  const handleMouseLeave = (type: 'maintenance' | 'infrastructure' | 'resources' | 'admin') => {
    if (isSidebarCollapsed) {
      const ref = type === 'maintenance' ? maintenanceTimeoutRef : type === 'infrastructure' ? infrastructureTimeoutRef : type === 'resources' ? resourcesTimeoutRef : adminTimeoutRef
      ref.current = setTimeout(() => {
        if (type === 'maintenance') setIsMaintenanceHovered(false)
        if (type === 'infrastructure') setIsInfrastructureHovered(false)
        if (type === 'resources') setIsResourcesHovered(false)
        if (type === 'admin') setIsAdminHovered(false)
      }, 300)
    }
  }

  const handleSubmenuMouseEnter = (type: 'maintenance' | 'infrastructure' | 'resources' | 'admin') => {
    if (isSidebarCollapsed) {
      const ref = type === 'maintenance' ? maintenanceTimeoutRef : type === 'infrastructure' ? infrastructureTimeoutRef : type === 'resources' ? resourcesTimeoutRef : adminTimeoutRef
      if (ref.current) {
        clearTimeout(ref.current)
        if (type === 'maintenance') setIsMaintenanceHovered(true)
        if (type === 'infrastructure') setIsInfrastructureHovered(true)
        if (type === 'resources') setIsResourcesHovered(true)
        if (type === 'admin') setIsAdminHovered(true)
      }
    }
  }

  const handleSubmenuMouseLeave = (type: 'maintenance' | 'infrastructure' | 'resources' | 'admin') => {
    if (isSidebarCollapsed) {
      const ref = type === 'maintenance' ? maintenanceTimeoutRef : type === 'infrastructure' ? infrastructureTimeoutRef : type === 'resources' ? resourcesTimeoutRef : adminTimeoutRef
      ref.current = setTimeout(() => {
        if (type === 'maintenance') setIsMaintenanceHovered(false)
        if (type === 'infrastructure') setIsInfrastructureHovered(false)
        if (type === 'resources') setIsResourcesHovered(false)
        if (type === 'admin') setIsAdminHovered(false)
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
            {/* Dashboard / Inicio */}
            {!isSuperAdminUser && !isClientUser && (
              <li>
                <NavLink to="/inicio" className={({ isActive }) => (isActive ? styles.active : "")} onClick={() => setIsMenuOpen(false)}>
                  <Home size={20} /> <span className={styles.linkText}>{t('nav.home')}</span>
                </NavLink>
              </li>
            )}

            {/* Mantenimiento */}
            {!isSuperAdminUser && !isClientUser && (
              <li className={styles.menuGroup}
                onMouseEnter={() => handleMouseEnter('maintenance')}
                onMouseLeave={() => handleMouseLeave('maintenance')}
              >
                <button
                  type="button"
                  className={`${styles.groupButton} ${isMaintenanceSectionActive ? styles.active : ""}`}
                  onClick={() => setIsMaintenanceMenuOpen((prev) => !prev)}
                >
                  <span className={styles.groupButtonContent}>
                    <ClipboardList size={20} /> <span className={styles.linkText}>{t('nav.maintenance')}</span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={`${styles.groupChevron} ${isMaintenanceMenuOpen ? styles.groupChevronOpen : ""}`}
                  />
                </button>
                <div 
                  className={`${styles.submenu} ${(isMaintenanceMenuOpen || (isSidebarCollapsed && isMaintenanceHovered)) ? styles.submenuOpen : ""}`}
                  onMouseEnter={() => handleSubmenuMouseEnter('maintenance')}
                  onMouseLeave={() => handleSubmenuMouseLeave('maintenance')}
                >
                  <NavLink to={workOrdersRoute} className={({ isActive }) => `${styles.submenuLink} ${isActive ? styles.active : ""}`} onClick={() => { setIsMenuOpen(false); setIsMaintenanceHovered(false) }}>
                    <ClipboardList size={20} /> <span className={styles.linkText}>{t('nav.workOrders')}</span>
                  </NavLink>
                  <NavLink to={calendarRoute} className={({ isActive }) => `${styles.submenuLink} ${isActive ? styles.active : ""}`} onClick={() => { setIsMenuOpen(false); setIsMaintenanceHovered(false) }}>
                    <Calendar size={20} /> <span className={styles.linkText}>{t('nav.calendar')}</span>
                  </NavLink>
                  {!isTechnicianUser && (
                    <NavLink to={maintenancePlanRoute} className={({ isActive }) => `${styles.submenuLink} ${isActive ? styles.active : ""}`} onClick={() => { setIsMenuOpen(false); setIsMaintenanceHovered(false) }}>
                      <CreditCard size={20} /> <span className={styles.linkText}>{t('nav.maintenancePlan')}</span>
                    </NavLink>
                  )}
                </div>
              </li>
            )}

            {/* Activos e Infraestructura */}
            {!isSuperAdminUser && !isClientUser && (
              <li className={styles.menuGroup}
                onMouseEnter={() => handleMouseEnter('infrastructure')}
                onMouseLeave={() => handleMouseLeave('infrastructure')}
              >
                <button
                  type="button"
                  className={`${styles.groupButton} ${isInfrastructureSectionActive ? styles.active : ""}`}
                  onClick={() => setIsInfrastructureMenuOpen((prev) => !prev)}
                >
                  <span className={styles.groupButtonContent}>
                    <Building size={20} /> <span className={styles.linkText}>{t('nav.infrastructure')}</span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={`${styles.groupChevron} ${isInfrastructureMenuOpen ? styles.groupChevronOpen : ""}`}
                  />
                </button>
                <div 
                  className={`${styles.submenu} ${(isInfrastructureMenuOpen || (isSidebarCollapsed && isInfrastructureHovered)) ? styles.submenuOpen : ""}`}
                  onMouseEnter={() => handleSubmenuMouseEnter('infrastructure')}
                  onMouseLeave={() => handleSubmenuMouseLeave('infrastructure')}
                >
                  <NavLink to="/instalaciones" className={({ isActive }) => `${styles.submenuLink} ${isActive ? styles.active : ""}`} onClick={() => { setIsMenuOpen(false); setIsInfrastructureHovered(false) }}>
                    <Building size={20} /> <span className={styles.linkText}>{t('nav.installations')}</span>
                  </NavLink>
                  {!isTechnicianUser && (
                    <NavLink to="/activos" className={({ isActive }) => `${styles.submenuLink} ${isActive ? styles.active : ""}`} onClick={() => { setIsMenuOpen(false); setIsInfrastructureHovered(false) }}>
                      <Package size={20} /> <span className={styles.linkText}>{t('nav.assets')}</span>
                    </NavLink>
                  )}
                </div>
              </li>
            )}

            {/* Inventario y Recursos */}
            {!isSuperAdminUser && !isClientUser && (
              <li className={styles.menuGroup}
                onMouseEnter={() => handleMouseEnter('resources')}
                onMouseLeave={() => handleMouseLeave('resources')}
              >
                <button
                  type="button"
                  className={`${styles.groupButton} ${isResourcesSectionActive ? styles.active : ""}`}
                  onClick={() => setIsResourcesMenuOpen((prev) => !prev)}
                >
                  <span className={styles.groupButtonContent}>
                    <Boxes size={20} /> <span className={styles.linkText}>{t('nav.resources')}</span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={`${styles.groupChevron} ${isResourcesMenuOpen ? styles.groupChevronOpen : ""}`}
                  />
                </button>
                <div 
                  className={`${styles.submenu} ${(isResourcesMenuOpen || (isSidebarCollapsed && isResourcesHovered)) ? styles.submenuOpen : ""}`}
                  onMouseEnter={() => handleSubmenuMouseEnter('resources')}
                  onMouseLeave={() => handleSubmenuMouseLeave('resources')}
                >
                  <NavLink to="/inventario" className={({ isActive }) => `${styles.submenuLink} ${isActive ? styles.active : ""}`} onClick={() => { setIsMenuOpen(false); setIsResourcesHovered(false) }}>
                    <Boxes size={20} /> <span className={styles.linkText}>{t('nav.inventory')}</span>
                  </NavLink>
                  {isAdminUser && (
                    <NavLink to="/proveedores" className={({ isActive }) => `${styles.submenuLink} ${isActive ? styles.active : ""}`} onClick={() => { setIsMenuOpen(false); setIsResourcesHovered(false) }}>
                      <Truck size={20} /> <span className={styles.linkText}>{t('nav.suppliers')}</span>
                    </NavLink>
                  )}
                </div>
              </li>
            )}

            {/* Administración */}
            <li className={styles.menuGroup}
              onMouseEnter={() => handleMouseEnter('admin')}
              onMouseLeave={() => handleMouseLeave('admin')}
            >
              <button
                type="button"
                className={`${styles.groupButton} ${isAdminSectionActive ? styles.active : ""}`}
                onClick={() => setIsAdminMenuOpen((prev) => !prev)}
              >
                <span className={styles.groupButtonContent}>
                  <Settings size={20} /> <span className={styles.linkText}>{t('nav.administration')}</span>
                </span>
                <ChevronDown
                  size={16}
                  className={`${styles.groupChevron} ${isAdminMenuOpen ? styles.groupChevronOpen : ""}`}
                />
              </button>
              <div 
                className={`${styles.submenu} ${(isAdminMenuOpen || (isSidebarCollapsed && isAdminHovered)) ? styles.submenuOpen : ""}`}
                onMouseEnter={() => handleSubmenuMouseEnter('admin')}
                onMouseLeave={() => handleSubmenuMouseLeave('admin')}
              >
                {!isTechnicianUser && !isSuperAdminUser && !isClientUser && (
                  <>
                    <NavLink to={formsRoute} className={({ isActive }) => `${styles.submenuLink} ${isActive ? styles.active : ""}`} onClick={() => { setIsMenuOpen(false); setIsAdminHovered(false) }}>
                      <FileText size={20} /> <span className={styles.linkText}>{t('nav.forms')}</span>
                    </NavLink>
                    <NavLink to="/personal" className={({ isActive }) => `${styles.submenuLink} ${isActive ? styles.active : ""}`} onClick={() => { setIsMenuOpen(false); setIsAdminHovered(false) }}>
                      <User size={20} /> <span className={styles.linkText}>{t('nav.personal')}</span>
                    </NavLink>
                  </>
                )}
                {isSuperAdminUser && (
                  <>
                    <NavLink to="/panel-admin" className={({ isActive }) => `${styles.submenuLink} ${isActive ? styles.active : ""}`} onClick={() => { setIsMenuOpen(false); setIsAdminHovered(false) }}>
                      <Settings size={20} /> <span className={styles.linkText}>Panel Admin</span>
                    </NavLink>
                    <NavLink to="/tenants" className={({ isActive }) => `${styles.submenuLink} ${isActive ? styles.active : ""}`} onClick={() => { setIsMenuOpen(false); setIsAdminHovered(false) }}>
                      <Database size={20} /> <span className={styles.linkText}>Tenants</span>
                    </NavLink>
                  </>
                )}
              </div>
            </li>
          </ul>
          <div className={styles.bottomSection}>
            <div className={styles.userSection}>
              {user && (
                <div className={styles.userInfo}>
                  <div
                    className={styles.userAvatar}
                    onClick={() => {
                      if (!isClientUser && !isAdminUser) {
                        setIsMenuOpen(false);
                        navigate('/perfil');
                      }
                    }}
                    style={{ cursor: (isClientUser || isAdminUser) ? 'default' : 'pointer' }}
                    title={(!isClientUser && !isAdminUser) ? (t('common.viewProfile') || 'Ver perfil') : undefined}
                  >
                    {user.substring(0, 2).toUpperCase()}
                  </div>
                  <div className={styles.userDetails}>
                    <span
                      className={styles.userName}
                      onClick={() => {
                        if (!isClientUser && !isAdminUser) {
                          setIsMenuOpen(false);
                          navigate('/perfil');
                        }
                      }}
                      style={{ cursor: (isClientUser || isAdminUser) ? 'default' : 'pointer' }}
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
